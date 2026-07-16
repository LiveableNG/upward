export type SavingsGoalType = 'rent' | 'home'

export const MAX_SAVINGS_GOALS = 2

export const SAVINGS_GOAL_TYPES: Record<
  SavingsGoalType,
  { label: string; name: string; category: SavingsGoalType }
> = {
  rent: {
    label: 'Save toward rent',
    name: 'Save toward rent',
    category: 'rent',
  },
  home: {
    label: 'Save towards a home',
    name: 'Save towards a home',
    category: 'home',
  },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function resolveGoalType(goal: any): SavingsGoalType | null {
  const raw = String(goal?.type || goal?.category || goal?.name || '').toLowerCase()
  if (raw.includes('home')) return 'home'
  if (raw.includes('rent')) return 'rent'
  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeSavingsGoal(goal: any, index: number) {
  const resolvedType = resolveGoalType(goal)
  const goalType: SavingsGoalType =
    resolvedType ?? (index === 0 ? 'rent' : 'home')
  const fallback = SAVINGS_GOAL_TYPES[goalType]
  const name = goal.name || goal.title || fallback.name
  const target = goal.targetAmount ?? goal.target_amount ?? goal.goalAmount ?? 0
  const current = goal.currentAmount ?? goal.current_amount ?? goal.balance ?? goal.saved ?? 0
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  const isHome = goalType === 'home'

  return {
    id: goal.uuid || goal.id || String(index),
    name,
    target,
    current,
    pct,
    isHome,
    goalType,
    autoSave: !!(goal.autoSaveEnabled ?? goal.auto_save_enabled),
    endDate: goal.endDate ?? goal.end_date ?? '',
    reminderEnabled: goal.reminderEnabled ?? goal.reminder_enabled ?? true,
    reminderFrequency: goal.reminderFrequency ?? goal.reminder_frequency ?? 'MONTHLY',
    reminderDay: goal.reminderDay ?? goal.reminder_day ?? 27,
    autoSaveEnabled: goal.autoSaveEnabled ?? goal.auto_save_enabled ?? true,
    startDate: goal.startDate ?? goal.start_date ?? new Date().toISOString().split('T')[0],
    raw: goal,
  }
}

export function setGoalPath(type?: SavingsGoalType) {
  return type ? `/dashboard/savings/set-goal?type=${type}` : '/dashboard/savings/set-goal'
}
