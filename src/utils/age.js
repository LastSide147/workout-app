// Возраст никогда не хранится готовым числом — только дата рождения
// (год и месяц, без дня: с точностью до месяца достаточно для
// сравнения в Статистике). Если хранить "возраст: 27" отдельным
// числом, оно устареет в день рождения пользователя, и никто не
// будет его вручную обновлять. С датой рождения возраст просто
// считается заново каждый раз от сегодняшней даты — он всегда
// актуален сам по себе, без каких-либо действий пользователя.
export function calculateAge(birthYear, birthMonth) {
  if (!birthYear || !birthMonth) {
    return null;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // getMonth() считает от 0

  let age = currentYear - birthYear;
  if (currentMonth < birthMonth) {
    age -= 1;
  }
  return age;
}

// Месяцы для выбора — только названия по-русски, без дней.
export const BIRTH_MONTHS = [
  {value: 1, label: 'Январь'},
  {value: 2, label: 'Февраль'},
  {value: 3, label: 'Март'},
  {value: 4, label: 'Апрель'},
  {value: 5, label: 'Май'},
  {value: 6, label: 'Июнь'},
  {value: 7, label: 'Июль'},
  {value: 8, label: 'Август'},
  {value: 9, label: 'Сентябрь'},
  {value: 10, label: 'Октябрь'},
  {value: 11, label: 'Ноябрь'},
  {value: 12, label: 'Декабрь'},
];

const MIN_BIRTH_YEAR = 1966;

export function getBirthYearOptions() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear - 18; year >= MIN_BIRTH_YEAR; year -= 1) {
    years.push({value: year, label: String(year)});
  }
  return years;
}
