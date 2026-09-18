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
    <svg width="18" height="18" viewBox="0 0 170 170" fill="currentColor" aria-hidden="true">
      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.58-7.7-11.64-13.98-5.87-9.06-10.4-19.16-13.58-30.29-3.18-11.13-4.77-21.73-4.77-31.81 0-14.49 3.54-26.6 10.63-36.33 7.09-9.73 16.27-14.73 27.53-15.01 5.33 0 11.05 1.44 17.15 4.33 6.1 2.89 10.1 4.39 12.01 4.5 1.54-.22 5.75-1.78 12.63-4.68 6.88-2.9 12.38-4.14 16.5-3.72 12.22 1.05 21.84 5.75 28.86 14.11-10.74 6.53-15.98 15.48-15.73 26.85.25 9.17 3.79 16.89 10.63 23.16 6.84 6.27 15.01 9.77 24.51 10.5-2.22 6.64-4.88 13.58-7.98 20.81zM119.22 33.64c0-7.39 2.65-14.28 7.95-20.67 5.3-6.39 11.95-10.37 19.95-11.97.22 1.33.33 2.55.33 3.66 0 7.39-2.76 14.4-8.28 21.03-5.52 6.63-12.29 10.62-20.31 11.97-.22-1.33-.33-2.55-.33-3.66z" />
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
