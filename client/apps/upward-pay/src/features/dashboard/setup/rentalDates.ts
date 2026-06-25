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
