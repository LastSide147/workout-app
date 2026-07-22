import colors from '../theme/colors';

// Пороговые значения для подсветки числа повторений в блоке "Мои
// упражнения" (Статистика), только для периода "День". 4 ступени:
//   0–100      → красный
//   100–200    → оранжевый
//   200–300    → жёлтый
//   300 и выше → зелёный
export const REPS_LOW = 100;
export const REPS_MEDIUM = 200;
export const REPS_HIGH = 300;

export function getRepsIntensityColor(reps) {
  if (reps < REPS_LOW) {
    return colors.warning;
  }
  if (reps < REPS_MEDIUM) {
    return colors.intensityOrange;
  }
  if (reps < REPS_HIGH) {
    return colors.intensityYellow;
  }
  return colors.success;
}