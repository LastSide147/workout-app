import colors from '../theme/colors';

export const DAY_STATUS = {
  SKIPPED: 'skipped',
  WEEKEND: 'weekend',
  INJURY: 'injury',
};

export const STATUS_LABELS = {
  [DAY_STATUS.SKIPPED]: 'Пропустил',
  [DAY_STATUS.WEEKEND]: 'Выходной',
  [DAY_STATUS.INJURY]: 'Травма/восстановление',
};

export const STATUS_COLORS = {
  workout: colors.success,
  [DAY_STATUS.SKIPPED]: colors.warning,
  [DAY_STATUS.WEEKEND]: colors.statusWeekend,
  [DAY_STATUS.INJURY]: colors.danger,
};
