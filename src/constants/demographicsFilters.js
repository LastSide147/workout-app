// Фильтр по возрасту/весу в Статистике — ОТНОСИТЕЛЬНЫЙ, а не абсолютный.
// Пользователь не выбирает диапазон вручную (типа "26-35 лет") — он
// выбирает ДОПУСК ("±10 лет", "±10 кг"), а сам диапазон каждый раз
// считается от ЕГО СОБСТВЕННОГО возраста/веса, указанного в профиле.
// Например: у пользователя вес 70 кг, выбрал "±10 кг" — увидит
// соперников с весом от 60 до 80 кг. У другого пользователя с весом
// 90 кг тот же выбор "±10 кг" покажет диапазон 80-100 — граница всегда
// своя, потому что она считается от СВОЕГО значения, а не общая для
// всех, как было раньше с фиксированными диапазонами.
//
// Шаг 0 — отдельный случай: не "±0 лет/кг" (звучит странно), а точное
// совпадение — показывает только тех, у кого возраст/вес СОВПАДАЕТ с
// твоим один в один. Технически это тот же допуск, только равный нулю
// (Math.abs(их - мой) <= 0 в fetchLeaderboard), отдельной ветки кода
// под это заводить не пришлось.
//
// ВАЖНО ДЛЯ БУДУЩИХ ПРАВОК: чтобы добавить/убрать шаг допуска (кроме
// текущих "точно"/±5/±10/±15/±20 лет и "точно"/±5/±10/±15/±20/±25/±35 кг)
// — меняешь ТОЛЬКО массивы AGE_TOLERANCE_STEPS / WEIGHT_TOLERANCE_STEPS
// ниже. Список для выпадающего меню считается из них автоматически.
const AGE_TOLERANCE_STEPS = [0, 5, 10, 15, 20];
const WEIGHT_TOLERANCE_STEPS = [0, 5, 10, 15, 20, 25, 35];

export const ALL_AGES_OPTION = 'Без ограничений';
export const ALL_WEIGHTS_OPTION = 'Без ограничений';

// Экспортируется — StatisticsScreen подменяет эту подпись на реальное
// число ("29" вместо "Точно как у меня") при отображении, зная
// собственный возраст/вес смотрящего. Внутреннее ЗНАЧЕНИЕ выбора
// (то, что хранится в состоянии фильтра и участвует в поиске по
// getAgeToleranceYears/getWeightToleranceKg ниже) при этом не меняется
// — подменяется только то, что видно на экране.
export const EXACT_MATCH_LABEL = 'Точно как у меня';

function ageToleranceLabel(step) {
  return step === 0 ? EXACT_MATCH_LABEL : `±${step} лет`;
}

function weightToleranceLabel(step) {
  return step === 0 ? EXACT_MATCH_LABEL : `±${step} кг`;
}

// Списки для выпадающего меню — "Без ограничений" (фильтр выключен)
// плюс подписи вида "±10 лет"/"±10 кг", посчитанные из шагов выше.
export const AGE_FILTER_OPTIONS = [ALL_AGES_OPTION, ...AGE_TOLERANCE_STEPS.map(ageToleranceLabel)];
export const WEIGHT_FILTER_OPTIONS = [
  ALL_WEIGHTS_OPTION,
  ...WEIGHT_TOLERANCE_STEPS.map(weightToleranceLabel),
];

// Достаёт число допуска обратно из выбранной подписи ("±10 лет" → 10).
// Возвращает null, если выбрано "Без ограничений" (фильтр не активен) —
// это и есть признак "фильтр выключен" для остального кода.
export function getAgeToleranceYears(selectedLabel) {
  if (!selectedLabel || selectedLabel === ALL_AGES_OPTION) {
    return null;
  }
  const step = AGE_TOLERANCE_STEPS.find(value => ageToleranceLabel(value) === selectedLabel);
  return typeof step === 'number' ? step : null;
}

export function getWeightToleranceKg(selectedLabel) {
  if (!selectedLabel || selectedLabel === ALL_WEIGHTS_OPTION) {
    return null;
  }
  const step = WEIGHT_TOLERANCE_STEPS.find(value => weightToleranceLabel(value) === selectedLabel);
  return typeof step === 'number' ? step : null;
}
