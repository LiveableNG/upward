import * as SecureStore from 'expo-secure-store'

import { RSI_STORAGE_KEY, RSI_TERMS_VERSION } from '@/features/rent-support-insurance/constants'
import type {
  RsiEnrolmentFormData,
  RsiEnrolmentRecord,
} from '@/features/rent-support-insurance/types'

export async function getRsiEnrolments(): Promise<RsiEnrolmentRecord[]> {
  try {
    const raw = await SecureStore.getItemAsync(RSI_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RsiEnrolmentRecord | RsiEnrolmentRecord[]
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return []
  }
}

export async function saveRsiEnrolment(form: RsiEnrolmentFormData): Promise<RsiEnrolmentRecord> {
  const record: RsiEnrolmentRecord = {
    submittedAt: new Date().toISOString(),
    termsVersion: RSI_TERMS_VERSION,
    status: 'pending_activation',
    form,
  }
  const existing = await getRsiEnrolments()
  const next = [...existing.filter((item) => item.form.propertyUuid !== form.propertyUuid), record]
  await SecureStore.setItemAsync(RSI_STORAGE_KEY, JSON.stringify(next))
  return record
}

export async function clearRsiEnrolment(propertyUuid: string): Promise<void> {
  const remaining = (await getRsiEnrolments()).filter(
    (record) => record.form.propertyUuid !== propertyUuid,
  )
  if (remaining.length === 0) {
    await SecureStore.deleteItemAsync(RSI_STORAGE_KEY)
    return
  }
  await SecureStore.setItemAsync(RSI_STORAGE_KEY, JSON.stringify(remaining))
}
