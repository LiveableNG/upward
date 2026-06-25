export const SAVE_FOR_HOME_TIMELINES = [
  '3 years',
  '5 years',
  '7 years',
  '10 years',
] as const

export const SAVE_FOR_HOME_BUDGETS = [
  '50M - 80M',
  '80M - 120M',
  '120M - 160M',
  'Above 160M',
] as const

export type SaveForHomeTimeline = (typeof SAVE_FOR_HOME_TIMELINES)[number]
export type SaveForHomeBudget = (typeof SAVE_FOR_HOME_BUDGETS)[number]
