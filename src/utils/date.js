// Строит ключ даты вида "YYYY-MM-DD" из объекта Date — по ЛОКАЛЬНОМУ
// времени пользователя, а не по UTC. Раньше здесь стоял
// date.toISOString(), который переводит момент времени в UTC перед
// тем, как отрезать дату. Из-за этого для пользователей восточнее
// Гринвича (Москва и похожие пояса) первые ~3 часа суток по местному
// времени ISO-строка ещё показывала UTC-время предыдущих суток — и
// такой ключ получался "вчерашним", хотя по часам пользователя уже
// наступил новый день. Тренировка в это время уходила не в тот день
// и "терялась" в статистике. Теперь ключ строится из локальных
// getFullYear/getMonth/getDate — так же, как пользователь видит дату
// на экране телефона.
export function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Обратная операция — превращает ключ "YYYY-MM-DD" в объект Date,
// тоже по местной полуночи. Простое new Date("2026-07-25") для этого
// НЕ годится: JS разбирает дату-без-времени как UTC-полночь, и в
// часовых поясах западнее UTC при обратном переводе в локальное время
// дата "съезжает" на день назад. Разбираем компоненты вручную и
// собираем дату через new Date(year, monthIndex, day) — конструктор с
// отдельными числами всегда работает в локальном времени.
export function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateDisplay(dateKey) {
  const [year, month, day] = dateKey.split('-');
  return `${day}.${month}.${year}`;
}

// Понедельник текущей недели в виде ключа даты
export function getStartOfWeekKey(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return getDateKey(d);
}

// Первое число текущего месяца в виде ключа даты
export function getStartOfMonthKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

// Входит ли dateKey в текущую неделю (понедельник–воскресенье)?
// Нужно, чтобы ограничить редактирование в "Истории" только текущей
// неделей — если пользователь забыл заполнить данные, он может
// дополнить их до конца недели, но не вернуться к прошлым неделям
// или месяцам.
//
// Ключи дат в формате YYYY-MM-DD можно сравнивать как обычные строки
// (лексикографическое сравнение совпадает с хронологическим), поэтому
// отдельная конвертация в Date для самого сравнения не нужна.
export function isWithinCurrentWeek(dateKey) {
  const startKey = getStartOfWeekKey(new Date());

  const start = parseDateKey(startKey);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const endKey = getDateKey(end);

  return dateKey >= startKey && dateKey <= endKey;
}
// Самая ранняя дата, доступная в календаре "Истории". Раньше июня
// 2026 приложение статистику не ведёт, поэтому листать календарь назад
// дальше этой даты незачем — там заведомо нет и не будет данных.
export const HISTORY_MIN_DATE_KEY = '2026-06-01';

// Самая поздняя дата, доступная в календаре "Истории" — 31 декабря
// ТЕКУЩЕГО года. Функция, а не константа: год берётся из реального
// "сейчас" при каждом вызове, поэтому 1 января следующего года
// ограничение само сдвинется на год вперёд, без правок кода.
export function getHistoryMaxDateKey() {
  const currentYear = new Date().getFullYear();
  return getDateKey(new Date(currentYear, 11, 31));
}