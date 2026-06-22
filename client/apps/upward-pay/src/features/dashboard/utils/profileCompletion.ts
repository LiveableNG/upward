import { type UserProfile } from '@/features/auth/types'
import { SETUP_PATHS } from '../setup/setupPaths'

export const PHONE_REGEX = /^\+234\d{10}$/

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
  return !!(user?.phone && PHONE_REGEX.test(user.phone))
}

export function isOnboardingComplete(user: UserProfile | null | undefined): boolean {
  return hasRentalInfo(user) && hasPhone(user)
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

export function getSetupEntryPath(user: UserProfile | null | undefined): string {
  if (!hasRentalInfo(user)) return SETUP_PATHS.rental
  if (!hasPhone(user)) return SETUP_PATHS.phone
  return SETUP_PATHS.rental
}
