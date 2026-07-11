import firestore from '@react-native-firebase/firestore';

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
  const doc = await workoutsCollection(userId).doc(dateKey).get();
  return doc.exists ? doc.data() : null;
}

export async function getDayEntries(userId, dateKey) {
  const snapshot = await entriesCollection(userId, dateKey).get();
  return snapshot.docs.map(doc => ({
    exercise: doc.id,
    reps: doc.data().reps,
  }));
}

export async function saveExercisesForDate(userId, dateKey, exercisesList) {
  const existingSnapshot = await entriesCollection(userId, dateKey).get();
  const newNames = exercisesList.map(item => item.exercise);

  const batch = firestore().batch();

  existingSnapshot.docs.forEach(doc => {
    if (!newNames.includes(doc.id)) {
      batch.delete(doc.ref);
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

  await batch.commit();
}

export async function setStatusForDate(userId, dateKey, status) {
  const existingSnapshot = await entriesCollection(userId, dateKey).get();
  const batch = firestore().batch();

  existingSnapshot.docs.forEach(doc => batch.delete(doc.ref));

  batch.set(workoutsCollection(userId).doc(dateKey), {
    date: dateKey,
    status,
    hasExercises: false,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();
}

export async function clearDay(userId, dateKey) {
  const existingSnapshot = await entriesCollection(userId, dateKey).get();
  const batch = firestore().batch();

  existingSnapshot.docs.forEach(doc => batch.delete(doc.ref));
  batch.delete(workoutsCollection(userId).doc(dateKey));

  await batch.commit();
}