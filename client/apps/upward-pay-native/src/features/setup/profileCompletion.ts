import { type UserProfile } from '@/features/auth/types'
import { SETUP_PATHS, type SetupHref } from '@/features/setup/setupPaths'

export const PHONE_REGEX = /^\+?\d{7,15}$/

export function hasRentalInfo(user: UserProfile | null | undefined): boolean {
  if (!user) return false

  const hasProperties = user.properties && user.properties.length > 0
  const firstProp = hasProperties ? user.properties![0] : null

  return !!(
    hasProperties &&
    firstProp?.location?.area &&
    firstProp?.location?.state &&
    firstProp?.location?.country &&
    firstProp?.rentEndDate
  )
}

export function hasPhone(user: UserProfile | null | undefined): boolean {
  return !!(user?.phone && PHONE_REGEX.test(user.phone.replace(/[\s\-()]/g, '')))
}

export function hasDateOfBirth(user: UserProfile | null | undefined): boolean {
  return !!user?.dateOfBirth
}

export function hasContactDetails(user: UserProfile | null | undefined): boolean {
  return hasPhone(user) && hasDateOfBirth(user)
}

export function needsIdentityVerification(user: UserProfile | null | undefined): boolean {
  if (!user) return false
  const verificationOn = user.verificationOn ?? true
  return verificationOn && !user.isIdentityVerified
}

export function isOnboardingComplete(user: UserProfile | null | undefined): boolean {
  return hasRentalInfo(user) && hasContactDetails(user)
}

export function isProfileSetupComplete(user: UserProfile | null | undefined): boolean {
  return isOnboardingComplete(user) && !needsIdentityVerification(user)
}

export function getSetupEntryPath(user: UserProfile | null | undefined): SetupHref {
  if (!hasRentalInfo(user)) return SETUP_PATHS.rental
  if (!hasContactDetails(user)) return SETUP_PATHS.phone
  return SETUP_PATHS.dashboard
}

export function cleanInternationalPhone(phone: string): string {
  let cleaned = phone.trim().replace(/[\s\-()]/g, '')
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '+234' + cleaned.slice(1)
  } else if (cleaned.length >= 7 && !cleaned.startsWith('+')) {
    cleaned = '+' + cleaned
  }
  return cleaned
}
