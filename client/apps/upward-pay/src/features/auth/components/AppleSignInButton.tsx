'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { AppleSignIn, SignInScope } from '@capawesome/capacitor-apple-sign-in'
import { socialSignIn } from '@/features/auth/services/authService'
import { isAppleAuthEnabled } from '@/features/auth/utils/appleAuth'
import { useAuth } from '@/features/auth/AuthContext'
import { setAccessToken, setRefreshToken } from '@/lib/auth-token'
import { setCookie } from '@/lib/cookie-utils'
import { useToast } from '@/components/common/Toast'

interface AppleSignInButtonProps {
  onSuccess?: () => void
  disabled?: boolean
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ marginBottom: '1.5px', flexShrink: 0 }}>
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  )
}

export function AppleSignInButton({ onSuccess, disabled }: AppleSignInButtonProps) {
  const router = useRouter()
  const { login: setAuthUser } = useAuth()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [loading, setLoading] = useState(false)

  if (!isAppleAuthEnabled()) return null

  const handleAppleSignIn = async () => {
    if (loading || disabled) return
    setLoading(true)

    try {
      const result = await AppleSignIn.signIn({
        scopes: [SignInScope.Email, SignInScope.FullName],
      })

      if (!result.idToken) {
        toast.error('Apple sign-in failed. No identity token was received.', 'Sign in failed')
        return
      }

      const res = await socialSignIn({
        provider: 'apple',
        idToken: result.idToken,
        firstName: result.givenName || undefined,
        lastName: result.familyName || undefined,
      })

      if (res.accessToken) {
        setAccessToken(res.accessToken)
        setCookie('pay_access_token', res.accessToken)
      }
      if (res.refreshToken) {
        setRefreshToken(res.refreshToken)
      }

      setAuthUser(res.user)
      queryClient.setQueryData(['user'], res.user)

      if (onSuccess) {
        onSuccess()
      } else {
        router.replace('/dashboard')
      }
    } catch (err: any) {
      // Gracefully ignore user cancellation
      const errStr = String(err?.message || err || '')
      if (
        errStr.includes('canceled') ||
        errStr.includes('cancelled') ||
        err?.code === 'SIGN_IN_CANCELED' ||
        err?.code === '1001'
      ) {
        return
      }
      const message = err instanceof Error ? err.message : 'Apple sign-in failed'
      toast.error(message, 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  const isDisabled = loading || disabled

  return (
    <button
      type="button"
      className={`auth-apple-btn${isDisabled ? ' auth-apple-btn--disabled' : ''}`}
      onClick={handleAppleSignIn}
      disabled={isDisabled}
      aria-label="Continue with Apple"
    >
      {loading ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          <span>Signing in…</span>
        </>
      ) : (
        <>
          <AppleIcon />
          <span>Continue with Apple</span>
        </>
      )}
    </button>
  )
}
