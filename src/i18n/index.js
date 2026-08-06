// Инициализация локализации — импортируется ОДИН РАЗ в App.js (как
// побочный эффект, без использования результата) до отрисовки чего
// бы то ни было. i18next после этого работает как глобальный синглтон
// — компоненты получают функцию перевода через хук useTranslation(),
// им ничего заново настраивать не нужно.
import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import * as Localization from 'expo-localization';
import ru from './locales/ru.json';
import en from './locales/en.json';

const resources = {
  ru: {translation: ru},
  en: {translation: en},
};

// getLocales()[0] — язык, который стоит первым в настройках устройства
// пользователя. languageCode — двухбуквенный код ("ru", "en", "fr"...).
// Поддерживаем сейчас только русский и английский — если на устройстве
// стоит любой третий язык (французский, немецкий и т.д.), используем
// русский как запасной вариант по умолчанию.
const deviceLanguageCode = Localization.getLocales()[0]?.languageCode;
const initialLanguage = resources[deviceLanguageCode] ? deviceLanguageCode : 'ru';

i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  // Если для какого-то ключа забудут добавить перевод при добавлении
  // новой фичи — вместо пустоты или ошибки покажется русский текст,
  // а не сломанный экран.
  fallbackLng: 'ru',
  interpolation: {escapeValue: false}, // React сам экранирует текст, i18next делать это ещё раз не должен
});

export default i18n;