import colors from '../theme/colors';

// Пороговые значения для подсветки числа повторений в блоке "Мои
// упражнения" (Статистика). По тому же принципу, что и STATUS_COLORS
// в constants/dayStatus.js: цвета берутся из theme/colors.js, а сама
// логика (что чем подсвечивать) живёт здесь — colors.js остаётся
// просто списком значений, без функций.
//
// Смысл: сколько В СРЕДНЕМ повторений упражнения приходится на один
// день за выбранный период (сумма / число дней) — чтобы сравнение
// было честным что за "День", что за "Год".
//   меньше REPS_PER_DAY_LOW              → мало, красный
//   от REPS_PER_DAY_LOW до REPS_PER_DAY_HIGH (не включительно) → средне, жёлтый
//   REPS_PER_DAY_HIGH и больше            → хорошо, зелёный
export const REPS_PER_DAY_LOW = 100;
export const REPS_PER_DAY_HIGH = 300;

export function getRepsIntensityColor(repsPerDay) {
  if (repsPerDay < REPS_PER_DAY_LOW) {
    return colors.danger;
  }
  if (repsPerDay < REPS_PER_DAY_HIGH) {
    return colors.warning;
  }
  return colors.success;
}