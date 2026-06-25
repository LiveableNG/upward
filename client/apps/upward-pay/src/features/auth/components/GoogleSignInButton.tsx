'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { socialSignIn } from '@/features/auth/services/authService'
import { isGoogleAuthEnabled } from '@/features/auth/utils/googleAuth'
import { useAuth } from '@/features/auth/AuthContext'
import { setAccessToken } from '@/lib/auth-token'
import { setCookie } from '@/lib/cookie-utils'
import { useToast } from '@/components/common/Toast'

interface GoogleSignInButtonProps {
  onSuccess?: () => void
  disabled?: boolean
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c3.42-3.15 5.372-7.78 5.372-13.24z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  )
}

export function GoogleSignInButton({ onSuccess, disabled }: GoogleSignInButtonProps) {
  const router = useRouter()
  const { login: setAuthUser } = useAuth()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [loading, setLoading] = useState(false)

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  if (!isGoogleAuthEnabled() || !clientId) return null

  const handleSuccess = async (response: CredentialResponse) => {
    const idToken = response.credential
    if (!idToken) {
      toast.error('Google sign-in failed. Please try again.', 'Sign in failed')
      return
    }

    setLoading(true)
    try {
      const result = await socialSignIn({ provider: 'google', idToken })
      if (result.accessToken) {
        setAccessToken(result.accessToken)
        setCookie('pay_access_token', result.accessToken)
      }
      setAuthUser(result.user)
      queryClient.setQueryData(['user'], result.user)

      if (onSuccess) {
        onSuccess()
      } else {
        router.replace('/dashboard')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed'
      toast.error(message, 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  const isDisabled = loading || disabled

  return (
    <div className={`auth-google-btn${isDisabled ? ' auth-google-btn--disabled' : ''}`}>
      <div className="auth-google-btn__face" aria-hidden="true">
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>Signing in…</span>
          </>
        ) : (
          <>
            <GoogleIcon />
            <span>Continue with Google</span>
          </>
        )}
      </div>

      {!isDisabled && (
        <div className="auth-google-btn__native" aria-label="Continue with Google">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => toast.error('Google sign-in was cancelled or failed.', 'Sign in failed')}
            theme="outline"
            size="large"
            shape="rectangular"
            text="continue_with"
            width="400"
          />
        </div>
      )}
    </div>
  )
}
