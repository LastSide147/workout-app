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
  workout: '#4CAF50',
  [DAY_STATUS.SKIPPED]: '#FF9800',
  [DAY_STATUS.WEEKEND]: '#9E9E9E',
  [DAY_STATUS.INJURY]: '#e53935',
};