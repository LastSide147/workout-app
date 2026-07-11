import firestore from '@react-native-firebase/firestore';
import {getCurrentUser} from './firebase';
import {getDayEntries} from './workoutDays';
import {getWithOfflineFallback, saveWithOfflineFallback} from './offlineSync';

function ratingDayDoc(userId, dateKey) {
  return firestore()
    .collection('ratings')
    .doc(userId)
    .collection('days')
    .doc(dateKey);
}

function profileDoc(userId) {
  return firestore().collection('profiles').doc(userId);
}

// Сумма (повторения × коэффициент) по всем упражнениям дня.
// Упражнение без коэффициента (мастер ещё не задал) в сумму не входит.
export function computeDayRating(exercisesList, exerciseCoefficients) {
  return exercisesList.reduce((total, item) => {
    const coefficient = exerciseCoefficients[item.exercise];
    if (typeof coefficient !== 'number') {
      return total;
    }
    return total + item.reps * coefficient;
  }, 0);
}

export async function saveDayRating(userId, dateKey, rating) {
  await ratingDayDoc(userId, dateKey).set({
    rating,
    date: dateKey,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
}

export async function deleteDayRating(userId, dateKey) {
  await ratingDayDoc(userId, dateKey).delete();
}

// Никнейм = часть email до "@". Для анонимных пользователей email
// отсутствует, поэтому подставляем нейтральное имя на основе uid.
export async function upsertProfileNickname(userId) {
  const user = getCurrentUser();
  const email = user && user.email;

  const nickname = email
    ? email.split('@')[0].slice(0, 50)
    : `Игрок-${userId.slice(0, 4)}`;

  await profileDoc(userId).set(
    {nickname, updatedAt: firestore.FieldValue.serverTimestamp()},
    {merge: true},
  );
}

// Общий рейтинг за диапазон дат (startDateKey/endDateKey — строки
// вида "2026-07-01").
//
// Рейтинг — единственная часть приложения, которой реально нужен
// интернет (это данные ВСЕХ пользователей, их нельзя целиком
// держать в локальном кэше одного телефона). Поэтому здесь не
// маскируем офлайн под "всё в порядке", а честно возвращаем признак
// fromCache, чтобы экран показал пользователю, что рейтинг может
// быть устаревшим/недоступным без сети.
//
// Возвращает {items, fromCache}:
//  - items — отсортированный список {userId, nickname, rating}
//  - fromCache — true, если данные взяты не с сервера, а из
//    локального кэша (значит, могут быть неактуальны)
export async function fetchLeaderboard(startDateKey, endDateKey) {
  const snapshot = await getWithOfflineFallback(
    firestore()
      .collectionGroup('days')
      .where('date', '>=', startDateKey)
      .where('date', '<=', endDateKey),
  );

  const totalsByUser = {};
  snapshot.docs.forEach(doc => {
    const userId = doc.ref.parent.parent.id;
    const rating = doc.data().rating || 0;
    totalsByUser[userId] = (totalsByUser[userId] || 0) + rating;
  });

  const userIds = Object.keys(totalsByUser);
  if (userIds.length === 0) {
    return {items: [], fromCache: snapshot.metadata.fromCache};
  }

  const profileSnapshots = await Promise.all(
    userIds.map(userId => getWithOfflineFallback(profileDoc(userId))),
  );

  const items = userIds.map((userId, index) => ({
    userId,
    nickname: profileSnapshots[index].exists
      ? profileSnapshots[index].data().nickname
      : 'Без имени',
    rating: Math.round(totalsByUser[userId] * 100) / 100,
  }));

  items.sort((a, b) => b.rating - a.rating);

  const fromCache =
    snapshot.metadata.fromCache ||
    profileSnapshots.some(doc => doc.metadata.fromCache);

  return {items, fromCache};
}

// Пересчитывает рейтинг по ВСЕМ дням пользователя с текущими
// коэффициентами упражнений и перезаписывает устаревшие значения.
// Вызывается при открытии экрана истории (без await — см. вызов в
// WorkoutHistoryScreen, это фоновая задача, а не то, чего пользователь
// ждёт на экране).
//
// Дни обрабатываются параллельно (Promise.all), а не по очереди:
// - getDayEntries уже не виснет офлайн (использует getWithOfflineFallback);
// - но раньше запись saveDayRating(...) каждого дня ожидалась через
//   await ПОСЛЕДОВАТЕЛЬНО — а .set() в Firestore тоже не завершает
//   Promise без ответа сервера. Офлайн это означало, что цикл
//   застревал на первом же дне и остальные дни вообще не
//   пересчитывались. saveWithOfflineFallback снимает это ограничение
//   для каждого дня независимо.
export async function recalculateAllRatings(userId, days, exerciseCoefficients) {
  const dateKeysWithWorkout = Object.keys(days).filter(
    dateKey => days[dateKey].hasExercises,
  );

  await Promise.all(
    dateKeysWithWorkout.map(async dateKey => {
      try {
        const entries = await getDayEntries(userId, dateKey);
        const exercisesList = entries.map(item => ({
          exercise: item.exercise,
          reps: item.reps,
        }));
        const rating = computeDayRating(exercisesList, exerciseCoefficients);
        await saveWithOfflineFallback(saveDayRating(userId, dateKey, rating), {
          onBackgroundError: error =>
            console.error(`Рейтинг за ${dateKey} не принят сервером:`, error),
        });
      } catch (error) {
        console.error(`Ошибка пересчёта рейтинга за ${dateKey}:`, error);
      }
    }),
  );
}