import countries from '../constants/countries';
import cities from '../constants/cities';

// Страны, доступные для выбора в профиле ПРЯМО СЕЙЧАС. Не весь список
// из countries.js (там 250+ стран мира), а только те, для которых в
// cities.js есть настоящий список городов, а не одна столица —
// иначе поле "Город" открывалось бы, а выбрать в нём можно было бы
// только один вариант, что бессмысленно.
//
// ВАЖНО ДЛЯ БУДУЩИХ ПРАВОК: чтобы добавить ещё одну страну целиком —
// 1) допишите её города в src/constants/cities.js форматом
// {name, countryCode}, 2) добавьте её код сюда. Экран профиля и
// компонент пикера трогать не нужно — оба сами подхватят новую страну
// и её города через функции ниже.
const ENABLED_COUNTRY_CODES = ['RU'];

// Список для поля "Страна" — {value: код ISO2, label: название по-русски}.
// Формат {value, label} — то, что ожидает SearchableListPickerModal.
export function getCountryOptions() {
  return countries
    .filter(country => ENABLED_COUNTRY_CODES.includes(country.code))
    .map(country => ({value: country.code, label: country.nameRu}));
}

// Список для поля "Город" — только города выбранной страны. value и
// label здесь совпадают: отдельного кода города не заводим (в отличие
// от страны, у которой есть международный ISO-код), само название —
// уже достаточно уникальный и человекочитаемый идентификатор (см.
// комментарий про Железногорск в cities.js).
export function getCityOptions(countryCode) {
  if (!countryCode) {
    return [];
  }
  return cities
    .filter(city => city.countryCode === countryCode)
    .map(city => ({value: city.name, label: city.name}));
}

// Выбирает нужное поле названия страны по языку — 'en' → nameEn, любое
// другое значение (в том числе не переданное) → nameRu. Запасной вариант
// — русский, чтобы старые вызовы без языка (профиль, пока не
// локализован) продолжали работать точно как раньше.
function pickCountryName(country, language) {
  return language === 'en' ? country.nameEn : country.nameRu;
}

// Название страны по коду — нужно, чтобы после перезахода показать
// "Russia"/"Россия", а не хранившийся код "RU". language необязателен
// — старые вызовы (профиль) без него получат русский, как и раньше.
export function getCountryLabel(countryCode, language = 'ru') {
  const found = countries.find(country => country.code === countryCode);
  return found ? pickCountryName(found, language) : null;
}

// Полный список стран — для экрана регистрации/входа, где нужно
// просто узнать, какую страну указал пользователь (в отличие от
// getCountryOptions() выше, тут нет фильтра по ENABLED_COUNTRY_CODES).
// language — тот же принцип, что и в getCountryLabel выше.
export function getAllCountryOptions(language = 'ru') {
  return countries.map(country => ({
    value: country.code,
    label: pickCountryName(country, language),
  }));
}
