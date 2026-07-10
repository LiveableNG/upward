'use client'

import React, { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, ShieldAlert } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import {
  PayFlowPrimaryButton,
  PayPageShell,
} from '@/features/dashboard/components/payment/PayPageShell'
import { CapacitorGuard } from '@/components/common/CapacitorGuard'
import { BiometricLoginButton } from '@/features/auth/component/BiometricLoginButton'
import { CheckoutRecipientCard } from './CheckoutRecipientCard'
import { CheckoutAmountHero, parseRentInput } from './CheckoutAmountHero'
import { CheckoutReceipt, type CheckoutReceiptRow } from './CheckoutReceipt'
import { CheckoutComparisonCards } from '@/features/premium/components/CheckoutComparisonCards'

const FEE_NAMES = new Set(['Processing Fee', 'Transaction Fee', 'Upward Benefits'])
const FEE_IDS = new Set([-2, -3])

function isFeeLine(name: string, id: number): boolean {
  return FEE_NAMES.has(name) || FEE_IDS.has(id)
}

interface BasicCheckoutViewProps {
  uuid: string
  paymentData: any
  currency: string
  totalOwed: number
  parsedAmount: number
  minRequired: number
  isBelowMin: boolean
  isValidAmount: boolean
  isFullPaymentRequired: boolean
  isUnderpaying: boolean
  isPendingRefund: boolean
  rates: {
    transactionFee: number
    benefitsFee: number
  }
  visibleAllocs: Array<{
    id: number
    name: string
    totalAmount: number
    amountPaid: number
    remaining: number
    allocated: number
  }>
  visibleLineItems: Array<{
    id: number
    name: string
    status?: string
  }>
  loginLoading: boolean
  authUser: { isIdentityVerified?: boolean } | null
  executeLogin: (email: string, pass: string) => void
  handleAllocationChange: (id: number, amount: number) => void
  onPayClick: () => void
  showPremiumOptions?: boolean
  isPremiumSelected?: boolean
  onSelectStandard?: () => void
  onSelectPremium?: () => void
  onManualPayClick?: () => void
  onCancelRequest?: () => void
}

export function BasicCheckoutView({
  uuid,
  paymentData,
  currency,
  totalOwed,
  parsedAmount,
  minRequired,
  isBelowMin,
  isValidAmount,
  isFullPaymentRequired,
  isUnderpaying,
  isPendingRefund,
  rates,
  visibleAllocs,
  visibleLineItems,
  loginLoading,
  authUser,
  executeLogin,
  handleAllocationChange,
  onPayClick,
  showPremiumOptions = false,
  isPremiumSelected = false,
  onSelectStandard,
  onSelectPremium,
  onManualPayClick,
  onCancelRequest,
}: BasicCheckoutViewProps) {
  const router = useRouter()

  const loginRequired = paymentData.hasPassword && !authUser
  const isGuest = !paymentData.hasPassword
  const isLoggedIn = !!authUser
  const canPayPartial =
    !!paymentData.payment.allowPartial && !isPendingRefund && !isGuest

  const accountName =
    paymentData.payment?.verifiedRecipientName ||
    paymentData.company?.name ||
    'Payment recipient'

  const bankName = paymentData.payment?.bankName as string | undefined
  const accountNumber = paymentData.payment?.accountNumber as string | undefined
  const accountMeta =
    bankName && accountNumber
      ? `${bankName} · ${accountNumber}`
      : paymentData.property?.locationAddress || paymentData.payment?.description || null

  const rentLineItems = useMemo(
    () => visibleLineItems.filter((item) => !isFeeLine(item.name, item.id)),
    [visibleLineItems],
  )

  const rentAllocations = useMemo(
    () => visibleAllocs.filter((alloc) => !isFeeLine(alloc.name, alloc.id)),
    [visibleAllocs],
  )

  const rentSubtotal = useMemo(
    () => rentAllocations.reduce((sum, alloc) => sum + alloc.allocated, 0),
    [rentAllocations],
  )

  const transactionFeeAmount = useMemo(() => {
    const feeAlloc = visibleAllocs.find(
      (a) => a.name === 'Transaction Fee' || a.id === -2,
    )
    return feeAlloc?.allocated ?? (rentSubtotal > 0 ? rates.transactionFee : 0)
  }, [visibleAllocs, rentSubtotal, rates.transactionFee])
  const benefitsFeeAmount = useMemo(() => {
    const benefitsAlloc = visibleAllocs.find(
      (a) =>
        a.id === -3 ||
        a.name === 'Upward Benefits' ||
        a.name === 'Rent Protection Insurance',
    )
    return benefitsAlloc?.allocated ?? 0
  }, [visibleAllocs])

  const heroEditable =
    canPayPartial && rentLineItems.length === 1 && !isPendingRefund

  const receiptRows: CheckoutReceiptRow[] = useMemo(() => {
    const rows: CheckoutReceiptRow[] = rentAllocations
      .filter((alloc) => alloc.allocated > 0 || canPayPartial)
      .map((alloc) => {
        const isPaid = visibleLineItems.find((i) => i.id === alloc.id)?.status === 'PAID'
        const multiRent = rentLineItems.length > 1
        return {
          id: alloc.id,
          name: alloc.name,
          amount: alloc.allocated,
          editable:
            canPayPartial &&
            !isPaid &&
            multiRent &&
            !isFeeLine(alloc.name, alloc.id),
          maxAmount: alloc.remaining,
        }
      })
      .filter((row) => row.amount > 0 || row.editable)

    if (transactionFeeAmount > 0 || rentSubtotal > 0) {
      rows.push({
        id: -2,
        name: 'Transaction fee',
        amount: transactionFeeAmount,
      })
    }
    if (benefitsFeeAmount > 0) {
      rows.push({
        id: -3,
        name: 'Rent Protection Insurance',
        amount: benefitsFeeAmount,
      })
    }

    return rows
  }, [
    rentAllocations,
    visibleLineItems,
    canPayPartial,
    rentLineItems.length,
    transactionFeeAmount,
    benefitsFeeAmount,
    rentSubtotal,
  ])

  const handleRentHeroChange = (value: string) => {
    const rent = parseRentInput(value)
    const primaryRent = rentLineItems[0]
    if (primaryRent) {
      handleAllocationChange(primaryRent.id, rent)
    }
  }

  const ctaLabel = () => {
    if (isPendingRefund) return 'Refund pending'
    if (parsedAmount === 0) return 'Enter amount to continue'
    if (isBelowMin) return `Minimum is ${formatCurrency(minRequired, currency)}`
    if (isUnderpaying) {
      return `Full payment required — ${formatCurrency(totalOwed, currency)}`
    }
    return `Pay ${formatCurrency(parsedAmount, currency)} now`
  }

  const ctaDisabled = !isValidAmount || isUnderpaying || isPendingRefund

  const handleBack = () => {
    if (authUser) {
      router.push('/dashboard')
      return
    }
    router.push('/')
  }

  return (
    <PayPageShell
      title="Pay Rent"
      showBack
      onBack={handleBack}
      pinFooter
      footer={
        !loginRequired && (isLoggedIn || isGuest) ? (
          <div className="flex flex-col gap-3 w-full">
            <PayFlowPrimaryButton onClick={onPayClick} disabled={ctaDisabled}>
              {ctaLabel()}
            </PayFlowPrimaryButton>
            
            {onManualPayClick && (
              <button
                type="button"
                className="btn btn--full btn--pill manual-upload-btn"
                onClick={onManualPayClick}
                disabled={ctaDisabled}
              >
                Upload payment proof
              </button>
            )}
            
            {onCancelRequest && (
              <button
                type="button"
                className="btn btn--ghost btn--full btn--pill"
                onClick={onCancelRequest}
              >
                Cancel payment request
              </button>
            )}

            <p 
              className="pay-flow__secure flex items-center justify-center gap-1.5 w-full text-center"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Lock size={12} /> Secured by Upward
            </p>
          </div>
        ) : undefined
      }
    >
      <CheckoutRecipientCard
        accountName={accountName}
        accountMeta={accountMeta}
        dueDate={paymentData.payment.dueDate}
        isVerified={!!paymentData.payment?.verifiedRecipientName}
      />
      <style jsx>{`
        .manual-upload-btn {
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 14px;
          height: 48px;
          background-color: var(--surface);
          border: 1px solid var(--border-solid);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          transition: all 0.2s ease;
        }
        .manual-upload-btn:hover:not(:disabled) {
          background-color: var(--clay-faint, #faf9f5);
          border-color: var(--clay);
          color: var(--clay);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
        }
      `}</style>

      {loginRequired ? (
        <div className="pay-flow__login-prompt">
          <p>This request is linked to an account. Log in to pay.</p>
          <button
            type="button"
            className="pay-flow__cta"
            onClick={() => router.push(`/login?redirect=/pay/${uuid}`)}
            disabled={loginLoading}
          >
            <Lock size={16} />
            {loginLoading ? 'Logging in…' : 'Log in to pay'}
          </button>
          <CapacitorGuard>
            <BiometricLoginButton onAuthenticated={(email, pass) => executeLogin(email, pass)} />
          </CapacitorGuard>
        </div>
      ) : (
        <>
          {isPendingRefund ? (
            <div className="pay-flow__alert pay-flow__alert--error">
              <ShieldAlert size={18} />
              <div>
                <strong>Refund action required</strong>
                <p>
                  An underpayment was detected. A refund is pending for this
                  payment request.
                </p>
              </div>
            </div>
          ) : null}

          {showPremiumOptions ? (
            <CheckoutComparisonCards
              currency={currency}
              transactionFee={rates.transactionFee}
              benefitsFee={rates.benefitsFee}
              isPremiumSelected={isPremiumSelected}
              onSelectStandard={onSelectStandard || (() => {})}
              onSelectPremium={onSelectPremium || (() => {})}
            />
          ) : null}

          {canPayPartial ? (
            <CheckoutAmountHero
              currency={currency}
              rentAmount={rentSubtotal}
              editable={heroEditable}
              canPayPartial={canPayPartial}
              isBelowMin={isBelowMin}
              isFullPaymentRequired={isFullPaymentRequired}
              minRequired={minRequired}
              onRentChange={handleRentHeroChange}
            />
          ) : null}

          <CheckoutReceipt
            rows={receiptRows}
            total={parsedAmount}
            currency={currency}
            onRowChange={canPayPartial ? handleAllocationChange : undefined}
          />
        </>
      )}
    </PayPageShell>
  )
}
