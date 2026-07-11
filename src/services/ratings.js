import firestore from '@react-native-firebase/firestore';
import {getCurrentUser} from './firebase';
import {getDayEntries} from './workoutDays';

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
export async function fetchLeaderboard(startDateKey, endDateKey) {
  const snapshot = await firestore()
    .collectionGroup('days')
    .where('date', '>=', startDateKey)
    .where('date', '<=', endDateKey)
    .get();

  const totalsByUser = {};
  snapshot.docs.forEach(doc => {
    const userId = doc.ref.parent.parent.id;
    const rating = doc.data().rating || 0;
    totalsByUser[userId] = (totalsByUser[userId] || 0) + rating;
  });

  const userIds = Object.keys(totalsByUser);
  if (userIds.length === 0) {
    return [];
  }

  const profiles = await Promise.all(
    userIds.map(userId => profileDoc(userId).get()),
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

// Пересчитывает рейтинг по ВСЕМ дням пользователя с текущими
// коэффициентами упражнений и перезаписывает устаревшие значения.
// Вызывается при открытии экрана истории.
export async function recalculateAllRatings(userId, days, exerciseCoefficients) {
  const dateKeysWithWorkout = Object.keys(days).filter(
    dateKey => days[dateKey].hasExercises,
  );

  for (const dateKey of dateKeysWithWorkout) {
    try {
      const entries = await getDayEntries(userId, dateKey);
      const exercisesList = entries.map(item => ({
        exercise: item.exercise,
        reps: item.reps,
      }));
      const rating = computeDayRating(exercisesList, exerciseCoefficients);
      await saveDayRating(userId, dateKey, rating);
    } catch (error) {
      console.error(`Ошибка пересчёта рейтинга за ${dateKey}:`, error);
    }
  }
}