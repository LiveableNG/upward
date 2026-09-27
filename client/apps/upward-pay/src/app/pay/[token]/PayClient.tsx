'use client'

import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  Lock,
  CreditCard,
  ArrowRight,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  X
} from 'lucide-react'
import { formatCurrency, generateId } from '@/lib/utils'
import { UpwardLogo } from '@/components/PoweredByUpward'
import PaystackEmbeddedCheckout from '@/features/dashboard/components/payment/PaystackEmbeddedCheckout'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import FallbackSuspense from '@/components/FallbackSuspense'
import { PayCheckoutSkeleton } from '@/features/payments/components/unified-pay/PayCheckoutSkeleton'
import { CapacitorGuard } from '@/components/common/CapacitorGuard'

import { InvoiceHeader } from '@/features/payments/components/unified-pay/InvoiceHeader'
import { AmountDetailCard } from '@/features/payments/components/unified-pay/AmountDetailCard'
import { PaymentInput } from '@/features/payments/components/unified-pay/PaymentInput'
import { AllocationBreakdown } from '@/features/payments/components/unified-pay/AllocationBreakdown'
import { SuccessStep } from '@/features/payments/components/unified-pay/SuccessStep'
import { OnboardingStep } from '@/features/payments/components/unified-pay/OnboardingStep'
import { SettledStep } from '@/features/payments/components/unified-pay/SettledStep'
import { UploadProofOfPayment } from '@/features/payments/components/unified-pay/UploadProofOfPayment'
import { StatusStep } from '@/features/payments/components/unified-pay/StatusStep'
import { RenewalModal } from '@/features/payments/components/unified-pay/RenewalModal'
import { usePaymentFlow } from '@/features/payments/hooks/usePaymentFlow'
import { useCheckoutVariant } from '@/features/premium/components/LaunchDarklyProvider'
import { useCheckoutExperimentTracking } from '@/features/premium/hooks/useCheckoutExperimentTracking'
import { CHECKOUT_EXPERIMENT_EVENTS } from '@/features/premium/utils/checkoutExperimentTracking'
import { BasicCheckoutView } from '@/features/payments/components/unified-pay/BasicCheckoutView'
import { isSelfInitiatedPayment } from '@/features/dashboard/components/payment/paymentOrigin'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/common/Toast'
import { api } from '@/lib/api'

export default function PayClient({ overrideToken }: { overrideToken?: string }) {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const onlineOnly = searchParams.get('method') === 'online'
  const {
    variant,
    isReady: isCheckoutVariantReady,
    isBasicCheckout,
    isPremiumCheckout,
  } = useCheckoutVariant()
  const { track } = useCheckoutExperimentTracking()
  const [showUnverifiedModal, setShowUnverifiedModal] = React.useState(false)
  const [checkoutAmount, setCheckoutAmount] = React.useState<number | null>(null)
  const [checkoutLineItems, setCheckoutLineItems] = React.useState<Array<{ name: string; amountPaid: number }> | null>(null)
  const queryClient = useQueryClient()
  const { success: toastSuccess, error: toastError } = useToast()
  const checkoutViewedRef = useRef(false)

  const uuid = useMemo(() => {
    if (overrideToken) return overrideToken
    const t = params?.token
    if (Array.isArray(t)) return t[0]
    return t as string
  }, [params?.token, overrideToken])

  const onPaymentConfirmed = useCallback(
    (isPremiumSelected: boolean) => {
      track(
        CHECKOUT_EXPERIMENT_EVENTS.PAYMENT_COMPLETED,
        variant,
        isPremiumSelected,
      )
    },
    [track, variant],
  )

  const {
    step, setStep,
    paymentData,
    lineItems,
    errorMessage,
    showPassword, setShowPassword,
    isSubmitting,
    amountInput,
    showBreakdown, setShowBreakdown,
    showRenewalModal, setShowRenewalModal,
    formData, setFormData,
    totalOwed,
    parsedAmount,
    lastConfirmedAmount,
    minRequired,
    isBelowMin,
    isValidAmount,
    isFullPaymentRequired,
    isUnderpaying,
    currency,
    effectiveAllocs,
    finalLineItemPayments,
    progressPct,
    handleAmountChange,
    handleAllocationChange,
    handlePaymentSuccess,
    handleActivation,
    handleCancelRequest,
    loadPaymentDetails,
    loginLoading,
    executeLogin,
    authUser,
    isPendingRefund,
    isBenefitsOptedIn,
    setIsBenefitsOptedIn,
    rates
  } = usePaymentFlow(uuid, {
    forceBenefitsOptOut: isBasicCheckout,
    onPaymentConfirmed,
  })

  // Logged-in tenants choose online vs bank transfer in the dashboard wizard.
  // Online-only deep links (?method=online) stay on this checkout page.
  useEffect(() => {
    if (!uuid || onlineOnly) return
    if (!authUser || !paymentData) return
    if (step !== 'invoice') return
    router.replace(`/dashboard/pay-rent?paymentUuid=${encodeURIComponent(uuid)}`)
  }, [uuid, onlineOnly, authUser, paymentData, step, router])

  useEffect(() => {
    checkoutViewedRef.current = false
  }, [uuid])

  useEffect(() => {
    if (step !== 'invoice' || !paymentData || !isCheckoutVariantReady) return
    if (checkoutViewedRef.current) return

    checkoutViewedRef.current = true
    track(
      CHECKOUT_EXPERIMENT_EVENTS.VIEWED,
      variant,
      isBenefitsOptedIn,
    )
  }, [
    step,
    paymentData,
    isCheckoutVariantReady,
    variant,
    isBenefitsOptedIn,
    track,
  ])

  const handlePayClick = useCallback(async () => {
    if (!paymentData) return

    const isGuest = !paymentData.hasPassword
    const verificationOn = paymentData?.user?.verificationOn ?? true
    const hasPaidBefore = (paymentData?.user?.paidRequestsCount ?? 0) >= 1

    if (
      verificationOn &&
      authUser &&
      !authUser.isIdentityVerified &&
      !isGuest &&
      hasPaidBefore
    ) {
      setShowUnverifiedModal(true)
      return
    }

    track(
      CHECKOUT_EXPERIMENT_EVENTS.PAYMENT_STARTED,
      variant,
      isBenefitsOptedIn,
    )
    setStep('checkout')
  }, [
    paymentData,
    authUser,
    track,
    variant,
    isBenefitsOptedIn,
    setStep,
  ])

  useEffect(() => {
    if ((isBasicCheckout || rates.benefitsPaid) && isBenefitsOptedIn) {
      setIsBenefitsOptedIn(false)
    }
  }, [isBasicCheckout, isBenefitsOptedIn, rates.benefitsPaid, setIsBenefitsOptedIn])

  const showBenefitsUI = isPremiumCheckout && !rates.benefitsPaid
  const renameBenefitsLabel = (name: string) =>
    isPremiumCheckout && name === 'Upward Benefits'
      ? 'Rent Protection Insurance'
      : name
  const visibleLineItems = useMemo(
    () => {
      let items = isBasicCheckout ? lineItems.filter((item) => item.name !== 'Upward Benefits') : lineItems
      if (rates.transactionFee === 0) {
        items = items.filter((item) => item.id !== -2 && item.name !== 'Transaction Fee')
      }
      return items.map((item) => ({
        ...item,
        name: renameBenefitsLabel(item.name),
      }))
    },
    [isBasicCheckout, isPremiumCheckout, lineItems, rates.transactionFee],
  )
  const visibleAllocs = useMemo(
    () => {
      let allocs = isBasicCheckout
        ? effectiveAllocs.filter((alloc) => alloc.name !== 'Upward Benefits')
        : effectiveAllocs
      if (rates.transactionFee === 0) {
        allocs = allocs.filter((alloc) => alloc.id !== -2 && alloc.name !== 'Transaction Fee')
      }
      return allocs.map((alloc) => ({
        ...alloc,
        name: renameBenefitsLabel(alloc.name),
      }))
    },
    [isBasicCheckout, isPremiumCheckout, effectiveAllocs, rates.transactionFee],
  )

  if (step === 'loading') return <PayCheckoutSkeleton />

  if (step === 'error') {
    return (
      <StatusStep
        title="Link Expired"
        message={errorMessage || 'This payment link is no longer valid or has expired.'}
        type="error"
        onAction={() => router.push('/')}
        actionLabel="Return Home"
      />
    )
  }

  if (step === 'cancelled') {
    return (
      <StatusStep
        title="Request Cancelled"
        message="This payment request has been cancelled by the property manager and is no longer valid."
        type="cancelled"
        onAction={() => router.push('/')}
        actionLabel="Return Home"
      />
    )
  }

  if (step === 'checkout') {
    return (
      <div className="checkout-view flex items-center justify-center min-h-screen bg-[var(--bg)] relative overflow-y-auto p-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-[var(--clay-faint)] rounded-full blur-[120px] opacity-50 pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-[var(--clay-faint)] rounded-full blur-[120px] opacity-50 pointer-events-none" />

        <div className="w-full max-w-[540px] my-auto z-10">
          <div className="bg-white rounded-[40px] overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.1)] border border-[var(--border-solid)] animate-in zoom-in-95 fade-in duration-500 max-h-[calc(100vh-32px)] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <PaystackEmbeddedCheckout
              email={paymentData.user.email}
              amount={checkoutAmount ?? parsedAmount}
              gatewayFee={0}
              currency={currency}
              companyName={paymentData.company?.name}
              paymentRequestUuid={uuid}
              onSuccess={handlePaymentSuccess}
              onClose={() => {
                setCheckoutAmount(null)
                setCheckoutLineItems(null)
                setStep('invoice')
              }}
              lineItems={(checkoutLineItems ?? finalLineItemPayments).map(p => ({ name: p.name, amount: p.amountPaid }))}
            />
          </div>
        </div>
      </div>
    )
  }

  if (step === 'manual-transfer') {
    return (
      <PayPageShell
        title="Upload Payment Proof"
        showBack
        onBack={() => setStep('invoice')}
      >
        <div className="manual-transfer-wrapper">
          {/* Transfer Instructions */}
          <div className="manual-transfer-section">
            <h2 className="manual-transfer-title">Manual Bank Transfer</h2>
            <p className="manual-transfer-desc">
              Please transfer {formatCurrency(parsedAmount, currency)} to the account below, then upload your proof of payment.
            </p>
          </div>

          {/* Upload Component */}
          {paymentData?.payment?.latestProof?.status === 'PENDING' ? (
            <div className="manual-transfer-section manual-transfer-review">
              <h4 className="manual-transfer-review-title">Payment Proof In Review</h4>
              <p className="manual-transfer-review-desc">
                Your submitted proof of payment is currently being reviewed. You will be notified once it is approved. Please wait for the review to complete before submitting another.
              </p>
              <button className="btn btn--secondary btn--sm btn--pill" onClick={() => setStep('invoice')}>Back to Invoice</button>
            </div>
          ) : (
            <div className="manual-transfer-upload-wrapper">
              <UploadProofOfPayment 
                paymentRequestUuid={paymentData?.payment?.uuid}
                userPropertyUuid={paymentData?.payment?.userPropertyUuid}
                amount={parsedAmount}
                currency={currency}
                lineItems={finalLineItemPayments}
                bankName={paymentData?.property?.manualAccount?.bankName || ''}
                accountName={paymentData?.property?.manualAccount?.accountName || paymentData?.company?.name || 'Property Manager'}
                accountNumber={paymentData?.property?.manualAccount?.accountNumber || '0000000000'}
                onCancel={() => setStep('invoice')}
                onSuccess={() => setStep('success-manual')}
              />
            </div>
          )}
        </div>
        <style jsx>{`
          .manual-transfer-wrapper {
            display: flex;
            flex-direction: column;
            gap: 24px;
            width: 100%;
          }
          .manual-transfer-section {
            background: var(--surface);
            padding: 24px;
            border-radius: 24px;
            border: none;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          }
          .manual-transfer-title {
            font-size: 18px;
            font-weight: 700;
            color: var(--text);
            margin-bottom: 8px;
          }
          .manual-transfer-desc {
            font-size: 14px;
            color: var(--text-secondary);
            margin-bottom: 24px;
            line-height: 1.5;
          }
          .manual-transfer-box {
            background: var(--bg);
            padding: 20px;
            border-radius: 16px;
            border: 1px solid var(--border-solid);
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .manual-transfer-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .manual-transfer-label {
            font-size: 14px;
            font-weight: 500;
            color: var(--text-muted);
          }
          .manual-transfer-value {
            font-size: 14px;
            font-weight: 700;
            color: var(--text);
            text-align: right;
            max-width: 60%;
            word-break: break-word;
          }
          .manual-transfer-highlight {
            font-size: 18px;
            font-weight: 800;
            letter-spacing: 0.05em;
            color: var(--clay);
          }
          .manual-transfer-review {
            text-align: center;
          }
          .manual-transfer-review-title {
            font-size: 16px;
            font-weight: 700;
            color: var(--text);
            margin-bottom: 8px;
          }
          .manual-transfer-review-desc {
            font-size: 14px;
            color: var(--text-secondary);
            margin-bottom: 16px;
          }
          .manual-transfer-upload-wrapper {
            background: var(--surface);
            padding: 24px;
            border-radius: 24px;
            border: none;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          }
        `}</style>
      </PayPageShell>
    )
  }

  if (step === 'onboarding') {
    return (
      <OnboardingStep
        formData={formData}
        setFormData={setFormData}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        isSubmitting={isSubmitting}
        companyName={paymentData.company?.name || 'Upward Platform'}
        handleActivation={handleActivation}
        type={paymentData.payment?.amount === paymentData.payment?.amountPaid ? 'invite' : 'payment'}
        remainingBalance={totalOwed - parsedAmount}
        currency={currency}
      />
    )
  }

  if (step === 'already-paid') {
    return (
      <SettledStep
        amountPaid={paymentData.payment.amountPaid}
        currency={currency}
        companyName={paymentData.company?.name || 'Upward Platform'}
        description={paymentData.payment.description || 'Housing Invoice'}
        onDashboard={() => {
          if (authUser) {
            router.replace('/dashboard')
          } else {
            router.push('/login')
          }
        }}
        onOnboarding={() => setStep('onboarding')}
        isLoggedIn={!!authUser}
        hasAccount={paymentData.hasPassword}
      />
    )
  }

  if (step === 'success') {
    return (
      <SuccessStep
        finalAmount={lastConfirmedAmount || parsedAmount}
        currency={currency}
        companyName={paymentData.company.name}
        isPendingRefund={isPendingRefund}
        onDone={() => {
          if (authUser) {
            router.replace('/dashboard')
          } else {
            window.location.href = '/dashboard'
          }
        }}
      />
    )
  }

  if (step === 'success-manual') {
    return (
      <SuccessStep
        finalAmount={parsedAmount}
        currency={currency}
        companyName={paymentData.company.name}
        isManualReview={true}
        onDone={() => router.push('/dashboard')}
      />
    )
  }

  if (step === 'processing') return <FallbackSuspense message="Finalizing payment..." />

  if (step === 'invoice' && !isCheckoutVariantReady && isPremiumCheckout) {
    return <PayCheckoutSkeleton />
  }

  if (step === 'invoice' && paymentData) {
    const loginRequired = paymentData.hasPassword && !authUser
    const isGuest = !paymentData.hasPassword
    const isLoggedIn = !!authUser

    const checkoutModals = (
      <>
        {paymentData?.property && (
          <RenewalModal
            isOpen={showRenewalModal}
            propertyUuid={paymentData.property.uuid}
            onClose={() => setShowRenewalModal(false)}
            onRenewed={() => {
              setShowRenewalModal(false)
              loadPaymentDetails()
            }}
          />
        )}


        {showUnverifiedModal && (
          <div className="modal-overlay" onClick={() => setShowUnverifiedModal(false)}>
            <div className="modal-card animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="modal-card__header">
                <div className="modal-card__badge" style={{ background: 'var(--error)' }}>
                  VERIFICATION REQUIRED
                </div>
                <button className="modal-card__close" onClick={() => setShowUnverifiedModal(false)}>
                  <X size={16} />
                </button>
              </div>
              <div className="modal-card__body py-6 text-center">
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                  <div style={{ background: '#fee2e2', color: 'var(--error)', borderRadius: '50%', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldAlert size={36} />
                  </div>
                </div>
                <h3 className="modal-card__title" style={{ fontSize: '20px', fontWeight: 800 }}>Verify Your Identity</h3>
                <p className="modal-card__text" style={{ marginTop: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  To comply with financial regulations and secure your transactions, you must verify your identity using your Bank Verification Number (BVN) before completing payments.
                </p>
                <div style={{ background: 'var(--surface)', borderRadius: '12px', padding: '12px', marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}>
                  <Lock size={16} style={{ flexShrink: 0, color: 'var(--clay)' }} />
                  <span>Your BVN is only used for one-time verification. <strong>We do not save your BVN number</strong>.</span>
                </div>
              </div>
              <div className="modal-card__footer flex flex-col gap-3 pt-2">
                <button
                  className="btn btn--primary btn--full btn--pill"
                  onClick={() => {
                    setShowUnverifiedModal(false)
                    router.push(`/dashboard/verify-identity?redirect=${encodeURIComponent(`/pay/${uuid}`)}`)
                  }}
                >
                  Verify Identity Now <ArrowRight size={16} />
                </button>
                <button
                  className="btn btn--ghost btn--full btn--pill"
                  onClick={() => setShowUnverifiedModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )

    const isSelfInitiated = isSelfInitiatedPayment({
      description: paymentData?.payment?.description,
      company_name: paymentData?.company?.name,
      manager_name: paymentData?.manager
        ? `${paymentData.manager.firstName || ''} ${paymentData.manager.lastName || ''}`.trim()
        : null,
    })

    return (
      <>
        <BasicCheckoutView
          uuid={uuid}
          paymentData={paymentData}
          currency={currency}
          totalOwed={totalOwed}
          parsedAmount={parsedAmount}
          minRequired={minRequired}
          isBelowMin={isBelowMin}
          isValidAmount={isValidAmount}
          isFullPaymentRequired={isFullPaymentRequired}
          isUnderpaying={isUnderpaying}
          isPendingRefund={isPendingRefund}
          rates={rates}
          visibleAllocs={visibleAllocs}
          visibleLineItems={visibleLineItems}
          loginLoading={loginLoading}
          authUser={authUser}
          executeLogin={executeLogin}
          handleAllocationChange={handleAllocationChange}
          onPayClick={handlePayClick}
          onReloadDetails={loadPaymentDetails}
          onSettledSuccess={(isFull) => {
            if (isFull) {
              setStep('already-paid')
            } else {
              loadPaymentDetails()
            }
          }}
          onCancelRequest={isSelfInitiated ? handleCancelRequest : undefined}
          cancelLoading={isSelfInitiated ? isSubmitting : false}
        />
        {checkoutModals}
      </>
    )
  }

  return null
}
