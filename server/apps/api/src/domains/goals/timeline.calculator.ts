import { GoalTargetType, UserGoalAction } from './goal.repository'

export function computeTargetDate(startDate: Date, durationDays: number): Date {
  const target = new Date(startDate.getTime())
  target.setDate(target.getDate() + durationDays)
  return target
}

export function calculateDaysRemaining(targetDate: Date): number {
  const now = new Date()
  const diffTime = targetDate.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
}

export function formatTimelineHuman(durationDays: number): string {
  if (durationDays < 14) return `${durationDays} days`
  if (durationDays < 60) return `${Math.round(durationDays / 7)} weeks`
  if (durationDays < 330) return `${Math.round(durationDays / 30)} months`
  const years = (durationDays / 365).toFixed(1).replace('.0', '')
  return `${years} ${years === '1' ? 'year' : 'years'}`
}

export function calculateGoalProgress(params: {
  targetType?: GoalTargetType
  actions?: UserGoalAction[] | null
  savedKobo?: bigint | null
  targetKobo?: bigint | null
}): number {
  const { targetType = 'CHECKLIST_ACTIONS', actions, savedKobo, targetKobo } = params

  const totalActions = actions?.length || 0
  const doneActions = actions?.filter((a) => a.done).length || 0
  const actionPct = totalActions > 0 ? (doneActions / totalActions) * 100 : null

  const saved = savedKobo ? Number(savedKobo) : 0
  const target = targetKobo ? Number(targetKobo) : 0
  const moneyPct = target > 0 ? Math.min(100, (saved / target) * 100) : null

  switch (targetType) {
    case 'AMOUNT':
      return moneyPct != null ? Math.round(moneyPct) : 0

    case 'DEADLINE':
    case 'CHECKLIST_ACTIONS':
      return actionPct != null ? Math.round(actionPct) : 0

    case 'HYBRID':
      if (actionPct != null && moneyPct != null) {
        return Math.min(100, Math.round((actionPct + moneyPct) / 2))
      }
      if (moneyPct != null) return Math.round(moneyPct)
      if (actionPct != null) return Math.round(actionPct)
      return 0

    case 'RECURRING_HABIT':
      return actionPct != null ? Math.round(actionPct) : 0

    case 'VERIFICATION':
      return actionPct != null && actionPct === 100 ? 100 : 0

    default:
      if (actionPct != null && moneyPct != null) {
        return Math.min(100, Math.round((actionPct + moneyPct) / 2))
      }
      if (moneyPct != null) return Math.round(moneyPct)
      if (actionPct != null) return Math.round(actionPct)
      return 0
  }
}

