'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Sparkles,
  Building,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useExecuteSettlement } from '../hooks/useRentSavings'
import { useToast } from '@/components/common/Toast'
import { SettlementSuccessModal } from './SettlementSuccessModal'

interface SettlementHubViewProps {
  vault: {
    vault_id: string
    current_balance_kobo: number
    principal_kobo: number
    accrued_yield_kobo: number
    target_amount_kobo: number
    contractual_due_date: string
    days_remaining: number
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
  const [successData, setSuccessData] = useState<any | null>(null)
  const [landlordNameSubmitted, setLandlordNameSubmitted] = useState<string>('')

  const { error: toastError, success: toastSuccess } = useToast()
  const settlementMutation = useExecuteSettlement()

  const currentBalanceNaira = vault.current_balance_kobo / 100
  const targetRentNaira = vault.target_amount_kobo / 100
  const accruedYieldNaira = vault.accrued_yield_kobo / 100
  const surplusNaira = Math.max(0, currentBalanceNaira - targetRentNaira)

  // 1.2x early bird bonus estimation (approx 0.6% on rent target)
  const estimatedCashbackNaira = targetRentNaira * 0.005 * 1.2

  const {
    register,
    handleSubmit,
    watch,
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

  const disburseSurplus = watch('disburseSurplusToWallet')

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
      setSuccessData(res.data)
      toastSuccess('Rent settlement authorized! Dispatched to landlord via NIP.')
    } catch (err: any) {
      toastError(err?.message || 'Settlement failed. Please verify landlord account details.')
    }
  }

  return (
    <div className="rent-savings">
      {/* Hero Settlement Banner */}
      <div className="settlement-hub-banner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="settlement-hub-banner__multiplier">
            <Sparkles size={14} />
            <span>1.2x Early-Bird Cashback Active</span>
          </div>
          <span style={{ fontSize: '0.8125rem', opacity: 0.85 }}>
            {vault.days_remaining} Days to Lease Due Date
          </span>
        </div>

        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: -0.5 }}>
            Settlement Hub (T-30 Window Open)
          </h2>
          <p style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: 4, lineHeight: 1.45 }}>
            Your rent savings are mature and ready for payout. Direct payment to your landlord
            unlocks an official legal receipt and credits your early-bird cashback bonus.
          </p>
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: 'var(--radius-md, 10px)',
            padding: '12px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Accumulated Vault Total</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
              {formatCurrency(currentBalanceNaira, 'NGN')}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Target Rent Due</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
              {formatCurrency(targetRentNaira, 'NGN')}
            </div>
          </div>
        </div>
      </div>

      {/* Daily Compounding Notice */}
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
          <strong>Daily Yield Continues:</strong> Your funds continue compounding at 14.5% p.a.
          right up until the exact second you authorize payment.
        </span>
      </div>

      {/* Landlord Payment Form */}
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

          {/* Surplus Toggle */}
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

          {/* Payout Breakdown Card */}
          <div className="vault-fee-breakdown" style={{ marginTop: 8 }}>
            <div className="vault-fee-breakdown__row">
              <span>Gross Payment to Landlord</span>
              <span style={{ fontWeight: 700 }}>{formatCurrency(targetRentNaira, 'NGN')}</span>
            </div>
            <div className="vault-fee-breakdown__row">
              <span>Estimated 1.2x Cashback Bonus</span>
              <span style={{ color: 'var(--clay)', fontWeight: 700 }}>
                +{formatCurrency(estimatedCashbackNaira, 'NGN')}
              </span>
            </div>
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
              : 'Authorize Rent Payout (Instant NIP)'}
            <ArrowRight size={18} />
          </button>
        </form>
      </div>

      {/* Screen 6: Success Modal */}
      {successData && (
        <SettlementSuccessModal
          data={successData}
          landlordName={landlordNameSubmitted}
          onClose={() => setSuccessData(null)}
          onRestartVault={onRestartVault}
        />
      )}
    </div>
  )
}
