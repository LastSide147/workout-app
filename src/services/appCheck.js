import {getApp} from '@react-native-firebase/app';
import {initializeAppCheck, ReactNativeFirebaseAppCheckProvider} from '@react-native-firebase/app-check';

// App Check подтверждает Firebase, что запросы к Firestore идут из настоящего
// приложения, а не от постороннего скрипта с вашим Firebase-ключом (сам ключ
// из google-services.json не секретный — см. SECURITY-CHECKLIST.md, пункт 4,
// но без App Check его теоретически можно использовать в обход приложения).
//
// Провайдер 'debug' — временный, для тестовых (preview) сборок, которые вы
// устанавливаете вручную, не через Google Play. Play Integrity (боевой
// провайдер) умеет подтверждать только приложения, установленные из Play —
// когда опубликуете приложение туда (даже в закрытое тестирование), нужно
// будет заменить 'debug' на 'playIntegrity' здесь, для production-сборок.
//
// ВАЖНО: теперь initAppCheck() ВОЗВРАЩАЕТ Promise (раньше просто
// "запускал и забывал"). Это стало критично с тех пор, как в Firestore
// включили Enforce: запрос без готового токена App Check отклоняется
// той же ошибкой [firestore/permission-denied], что и настоящий запрет
// в Security Rules — снаружи не отличить. Раньше App.js не ждал этот
// Promise и сразу показывал экраны, которые тут же лезли в Firestore —
// получалась гонка (см. подробности в App.js, там же и дожидаемся
// этого Promise перед показом чего-либо, кроме спиннера).
export function initAppCheck() {
  const provider = new ReactNativeFirebaseAppCheckProvider();
  provider.configure({
    android: {
      provider: 'debug',
      // Токен подставляется из eas.json (см. ниже) — не хардкодим его прямо
      // в коде, чтобы не гонять один и тот же секрет по репозиторию открытым
      // текстом (не критично, но так чище).
      debugToken: process.env.EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN,
    },
  });

  return initializeAppCheck(getApp(), {
    provider,
    isTokenAutoRefreshEnabled: true,
  }).catch(error => {
    // Логируем, но НЕ пробрасываем ошибку дальше — если App Check по
    // какой-то причине не инициализировался, приложение всё равно
    // должно продолжить запуск, а не зависнуть на спиннере навсегда.
    // Firestore в этом случае сам отклонит запросы (раз Enforce
    // включён) — это будет понятная ошибка на конкретном действии, а
    // не бесконечная "Загрузка...".
    console.error('Ошибка инициализации App Check:', error);
  });
}