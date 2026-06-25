export const SAVE_FOR_RENT_TIMELINES = [
  'In 1-3 months',
  'In 3-6 months',
  'In 6-12 months',
  'In 12+ months',
] as const

export const SAVE_FOR_RENT_BUDGETS = [
  'Under ₦500,000',
  '₦500,000 - ₦1,000,000',
  '₦1,000,000 - ₦2,500,000',
  '₦2,500,000+',
] as const

export type SaveForRentTimeline = (typeof SAVE_FOR_RENT_TIMELINES)[number]
export type SaveForRentBudget = (typeof SAVE_FOR_RENT_BUDGETS)[number]
