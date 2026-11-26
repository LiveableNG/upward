export function clampReminderDay(day: number | null | undefined, fallback = 28): number {
  if (day === null || day === undefined) return fallback
  const n = Math.round(Number(day))
  if (!Number.isFinite(n)) return fallback
  return Math.min(31, Math.max(1, n))
}
