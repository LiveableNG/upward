'use client'

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, ShieldAlert, Info, UserCheck } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import {
  PayFlowPrimaryButton,
  PayPageShell,
} from '@/features/dashboard/components/payment/PayPageShell'
import { RentInvoiceCard } from './RentInvoiceCard'
import { type CheckoutReceiptRow } from './CheckoutReceipt'

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
  onPayClick: () => Promise<void> | void
  onReloadDetails?: () => Promise<void> | void
  onSettledSuccess?: (isFullSettlement?: boolean) => void
  onManualPayClick?: () => void
  onCancelRequest?: () => void
  cancelLoading?: boolean
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
  onReloadDetails,
  onSettledSuccess,
  onManualPayClick,
  onCancelRequest,
  cancelLoading = false,
}: BasicCheckoutViewProps) {
  const router = useRouter()
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const loginRequired = Boolean(paymentData?.hasPassword && !authUser)
  const isGuest = Boolean(!paymentData?.hasPassword)
  const isLoggedIn = Boolean(authUser)
  const canPayPartial =
    Boolean(paymentData?.payment?.allowPartial) && !isPendingRefund && isLoggedIn

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

  const netPayable = parsedAmount

  const handleProceedToPay = async () => {
    onPayClick()
  }

  const receiptRows: CheckoutReceiptRow[] = useMemo(() => {
    const rows: CheckoutReceiptRow[] = rentAllocations
      .filter((alloc) => alloc.allocated > 0 || canPayPartial)
      .map((alloc) => {
        const isPaid = visibleLineItems.find((i) => i.id === alloc.id)?.status === 'PAID'
        return {
          id: alloc.id,
          name: alloc.name,
          amount: alloc.allocated,
          editable:
            canPayPartial &&
            !isPaid &&
            !isFeeLine(alloc.name, alloc.id),
          maxAmount: alloc.remaining,
        }
      })
      .filter((row) => row.amount > 0 || row.editable)

    if (transactionFeeAmount > 0) {
      rows.push({
        id: -2,
        name: 'Transaction fee',
        amount: transactionFeeAmount,
      })
    }

    return rows
  }, [
    rentAllocations,
    visibleLineItems,
    canPayPartial,
    transactionFeeAmount,
  ])

  const ctaLabel = () => {
    if (isPendingRefund) return 'Refund pending'
    if (netPayable === 0) return 'Enter amount to continue'
    if (isBelowMin) return `Minimum is ${formatCurrency(minRequired, currency)}`
    if (isUnderpaying) {
      return `Full payment required — ${formatCurrency(totalOwed, currency)}`
    }
    return `Pay ${formatCurrency(netPayable, currency)} now`
  }

  const hasNoLineItems = rentLineItems.length === 0 && (paymentData.payment?.amount > 0)
  const ctaDisabled = !isValidAmount || isUnderpaying || isPendingRefund || hasNoLineItems

  const handleBack = () => {
    if (authUser) {
      router.push('/dashboard')
      return
    }
    router.push('/')
  }

  const tenantEmail = paymentData?.user?.email || null

  return (
    <PayPageShell
      title="Rent Invoice"
      showBack
      onBack={handleBack}
      pinFooter
      footer={
        loginRequired ? (
          <div className="pay-flow__checkout-footer">
            <PayFlowPrimaryButton
              onClick={() => router.push(`/login?redirect=/pay/${uuid}`)}
              disabled={loginLoading}
            >
              <Lock size={15} style={{ marginRight: 6, display: 'inline-block', verticalAlign: '-1px' }} />
              {loginLoading ? 'Logging in…' : 'Log in to pay'}
            </PayFlowPrimaryButton>

            <p className="pay-flow__secure">
              <Lock size={12} /> Secured by Upward
            </p>
          </div>
        ) : (isLoggedIn || isGuest) ? (
          <div className="pay-flow__checkout-footer">
            <PayFlowPrimaryButton
              onClick={handleProceedToPay}
              disabled={ctaDisabled || cancelLoading}
            >
              {ctaLabel()}
            </PayFlowPrimaryButton>

            {onManualPayClick && (
              <button
                type="button"
                className="pay-flow__manual-upload-btn"
                onClick={onManualPayClick}
                disabled={ctaDisabled || cancelLoading}
              >
                Upload payment proof
              </button>
            )}

            {onCancelRequest && (
              <button
                type="button"
                className="pay-flow__cancel-link"
                onClick={() => setShowCancelConfirm(true)}
                disabled={cancelLoading}
              >
                Cancel this request
              </button>
            )}

            <p className="pay-flow__secure">
              <Lock size={12} /> Secured by Upward
            </p>
          </div>
        ) : undefined
      }
    >
      {/* ── 1. Context Notice Banner: Account Linked vs Guest Checkout ── */}
      {loginRequired && (
        <div className="pay-flow__notice-banner pay-flow__notice-banner--account">
          <div className="pay-flow__notice-banner-icon">
            <Lock size={16} />
          </div>
          <div className="pay-flow__notice-banner-body">
            <div className="pay-flow__notice-banner-title">Account linked to invoice</div>
            <div className="pay-flow__notice-banner-sub">
              This payment request is linked to {tenantEmail ? <strong>{tenantEmail}</strong> : 'your Upward account'}. Sign in to complete payment.
            </div>
          </div>
        </div>
      )}

      {isGuest && (
        <div className="pay-flow__notice-banner pay-flow__notice-banner--guest">
          <div className="pay-flow__notice-banner-icon">
            <UserCheck size={16} />
          </div>
          <div className="pay-flow__notice-banner-body">
            <div className="pay-flow__notice-banner-title">Guest Rent Payment</div>
            <div className="pay-flow__notice-banner-sub">
              Pay directly without an account. You’ll receive an official verified receipt and your Rent Passport™ will be created automatically.
            </div>
          </div>
          <span className="pay-flow__notice-banner-tag">Guest</span>
        </div>
      )}

      {/* ── 2. Validation / Refund Alerts ── */}
      {hasNoLineItems ? (
        <div className="pay-flow__alert pay-flow__alert--error" style={{ marginBottom: 16 }}>
          <ShieldAlert size={18} />
          <div>
            <strong>Invalid Invoice</strong>
            <p>
              This payment request has no line items. Please contact your property manager to regenerate the invoice.
            </p>
          </div>
        </div>
      ) : null}

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

      {/* ── 3. Rent Invoice Document (Visible in ALL states) ── */}
      <RentInvoiceCard
        paymentData={paymentData}
        currency={currency}
        totalOwed={totalOwed}
        parsedAmount={netPayable}
        receiptRows={receiptRows}
        canPayPartial={canPayPartial}
        isBelowMin={isBelowMin}
        minRequired={minRequired}
        onAllocationChange={canPayPartial ? handleAllocationChange : undefined}
      />

      {/* ── 4. In-flow login card for unauthenticated account holders ── */}
      {loginRequired && (
        <div className="pay-flow__login-prompt" style={{ marginTop: 14 }}>
          <p>
            Sign in to your Upward account to pay this invoice and build your verified Rent Passport™ credit history.
          </p>
          <button
            type="button"
            className="pay-flow__cta"
            onClick={() => router.push(`/login?redirect=/pay/${uuid}`)}
            disabled={loginLoading}
          >
            <Lock size={16} />
            {loginLoading ? 'Logging in…' : 'Log in to pay'}
          </button>
        </div>
      )}

      {/* ── 5. Cancellation Confirmation Modal ── */}
      {showCancelConfirm ? (
        <div className="pay-flow__modal-overlay">
          <div className="pay-flow__modal">
            <div className="pay-flow__modal-icon">
              <Info size={28} />
            </div>
            <h3 className="pay-flow__modal-title">Cancel this request?</h3>
            <p className="pay-flow__modal-text">
              This payment request will be cancelled. You can start a new one anytime from Pay Rent.
            </p>
            <div className="pay-flow__modal-actions">
              <button
                type="button"
                className="pay-flow__btn-secondary"
                onClick={() => setShowCancelConfirm(false)}
                disabled={cancelLoading}
              >
                Keep paying
              </button>
              <PayFlowPrimaryButton
                disabled={cancelLoading}
                loading={cancelLoading}
                onClick={() => {
                  onCancelRequest?.()
                }}
              >
                Yes, cancel
              </PayFlowPrimaryButton>
            </div>
          </div>
        </div>
      ) : null}
    </PayPageShell>
  )
}
