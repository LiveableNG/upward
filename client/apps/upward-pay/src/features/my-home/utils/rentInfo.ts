export type RentInfo = {
  expiresOn: string
  timeLeft: string
  percentageTimeLeft: number
  expired: boolean
}

function formatRentDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = date.toLocaleString('en-GB', { month: 'short' })
  return `${day} ${month}, ${date.getFullYear()}`
}

function diffMonthsAndWeeks(from: Date, to: Date): { months: number; weeks: number } {
  let months = 0
  let cursor = new Date(from)

  while (true) {
    const next = new Date(cursor)
    next.setMonth(next.getMonth() + 1)
    if (next <= to) {
      months += 1
      cursor = next
    } else {
      break
    }
  }

  const weeks = Math.max(0, Math.floor((to.getTime() - cursor.getTime()) / (7 * 24 * 60 * 60 * 1000)))
  return { months, weeks }
}

/**
 * Mirrors GT DashboardHomeUnits::getRentInfo — used for the tenancy card on My Home.
 */
export function getRentInfo(rentStartDate?: string, rentEndDate?: string): RentInfo | null {
  if (!rentEndDate) return null

  const end = new Date(rentEndDate)
  if (Number.isNaN(end.getTime())) return null

  const now = new Date()
  const expiresOn = formatRentDate(end)

  if (now > end) {
    return {
      expiresOn,
      timeLeft: 'Expired',
      percentageTimeLeft: 0,
      expired: true,
    }
  }

  const start = rentStartDate ? new Date(rentStartDate) : new Date(end)
  if (rentStartDate && Number.isNaN(start.getTime())) {
    return { expiresOn, timeLeft: '—', percentageTimeLeft: 0, expired: false }
  }

  if (!rentStartDate) {
    start.setFullYear(start.getFullYear() - 1)
  }

  const { months, weeks } = diffMonthsAndWeeks(now, end)
  const dayMs = 24 * 60 * 60 * 1000
  const totalDays = Math.max(Math.floor((end.getTime() - start.getTime()) / dayMs), 1)
  const daysLeft = Math.floor((end.getTime() - now.getTime()) / dayMs)
  const percentageTimeLeft = Math.min(100, Math.max(0, Math.round((daysLeft / totalDays) * 10000) / 100))

  const parts: string[] = []
  if (months > 0) parts.push(`${months} month${months === 1 ? '' : 's'}`)
  if (weeks > 0) parts.push(`${weeks} week${weeks === 1 ? '' : 's'}`)

  return {
    expiresOn,
    timeLeft: parts.length > 0 ? `${parts.join(', ')} left` : 'Less than a week left',
    percentageTimeLeft,
    expired: false,
  }
}
