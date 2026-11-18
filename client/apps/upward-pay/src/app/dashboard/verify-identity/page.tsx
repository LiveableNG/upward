'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Fingerprint,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { verifyKyc, getMe } from '@/features/auth/services/authService'
import { useAuth } from '@/features/auth/AuthContext'
import { KycInfoSheet } from '@/features/dashboard/components/verify-identity/BvnInfoSheet'
import {
  SetupPageShell,
  SetupPrimaryButton,
} from '@/features/dashboard/setup/components/SetupPageShell'

const kycSchema = z.object({
  type: z.enum(['BVN', 'NIN']),
  idNumber: z
    .string()
    .length(11, 'Must be exactly 11 digits')
    .regex(/^\d{11}$/, 'Must contain exactly 11 digits'),
})

type KycFormData = z.infer<typeof kycSchema>

export default function VerifyIdentityPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { user, login: setAuthUser } = useAuth()
  const isAlreadyVerified = !!user?.isIdentityVerified

  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const redirectPath = searchParams ? searchParams.get('redirect') : null

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isValid },
  } = useForm<KycFormData>({
    resolver: zodResolver(kycSchema),
    defaultValues: {
      type: 'BVN',
      idNumber: '',
    },
    mode: 'onChange',
  })

  const selectedType = useWatch({ control, name: 'type' })
  const idNumberValue = useWatch({ control, name: 'idNumber' }) || ''

  const verifyMutation = useMutation({
    mutationFn: verifyKyc,
    onSuccess: async (result) => {
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
        setError(result.message || 'Verification failed. Please check your details and try again.')
      }
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : 'An error occurred during verification. Please try again.'
      setError(message)
    },
  })

  const handleIdNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericOnly = e.target.value.replace(/\D/g, '').slice(0, 11)
    setValue('idNumber', numericOnly, { shouldValidate: true })
    if (error) setError(null)
  }

  const handleTabSwitch = (newType: 'BVN' | 'NIN') => {
    if (newType === selectedType) return
    setValue('type', newType)
    setValue('idNumber', '', { shouldValidate: true })
    setError(null)
  }

  const handleBack = () => {
    if (redirectPath) {
      router.push(redirectPath)
    } else {
      router.push('/dashboard')
    }
  }

  const onSubmit = (data: KycFormData) => {
    setError(null)
    verifyMutation.mutate({
      type: data.type,
      idNumber: data.idNumber,
    })
  }

  if (isAlreadyVerified) {
    const verifiedType = user?.kycVerification?.idType || 'BVN'
    const maskedId = user?.kycVerification?.idNumberMasked || '•••• •••• ••••'

    return (
      <SetupPageShell
        className="setup-page--verify-identity"
        title="Identity Verification"
        onBack={handleBack}
        footer={
          <>
            <SetupPrimaryButton type="button" onClick={handleBack}>
              Back to Dashboard
            </SetupPrimaryButton>
            <p className="verify-identity-page__trust">
              <Lock
                size={13}
                style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}
                aria-hidden
              />
              Need to update your verified documents? Contact Upward Support.
            </p>
          </>
        }
      >
        <div className="verify-identity-page__verified-card">
          <div className="verify-identity-page__verified-icon-wrap" aria-hidden="true">
            <ShieldCheck size={32} />
          </div>
          <h2 className="verify-identity-page__verified-title">Identity Verified</h2>
          <p className="verify-identity-page__verified-subtitle">
            Your identity has been verified and protected under NDPR standards.
          </p>

          <div className="verify-identity-page__verified-details">
            <div className="verify-identity-page__verified-row">
              <span className="verify-identity-page__verified-row-label">Verification Type</span>
              <span className="verify-identity-page__verified-row-value">
                {verifiedType === 'NIN' ? (
                  <>
                    <Fingerprint size={14} aria-hidden /> National ID (NIN)
                  </>
                ) : (
                  <>
                    <CreditCard size={14} aria-hidden /> Bank Verification (BVN)
                  </>
                )}
              </span>
            </div>

            <div className="verify-identity-page__verified-row">
              <span className="verify-identity-page__verified-row-label">ID Number</span>
              <span className="verify-identity-page__verified-row-value">{maskedId}</span>
            </div>

            <div className="verify-identity-page__verified-row">
              <span className="verify-identity-page__verified-row-label">Status</span>
              <span className="verify-identity-page__verified-tag">
                <CheckCircle2 size={12} aria-hidden /> Verified
              </span>
            </div>
          </div>

          <div className="verify-identity-page__perks-title">Unlocked Benefits</div>
          <div className="verify-identity-page__perks-list">
            <div className="verify-identity-page__perk-item">
              <span className="verify-identity-page__perk-icon">
                <Sparkles size={13} />
              </span>
              <span>Dedicated Virtual Account (DVA) Enabled</span>
            </div>
            <div className="verify-identity-page__perk-item">
              <span className="verify-identity-page__perk-icon">
                <Lock size={13} />
              </span>
              <span>Automated Rent Savings &amp; Wallet Activated</span>
            </div>
            <div className="verify-identity-page__perk-item">
              <span className="verify-identity-page__perk-icon">
                <ShieldCheck size={13} />
              </span>
              <span>+50 Points Upward Credibility Boost</span>
            </div>
          </div>
        </div>
      </SetupPageShell>
    )
  }

  const isLoading = verifyMutation.isPending
  const canSubmit = idNumberValue.length === 11 && isValid && !isLoading && !successMsg
  const isBvn = selectedType === 'BVN'

  return (
    <SetupPageShell
      className="setup-page--verify-identity"
      title="Verify Identity"
      onBack={handleBack}
      footer={
        <>
          <SetupPrimaryButton type="submit" form="verify-kyc-form" disabled={!canSubmit}>
            {isLoading ? (
              <>
                Verifying {selectedType}…
                <Loader2 size={18} className="verify-identity-page__spinner" aria-hidden />
              </>
            ) : (
              `Verify with ${selectedType}`
            )}
          </SetupPrimaryButton>
          <p className="verify-identity-page__trust">
            <Lock
              size={13}
              style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}
              aria-hidden
            />
            Encrypted &amp; secure. <strong>We do not save your {selectedType} number</strong>.
          </p>
        </>
      }
    >
      <div className="verify-identity-page__promo">
        <div className="verify-identity-page__promo-icon" aria-hidden="true">
          <Sparkles size={20} />
        </div>
        <div>
          <p className="verify-identity-page__promo-title">Unlock Savings &amp; Wallet</p>
          <p className="verify-identity-page__promo-desc">
            Verify your BVN or NIN to enable your dedicated virtual account and unlock +50 points.
          </p>
        </div>
      </div>

      <div className="verify-identity-page__tabs" role="tablist" aria-label="KYC Document Type">
        <button
          type="button"
          role="tab"
          aria-selected={isBvn}
          className={`verify-identity-page__tab ${isBvn ? 'verify-identity-page__tab--active' : ''}`}
          onClick={() => handleTabSwitch('BVN')}
          disabled={isLoading || !!successMsg}
        >
          <CreditCard size={16} aria-hidden />
          <span>Verify with BVN</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={!isBvn}
          className={`verify-identity-page__tab ${!isBvn ? 'verify-identity-page__tab--active' : ''}`}
          onClick={() => handleTabSwitch('NIN')}
          disabled={isLoading || !!successMsg}
        >
          <Fingerprint size={16} aria-hidden />
          <span>Verify with NIN</span>
        </button>
      </div>

      <form
        id="verify-kyc-form"
        onSubmit={handleSubmit(onSubmit)}
        className="verify-identity-page__form"
      >
        {error && (
          <div
            className="verify-identity-page__alert verify-identity-page__alert--error"
            role="alert"
          >
            <AlertCircle size={16} aria-hidden />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div
            className="verify-identity-page__alert verify-identity-page__alert--success"
            role="status"
          >
            <ShieldCheck size={16} aria-hidden />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="verify-identity-page__field">
          <label htmlFor="id-number-input">
            {isBvn ? 'Bank Verification Number (BVN)' : 'National Identity Number (NIN)'}
          </label>
          <div className="verify-identity-page__input-row">
            <input
              id="id-number-input"
              type="text"
              pattern="[0-9]*"
              inputMode="numeric"
              maxLength={11}
              placeholder={isBvn ? 'Enter your 11-digit BVN' : 'Enter your 11-digit NIN'}
              value={idNumberValue}
              onChange={handleIdNumberChange}
              disabled={isLoading || !!successMsg}
              autoComplete="off"
              required
            />
            {isLoading && (
              <Loader2 className="verify-identity-page__spinner" size={18} aria-label="Verifying" />
            )}
          </div>
          <div className="verify-identity-page__hint">
            {errors.idNumber ? (
              <span style={{ color: '#b42318' }}>{errors.idNumber.message}</span>
            ) : (
              `${idNumberValue.length}/11 digits`
            )}
          </div>
        </div>
      </form>

      <KycInfoSheet idType={selectedType} />
    </SetupPageShell>
  )
}
