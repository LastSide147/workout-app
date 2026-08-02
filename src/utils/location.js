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

// Название страны по коду — нужно, чтобы после перезахода в профиль
// показать на кнопке "Россия", а не хранившийся код "RU".
export function getCountryLabel(countryCode) {
  const found = countries.find(country => country.code === countryCode);
  return found ? found.nameRu : null;
}
