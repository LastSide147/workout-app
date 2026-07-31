import crashlytics from '@react-native-firebase/crashlytics';

// Firebase Crashlytics — сбор ошибок и крэшей с реальных устройств
// пользователей, видно в Firebase Console -> Crashlytics практически
// сразу после того, как ошибка произошла (не нужно, чтобы пользователь
// сам вам её описал).
//
// Вызывается один раз при старте приложения (см. App.js), аналогично
// initAppCheck().
export function initCrashlytics() {
  // По умолчанию сбор может быть выключен для debug-сборок — включаем
  // явно, чтобы ловить ошибки и на preview-сборках, которыми тестируете.
  crashlytics()
    .setCrashlyticsCollectionEnabled(true)
    .catch(error => console.error('Не удалось включить Crashlytics:', error));

  // Перехватываем console.error — в проекте уже 33 места, где ошибки
  // просто печатаются в консоль телефона и никто их не видит (кроме
  // как через USB-кабель). Подменяем функцию так, чтобы КАЖДЫЙ такой
  // вызов (существующий и будущий) ещё и улетал в Crashlytics —
  // переписывать все 33 места по отдельности не нужно.
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // Сначала — как раньше, ничего не теряем в обычном логе телефона.
    originalConsoleError(...args);

    try {
      // Если среди аргументов есть настоящий Error — отправляем его
      // (тогда в Crashlytics будет полный stack trace). Если ошибки
      // как объекта нет (например, console.error('просто текст')) —
      // собираем текст всех аргументов в одно сообщение.
      const errorArg = args.find(arg => arg instanceof Error);
      const message = args
        .map(arg => (arg instanceof Error ? arg.message : String(arg)))
        .join(' ');
      crashlytics().recordError(errorArg || new Error(message));
    } catch (loggingError) {
      originalConsoleError('Ошибка логирования в Crashlytics:', loggingError);
    }
  };

  // ErrorUtils — встроенный глобальный объект React Native (без
  // импорта), ловит ошибки, которые иначе привели бы к вылету
  // приложения без каких-либо ваших console.error вообще.
  const defaultHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    crashlytics().recordError(error);
    defaultHandler(error, isFatal);
  });
}

// Привязывает ошибки в Crashlytics к конкретному пользователю (его
// uid, не email — email это персональные данные, uid безопаснее) —
// удобно, когда конкретный человек напишет "у меня не работает",
// сможете найти именно его ошибки в консоли.
export function setCrashlyticsUser(userId) {
  crashlytics()
    .setUserId(userId || '')
    .catch(error => console.error('Не удалось выставить userId в Crashlytics:', error));
}