export function getDateKey(date) {
  return date.toISOString().split('T')[0];
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
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  return getDateKey(d);
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

  const start = new Date(startKey);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const endKey = getDateKey(end);

  return dateKey >= startKey && dateKey <= endKey;
}