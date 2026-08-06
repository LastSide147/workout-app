// Полное удаление аккаунта пользователя: сначала данные из Firestore,
// потом сам аккаунт в Firebase Auth. Порядок важен — если сначала
// удалить Auth-пользователя, он потеряет доступ и не сможет удалить
// свои же документы в Firestore (Security Rules это не пропустят).
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// ВАЖНО: Firebase требует "свежий" вход перед таким чувствительным
// действием, как удаление аккаунта — иначе кинет ошибку
// auth/requires-recent-login. Поэтому просим пароль ещё раз и
// повторно логинимся прямо перед удалением.
async function reauthenticate(password) {
  const user = auth().currentUser;
  if (!user || !user.email) {
    throw new Error('Пользователь не авторизован');
  }
  const credential = auth.EmailAuthProvider.credential(user.email, password);
  await user.reauthenticateWithCredential(credential);
  return user;
}

// Удаляет поддокументы коллекции (например, ratings/{uid}/days/*).
// Firestore не умеет удалять субколлекцию одним вызовом — нужно
// сначала получить список документов, потом удалить каждый.
async function deleteSubcollection(parentRef, subcollectionName) {
  const snapshot = await parentRef.collection(subcollectionName).get();
  const batch = firestore().batch();
  snapshot.forEach(doc => batch.delete(doc.ref));
  if (!snapshot.empty) {
    await batch.commit();
  }
}

export async function deleteAccountAndData(password) {
  const user = await reauthenticate(password);
  const uid = user.uid;
  const usersDocRef = firestore().collection('users').doc(uid);

  // 1. users/{uid}/workouts/{dateKey}/entries/{exerciseId} — сначала
  // получаем список дней (пока не удаляя), для каждого дня удаляем
  // entries внутри, и только потом — сами документы дней.
  const workoutsSnapshot = await usersDocRef.collection('workouts').get();
  for (const workoutDoc of workoutsSnapshot.docs) {
    await deleteSubcollection(workoutDoc.ref, 'entries');
  }
  await deleteSubcollection(usersDocRef, 'workouts');

  // 2. users/{uid}/selectedExercises/*
  await deleteSubcollection(usersDocRef, 'selectedExercises');

  // 3. users/{uid}/weeklyBonuses/*
  await deleteSubcollection(usersDocRef, 'weeklyBonuses');

  // 4. ratings/{uid}/days/{date} — родительского документа ratings/{uid}
  // как отдельной сущности не существует, есть только эта субколлекция.
  await deleteSubcollection(firestore().collection('ratings').doc(uid), 'days');

  // 5. profiles/{uid}
  await firestore().collection('profiles').doc(uid).delete();

  // 6. leaderboardTotals/{period}/users/{uid} — периодов может быть
  // несколько (неделя/месяц/всё время и т.п.), заранее не знаем сколько,
  // поэтому сначала получаем список всех period-документов.
  const periodsSnapshot = await firestore().collection('leaderboardTotals').get();
  const leaderboardBatch = firestore().batch();
  periodsSnapshot.forEach(periodDoc => {
    leaderboardBatch.delete(periodDoc.ref.collection('users').doc(uid));
  });
  if (!periodsSnapshot.empty) {
    await leaderboardBatch.commit();
  }

  // 7. users/{uid} — сам корневой документ, последним из Firestore
  await usersDocRef.delete();

  // 8. Сам аккаунт в Firebase Auth — теперь можно, все данные уже удалены
  await user.delete();
}