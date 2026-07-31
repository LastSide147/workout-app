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

  initializeAppCheck(getApp(), {
    provider,
    isTokenAutoRefreshEnabled: true,
  }).catch(error => {
    console.error('Ошибка инициализации App Check:', error);
  });
}