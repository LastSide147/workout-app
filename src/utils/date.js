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