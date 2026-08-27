import { type UserProfile } from '@/features/auth/types'
import { SETUP_PATHS } from '../setup/setupPaths'

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
  return !!(user?.phone && PHONE_REGEX.test(user.phone.replace(/[\s\-\(\)]/g, '')))
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

/** Rental + phone + identity (when required) — used for the dashboard setup blocker */
export function isProfileSetupComplete(user: UserProfile | null | undefined): boolean {
  return isOnboardingComplete(user) && !needsIdentityVerification(user)
}

/** @deprecated Use hasRentalInfo for rental-only checks or isOnboardingComplete for the gate */
export function isProfileComplete(user: UserProfile | null | undefined): boolean {
  return hasRentalInfo(user)
}

export function getStandaloneRentalPath(): string {
  return SETUP_PATHS.rental
}

export function getStandalonePhonePath(): string {
  return SETUP_PATHS.phone
}

export function getIdentityVerificationPath(redirect = SETUP_PATHS.dashboard): string {
  return `${SETUP_PATHS.identity}?redirect=${encodeURIComponent(redirect)}`
}

export function getSetupEntryPath(user: UserProfile | null | undefined): string {
  if (!hasRentalInfo(user)) return SETUP_PATHS.rental
  if (!hasContactDetails(user)) return SETUP_PATHS.phone
  if (needsIdentityVerification(user)) return getIdentityVerificationPath()
  return SETUP_PATHS.rental
}
