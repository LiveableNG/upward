import {
  RSI_ANNUAL_RATE,
  RSI_MAX_ENTRY_AGE,
  RSI_MAX_SUM_ASSURED,
} from '@/features/rent-support-insurance/constants'
import type { RsiEnrolmentFormData } from '@/features/rent-support-insurance/types'
import { type UserProfile } from '@/features/auth/types'
import { toDateInputValue } from '@/features/setup/rentalDates'

export function calculateAnnualPremium(sumAssured: number): number {
  if (!Number.isFinite(sumAssured) || sumAssured <= 0) return 0
  const capped = Math.min(sumAssured, RSI_MAX_SUM_ASSURED)
  return Math.round(capped * RSI_ANNUAL_RATE)
}

export function getAgeFromDob(dob: string): number | null {
  if (!dob) return null
  const birth = new Date(dob)
  if (Number.isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1
  return age
}

export function isWithinEntryAge(dob: string): boolean {
  const age = getAgeFromDob(dob)
  return age !== null && age <= RSI_MAX_ENTRY_AGE
}

export function buildDefaultFormData(
  user: UserProfile | null | undefined,
  propertyUuid: string,
): RsiEnrolmentFormData {
  const property =
    (user?.properties || []).find(
      (item) =>
        (item.uuid === propertyUuid || String(item.id) === propertyUuid) && !item.isPastTenancy,
    ) ?? null

  const landlordName = property?.companyName || property?.managerName || ''
  const propertyAddress = property?.location
    ? [property.location.address, property.location.area, property.location.state]
        .filter(Boolean)
        .join(', ')
    : property?.address || ''

  return {
    propertyUuid,
    fullName: [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim(),
    dateOfBirth: user?.dateOfBirth ? toDateInputValue(user.dateOfBirth) : '',
    gender: user?.gender ?? '',
    phone: user?.phone ?? '',
    address: user?.address ?? propertyAddress,
    occupation: '',
    employmentType: '',
    rentStartDate: property?.rentStartDate ? toDateInputValue(property.rentStartDate) : '',
    annualRent: property?.rentAmount ? String(property.rentAmount) : '',
    landlordName,
    propertyAddress,
  }
}

export function parseAnnualRent(value: string): number {
  const digits = value.replace(/[^\d]/g, '')
  if (!digits) return 0
  return Number(digits)
}
