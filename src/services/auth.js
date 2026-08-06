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

export async function sendPasswordReset(email) {
  await auth().sendPasswordResetEmail(email);
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

// Коды ошибок, которые однозначно означают "этого пользователя больше
// не существует" (аккаунт удалили — с этого же устройства или с
// другого). Отличаем их от обычных сетевых сбоев (auth/network-request-
// failed и т.п.) специально: разлогинивать пользователя из-за того,
// что у него на секунду пропал интернет, было бы неправильно — тогда
// разлогин случился бы у любого, кто открыл приложение в метро.
const ACCOUNT_GONE_ERROR_CODES = [
  'auth/user-not-found',
  'auth/user-disabled',
  'auth/user-token-expired',
  'auth/invalid-user-token',
];

// Спрашивает у сервера Firebase "этот пользователь всё ещё существует?"
// и, если аккаунт уже удалён (например, с другого устройства), сразу
// разлогинивает локально — вместо того чтобы молча ждать, пока
// закэшированный токен сам не истечёт (до часа). Вызывается при каждом
// возврате приложения на передний план (см. App.js), а не только раз в
// час — так "экран-призрак" с удалённым аккаунтом не провисит долго.
export async function verifyCurrentUserStillExists() {
  const user = auth().currentUser;
  if (!user) {
    return;
  }
  try {
    await user.reload();
  } catch (error) {
    if (ACCOUNT_GONE_ERROR_CODES.includes(error.code)) {
      await auth().signOut();
    }
    // Любые другие ошибки (например, нет интернета прямо сейчас) —
    // намеренно игнорируем, проверим ещё раз в следующий раз.
  }
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
    case 'auth/password-does-not-meet-requirements':
      return 'Минимум 8 символов, содержит заглавные и строчные буквы, цифры';
    default:
      return 'Ошибка: ' + (error ? error.message : 'неизвестная');
  }
}