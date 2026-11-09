'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, AlertCircle, Clock, CheckCircle2, ArrowRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useDisburseAdvance } from '../hooks/useRentSavings'
import { useToast } from '@/components/common/Toast'

interface EmergencyAdvanceModalProps {
  vaultId: string
  currentBalanceKobo: number
  maxBorrowableKobo: number
  hasActiveLoan: boolean
  onClose: () => void
}

const advanceFormSchema = z.object({
  amountKobo: z.number().positive(),
  destinationBankCode: z.string().min(3, 'Bank code is required'),
  destinationAccountNumber: z.string().length(10, 'Account number must be 10 digits'),
})

type AdvanceFormData = z.infer<typeof advanceFormSchema>

export function EmergencyAdvanceModal({
  vaultId,
  currentBalanceKobo,
  maxBorrowableKobo,
  hasActiveLoan,
  onClose,
}: EmergencyAdvanceModalProps) {
  const [borrowAmountKobo, setBorrowAmountKobo] = useState<number>(
    Math.min(maxBorrowableKobo, Math.max(1000000, Math.floor(maxBorrowableKobo * 0.5))),
  )
  const [successData, setSuccessData] = useState<any | null>(null)

  const { error: toastError, success: toastSuccess } = useToast()
  const disburseMutation = useDisburseAdvance()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AdvanceFormData>({
    resolver: zodResolver(advanceFormSchema),
    defaultValues: {
      amountKobo: borrowAmountKobo,
      destinationBankCode: '058', // GTBank default / sample
      destinationAccountNumber: '',
    },
  })

  const facilityFeeKobo = Math.round(borrowAmountKobo * 0.035)
  const totalRepayableKobo = borrowAmountKobo + facilityFeeKobo

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    setBorrowAmountKobo(val)
    setValue('amountKobo', val)
  }

  const onSubmit = async (data: AdvanceFormData) => {
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
      toastSuccess('Emergency advance successfully disbursed!')
    } catch (err: any) {
      toastError(err?.message || 'Failed to disburse emergency advance')
    }
  }

  return (
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
                  You currently have an outstanding emergency advance on this rent vault. You can
                  request a new advance once the existing loan is repaid.
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
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.1)',
                color: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
              }}
            >
              <CheckCircle2 size={32} />
            </div>

            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>
                {formatCurrency(successData.borrowed_amount_kobo / 100, 'NGN')} Disbursed
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Instant NIP Transfer Reference: {successData.payout_transfer_reference}
              </p>
            </div>

            <div className="vault-fee-breakdown">
              <div className="vault-fee-breakdown__row">
                <span>Facility Fee (3.5%)</span>
                <span>{formatCurrency(successData.facility_fee_kobo / 100, 'NGN')}</span>
              </div>
              <div className="vault-fee-breakdown__row vault-fee-breakdown__row--total">
                <span>Total Repayable</span>
                <span>{formatCurrency(successData.total_repayable_kobo / 100, 'NGN')}</span>
              </div>
              <div className="vault-fee-breakdown__row">
                <span>Due Date (30 Days)</span>
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
            style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
          >
            {/* Limit Cap Notice */}
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Draw up to <strong>40% ({formatCurrency(maxBorrowableKobo / 100, 'NGN')})</strong> of
              your accumulated mutual fund collateral for an emergency. Your principal continues
              working.
            </div>

            {/* Slider Section */}
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
                min={1000000} // Min ₦10,000
                max={Math.max(1000000, maxBorrowableKobo)}
                step={500000} // ₦5,000 steps
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

            {/* Transparent Fee & Term Breakdown */}
            <div className="vault-fee-breakdown">
              <div className="vault-fee-breakdown__row">
                <span>Borrowed Capital</span>
                <span>{formatCurrency(borrowAmountKobo / 100, 'NGN')}</span>
              </div>
              <div className="vault-fee-breakdown__row">
                <span>Facility Fee (3.5% flat)</span>
                <span>{formatCurrency(facilityFeeKobo / 100, 'NGN')}</span>
              </div>
              <div className="vault-fee-breakdown__row vault-fee-breakdown__row--total">
                <span>Total Repayable (in 30 days)</span>
                <span>{formatCurrency(totalRepayableKobo / 100, 'NGN')}</span>
              </div>
            </div>

            {/* Destination Bank Account */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="rent-calculator__field">
                <label className="rent-calculator__label">Destination Bank</label>
                <select
                  {...register('destinationBankCode')}
                  className="rent-calculator__input rent-calculator__input--no-prefix"
                >
                  <option value="058">Guaranty Trust Bank (GTBank)</option>
                  <option value="011">First Bank of Nigeria</option>
                  <option value="033">United Bank for Africa (UBA)</option>
                  <option value="057">Zenith Bank</option>
                  <option value="035">Wema Bank</option>
                  <option value="044">Access Bank</option>
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
                    placeholder="0123456789"
                    {...register('destinationAccountNumber')}
                    className="rent-calculator__input rent-calculator__input--no-prefix"
                  />
                </div>
                {errors.destinationAccountNumber && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--error)' }}>
                    {errors.destinationAccountNumber.message}
                  </span>
                )}
              </div>
            </div>

            {/* 30-Day SLA & Late fee warning */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                lineHeight: 1.45,
              }}
            >
              <Clock size={16} color="var(--warning)" style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                30-day fixed repayment tenure. Repayment is automatically deducted on day 30 or can
                be repaid manually at any time with zero prepayment penalties. Late defaults incur
                0.1%/day late charges.
              </span>
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              className="vault-btn-primary"
              disabled={isSubmitting || disburseMutation.isPending || maxBorrowableKobo < 1000000}
            >
              {disburseMutation.isPending
                ? 'Processing Transfer...'
                : 'Disburse Cash (Instant NIP)'}
              <ArrowRight size={18} />
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
