import { type UserProfile } from '@/features/auth/types'

export function isSavingsWalletEnabled(user: UserProfile | null | undefined): boolean {
  return !!user?.savingsWalletEnabled
}
