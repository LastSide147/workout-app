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

// Общий рейтинг (для "Все упражнения") — с учётом коэффициентов.
export function computeDayRating(exercisesList, exerciseCoefficients) {
  return exercisesList.reduce((total, item) => {
    const coefficient = exerciseCoefficients[item.exercise];
    if (typeof coefficient !== 'number') {
      return total;
    }
    return total + item.reps * coefficient;
  }, 0);
}

// Повторения по каждому упражнению за день — БЕЗ коэффициента.
// Используется, когда выбран фильтр по конкретному упражнению —
// там нужен топ по количеству повторений, а не взвешенное число.
export function computeDayRepsByExercise(exercisesList) {
  const byExercise = {};
  exercisesList.forEach(item => {
    byExercise[item.exercise] = item.reps;
  });
  return byExercise;
}

export async function saveDayRating(userId, dateKey, rating, byExercise) {
  await ratingDayDoc(userId, dateKey).set({
    rating,
    byExercise: byExercise || {},
    date: dateKey,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
}

export async function deleteDayRating(userId, dateKey) {
  await ratingDayDoc(userId, dateKey).delete();
}

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

// exerciseFilter = null → общий рейтинг (сумма с коэффициентами).
// exerciseFilter = "Отжимания" → топ по сумме сырых повторений
// именно этого упражнения (без коэффициента).
export async function fetchLeaderboard(startDateKey, endDateKey, exerciseFilter) {
  // getWithOfflineFallback — чтобы экран статистики не "завис" на
  // загрузке рейтинга без сети, а тихо показал последнюю кэшированную
  // версию (см. services/offlineSync.js).
  const snapshot = await getWithOfflineFallback(
    firestore()
      .collectionGroup('days')
      .where('date', '>=', startDateKey)
      .where('date', '<=', endDateKey),
  );

  const totalsByUser = {};
  snapshot.docs.forEach(doc => {
    const userId = doc.ref.parent.parent.id;
    const data = doc.data();

    const value = exerciseFilter
      ? (data.byExercise && data.byExercise[exerciseFilter]) || 0
      : data.rating || 0;

    totalsByUser[userId] = (totalsByUser[userId] || 0) + value;
  });

  const userIds = Object.keys(totalsByUser).filter(id => totalsByUser[id] > 0);
  if (userIds.length === 0) {
    return [];
  }

  const profiles = await Promise.all(
    userIds.map(userId => getWithOfflineFallback(profileDoc(userId))),
  );

  const leaderboard = userIds.map((userId, index) => ({
    userId,
    nickname: profiles[index].exists
      ? profiles[index].data().nickname
      : 'Без имени',
    rating: Math.round(totalsByUser[userId] * 100) / 100,
  }));

  leaderboard.sort((a, b) => b.rating - a.rating);
  return leaderboard;
}

// Дни обрабатываются параллельно (Promise.all), а не по очереди —
// иначе один "зависший" офлайн день (ожидание ack от .set()) держал
// бы весь цикл и остальные дни не пересчитывались бы вообще.
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
        const byExercise = computeDayRepsByExercise(exercisesList);
        await saveWithOfflineFallback(
          saveDayRating(userId, dateKey, rating, byExercise),
          {
            onBackgroundError: error =>
              console.error(`Рейтинг за ${dateKey} не принят сервером:`, error),
          },
        );
      } catch (error) {
        console.error(`Ошибка пересчёта рейтинга за ${dateKey}:`, error);
      }
    }),
  );
}