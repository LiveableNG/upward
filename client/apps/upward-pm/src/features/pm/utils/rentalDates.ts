export type LeaseDurationUnit = 'years' | 'months' | 'weeks' | 'days'

export function calculateRentEndDate(
  startDate: string | null | undefined,
  rentType: string | null | undefined,
  leaseDuration: number | string = 1,
  leaseUnit: LeaseDurationUnit = 'years'
): string {
  if (!startDate) return ''
  
  // Format as YYYY-MM-DD if ISO string
  const cleanDate = startDate.split('T')[0]
  const [yearStr, monthStr, dayStr] = cleanDate.split('-')
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
