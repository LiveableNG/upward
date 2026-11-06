import { type UserProfile } from '@/features/auth/types'
import {
  getSetupEntryPath,
  isOnboardingComplete,
  isProfileSetupComplete,
} from '@/features/setup/profileCompletion'
import { type SetupHref } from '@/features/setup/setupPaths'

export function needsProfileSetup(user: UserProfile | null): boolean {
  if (!user) return false
  return !isOnboardingComplete(user)
}

export function needsFullProfileSetup(user: UserProfile | null): boolean {
  if (!user) return false
  return !isProfileSetupComplete(user)
}

export function getPostAuthSetupPath(user: UserProfile | null): SetupHref {
  return getSetupEntryPath(user)
}

export function getUserDisplayName(user: UserProfile | null): string {
  if (!user) return 'Tenant'
  const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
  return name || user.email
}
