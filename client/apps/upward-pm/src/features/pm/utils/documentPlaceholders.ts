import { intervalToDuration, startOfDay } from 'date-fns'

export const EMPTY_PLACEHOLDER = '__________'

function toDateValue(dateValue: any): Date | null {
  if (!dateValue) return null
  const date = new Date(dateValue)
  return Number.isNaN(date.getTime()) ? null : date
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

function addYearsMinusOneDay(date: Date, years = 1): Date {
  const nextDate = new Date(date)
  nextDate.setFullYear(nextDate.getFullYear() + years)
  nextDate.setDate(nextDate.getDate() - 1)
  return nextDate
}

function formatPlural(value: number, unit: string) {
  return `${value} ${unit}${value === 1 ? '' : 's'}`
}

function joinParts(parts: string[]) {
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

function numberToWords(value: number): string {
  if (value === 0) return 'Zero'

  const small = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const scales = [
    { value: 1_000_000_000_000, label: 'Trillion' },
    { value: 1_000_000_000, label: 'Billion' },
    { value: 1_000_000, label: 'Million' },
    { value: 1_000, label: 'Thousand' },
  ]

  const underThousand = (num: number): string => {
    const parts: string[] = []
    const hundreds = Math.floor(num / 100)
    const remainder = num % 100

    if (hundreds > 0) {
      parts.push(`${small[hundreds]} Hundred`)
    }

    if (remainder > 0) {
      if (remainder < 20) {
        parts.push(small[remainder])
      } else {
        const ten = Math.floor(remainder / 10)
        const ones = remainder % 10
        parts.push(ones > 0 ? `${tens[ten]} ${small[ones]}` : tens[ten])
      }
    }

    return parts.join(' ')
  }

  let remaining = Math.floor(Math.abs(value))
  const parts: string[] = []

  for (const scale of scales) {
    if (remaining >= scale.value) {
      const scaleCount = Math.floor(remaining / scale.value)
      parts.push(`${underThousand(scaleCount)} ${scale.label}`)
      remaining %= scale.value
    }
  }

  if (remaining > 0) {
    parts.push(underThousand(remaining))
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

function resolveCurrencyLabel(currency?: string) {
  const normalized = (currency || '').trim().toLowerCase()
  if (!normalized || normalized.includes('₦') || normalized.includes('ngn') || normalized.includes('naira')) {
    return 'Naira'
  }

  return currency?.trim() || 'Currency'
}

function formatDurationParts(duration: ReturnType<typeof intervalToDuration>, inWords = false): string {
  const parts: string[] = []

  const years = duration.years || 0
  const months = duration.months || 0
  const days = duration.days || 0

  if (years > 0) {
    parts.push(inWords ? `${numberToWords(years)} Year${years === 1 ? '' : 's'}` : formatPlural(years, 'year'))
  }

  if (months > 0) {
    parts.push(inWords ? `${numberToWords(months)} Month${months === 1 ? '' : 's'}` : formatPlural(months, 'month'))
  }

  if (days > 0) {
    parts.push(inWords ? `${numberToWords(days)} Day${days === 1 ? '' : 's'}` : formatPlural(days, 'day'))
  }

  if (parts.length === 0) {
    return inWords ? 'Zero Days' : '0 days'
  }

  return joinParts(parts)
}

export function formatDisplayDate(dateValue: any): string {
  const date = toDateValue(dateValue)
  if (!date) return EMPTY_PLACEHOLDER

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function getLeaseEndDate(startValue: any): Date | null {
  const startDate = toDateValue(startValue)
  if (!startDate) return null

  return addYearsMinusOneDay(startDate)
}

export function getNextRentStartDate(startValue: any): Date | null {
  const leaseEndDate = getLeaseEndDate(startValue)
  if (!leaseEndDate) return null

  return addDays(leaseEndDate, 1)
}

export function getNextRentEndDate(startValue: any): Date | null {
  const nextRentStartDate = getNextRentStartDate(startValue)
  if (!nextRentStartDate) return null

  return addYearsMinusOneDay(nextRentStartDate)
}

export function formatAmountInWords(amountValue: any, currency?: string): string {
  const amountNumber = typeof amountValue === 'number' ? amountValue : Number(amountValue)
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) return EMPTY_PLACEHOLDER

  return `${numberToWords(Math.round(amountNumber))} ${resolveCurrencyLabel(currency)} Only`
}

export function formatTimeframeUntilDate(dateValue: any, referenceDate: Date = new Date()): string {
  const targetDate = toDateValue(dateValue)
  if (!targetDate) return EMPTY_PLACEHOLDER

  const duration = intervalToDuration({
    start: startOfDay(referenceDate),
    end: startOfDay(targetDate),
  })

  return formatDurationParts(duration, false)
}

export function formatTimeframeUntilDateInWords(dateValue: any, referenceDate: Date = new Date()): string {
  const targetDate = toDateValue(dateValue)
  if (!targetDate) return EMPTY_PLACEHOLDER

  const duration = intervalToDuration({
    start: startOfDay(referenceDate),
    end: startOfDay(targetDate),
  })

  return formatDurationParts(duration, true)
}