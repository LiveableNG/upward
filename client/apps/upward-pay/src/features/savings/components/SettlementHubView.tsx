'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Award, ArrowRight, TrendingUp, AlertCircle, PlusCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useExecuteSettlement, useSavingsOnboardingPrefill } from '../hooks/useRentSavings'
import type {
  SavingsPlanPattern,
  SavingsProductOption,
  SettlementResultData,
} from '../services/savingsService'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/features/auth/AuthContext'
import { usePlatformRates } from '@/features/payments/hooks/usePlatformRates'
import { SettlementSuccessModal } from './SettlementSuccessModal'
import { FundVaultModal } from './FundVaultModal'

interface SettlementHubViewProps {
  vault: {
    vault_id: string
    current_balance_kobo: number
    principal_kobo: number
    accrued_yield_kobo: number
    target_amount_kobo: number
    contractual_due_date: string
    days_remaining: number
    annual_yield_rate_pct?: number
    product_option?: SavingsProductOption
    plan_pattern?: SavingsPlanPattern
    preferred_payday_day?: number
    dedicated_account?: {
      bank_name: string
      account_number: string
      account_name: string
      assignment_status?: string
    } | null
  }
  onRestartVault: () => void
}

const settlementFormSchema = z.object({
  landlordName: z.string().min(3, 'Landlord or agency name is required'),
  landlordBankCode: z.string().min(3, 'Please select a recipient bank'),
  landlordAccountNumber: z.string().length(10, 'Account number must be exactly 10 digits'),
  propertyAddress: z.string().min(5, 'Property address is required for receipt generation'),
  disburseSurplusToWallet: z.boolean(),
})

type SettlementFormData = z.infer<typeof settlementFormSchema>

export function SettlementHubView({ vault, onRestartVault }: SettlementHubViewProps) {
  const router = useRouter()
  const [successData, setSuccessData] = useState<SettlementResultData | null>(null)
  const [landlordNameSubmitted, setLandlordNameSubmitted] = useState<string>('')
  const [showTopUpModal, setShowTopUpModal] = useState(false)

  const { error: toastError, success: toastSuccess } = useToast()
  const { user } = useAuth()
  const { rates: platformRates } = usePlatformRates()
  const annualRate = vault.annual_yield_rate_pct ?? platformRates?.savingsAnnualRatePct ?? 16
  const { data: prefill } = useSavingsOnboardingPrefill(true)
  const settlementMutation = useExecuteSettlement()

  const currentBalanceNaira = vault.current_balance_kobo / 100
  const targetRentNaira = vault.target_amount_kobo / 100
  const amountSendingNowNaira = Math.min(currentBalanceNaira, targetRentNaira)
  const shortfallNaira = Math.max(0, targetRentNaira - currentBalanceNaira)
  const isShortfall = shortfallNaira > 0
  const surplusNaira = Math.max(0, currentBalanceNaira - targetRentNaira)
  const estimatedCashbackNaira = isShortfall ? 0 : targetRentNaira * 0.005 * 1.2

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<SettlementFormData>({
    resolver: zodResolver(settlementFormSchema),
    defaultValues: {
      landlordName: '',
      landlordBankCode: '058',
      landlordAccountNumber: '',
      propertyAddress: '',
      disburseSurplusToWallet: true,
    },
  })

  useEffect(() => {
    const activeProperty = (user?.properties || []).find(
      (p: {
        isPastTenancy?: boolean
        address?: string
        landlordFirstName?: string
        landlordLastName?: string
        landlordBankCode?: string
        landlordAccountNumber?: string
      }) => !p.isPastTenancy,
    ) as
      | {
          address?: string
          landlordFirstName?: string
          landlordLastName?: string
          landlordBankCode?: string
          landlordAccountNumber?: string
        }
      | undefined

    const currentValues = getValues()
    const prefillLandlordName =
      prefill?.property?.landlord_name ||
      [activeProperty?.landlordFirstName, activeProperty?.landlordLastName]
        .filter(Boolean)
        .join(' ')
    const prefillBankCode =
      prefill?.property?.landlord_bank_code || activeProperty?.landlordBankCode
    const prefillAccountNum =
      prefill?.property?.landlord_account_number || activeProperty?.landlordAccountNumber
    const prefillAddress =
      prefill?.property?.address || prefill?.property?.name || activeProperty?.address

    if (prefillLandlordName && !currentValues.landlordName) {
      setValue('landlordName', prefillLandlordName)
    }
    if (prefillBankCode) {
      setValue('landlordBankCode', prefillBankCode)
    }
    if (prefillAccountNum && !currentValues.landlordAccountNumber) {
      setValue('landlordAccountNumber', prefillAccountNum)
    }
    if (prefillAddress && !currentValues.propertyAddress) {
      setValue('propertyAddress', prefillAddress)
    }
  }, [prefill, user?.properties, setValue, getValues])

  const onSubmit = async (data: SettlementFormData) => {
    try {
      setLandlordNameSubmitted(data.landlordName)
      const res = await settlementMutation.mutateAsync({
        vaultId: vault.vault_id,
        payload: {
          landlord_name: data.landlordName,
          landlord_bank_code: data.landlordBankCode,
          landlord_account_number: data.landlordAccountNumber,
          property_address: data.propertyAddress,
          disburse_surplus_to_wallet: data.disburseSurplusToWallet,
        },
      })
      setSuccessData(res)
      if (res.is_partial_settlement || (res.remaining_balance_kobo ?? 0) > 0) {
        toastSuccess(
          `Paid ${formatCurrency((res.amount_paid_to_landlord_kobo || 0) / 100, 'NGN')} from savings. Complete your remaining rent balance next.`,
        )
      } else {
        toastSuccess('Rent settlement authorized! Dispatched to landlord via NIP.')
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      toastError(error?.message || 'Settlement failed. Please verify landlord account details.')
    }
  }

  return (
    <div className="rent-savings">
      <div className="settlement-hub-banner">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          {isShortfall ? (
            <div
              className="settlement-hub-banner__multiplier"
              style={{ background: '#FEF3C7', color: '#B45309' }}
            >
              <AlertCircle size={14} />
              <span>{formatCurrency(shortfallNaira, 'NGN')} Short of Full Rent</span>
            </div>
          ) : (
            <div className="settlement-hub-banner__multiplier">
              <Award size={14} />
              <span>1.2x Early-Bird Cashback Active</span>
            </div>
          )}
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {vault.days_remaining} Days to Lease Due Date
          </span>
        </div>

        <div>
          <h2
            style={{
              fontSize: '1.375rem',
              fontWeight: 800,
              letterSpacing: -0.4,
              color: 'var(--text)',
            }}
          >
            {isShortfall ? 'Complete & Pay Your Rent' : 'Pay Your Landlord (Rent Ready)'}
          </h2>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              marginTop: 4,
              lineHeight: 1.45,
            }}
          >
            {isShortfall
              ? `Your savings cover ${formatCurrency(currentBalanceNaira, 'NGN')} of your ${formatCurrency(targetRentNaira, 'NGN')} rent. Transfer the remaining ${formatCurrency(shortfallNaira, 'NGN')} into your savings account to pay in full, or send your savings now and pay the balance immediately after.`
              : 'Your rent savings are ready for settlement. Sending rent directly to your landlord generates an official rent receipt and credits your early-bird cashback bonus to your wallet.'}
          </p>
        </div>

        <div
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md, 10px)',
            padding: '12px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Total Saved + Interest
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)' }}>
              {formatCurrency(currentBalanceNaira, 'NGN')}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Rent Due</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--clay)' }}>
              {formatCurrency(targetRentNaira, 'NGN')}
            </div>
          </div>
        </div>

        {isShortfall && (
          <div
            style={{
              background: '#FFF7ED',
              border: '1px solid rgba(194, 80, 31, 0.25)',
              borderRadius: 'var(--radius-md, 12px)',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text)' }}>
                Remaining balance needed to pay in full
              </span>
              <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--clay)' }}>
                {formatCurrency(shortfallNaira, 'NGN')}
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
              Transfer {formatCurrency(shortfallNaira, 'NGN')} to your dedicated rent account so we can pay your full {formatCurrency(targetRentNaira, 'NGN')} rent in one transfer.
            </p>
            <button
              type="button"
              className="vault-btn-primary"
              onClick={() => setShowTopUpModal(true)}
            >
              <PlusCircle size={17} />
              <span>Transfer {formatCurrency(shortfallNaira, 'NGN')} Balance First</span>
            </button>
          </div>
        )}
      </div>

      <div
        style={{
          background: 'rgba(34, 197, 94, 0.08)',
          border: '1px solid rgba(34, 197, 94, 0.2)',
          borderRadius: 'var(--radius-md, 12px)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          color: 'var(--success)',
          fontSize: '0.8125rem',
        }}
      >
        <TrendingUp size={20} style={{ flexShrink: 0 }} />
        <span>
          <strong>Daily Yield Continues:</strong> Your funds continue compounding at {annualRate}% p.a.
          right up until the exact second you authorize payment.
        </span>
      </div>

      <div className="rent-calculator__card">
        <h3 className="rent-calculator__title">Landlord Verification & Payout</h3>
        <p className="rent-calculator__subtitle">
          Enter your landlord or estate agency&apos;s verified NUBAN details. We execute an instant
          NIP transfer and generate your proof of tenancy payment.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="rent-calculator__form">
          <div className="rent-calculator__field">
            <label className="rent-calculator__label">Landlord or Property Manager Name</label>
            <div className="rent-calculator__input-wrapper">
              <input
                type="text"
                placeholder="e.g. Alhaji Musa (Property Owner)"
                {...register('landlordName')}
                className="rent-calculator__input rent-calculator__input--no-prefix"
              />
            </div>
            {errors.landlordName && (
              <span style={{ fontSize: '0.75rem', color: 'var(--error)' }}>
                {errors.landlordName.message}
              </span>
            )}
          </div>

          <div className="rent-calculator__field">
            <label className="rent-calculator__label">Recipient Bank</label>
            <select
              {...register('landlordBankCode')}
              className="rent-calculator__input rent-calculator__input--no-prefix"
            >
              <option value="058">Guaranty Trust Bank (GTBank)</option>
              <option value="011">First Bank of Nigeria</option>
              <option value="033">United Bank for Africa (UBA)</option>
              <option value="057">Zenith Bank</option>
              <option value="035">Wema Bank</option>
              <option value="044">Access Bank</option>
              <option value="214">First City Monument Bank (FCMB)</option>
              <option value="070">Fidelity Bank</option>
              <option value="232">Sterling Bank</option>
            </select>
            {errors.landlordBankCode && (
              <span style={{ fontSize: '0.75rem', color: 'var(--error)' }}>
                {errors.landlordBankCode.message}
              </span>
            )}
          </div>

          <div className="rent-calculator__field">
            <label className="rent-calculator__label">Landlord Account Number (NUBAN)</label>
            <div className="rent-calculator__input-wrapper">
              <input
                type="text"
                maxLength={10}
                placeholder="0123456789"
                {...register('landlordAccountNumber')}
                className="rent-calculator__input rent-calculator__input--no-prefix"
              />
            </div>
            {errors.landlordAccountNumber && (
              <span style={{ fontSize: '0.75rem', color: 'var(--error)' }}>
                {errors.landlordAccountNumber.message}
              </span>
            )}
          </div>

          <div className="rent-calculator__field">
            <label className="rent-calculator__label">Rented Property Address</label>
            <div className="rent-calculator__input-wrapper">
              <input
                type="text"
                placeholder="e.g. Flat 4B, Blue Water Court, Lekki Phase 1"
                {...register('propertyAddress')}
                className="rent-calculator__input rent-calculator__input--no-prefix"
              />
            </div>
            {errors.propertyAddress && (
              <span style={{ fontSize: '0.75rem', color: 'var(--error)' }}>
                {errors.propertyAddress.message}
              </span>
            )}
          </div>

          {surplusNaira > 0 && (
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                background: 'var(--surface)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md, 10px)',
                border: '1px solid var(--border)',
              }}
            >
              <input
                type="checkbox"
                {...register('disburseSurplusToWallet')}
                style={{ width: 18, height: 18, accentColor: 'var(--clay)' }}
              />
              <div style={{ fontSize: '0.8125rem', color: 'var(--text)' }}>
                <strong>Send surplus yield (+{formatCurrency(surplusNaira, 'NGN')})</strong>{' '}
                directly to my Upward Wallet
              </div>
            </label>
          )}

          <div className="vault-fee-breakdown" style={{ marginTop: 8 }}>
            <div className="vault-fee-breakdown__row">
              <span>{isShortfall ? 'Sending from Savings Now' : 'Gross Payment to Landlord'}</span>
              <span style={{ fontWeight: 700 }}>{formatCurrency(amountSendingNowNaira, 'NGN')}</span>
            </div>
            {isShortfall ? (
              <div className="vault-fee-breakdown__row">
                <span>Remaining Balance to Pay Next</span>
                <span style={{ color: 'var(--clay)', fontWeight: 700 }}>
                  {formatCurrency(shortfallNaira, 'NGN')}
                </span>
              </div>
            ) : (
              <div className="vault-fee-breakdown__row">
                <span>Estimated 1.2x Cashback Bonus</span>
                <span style={{ color: 'var(--clay)', fontWeight: 700 }}>
                  +{formatCurrency(estimatedCashbackNaira, 'NGN')}
                </span>
              </div>
            )}
            <div className="vault-fee-breakdown__row vault-fee-breakdown__row--total">
              <span>NIP Instant Transfer Fee</span>
              <span>₦0.00 (Covered by Upward)</span>
            </div>
          </div>

          <button
            type="submit"
            className="vault-btn-primary"
            disabled={isSubmitting || settlementMutation.isPending}
            style={{ marginTop: 8 }}
          >
            {settlementMutation.isPending
              ? 'Executing Transfer...'
              : isShortfall
                ? `Pay ${formatCurrency(amountSendingNowNaira, 'NGN')} Now & Complete Balance Next`
                : 'Authorize Rent Payout (Instant NIP)'}
            <ArrowRight size={18} />
          </button>
        </form>
      </div>

      {successData && (
        <SettlementSuccessModal
          data={successData}
          landlordName={landlordNameSubmitted}
          onClose={() => {
            const isPartial =
              Boolean(successData.is_partial_settlement) ||
              (successData.remaining_balance_kobo ?? 0) > 0
            setSuccessData(null)
            if (isPartial) {
              router.push('/dashboard')
            }
          }}
          onRestartVault={onRestartVault}
          onPayRemainingBalance={(paymentRequestUuid) => {
            setSuccessData(null)
            if (paymentRequestUuid) {
              router.push(`/dashboard/pay-rent?paymentUuid=${encodeURIComponent(paymentRequestUuid)}`)
            } else {
              router.push('/dashboard/pay-rent')
            }
          }}
        />
      )}

      <FundVaultModal
        isOpen={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
        initialFundingMode="EXTRA_TOPUP"
        recommendedAmountNaira={Math.ceil(shortfallNaira)}
        plannedMonthlyNaira={Math.ceil(shortfallNaira)}
        suggestedTodayNaira={Math.ceil(shortfallNaira)}
        dedicatedAccount={vault.dedicated_account}
        targetAmountNaira={targetRentNaira}
        daysRemaining={Math.max(1, vault.days_remaining)}
        contractualDueDate={vault.contractual_due_date}
        paydayDayOfMonth={vault.preferred_payday_day ?? 28}
        annualRatePct={annualRate}
        productOption={vault.product_option || 'SAVE_AND_EARN'}
        planPattern={vault.plan_pattern || 'INITIAL_DEPOSIT'}
        currentBalanceNaira={currentBalanceNaira}
      />
    </div>
  )
}
