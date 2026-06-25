'use client'

import { isGoogleAuthEnabled } from '../utils/googleAuth'

export function AuthSocialDivider() {
  if (!isGoogleAuthEnabled()) return null

  return (
    <div className="auth-divider">
      <span>OR</span>
    </div>
  )
}
