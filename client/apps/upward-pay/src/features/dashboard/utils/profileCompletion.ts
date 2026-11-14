import { type UserProfile } from '@/features/auth/types'
import { SETUP_PATHS } from '../setup/setupPaths'

export const PHONE_REGEX = /^\+?\d{7,15}$/

export function hasRentalInfo(user: UserProfile | null | undefined): boolean {
  if (!user) return false

  const properties = user.properties || []
  if (properties.length > 0) {
    const hasValidProperty = properties.some(
      (prop) =>
        !prop.isPastTenancy &&
        Boolean(
          prop.id ||
            prop.uuid ||
            prop.address ||
            prop.location?.address ||
            prop.location?.area ||
            prop.rentEndDate ||
            prop.rentAmount ||
            prop.externalUnitId,
        ),
    )
    if (hasValidProperty) return true
    return properties.length > 0
  }

  return Boolean(user.address && user.rentEndDate)
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

/** Rental + phone + identity (when required) + goals (when available) — used for the dashboard setup blocker */
export function isProfileSetupComplete(
  user: UserProfile | null | undefined,
  options?: { hasGoals?: boolean; goalsAvailable?: boolean },
): boolean {
  const baseComplete = isOnboardingComplete(user) && !needsIdentityVerification(user)
  if (!baseComplete) return false

  if (options?.goalsAvailable) {
    return !!options.hasGoals
  }

  return true
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

export function getSetupEntryPath(
  user: UserProfile | null | undefined,
  options?: { hasGoals?: boolean; goalsAvailable?: boolean },
): string {
  if (!hasRentalInfo(user)) return SETUP_PATHS.rental
  if (!hasContactDetails(user)) return SETUP_PATHS.phone
  if (needsIdentityVerification(user)) return getIdentityVerificationPath()
  if (options?.goalsAvailable && !options.hasGoals) return SETUP_PATHS.goals
  return SETUP_PATHS.rental
}
