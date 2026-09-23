const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Normalize API / stored values to `YYYY-MM-DD` for `<input type="date">`. */
export function toDateInputValue(value?: string | number | Date | null): string {
  if (value === null || value === undefined || value === '') return ''

  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/)
    if (match) return match[1]
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isDateInputValue(value: string): boolean {
  if (!DATE_INPUT_PATTERN.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

export function isRentDateRangeValid(start: string, end: string): boolean {
  if (!isDateInputValue(start) || !isDateInputValue(end)) return false
  return end >= start
}

export type LeaseDurationUnit = 'years' | 'months' | 'weeks' | 'days'

export function calculateRentEndDate(
  startDate: string,
  rentType: string,
  leaseDuration: number | string = 1,
  leaseUnit: LeaseDurationUnit = 'years'
): string {
  if (!startDate) return ''
  const [yearStr, monthStr, dayStr] = startDate.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)
  if (!year || !month || !day) return ''

  const start = new Date(Date.UTC(year, month - 1, day))
  if (Number.isNaN(start.getTime())) return ''

  const end = new Date(start.getTime())
  const normType = (rentType || '').trim().toLowerCase()

  if (normType === 'monthly') {
    end.setUTCMonth(end.getUTCMonth() + 1)
  } else if (normType === 'lease') {
    const duration = Math.max(1, parseInt(String(leaseDuration || '1'), 10) || 1)
    const unit = (leaseUnit || 'years').toLowerCase() as LeaseDurationUnit
    if (unit === 'days') {
      end.setUTCDate(end.getUTCDate() + duration)
    } else if (unit === 'weeks') {
      end.setUTCDate(end.getUTCDate() + duration * 7)
    } else if (unit === 'months') {
      end.setUTCMonth(end.getUTCMonth() + duration)
    } else {
      end.setUTCFullYear(end.getUTCFullYear() + duration)
    }
  } else {
    // Default: Annually / Yearly
    end.setUTCFullYear(end.getUTCFullYear() + 1)
  }

  end.setUTCDate(end.getUTCDate() - 1)

  const y = end.getUTCFullYear()
  const m = String(end.getUTCMonth() + 1).padStart(2, '0')
  const d = String(end.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function validateRentDates(start: string, end: string): string | null {
  if (!start || !end) return 'Please complete lease start and next rent due dates.'
  if (!isDateInputValue(start) || !isDateInputValue(end)) {
    return 'Dates must be in YYYY-MM-DD format.'
  }
  if (!isRentDateRangeValid(start, end)) {
    return 'Next rent due must be on or after the lease start date.'
  }
  return null
}
