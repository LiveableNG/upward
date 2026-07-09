import type { LDContext } from '@launchdarkly/react-sdk'
import type { UserProfile } from '@/features/auth/types'

export function buildLdContext(user: UserProfile | null): LDContext {
  if (!user?.uuid) {
    return {
      kind: 'user',
      key: 'anonymous',
      anonymous: true,
    }
  }

  return {
    kind: 'user',
    key: user.uuid,
    email: user.email,
    name: [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || undefined,
    custom: {
      isIdentityVerified: user.isIdentityVerified ?? false,
      isFromWaitlist: user.isFromWaitlist,
      isFromInvite: user.isFromInvite,
    },
  }
}
