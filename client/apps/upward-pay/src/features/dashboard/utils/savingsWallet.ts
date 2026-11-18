import { type UserProfile } from '@/features/auth/types'

export function isSavingsWalletEnabled(user: UserProfile | null | undefined): boolean {
  // Enabled for all active users in Rent Savings V1
  return true
}
