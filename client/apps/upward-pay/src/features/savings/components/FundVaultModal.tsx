'use client'

import React, { useState, useEffect, useRef, useSyncExternalStore } from 'react'
import {
  Copy,
  Check,
  Landmark,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/common/Toast'
import { BottomSheetModal } from '@/components/common/BottomSheetModal'
import { formatCurrency } from '@/lib/utils'
import {
  RENT_VAULT_QUERY_KEY,
  useSimulateVaultDeposit,
  useVerifyVaultFunding,
} from '../hooks/useRentSavings'
import {
  calculatePayLessPlan,
  recalculateReducedMonthlyNaira,
  verifyRentVaultFunding,
  type SavingsCadence,
  type SavingsPlanPattern,
  type SavingsProductOption,
  type VaultOnTrackStatus,
} from '../services/savingsService'
import { usePlatformRates } from '@/features/payments/hooks/usePlatformRates'

export type VaultFundingMode = 'INITIAL_DEPOSIT' | 'MONTHLY' | 'EXTRA_TOPUP'

interface FundVaultModalProps {
  isOpen: boolean
  onClose: () => void
  initialFundingMode?: VaultFundingMode
  recommendedAmountNaira?: number
  plannedMonthlyNaira?: number
  currentMonthRemainingNaira?: number
  currentMonthFulfilled?: boolean
  suggestedTodayNaira?: number
  onTrackStatus?: VaultOnTrackStatus
  isTargetReachedEarly?: boolean
  contractualDueDate?: string
  paydayDayOfMonth?: number
  cadence?: SavingsCadence
  dedicatedAccount?: {
    bank_name: string
    account_number: string
    account_name: string
  } | null
  targetAmountNaira?: number
  daysRemaining?: number
  annualRatePct?: number
  productOption?: SavingsProductOption
  planPattern?: SavingsPlanPattern
  currentBalanceNaira?: number
  isInitialDeposit?: boolean
}

const emptySubscribe = () => () => {}

export function FundVaultModal({
  isOpen,
  onClose,
  initialFundingMode,
  recommendedAmountNaira,
  plannedMonthlyNaira = 0,
  currentMonthRemainingNaira = 0,
  currentMonthFulfilled = false,
  suggestedTodayNaira = 0,
  onTrackStatus = 'ON_TRACK',
  isTargetReachedEarly = false,
  contractualDueDate,
  paydayDayOfMonth = 28,
  cadence = 'MONTHLY',
  dedicatedAccount,
  targetAmountNaira,
  daysRemaining,
  annualRatePct,
  productOption = 'RENT_PROTEC',
  planPattern = 'INITIAL_DEPOSIT',
  currentBalanceNaira = 0,
  isInitialDeposit = false,
}: FundVaultModalProps) {
  const [copiedField, setCopiedField] = useState<'account' | null>(null)
  const resolvedDefaultMode: VaultFundingMode =
    initialFundingMode ||
    (isInitialDeposit || currentBalanceNaira === 0
      ? 'INITIAL_DEPOSIT'
      : isTargetReachedEarly || (currentMonthFulfilled && onTrackStatus !== 'BEHIND')
        ? 'EXTRA_TOPUP'
        : 'MONTHLY')
  const [fundingMode, setFundingMode] = useState<VaultFundingMode>(resolvedDefaultMode)
  const [prevOpenMode, setPrevOpenMode] = useState<string>(`${isOpen}:${resolvedDefaultMode}`)
  if (`${isOpen}:${resolvedDefaultMode}` !== prevOpenMode) {
    setPrevOpenMode(`${isOpen}:${resolvedDefaultMode}`)
    if (isOpen) {
      setFundingMode(resolvedDefaultMode)
    }
  }

  const defaultAmountForMode = (() => {
    if (fundingMode === 'EXTRA_TOPUP') {
      if (
        initialFundingMode === 'EXTRA_TOPUP' &&
        recommendedAmountNaira &&
        recommendedAmountNaira > 0
      ) {
        return Math.round(recommendedAmountNaira)
      }
      return 100_000
    }
    if (fundingMode === 'MONTHLY') {
      if (onTrackStatus === 'BEHIND' && suggestedTodayNaira > 0) {
        return Math.round(suggestedTodayNaira)
      }
      if (currentMonthRemainingNaira > 0) return Math.round(currentMonthRemainingNaira)
      if (suggestedTodayNaira > 0) return Math.round(suggestedTodayNaira)
      if (plannedMonthlyNaira > 0) return Math.round(plannedMonthlyNaira)
    }
    if (recommendedAmountNaira && recommendedAmountNaira > 0) {
      return Math.round(recommendedAmountNaira)
    }
    if (
      targetAmountNaira &&
      targetAmountNaira > 0 &&
      (isInitialDeposit || currentBalanceNaira === 0) &&
      planPattern === 'INITIAL_DEPOSIT'
    ) {
      return Math.round(targetAmountNaira * 0.2)
    }
    return 100_000
  })()

  const [customAmountOverride, setCustomAmountOverride] = useState<string | null>(null)
  const [prevRecommended, setPrevRecommended] = useState<string>(`${fundingMode}:${defaultAmountForMode}`)
  if (`${fundingMode}:${defaultAmountForMode}` !== prevRecommended) {
    setPrevRecommended(`${fundingMode}:${defaultAmountForMode}`)
    setCustomAmountOverride(null)
  }

  const customAmount = customAmountOverride !== null ? customAmountOverride : defaultAmountForMode.toLocaleString()
  const [hasPaidNotified, setHasPaidNotified] = useState(false)
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null)
  const initialBalanceRef = useRef<number>(currentBalanceNaira)
  const autoDetectedRef = useRef<boolean>(false)

  const queryClient = useQueryClient()
  const { success: toastSuccess, error: toastError } = useToast()
  const { rates: platformRates } = usePlatformRates()
  const simulateMutation = useSimulateVaultDeposit()
  const verifyMutation = useVerifyVaultFunding()

  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )

  useEffect(() => {
    if (isOpen) {
      initialBalanceRef.current = currentBalanceNaira
      autoDetectedRef.current = false
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Auto-detect incoming transfer via live balance update / SSE without needing to click "I Have Transferred"
  useEffect(() => {
    if (!isOpen || autoDetectedRef.current) return
    if (currentBalanceNaira > initialBalanceRef.current) {
      autoDetectedRef.current = true
      setHasPaidNotified(true)
      const delta = currentBalanceNaira - initialBalanceRef.current
      toastSuccess(`Deposit of ${formatCurrency(delta, 'NGN')} received and credited to your Rent Savings!`)
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('upward_dismissed_initial_deposit_prompt', 'true')
        } catch {}
      }
      const timer = setTimeout(() => {
        onClose()
      }, 900)
      return () => clearTimeout(timer)
    }
  }, [isOpen, currentBalanceNaira, onClose, toastSuccess])

  // Background polling every 6 seconds while modal is open (matching Rent Payment DVA auto-detection)
  useEffect(() => {
    if (!isOpen || !dedicatedAccount?.account_number) return
    let cancelled = false

    const interval = setInterval(async () => {
      if (cancelled || autoDetectedRef.current) return
      try {
        const res = await verifyRentVaultFunding()
        if (cancelled || autoDetectedRef.current) return
        const baselineKobo = Math.round(initialBalanceRef.current * 100)
        if (res.newly_reconciled > 0 || res.current_balance_kobo > baselineKobo) {
          autoDetectedRef.current = true
          setHasPaidNotified(true)
          await queryClient.invalidateQueries({ queryKey: RENT_VAULT_QUERY_KEY })
          toastSuccess('Deposit detected and credited to your Rent Savings!')
          if (typeof window !== 'undefined') {
            try {
              sessionStorage.setItem('upward_dismissed_initial_deposit_prompt', 'true')
            } catch {}
          }
          setTimeout(() => {
            if (!cancelled) onClose()
          }, 900)
        }
      } catch {
        // Silent background check
      }
    }, 6000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [isOpen, dedicatedAccount?.account_number, onClose, queryClient, toastSuccess])

  const handleClose = () => {
    setHasPaidNotified(false)
    setVerifyNotice(null)
    setCustomAmountOverride(null)
    onClose()
  }

  const handleQuietSkip = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('upward_dismissed_initial_deposit_prompt', 'true')
      } catch {}
    }
    handleClose()
  }

  if (!isOpen || !isClient || typeof document === 'undefined') return null

  const isNonProd = process.env.NODE_ENV !== 'production'
  const bankName = dedicatedAccount?.bank_name || 'Wema Bank'
  const accountNumber = dedicatedAccount?.account_number || (isNonProd ? '9012345678' : '')
  const accountName = dedicatedAccount?.account_name || 'Upward Rent Savings'

  const handleCopy = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedField('account')
    toastSuccess('Account number copied!')
    setTimeout(() => setCopiedField(null), 2500)
  }

  const handleDeposit = async () => {
    if (!isNonProd || !accountNumber) {
      return
    }
    const rawNumber = Number(customAmount.replace(/,/g, ''))
    if (!rawNumber || isNaN(rawNumber) || rawNumber < 1000) {
      toastError('Please enter a valid deposit amount (minimum ₦1,000)')
      return
    }
    const amountKobo = Math.round(rawNumber * 100)

    try {
      await simulateMutation.mutateAsync({
        accountNumber,
        amountKobo,
        depositKind: fundingMode,
      })
      toastSuccess(
        `Deposit of ${formatCurrency(rawNumber, 'NGN')} received! Investing into ARM MMF in the background — we'll notify you once confirmed.`,
      )
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('upward_dismissed_initial_deposit_prompt', 'true')
        } catch {}
      }
      onClose()
    } catch (err: unknown) {
      const error = err as { message?: string }
      toastError(error?.message || 'Failed to complete deposit. Please try again.')
    }
  }

  const handleIHavePaid = async () => {
    setVerifyNotice(null)
    try {
      const res = await verifyMutation.mutateAsync()
      await queryClient.invalidateQueries({ queryKey: RENT_VAULT_QUERY_KEY })

      const prevBalanceKobo = Math.round(currentBalanceNaira * 100)
      if (res.detected || res.current_balance_kobo > prevBalanceKobo) {
        setHasPaidNotified(true)
        toastSuccess('Deposit received and credited to your Rent Savings wallet!')
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('upward_dismissed_initial_deposit_prompt', 'true')
          } catch {}
        }
        setTimeout(() => {
          onClose()
        }, 800)
        return
      }

      setVerifyNotice(
        `No bank transfer detected on ${accountNumber} yet. Once your bank completes the transfer, your wallet will update automatically.`,
      )
    } catch {
      await queryClient.invalidateQueries({ queryKey: RENT_VAULT_QUERY_KEY })
      setVerifyNotice(
        `No bank transfer detected yet. Once your bank completes the transfer, your wallet will update automatically.`,
      )
    }
  }

  const parsedDepositAmount = Number(customAmount.replace(/,/g, '')) || 0
  const effectiveTargetRent = targetAmountNaira || 2_500_000
  const effectiveRunwayDays = Math.max(1, daysRemaining || 330)
  const effectiveRatePct =
    annualRatePct ||
    (productOption === 'RENT_PROTEC'
      ? platformRates.rentProtecRatePct
      : platformRates.savingsAnnualRatePct)

  const initialPlanPreview = calculatePayLessPlan(
    effectiveTargetRent,
    effectiveRunwayDays,
    'MONTHLY',
    currentBalanceNaira + parsedDepositAmount,
    effectiveRatePct,
    {
      productOption,
      planPattern: 'INITIAL_DEPOSIT',
      maxMonths: platformRates.maxSavingsMonths,
      minRentProtecMonths: platformRates.rentProtecMinMonths,
      insurancePremiumPct: platformRates.insurancePremiumPct,
      contractualDueDate,
      paydayDayOfMonth,
    },
  )

  const fixedMonthlyNaira =
    plannedMonthlyNaira > 0 ? plannedMonthlyNaira : initialPlanPreview.periodicDepositNaira
  const reducedMonthlyAfterExtraNaira = recalculateReducedMonthlyNaira({
    targetRentNaira: effectiveTargetRent,
    newBalanceNaira: currentBalanceNaira + parsedDepositAmount,
    activeDaysRemaining: effectiveRunwayDays,
    annualRatePct: effectiveRatePct,
    currentPlannedMonthlyNaira: fixedMonthlyNaira,
    maxMonths: platformRates.maxSavingsMonths,
    currentMonthAlreadyFulfilled: currentMonthFulfilled || fundingMode === 'EXTRA_TOPUP',
    contractualDueDate,
    paydayDayOfMonth,
  })
  const projectedInterestNaira = initialPlanPreview.projectedYieldNaira

  const modalTitle =
    fundingMode === 'MONTHLY'
      ? onTrackStatus === 'BEHIND'
        ? 'Catch Up on Your Plan'
        : 'Save to Stay on Plan'
      : fundingMode === 'EXTRA_TOPUP'
        ? 'Top Up Any Amount'
        : 'Pay Initial Deposit'

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={handleClose}
      title={modalTitle}
      icon={<Landmark size={20} color="var(--clay)" />}
      maxWidth="480px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0 8px' }}>
        {/* Dual Flow Tabs when user already has savings */}
        {currentBalanceNaira > 0 && (
          <div className="fund-mode-tabs" role="tablist" aria-label="Deposit type">
            <button
              type="button"
              role="tab"
              aria-selected={fundingMode === 'MONTHLY'}
              className={`fund-mode-tabs__btn ${
                fundingMode === 'MONTHLY' ? 'fund-mode-tabs__btn--active' : ''
              }`}
              onClick={() => setFundingMode('MONTHLY')}
            >
              Stay on plan
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={fundingMode === 'EXTRA_TOPUP'}
              className={`fund-mode-tabs__btn ${
                fundingMode === 'EXTRA_TOPUP' ? 'fund-mode-tabs__btn--active' : ''
              }`}
              onClick={() => setFundingMode('EXTRA_TOPUP')}
            >
              Top up any amount
            </button>
          </div>
        )}

        {/* Compact Amount Input */}
        <div>
          <div className="vault-sandbox-card__input-wrapper" style={{ height: 44 }}>
            <span className="vault-sandbox-card__currency-prefix" style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              ₦
            </span>
            <input
              id="quick-save-amount"
              type="text"
              inputMode="numeric"
              className="vault-sandbox-card__input"
              style={{ fontSize: '1.2rem', fontWeight: 700 }}
              placeholder="e.g. 250,000"
              value={customAmount}
              onChange={(e) => {
                const digits = e.target.value.replace(/[^0-9]/g, '')
                setCustomAmountOverride(digits ? Number(digits).toLocaleString() : '')
              }}
            />
          </div>

          {fundingMode === 'EXTRA_TOPUP' && (
            <div className="rent-protec-boost__pills" style={{ marginTop: 8 }}>
              {[50_000, 100_000, 250_000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="rent-protec-boost__pill"
                  onClick={() => setCustomAmountOverride(preset.toLocaleString())}
                >
                  ₦{(preset / 1000).toLocaleString()}k
                </button>
              ))}
            </div>
          )}

          {/* Predictable impact summary — zero "Est." abbreviations */}
          {parsedDepositAmount > 0 && effectiveTargetRent > 0 && (
            <div
              style={{
                fontSize: '0.8125rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.45,
                marginTop: 8,
                padding: '0 2px',
              }}
            >
              {fundingMode === 'MONTHLY' ? (
                isTargetReachedEarly ? (
                  <>
                    You&apos;ve already reached your rent target. Any extra top-up still earns{' '}
                    <strong>{effectiveRatePct}% p.a.</strong> compounded daily until rent day.
                  </>
                ) : onTrackStatus === 'BEHIND' ? (
                  <>
                    Saving <strong>{formatCurrency(parsedDepositAmount, 'NGN')}</strong> today
                    begins earning daily compound interest immediately and brings your plan back on
                    track.
                  </>
                ) : currentMonthFulfilled ? (
                  <>
                    You&apos;ve already completed this month&apos;s{' '}
                    <strong>{formatCurrency(fixedMonthlyNaira, 'NGN')}</strong> contribution. Switch
                    to <strong>Top up any amount</strong> to lower future payments and earn more
                    daily interest.
                  </>
                ) : currentMonthRemainingNaira > 0 &&
                  parsedDepositAmount < currentMonthRemainingNaira ? (
                  <>
                    Counts toward this month&apos;s{' '}
                    <strong>{formatCurrency(fixedMonthlyNaira, 'NGN')}</strong> target (
                    <strong>
                      {formatCurrency(currentMonthRemainingNaira - parsedDepositAmount, 'NGN')}
                    </strong>{' '}
                    left). Starts compounding daily at <strong>{effectiveRatePct}% p.a.</strong>{' '}
                    from today.
                  </>
                ) : (
                  <>
                    Completes this month&apos;s plan and starts earning{' '}
                    <strong>{effectiveRatePct}% p.a.</strong> compounded daily from today.
                  </>
                )
              ) : fundingMode === 'EXTRA_TOPUP' ? (
                reducedMonthlyAfterExtraNaira > 0 ? (
                  <>
                    Adding <strong>{formatCurrency(parsedDepositAmount, 'NGN')}</strong> today
                    earns daily compound interest and lowers your future monthly target from{' '}
                    <strong>{formatCurrency(fixedMonthlyNaira, 'NGN')}/mo</strong> to{' '}
                    <strong style={{ color: '#059669' }}>
                      {formatCurrency(reducedMonthlyAfterExtraNaira, 'NGN')}/mo
                    </strong>
                    .
                  </>
                ) : (
                  <>
                    Adding <strong>{formatCurrency(parsedDepositAmount, 'NGN')}</strong> today
                    reaches your <strong>{formatCurrency(effectiveTargetRent, 'NGN')}</strong> rent
                    target, and your balance keeps earning daily interest until rent day.
                  </>
                )
              ) : initialPlanPreview.periodicDepositNaira > 0 ? (
                <>
                  Start with <strong>{formatCurrency(parsedDepositAmount, 'NGN')}</strong> today,
                  then save{' '}
                  <strong style={{ color: 'var(--clay)' }}>
                    {formatCurrency(initialPlanPreview.periodicDepositNaira, 'NGN')}/mo
                  </strong>{' '}
                  <span style={{ color: '#059669', fontWeight: 600 }}>
                    (expected +{formatCurrency(projectedInterestNaira, 'NGN')} in daily compound
                    returns)
                  </span>
                  .
                </>
              ) : (
                <>
                  Adding <strong>{formatCurrency(parsedDepositAmount, 'NGN')}</strong> today
                  completes your <strong>{formatCurrency(effectiveTargetRent, 'NGN')}</strong> rent
                  target!
                </>
              )}
            </div>
          )}
        </div>

        {/* Compact Account Card */}
        {accountNumber ? (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              background: 'var(--surface2, #fbf9f6)',
              border: '1px solid var(--border-solid, #eee7df)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '0.02em', lineHeight: 1.2 }}>
                {accountNumber}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {bankName} · {accountName}
              </div>
            </div>
            <button
              type="button"
              className={`vault-dva-card__copy-btn ${copiedField === 'account' ? 'vault-dva-card__copy-btn--copied' : ''}`}
              style={{ padding: '6px 12px', fontSize: '0.75rem', height: 32, flexShrink: 0 }}
              onClick={() => handleCopy(accountNumber)}
            >
              {copiedField === 'account' ? (
                <>
                  <Check size={13} /> Copied
                </>
              ) : (
                <>
                  <Copy size={13} /> Copy
                </>
              )}
            </button>
          </div>
        ) : (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'var(--surface2, #fbf9f6)',
              border: '1px solid var(--border-solid, #eee7df)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
            }}
          >
            <Loader2 size={15} className="animate-spin" color="var(--clay)" />
            <span>Provisioning your dedicated funding account...</span>
          </div>
        )}

        {accountNumber && !hasPaidNotified && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              padding: '2px 2px 0',
            }}
          >
            <Loader2 size={13} className="animate-spin" color="var(--clay)" style={{ flexShrink: 0 }} />
            <span>Your deposit will be detected automatically once your transfer completes.</span>
          </div>
        )}

        {verifyNotice && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '10px',
              background: 'rgba(194, 80, 31, 0.06)',
              border: '1px solid rgba(194, 80, 31, 0.2)',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.45,
            }}
          >
            {verifyNotice}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
          <button
            type="button"
            className="vault-btn-primary"
            style={{ height: 44 }}
            onClick={handleIHavePaid}
            disabled={hasPaidNotified || verifyMutation.isPending || !accountNumber}
          >
            {verifyMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Checking Transfer...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>{hasPaidNotified ? 'Transfer Confirmed!' : 'I Have Transferred'}</span>
              </>
            )}
          </button>

          {isNonProd && accountNumber && (
            <button
              type="button"
              className="vault-btn-secondary"
              onClick={handleDeposit}
              disabled={simulateMutation.isPending}
              style={{ fontSize: '0.75rem', height: 36 }}
            >
              {simulateMutation.isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Simulating Transfer...
                </>
              ) : (
                <span>Simulate Instant Transfer (₦{customAmount || '0'})</span>
              )}
            </button>
          )}

          {/* Quiet Skip Link: faint, unobtrusive text link as hard to see as possible */}
          <div style={{ textAlign: 'center', marginTop: 2 }}>
            <button
              type="button"
              onClick={handleQuietSkip}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted, #94a3b8)',
                fontSize: '0.6875rem',
                fontWeight: 400,
                opacity: 0.35,
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '4px 8px',
                transition: 'opacity 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.7'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.35'
              }}
            >
              I&apos;ll fund later
            </button>
          </div>
        </div>
      </div>
    </BottomSheetModal>
  )
}
