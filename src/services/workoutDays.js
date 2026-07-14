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

// Сохраняет ОДНО упражнение сразу, как только пользователь подтвердил
// его галочкой — отдельной кнопки "Сохранить тренировку" больше нет.
// День помечается как "есть тренировка", статус (выходной/пропуск/
// травма) сбрасывается, раз в этот день появилось упражнение.
export async function setExerciseEntry(userId, dateKey, exerciseName, reps) {
  const batch = firestore().batch();

  batch.set(entriesCollection(userId, dateKey).doc(exerciseName), {
    reps,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });

  batch.set(workoutsCollection(userId).doc(dateKey), {
    date: dateKey,
    status: null,
    hasExercises: true,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });

  return batch.commit();
}

// Удаляет ОДНО упражнение сразу (крестик у уже добавленного
// упражнения). hasRemainingExercises передаётся с экрана — true, если
// после удаления в этот день остаются другие упражнения.
export async function deleteExerciseEntry(
  userId,
  dateKey,
  exerciseName,
  hasRemainingExercises,
) {
  const batch = firestore().batch();

  batch.delete(entriesCollection(userId, dateKey).doc(exerciseName));

  batch.set(workoutsCollection(userId).doc(dateKey), {
    date: dateKey,
    status: null,
    hasExercises: hasRemainingExercises,
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