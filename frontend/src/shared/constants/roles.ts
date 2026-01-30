export const ROLES = {
  TOP: 'TOP',
  JGL: 'JGL',
  MID: 'MID',
  ADC: 'ADC',
  SUP: 'SUP',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  TOP: 'Top Lane',
  JGL: 'Jungle',
  MID: 'Mid Lane',
  ADC: 'ADC',
  SUP: 'Support',
};

export const ROLE_COLORS: Record<Role, string> = {
  TOP: '#FF6B6B',      // Red
  JGL: '#4ECDC4',      // Teal
  MID: '#FFE66D',      // Yellow
  ADC: '#95E1D3',      // Mint
  SUP: '#C7CEEA',      // Lavender
};

export const ROLE_ICONS: Record<Role, string> = {
  TOP: '🗡️',
  JGL: '🐯',
  MID: '🔮',
  ADC: '🏹',
  SUP: '🛡️',
};

export const DRAFT_PHASES = {
  BAN_1: 'BAN_1',
  BAN_2: 'BAN_2',
  BAN_3: 'BAN_3',
  PICK_1: 'PICK_1',
  PICK_2: 'PICK_2',
  PICK_3: 'PICK_3',
  PICK_4: 'PICK_4',
  PICK_5: 'PICK_5',
} as const;

export const TIME_PERIODS = {
  LAST_WEEK: 'LAST_WEEK',
  LAST_MONTH: 'LAST_MONTH',
  LAST_3_MONTHS: 'LAST_3_MONTHS',
  LAST_6_MONTHS: 'LAST_6_MONTHS',
  LAST_YEAR: 'LAST_YEAR',
} as const;

export type TimePeriod = typeof TIME_PERIODS[keyof typeof TIME_PERIODS];

export const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  LAST_WEEK: 'Last 7 Days',
  LAST_MONTH: 'Last 30 Days',
  LAST_3_MONTHS: 'Last 3 Months',
  LAST_6_MONTHS: 'Last 6 Months',
  LAST_YEAR: 'Last Year',
};
