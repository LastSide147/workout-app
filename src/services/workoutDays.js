import firestore from '@react-native-firebase/firestore';

function workoutsCollection(userId) {
  return firestore().collection('users').doc(userId).collection('workouts');
}

// Подписка на все дни сразу — используется в календаре
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

export async function saveExercisesForDate(userId, dateKey, exercisesList) {
  await workoutsCollection(userId)
    .doc(dateKey)
    .set({
      date: dateKey,
      exercises: exercisesList,
      status: null,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
}

export async function setStatusForDate(userId, dateKey, status) {
  await workoutsCollection(userId)
    .doc(dateKey)
    .set({
      date: dateKey,
      exercises: [],
      status,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
}

export async function clearDay(userId, dateKey) {
  await workoutsCollection(userId).doc(dateKey).delete();
}