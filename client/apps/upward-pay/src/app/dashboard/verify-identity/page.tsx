'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react'
import { verifyBvn, getMe } from '@/features/auth/services/authService'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import { BvnInfoSheet } from '@/features/dashboard/components/verify-identity/BvnInfoSheet'
import { SetupPageShell, SetupPrimaryButton } from '@/features/dashboard/setup/components/SetupPageShell'

export default function VerifyIdentityPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { login: setAuthUser } = useAuth()

  const [bvn, setBvn] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const redirectPath = searchParams ? searchParams.get('redirect') : null

  const handleBvnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '')
    if (val.length <= 11) {
      setBvn(val)
      setError(null)
    }
  }

  const handleBack = () => {
    if (redirectPath) {
      router.push(redirectPath)
    } else {
      router.push('/dashboard')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (bvn.length !== 11) {
      setError('BVN must be exactly 11 digits.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await verifyBvn(bvn)
      if (result.success) {
        setSuccessMsg(result.message || 'Identity verified successfully!')

        try {
          const freshUser = await getMe()
          setAuthUser(freshUser)
          queryClient.setQueryData(['user'], freshUser)
          queryClient.invalidateQueries({ queryKey: ['user'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        } catch (err) {
          console.error('Failed to refresh user profile data after verification', err)
        }

        setTimeout(() => {
          if (redirectPath) {
            router.push(redirectPath)
          } else {
            router.push('/dashboard')
          }
        }, 1500)
      } else {
        setError(result.message || 'Verification failed. Please check details and try again.')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred during verification. Please try again.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const canSubmit = bvn.length === 11 && !isLoading && !successMsg

  return (
    <SetupPageShell
      className="setup-page--verify-identity"
      title="Verify Identity"
      onBack={handleBack}
      footer={
        <>
          <SetupPrimaryButton type="submit" form="verify-bvn-form" disabled={!canSubmit}>
            {isLoading ? (
              <>
                Verifying…
                <Loader2 size={18} className="verify-identity-page__spinner" aria-hidden />
              </>
            ) : (
              'Submit for Verification'
            )}
          </SetupPrimaryButton>
          <p className="verify-identity-page__trust">
            🔒 Encrypted &amp; secure. <strong>We do not save your BVN number</strong>.
          </p>
        </>
      }
    >
      <div className="verify-identity-page__promo">
        <div className="verify-identity-page__promo-icon" aria-hidden="true">
          ✦
        </div>
        <div>
          <p className="verify-identity-page__promo-title">Unlock +50 points</p>
          <p className="verify-identity-page__promo-desc">
            Verified tenants are trusted by landlords and lenders across Nigeria.
          </p>
        </div>
      </div>

      <form id="verify-bvn-form" onSubmit={handleSubmit} className="verify-identity-page__form">
        {error && (
          <div className="verify-identity-page__alert verify-identity-page__alert--error" role="alert">
            <AlertCircle size={16} aria-hidden />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="verify-identity-page__alert verify-identity-page__alert--success" role="status">
            <ShieldCheck size={16} aria-hidden />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="verify-identity-page__field">
          <label htmlFor="bvn-input">Bank Verification Number (BVN)</label>
          <div className="verify-identity-page__input-row">
            <input
              id="bvn-input"
              type="text"
              pattern="[0-9]*"
              inputMode="numeric"
              maxLength={11}
              placeholder="Enter your 11-digit BVN"
              value={bvn}
              onChange={handleBvnChange}
              disabled={isLoading || !!successMsg}
              required
            />
            {isLoading && (
              <Loader2 className="verify-identity-page__spinner" size={18} aria-label="Verifying" />
            )}
          </div>
          <div className="verify-identity-page__hint">{bvn.length}/11 digits</div>
        </div>
      </form>

      <BvnInfoSheet />
    </SetupPageShell>
  )
}
