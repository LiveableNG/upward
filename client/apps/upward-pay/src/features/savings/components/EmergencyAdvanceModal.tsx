'use client'

import React, { useState, useEffect, useMemo, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, AlertCircle, Clock, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { formatCurrency } from '@/lib/utils'
import { useDisburseAdvance } from '../hooks/useRentSavings'
import type { EmergencyAdvanceResultData } from '../services/savingsService'
import { useToast } from '@/components/common/Toast'
import { api } from '@/lib/api'

interface EmergencyAdvanceModalProps {
  vaultId: string
  currentBalanceKobo?: number
  maxBorrowableKobo: number
  hasActiveLoan: boolean
  onClose: () => void
}

const advanceFormSchema = z.object({
  amountKobo: z.number().positive(),
  destinationBankCode: z.string().min(1, 'Please select a destination bank'),
  destinationAccountNumber: z
    .string()
    .min(10, 'Account number must be 10 digits')
    .max(10, 'Account number must be 10 digits')
    .regex(/^\d{10}$/, 'Must be numeric 10-digit NUBAN'),
})

type AdvanceFormData = z.infer<typeof advanceFormSchema>

const POPULAR_BANKS = [
  { code: '058', name: 'Guaranty Trust Bank (GTBank)' },
  { code: '044', name: 'Access Bank' },
  { code: '057', name: 'Zenith Bank' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '033', name: 'United Bank for Africa (UBA)' },
  { code: '035', name: 'Wema Bank' },
  { code: '090267', name: 'Kuda Bank' },
  { code: '999992', name: 'OPay Digital Services' },
  { code: '999991', name: 'PalmPay' },
  { code: '214', name: 'First City Monument Bank (FCMB)' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '232', name: 'Sterling Bank' },
  { code: '221', name: 'Stanbic IBTC Bank' },
]

const emptySubscribe = () => () => {}

export function EmergencyAdvanceModal({
  vaultId,
  maxBorrowableKobo,
  hasActiveLoan,
  onClose,
}: EmergencyAdvanceModalProps) {
  const [borrowAmountKobo, setBorrowAmountKobo] = useState<number>(
    Math.min(maxBorrowableKobo, Math.max(1000000, Math.floor(maxBorrowableKobo * 0.5))),
  )
  const [successData, setSuccessData] = useState<EmergencyAdvanceResultData | null>(null)

  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )

  const { error: toastError, success: toastSuccess } = useToast()
  const disburseMutation = useDisburseAdvance()

  const { data: banksData, isLoading: isLoadingBanks } = useQuery({
    queryKey: ['banks'],
    queryFn: () => api.getBanks(),
    staleTime: 1000 * 60 * 30,
  })

  const bankList = useMemo(() => {
    if (Array.isArray(banksData) && banksData.length > 0) {
      const map = new Map<string, string>()
      for (const b of POPULAR_BANKS) {
        map.set(b.code, b.name)
      }
      for (const b of banksData as { code: string; name: string }[]) {
        if (b.code && b.name && !map.has(b.code)) {
          map.set(b.code, b.name)
        }
      }
      return Array.from(map.entries()).map(([code, name]) => ({ code, name }))
    }
    return POPULAR_BANKS
  }, [banksData])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AdvanceFormData>({
    resolver: zodResolver(advanceFormSchema),
    defaultValues: {
      amountKobo: borrowAmountKobo,
      destinationBankCode: '058',
      destinationAccountNumber: '',
    },
  })

  const destinationBankCode = useWatch({
    control,
    name: 'destinationBankCode',
  })
  const destinationAccountNumber = useWatch({
    control,
    name: 'destinationAccountNumber',
  })

  const rawAccountNumber = (destinationAccountNumber || '').replace(/\D/g, '')

  const {
    data: resolvedData,
    isLoading: isResolving,
    error: resolveQueryError,
  } = useQuery({
    queryKey: ['resolve-account', rawAccountNumber, destinationBankCode],
    queryFn: () => api.resolveAccount(rawAccountNumber, destinationBankCode),
    enabled: rawAccountNumber.length === 10 && Boolean(destinationBankCode),
    staleTime: 1000 * 60 * 10,
    retry: 1,
  })

  const resolvedAccountName =
    resolvedData?.accountName ||
    resolvedData?.account_name ||
    resolvedData?.data?.account_name ||
    null

  const resolveError = resolveQueryError
    ? (resolveQueryError as { message?: string })?.message ||
      'Could not verify account name. Check details.'
    : null

  const facilityFeeKobo = Math.round(borrowAmountKobo * 0.035)
  const totalRepayableKobo = borrowAmountKobo + facilityFeeKobo

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    setBorrowAmountKobo(val)
    setValue('amountKobo', val)
  }

  const onSubmit = async (data: AdvanceFormData) => {
    if (!resolvedAccountName) {
      toastError('Please wait for account name verification before proceeding')
      return
    }

    try {
      const res = await disburseMutation.mutateAsync({
        vaultId,
        payload: {
          amount_kobo: borrowAmountKobo,
          destination_bank_code: data.destinationBankCode,
          destination_account_number: data.destinationAccountNumber,
        },
      })
      setSuccessData(res)
      toastSuccess('Emergency advance successfully sent to your bank!')
    } catch (err: unknown) {
      const error = err as { message?: string }
      toastError(error?.message || 'Failed to disburse emergency advance')
    }
  }

  const canSubmit =
    !isSubmitting &&
    !disburseMutation.isPending &&
    maxBorrowableKobo >= 1000000 &&
    Boolean(resolvedAccountName) &&
    !isResolving

  if (!isClient || typeof document === 'undefined') return null

  return createPortal(
    <div className="vault-modal-overlay" onClick={onClose}>
      <div className="vault-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="vault-modal-header">
          <span className="vault-modal-title">Emergency Cash Advance</span>
          <button type="button" className="vault-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {hasActiveLoan ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="rent-calculator__affordability">
              <AlertCircle size={20} />
              <div>
                <strong>Active Advance In Progress</strong>
                <p style={{ marginTop: 4 }}>
                  You already have an outstanding emergency advance. You can request a new one once
                  your current advance is repaid.
                </p>
              </div>
            </div>
            <button type="button" className="vault-btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        ) : successData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center' }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.1)',
                color: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
              }}
            >
              <CheckCircle2 size={30} />
            </div>

            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)' }}>
                {formatCurrency(successData.borrowed_amount_kobo / 100, 'NGN')} Sent to Your Bank
                Account
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Reference: {successData.payout_transfer_reference}
              </p>
            </div>

            <div className="vault-fee-breakdown">
              <div className="vault-fee-breakdown__row">
                <span>Service Fee (3.5%)</span>
                <span>{formatCurrency(successData.facility_fee_kobo / 100, 'NGN')}</span>
              </div>
              <div className="vault-fee-breakdown__row vault-fee-breakdown__row--total">
                <span>Total to Repay in 30 Days</span>
                <span>{formatCurrency(successData.total_repayable_kobo / 100, 'NGN')}</span>
              </div>
              <div className="vault-fee-breakdown__row">
                <span>Due Date</span>
                <span>
                  {new Date(successData.repayment_due_date).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            <button type="button" className="vault-btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div
              style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}
            >
              Borrow up to <strong>40% ({formatCurrency(maxBorrowableKobo / 100, 'NGN')})</strong>{' '}
              against your rent savings for urgent needs. Your savings keep growing while you handle
              the emergency.
            </div>

            <div className="vault-slider-group">
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}
              >
                <span
                  style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}
                >
                  Borrow Amount
                </span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--clay)' }}>
                  {formatCurrency(borrowAmountKobo / 100, 'NGN')}
                </span>
              </div>
              <input
                type="range"
                className="vault-slider"
                min={1000000}
                max={Math.max(1000000, maxBorrowableKobo)}
                step={500000}
                value={borrowAmountKobo}
                onChange={handleSliderChange}
                disabled={maxBorrowableKobo < 1000000}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                }}
              >
                <span>₦10,000</span>
                <span>Max: {formatCurrency(maxBorrowableKobo / 100, 'NGN')}</span>
              </div>
            </div>

            <div className="vault-fee-breakdown">
              <div className="vault-fee-breakdown__row">
                <span>Borrow Amount</span>
                <span>{formatCurrency(borrowAmountKobo / 100, 'NGN')}</span>
              </div>
              <div className="vault-fee-breakdown__row">
                <span>Service Fee (3.5%)</span>
                <span>{formatCurrency(facilityFeeKobo / 100, 'NGN')}</span>
              </div>
              <div className="vault-fee-breakdown__row vault-fee-breakdown__row--total">
                <span>Total to Repay in 30 Days</span>
                <span>{formatCurrency(totalRepayableKobo / 100, 'NGN')}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="rent-calculator__field">
                <label className="rent-calculator__label">
                  Destination Bank {isLoadingBanks && '(Loading...)'}
                </label>
                <select
                  {...register('destinationBankCode')}
                  className="rent-calculator__input rent-calculator__input--no-prefix"
                >
                  {bankList.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
                {errors.destinationBankCode && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--error)' }}>
                    {errors.destinationBankCode.message}
                  </span>
                )}
              </div>

              <div className="rent-calculator__field">
                <label className="rent-calculator__label">Account Number (NUBAN)</label>
                <div className="rent-calculator__input-wrapper">
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="10-digit account number"
                    {...register('destinationAccountNumber')}
                    className="rent-calculator__input rent-calculator__input--no-prefix"
                  />
                </div>

                {isResolving && (
                  <div className="vault-account-resolving">
                    <Loader2 size={13} className="animate-spin" />
                    <span>Verifying account details with Paystack...</span>
                  </div>
                )}

                {!isResolving && resolvedAccountName && (
                  <div className="vault-account-verified">
                    <CheckCircle2 size={15} />
                    <span>Verified: {resolvedAccountName}</span>
                  </div>
                )}

                {!isResolving && resolveError && rawAccountNumber.length === 10 && (
                  <div className="vault-account-error">
                    <AlertCircle size={14} />
                    <span>{resolveError}</span>
                  </div>
                )}

                {errors.destinationAccountNumber && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--error)' }}>
                    {errors.destinationAccountNumber.message}
                  </span>
                )}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                lineHeight: 1.4,
              }}
            >
              <Clock size={15} color="var(--clay)" style={{ flexShrink: 0 }} />
              <span>Repay within 30 days. You can repay early anytime with zero fees.</span>
            </div>

            <button type="submit" className="vault-btn-primary" disabled={!canSubmit}>
              {disburseMutation.isPending
                ? 'Sending Cash...'
                : isResolving
                  ? 'Verifying Account...'
                  : 'Get Cash Now'}
              <ArrowRight size={18} />
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}
