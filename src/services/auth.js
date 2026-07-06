import auth from '@react-native-firebase/auth';

// Подписка на изменение состояния входа (вход/выход).
// Используется в App.js, чтобы решить — показывать форму логина или само приложение.
export function subscribeToAuthState(callback) {
  return auth().onAuthStateChanged(callback);
}

export async function registerWithEmail(email, password) {
  const result = await auth().createUserWithEmailAndPassword(email, password);
  await result.user.sendEmailVerification();
  return result.user;
}

export async function loginWithEmail(email, password) {
  const result = await auth().signInWithEmailAndPassword(email, password);
  return result.user;
}

export async function resendVerificationEmail() {
  const user = auth().currentUser;
  if (user) {
    await user.sendEmailVerification();
  }
}

// Firebase не обновляет emailVerified автоматически — нужно явно
// перезапросить данные пользователя с сервера через reload()
export async function reloadCurrentUser() {
  const user = auth().currentUser;
  if (user) {
    await user.reload();
  }
  return auth().currentUser;
}

export async function logout() {
  await auth().signOut();
}

// Переводит технические коды ошибок Firebase в понятный текст на русском
export function getAuthErrorMessage(error) {
  const code = error && error.code;
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Этот email уже зарегистрирован';
    case 'auth/invalid-email':
      return 'Некорректный email';
    case 'auth/weak-password':
      return 'Пароль слишком простой (минимум 6 символов)';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Неверный email или пароль';
    default:
      return 'Ошибка: ' + (error ? error.message : 'неизвестная');
  }
}