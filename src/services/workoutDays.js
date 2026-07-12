import firestore from '@react-native-firebase/firestore';
import {getWithOfflineFallback} from './offlineSync';

function workoutsCollection(userId) {
  return firestore().collection('users').doc(userId).collection('workouts');
}

function entriesCollection(userId, dateKey) {
  return workoutsCollection(userId).doc(dateKey).collection('entries');
}

export function subscribeToWorkoutDays(userId, onData) {
  return workoutsCollection(userId).onSnapshot(snapshot => {
    const days = {};
    snapshot.docs.forEach(doc => {
      days[doc.id] = doc.data();
    });
    onData(days);
  });
}

export async function getDay(userId, dateKey) {
  const doc = await getWithOfflineFallback(workoutsCollection(userId).doc(dateKey));
  return doc.exists ? doc.data() : null;
}

export async function getDayEntries(userId, dateKey) {
  const snapshot = await getWithOfflineFallback(entriesCollection(userId, dateKey));
  return snapshot.docs.map(doc => ({
    exercise: doc.id,
    reps: doc.data().reps,
  }));
}

// ВАЖНО: previousExerciseNames передаётся с экрана (то, что уже было
// загружено при открытии дня), а не читается заново через .get().
// Раньше здесь был запрос entriesCollection(...).get() перед каждой
// записью — именно на нём кнопка "Сохранить" зависала офлайн: SDK
// ждал ответа сервера, чтобы узнать, какие упражнения уже есть в
// базе, и только потом формировал batch на удаление/запись. Теперь
// это сравнение делается на клиенте, батч собирается мгновенно и
// уходит в локальный кэш Firestore без единого сетевого чтения.
export async function saveExercisesForDate(
  userId,
  dateKey,
  exercisesList,
  previousExerciseNames = [],
) {
  const newNames = exercisesList.map(item => item.exercise);
  const batch = firestore().batch();

  previousExerciseNames.forEach(name => {
    if (!newNames.includes(name)) {
      batch.delete(entriesCollection(userId, dateKey).doc(name));
    }
  });

  exercisesList.forEach(item => {
    batch.set(entriesCollection(userId, dateKey).doc(item.exercise), {
      reps: item.reps,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  });

  batch.set(workoutsCollection(userId).doc(dateKey), {
    date: dateKey,
    status: null,
    hasExercises: exercisesList.length > 0,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });

  return batch.commit();
}

export async function setStatusForDate(
  userId,
  dateKey,
  status,
  previousExerciseNames = [],
) {
  const batch = firestore().batch();

  previousExerciseNames.forEach(name =>
    batch.delete(entriesCollection(userId, dateKey).doc(name)),
  );

  batch.set(workoutsCollection(userId).doc(dateKey), {
    date: dateKey,
    status,
    hasExercises: false,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });

  return batch.commit();
}

export async function clearDay(userId, dateKey, previousExerciseNames = []) {
  const batch = firestore().batch();

  previousExerciseNames.forEach(name =>
    batch.delete(entriesCollection(userId, dateKey).doc(name)),
  );
  batch.delete(workoutsCollection(userId).doc(dateKey));

  return batch.commit();
}