import { RSI_STORAGE_KEY, RSI_TERMS_VERSION } from './constants'
import type { RsiEnrolmentFormData, RsiEnrolmentRecord } from './types'

export function getRsiEnrolments(): RsiEnrolmentRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RSI_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RsiEnrolmentRecord | RsiEnrolmentRecord[]
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return []
  }
}

export function getRsiEnrolment(propertyUuid: string): RsiEnrolmentRecord | null {
  return (
    getRsiEnrolments().find((record) => record.form.propertyUuid === propertyUuid) || null
  )
}

export function saveRsiEnrolment(form: RsiEnrolmentFormData): RsiEnrolmentRecord {
  const record: RsiEnrolmentRecord = {
    submittedAt: new Date().toISOString(),
    termsVersion: RSI_TERMS_VERSION,
    status: 'pending_activation',
    form,
  }
  if (typeof window !== 'undefined') {
    const existing = getRsiEnrolments().filter(
      (item) => item.form.propertyUuid !== form.propertyUuid,
    )
    localStorage.setItem(RSI_STORAGE_KEY, JSON.stringify([...existing, record]))
  }
  return record
}

export function clearRsiEnrolment(propertyUuid?: string): void {
  if (typeof window !== 'undefined') {
    if (!propertyUuid) {
      localStorage.removeItem(RSI_STORAGE_KEY)
      return
    }
    const remaining = getRsiEnrolments().filter(
      (record) => record.form.propertyUuid !== propertyUuid,
    )
    if (remaining.length === 0) {
      localStorage.removeItem(RSI_STORAGE_KEY)
      return
    }
    localStorage.setItem(RSI_STORAGE_KEY, JSON.stringify(remaining))
  }
}
