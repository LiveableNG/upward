'use client'

import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Lock,
  CreditCard,
  ArrowRight,
  ChevronRight,
  ShieldAlert,
  X
} from 'lucide-react'
import { formatCurrency, generateId } from '@/lib/utils'
import { UpwardLogo } from '@/components/PoweredByUpward'
import PaystackEmbeddedCheckout from '@/features/dashboard/components/payment/PaystackEmbeddedCheckout'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import FallbackSuspense from '@/components/FallbackSuspense'
import { CapacitorGuard } from '@/components/common/CapacitorGuard'
import { BiometricLoginButton } from '@/features/auth/component/BiometricLoginButton'

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
import { useToast } from '@/components/common/Toast'
import { useCheckoutVariant } from '@/features/premium/components/LaunchDarklyProvider'
import { useCheckoutExperimentTracking } from '@/features/premium/hooks/useCheckoutExperimentTracking'
import { CHECKOUT_EXPERIMENT_EVENTS } from '@/features/premium/utils/checkoutExperimentTracking'
import { CheckoutComparisonCards } from '@/features/premium/components/CheckoutComparisonCards'
import { BasicCheckoutView } from '@/features/payments/components/unified-pay/BasicCheckoutView'

export default function PayClient({ overrideToken }: { overrideToken?: string }) {
  const router = useRouter()
  const params = useParams()
  const {
    variant,
    isReady: isCheckoutVariantReady,
    isBasicCheckout,
    isPremiumCheckout,
  } = useCheckoutVariant()
  const { track } = useCheckoutExperimentTracking()
  const { error } = useToast()
  const [showUnverifiedModal, setShowUnverifiedModal] = React.useState(false)
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

  const handlePayClick = useCallback(() => {
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
    variant,
    isBenefitsOptedIn,
    track,
    setStep,
  ])

  const handleManualPayClick = useCallback(() => {
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

    const hasManualAccount = !!paymentData?.property?.manualAccount
    const isVerifiedProperty = !!paymentData?.property?.isVerified

    if (!hasManualAccount) {
      if (isVerifiedProperty) {
        error('The property manager has not configured a manual payment account.')
      } else {
        error('Please set up your manual bank account in Rental details first.')
        router.push('/dashboard/setup')
      }
      return
    }

    track(
      CHECKOUT_EXPERIMENT_EVENTS.PAYMENT_STARTED,
      variant,
      isBenefitsOptedIn,
    )
    setStep('manual-transfer')
  }, [
    paymentData,
    authUser,
    variant,
    isBenefitsOptedIn,
    track,
    setStep,
  ])

  useEffect(() => {
    if (isBasicCheckout && isBenefitsOptedIn) {
      setIsBenefitsOptedIn(false)
    }
  }, [isBasicCheckout, isBenefitsOptedIn, setIsBenefitsOptedIn])

  const showBenefitsUI = isPremiumCheckout
  const renameBenefitsLabel = (name: string) =>
    isPremiumCheckout && name === 'Upward Benefits'
      ? 'Rent Protection Insurance'
      : name
  const visibleLineItems = useMemo(
    () =>
      (isBasicCheckout ? lineItems.filter((item) => item.name !== 'Upward Benefits') : lineItems).map((item) => ({
        ...item,
        name: renameBenefitsLabel(item.name),
      })),
    [isBasicCheckout, isPremiumCheckout, lineItems],
  )
  const visibleAllocs = useMemo(
    () =>
      (isBasicCheckout
        ? effectiveAllocs.filter((alloc) => alloc.name !== 'Upward Benefits')
        : effectiveAllocs
      ).map((alloc) => ({
        ...alloc,
        name: renameBenefitsLabel(alloc.name),
      })),
    [isBasicCheckout, isPremiumCheckout, effectiveAllocs],
  )

  if (step === 'loading') return <FallbackSuspense message="Retrieving secure payment details..." />

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
      <div className="checkout-view flex items-center justify-center min-h-screen bg-[var(--bg)] relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-[var(--clay-faint)] rounded-full blur-[120px] opacity-50 pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-[var(--clay-faint)] rounded-full blur-[120px] opacity-50 pointer-events-none" />

        <div className="w-full max-w-[540px] px-4 py-8 z-10">
          <div className="bg-white rounded-[40px] overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.1)] border border-[var(--border-solid)] animate-in zoom-in-95 fade-in duration-500">
            <PaystackEmbeddedCheckout
              email={paymentData.user.email}
              amount={parsedAmount}
              gatewayFee={0}
              currency={currency}
              companyName={paymentData.company?.name}
              paymentRequestUuid={uuid}
              onSuccess={handlePaymentSuccess}
              onClose={() => setStep('invoice')}
              lineItems={finalLineItemPayments.map(p => ({ name: p.name, amount: p.amountPaid }))}
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
                amount={totalOwed}
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
        onDashboard={() => router.push(authUser ? '/dashboard' : '/login')}
        onOnboarding={() => setStep('onboarding')}
        isLoggedIn={!!authUser}
        hasAccount={paymentData.hasPassword}
      />
    )
  }

  if (step === 'success') {
    return (
      <SuccessStep
        finalAmount={parsedAmount}
        currency={currency}
        companyName={paymentData.company.name}
        isPendingRefund={isPendingRefund}
        onDone={() => router.push('/dashboard')}
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
    return <FallbackSuspense message="Preparing checkout..." />
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

    const isSelfInitiated = paymentData?.payment?.description?.includes('Manual') || paymentData?.payment?.description?.includes('Self-initiated')

    if (isBasicCheckout) {
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
            onManualPayClick={isSelfInitiated ? undefined : handleManualPayClick}
            onCancelRequest={isSelfInitiated ? handleCancelRequest : undefined}
          />
          {checkoutModals}
        </>
      )
    }

    if (isPremiumCheckout) {
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
            onManualPayClick={isSelfInitiated ? undefined : handleManualPayClick}
            onCancelRequest={isSelfInitiated ? handleCancelRequest : undefined}
            showPremiumOptions
            isPremiumSelected={isBenefitsOptedIn}
            onSelectStandard={() => setIsBenefitsOptedIn(false)}
            onSelectPremium={() => setIsBenefitsOptedIn(true)}
          />
          {checkoutModals}
        </>
      )
    }

    const ctaLabel = () => {
      if (isPendingRefund) return 'Refund Pending'
      if (parsedAmount === 0) return 'Enter amount to continue'
      if (isBelowMin) return `Minimum is ${formatCurrency(minRequired, currency)}`
      if (isUnderpaying) return `Full payment required — ${formatCurrency(totalOwed, currency)}`
      return `Pay ${formatCurrency(parsedAmount, currency)} now`
    }

    const ctaDisabled = !isValidAmount || isUnderpaying || isPendingRefund

    return (
      <div className="auth-shell auth-shell--pay">
        <header className="pay-header">
          <div className="pay-header__content">
            <UpwardLogo size={24} color="var(--clay)" />
            {authUser && (
              <button onClick={() => router.push('/dashboard')} className="pay-header__dashboard-btn">
                <ChevronRight size={14} className="icon--back" />
                <span>Dashboard</span>
              </button>
            )}
          </div>
        </header>

        <main className="pay-main">
          <div className="pay-container">
            <div className="pay-layout">
              <div className="pay-layout__left">
                <InvoiceHeader
                  companyName={paymentData.payment?.verifiedRecipientName || paymentData.company?.name}
                  description={paymentData.payment?.description || 'Housing Invoice'}
                  logo={paymentData.company?.logo}
                  propertyAddress={paymentData.property?.locationAddress || paymentData.payment?.property_address || paymentData.property?.address || paymentData.payment?.propertyAddress}
                  isVerified={!!paymentData.payment?.verifiedRecipientName}
                />
                <AmountDetailCard
                  totalOwed={totalOwed}
                  currency={currency}
                  dueDate={paymentData.payment.dueDate}
                  parsedAmount={isGuest ? totalOwed : parsedAmount}
                  progressPct={isGuest ? 0 : progressPct}
                  label={
                    paymentData.payment?.description?.includes('Manual') || 
                    paymentData.payment?.description?.includes('Self-initiated') 
                      ? 'Total to Pay' 
                      : 'Amount Outstanding'
                  }
                />

                <div className="benefits-desktop-wrap">
                  {showBenefitsUI && (
                    <CheckoutComparisonCards
                      currency={currency}
                      transactionFee={rates.transactionFee}
                      benefitsFee={rates.benefitsFee}
                      isPremiumSelected={isBenefitsOptedIn}
                      onSelectStandard={() => setIsBenefitsOptedIn(false)}
                      onSelectPremium={() => setIsBenefitsOptedIn(true)}
                    />
                  )}
                </div>
              </div>

              <div className="pay-layout__right">
                {loginRequired && (
                  <div className="login-prompt">
                    <p className="login-prompt__text">This request is linked to an account. Login to pay.</p>
                    <button 
                      className="btn btn--primary btn--full btn--pill" 
                      onClick={() => router.push(`/login?redirect=/pay/${uuid}`)}
                      disabled={loginLoading}
                    >
                      <Lock size={16} className="mr-2" /> {loginLoading ? 'Logging in...' : 'Login to Pay'}
                    </button>
                    <CapacitorGuard>
                      <div style={{ marginTop: '-8px' }}>
                        <BiometricLoginButton onAuthenticated={(email, pass) => executeLogin(email, pass)} />
                      </div>
                    </CapacitorGuard>
                  </div>
                )}

                {!loginRequired && (isLoggedIn || isGuest) && (
                  <>
                    {isPendingRefund && (
                      <div className="refund-pending-banner">
                        <ShieldAlert size={20} className="refund-pending-banner__icon" />
                        <div className="refund-pending-banner__content">
                          <h4 className="refund-pending-banner__title">Refund Action Required</h4>
                          <p className="refund-pending-banner__text">
                            An underpayment was detected for this payment request. Because this property requires full payment, a refund is currently pending.
                          </p>
                          {!paymentData.user.hasBankDetails && (
                            <div className="refund-pending-banner__bank-warning">
                              <p className="refund-pending-banner__text refund-pending-banner__text--alert">
                                <strong>Warning:</strong> You have not set up your payout bank account. Please add your banking details to receive your refund.
                              </p>
                              {isLoggedIn ? (
                                <button 
                                  className="btn btn--secondary btn--sm btn--pill refund-pending-banner__btn"
                                  onClick={() => router.push('/dashboard/me?view=banking&edit=true')}
                                >
                                  Add Banking Details
                                </button>
                              ) : (
                                <p className="refund-pending-banner__text" style={{ marginTop: '6px', fontStyle: 'italic' }}>
                                  Please log in or sign up to configure your payout account.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {paymentData.payment?.latestProof?.status === 'REJECTED' && (
                      <div className="proof-rejected-banner">
                        <ShieldAlert size={20} className="proof-rejected-banner__icon" />
                        <div className="proof-rejected-banner__content">
                          <h4 className="proof-rejected-banner__title">Payment Proof Rejected</h4>
                          <p className="proof-rejected-banner__text">
                            Your uploaded proof of payment was rejected.
                          </p>
                          {paymentData.payment.latestProof.remarks && (
                            <div className="proof-rejected-banner__remarks">
                              <strong>Reason:</strong> {paymentData.payment.latestProof.remarks}
                            </div>
                          )}
                          <p className="proof-rejected-banner__text" style={{ marginTop: '6px' }}>
                            Please upload a clearer proof of payment or proceed to pay online below.
                          </p>
                        </div>
                      </div>
                    )}

                    {paymentData.payment?.latestProof?.status === 'PENDING' && (
                      <div className="proof-review-banner">
                        <div className="proof-review-banner__content">
                          <h4 className="proof-review-banner__title">Payment Proof In Review</h4>
                          <p className="proof-review-banner__text">
                            Your uploaded proof of payment is currently being reviewed by the property manager. You will be notified once it is approved.
                          </p>
                        </div>
                      </div>
                    )}

                    <PaymentInput
                      canPayPartial={!!paymentData.payment.allowPartial && !isPendingRefund}
                      isBelowMin={isBelowMin}
                      amountInput={amountInput}
                      currency={currency}
                      totalOwed={totalOwed}
                      minRequired={minRequired}
                      onAmountChange={handleAmountChange}
                      isGuest={isGuest && !paymentData.payment.allowPartial}
                      isFullPaymentRequired={isFullPaymentRequired}
                      isUnderpaying={isUnderpaying}
                    />

                    <AllocationBreakdown
                      showBreakdown={showBreakdown}
                      setShowBreakdown={setShowBreakdown}
                      effectiveAllocs={visibleAllocs}
                      currency={currency}
                      lineItems={visibleLineItems}
                      canPayPartial={!!paymentData.payment.allowPartial}
                      onAllocationChange={handleAllocationChange}
                    />
                    <div className="pay-cta pay-cta--sticky">
                      <button
                        className="btn btn--primary btn--full btn--pay btn--pill"
                        onClick={handlePayClick}
                        disabled={ctaDisabled}
                      >
                        <CreditCard size={18} className="icon--left" />
                        <span>{ctaLabel()}</span>
                        {!ctaDisabled && <ArrowRight size={18} className="icon--right" />}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </main>

        <footer className="pay-footer">
          <p className="pay-footer__disclaimer">
            All payments are processed securely via Paystack. By continuing, you agree to our{' '}
            <a href={`${process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'}/legal/terms`} target="_blank" rel="noopener noreferrer" className="link--dark">Terms of Service</a>
            {' '}and{' '}
            <a href={`${process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'}/legal/privacy`} target="_blank" rel="noopener noreferrer" className="link--dark">Privacy Policy</a>.
          </p>
        </footer>

        <style jsx>{`
          .pay-header {
            position: fixed;
            top: 0; left: 0; right: 0;
            z-index: 50;
            background: var(--bg);
            border-bottom: 1px solid var(--border-solid);
            height: 64px;
            display: flex;
            align-items: center;
          }
          @supports (backdrop-filter: blur(12px)) {
            .pay-header {
               opacity: 0.95;
               backdrop-filter: blur(12px);
            }
          }
          .pay-header__content {
            width: 100%;
            max-width: 520px;
            margin: 0 auto;
            padding: 0 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .pay-header__dashboard-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            border-radius: 100px;
            background: var(--surface);
            border: 1px solid var(--border-solid);
            font-size: 11px;
            font-weight: 700;
            color: var(--text-muted);
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .pay-header__dashboard-btn:hover {
            color: var(--clay);
            border-color: rgba(217, 119, 87, 0.2);
            background: var(--clay-faint);
          }
          .icon--back { transform: rotate(180deg); }
          .icon--left { margin-right: 6px; }
          .icon--right { margin-left: 8px; }

          .auth-shell.auth-shell--pay {
            padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 100px) !important;
          }

          .pay-main {
            padding-top: 64px;
            padding-bottom: 96px; /* Added spacing to prevent mobile sticky CTA overlap */
            min-height: calc(100vh - 64px - 52px);
            background: radial-gradient(circle at 80% 0%, var(--clay-faint), transparent 360px), var(--oat-dim);
            display: flex;
            align-items: flex-start;
          }
          .pay-container {
            width: 100%;
            max-width: 520px;
            margin: 0 auto;
            background: var(--bg);
            border-radius: 32px;
            padding: 36px 32px 32px;
            box-shadow: 0 32px 80px rgba(0,0,0,0.07), 0 8px 32px rgba(0,0,0,0.03);
            border: 1px solid var(--border-solid);
          }

          .pay-layout { display: flex; flex-direction: column; gap: 12px; }
          .pay-layout__left { display: flex; flex-direction: column; gap: 16px; }
          .pay-layout__right { display: flex; flex-direction: column; gap: 12px; }

          .pay-cta { margin-top: 8px; }
          
          /* Sticky Bottom CTA for MobileUX */
          @media (max-width: 1023px) {
            .pay-cta--sticky {
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              background: var(--bg);
              border-top: 1px solid var(--border-solid);
              padding: 16px 24px;
              z-index: 45;
              box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.04);
            }
            @supports (backdrop-filter: blur(12px)) {
              .pay-cta--sticky {
                background: rgba(255, 255, 255, 0.9);
                backdrop-filter: blur(12px);
              }
            }
          }

          .btn--pay {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 58px;
            font-size: 14px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            background: var(--clay);
            color: #fff;
            box-shadow: 0 12px 28px var(--clay-glow);
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .btn--pay:not(:disabled):hover {
            transform: translateY(-2px) scale(1.01);
            box-shadow: 0 20px 40px var(--clay-glow);
            filter: brightness(1.08);
          }
          .btn--pay:disabled {
            background: var(--surface);
            color: var(--text-muted);
            box-shadow: none;
            cursor: not-allowed;
          }
          .btn--pill { border-radius: 100px; }

          .login-prompt {
            text-align: center;
            padding: 28px 20px;
            background: var(--surface);
            border-radius: 24px;
            border: 1px solid var(--border-solid);
          }
          .login-prompt__text {
            font-size: 14px;
            color: var(--text-secondary);
            margin-bottom: 20px;
            font-weight: 600;
          }

          .pay-footer {
            height: 52px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 24px;
            border-top: 1px solid var(--border-solid);
            background: var(--bg);
            margin-bottom: 74px; /* Space on mobile footer so it's not hidden behind sticky button */
          }
          .pay-footer__disclaimer {
            font-size: 12px;
            font-weight: 500;
            color: var(--text-muted);
            text-align: center;
            line-height: 1.5;
          }
          .link--dark {
            color: var(--text);
            font-weight: 600;
            text-decoration: underline;
            text-underline-offset: 3px;
            text-decoration-color: var(--border-solid);
          }

          @media (max-width: 520px) {
            .pay-main { background: var(--bg); min-height: auto; }
            .pay-container {
              border-radius: 0;
              padding: 20px 20px 24px;
              border: none;
              box-shadow: none;
              background: transparent;
            }
            .pay-layout { gap: 20px; }
            .pay-footer { 
              position: static; 
              margin-top: 24px;
              margin-bottom: 24px;
              border-top: none;
            }
            .benefits-desktop-wrap {
              display: block;
              margin-bottom: 24px;
            }
          }

          @media (min-width: 1024px) {
            .benefits-desktop-wrap {
              display: block;
              margin-top: 24px;
              width: 100%;
            }
            .benefits-desktop-wrap :global(.benefits-card) {
              background: var(--bg);
            }
            .auth-shell--pay { max-width: 100%; padding: 0; }
            .pay-main {
              padding-top: 80px; padding-bottom: 80px;
              align-items: center; justify-content: center;
              min-height: 100vh;
            }
            .pay-container {
              max-width: 1080px; padding: 0; border-radius: 40px;
              margin: 0 auto; overflow: hidden; display: flex;
            }
            .pay-layout { flex-direction: row; align-items: stretch; gap: 0; width: 100%; }
            .pay-layout__left {
              flex: 1.1; gap: 32px; padding: 64px;
              background: var(--surface); border-right: 1px solid var(--border-solid);
              display: flex;
              flex-direction: column;
            }
            .pay-layout__right { flex: 1; padding: 64px; justify-content: flex-start; gap: 40px; }
            .pay-cta { margin-top: auto; padding-top: 32px; }
            .pay-header__content { max-width: 960px; padding: 0 64px; }
            .pay-footer { position: static; }
          }

          .refund-pending-banner {
            display: flex;
            gap: 12px;
            background: rgba(239, 68, 68, 0.04);
            border: 1.5px solid var(--error);
            padding: 18px;
            border-radius: 20px;
            margin-bottom: 20px;
          }
          .refund-pending-banner__icon {
            color: var(--error);
            flex-shrink: 0;
          }
          .refund-pending-banner__content {
            display: flex;
            flex-direction: column;
            gap: 6px;
            width: 100%;
          }
          .refund-pending-banner__title {
            font-size: 11px;
            font-weight: 850;
            color: var(--error);
            text-transform: uppercase;
            letter-spacing: 0.06em;
            margin: 0;
          }
          .refund-pending-banner__text {
            font-size: 13px;
            font-weight: 500;
            color: var(--text-secondary);
            line-height: 1.5;
            margin: 0;
          }
          .refund-pending-banner__text--alert {
            color: #d97706;
          }
          .refund-pending-banner__bank-warning {
            margin-top: 8px;
            padding-top: 8px;
          .refund-pending-banner__btn {
            margin-top: 8px;
          }
          .refund-pending-banner__btn:hover {
          background: rgba(217, 119, 87, 0.25);
        }

        .proof-rejected-banner {
          background: rgba(239, 68, 68, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }
        .proof-rejected-banner__icon {
          color: #ef4444;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .proof-rejected-banner__content {
          flex: 1;
        }
        .proof-rejected-banner__title {
          font-size: 14px;
          font-weight: 700;
          color: #b91c1c;
          margin: 0 0 4px 0;
        }
        .proof-rejected-banner__text {
          font-size: 13px;
          color: #7f1d1d;
          line-height: 1.5;
          margin: 0;
        }
        .proof-rejected-banner__remarks {
          margin-top: 8px;
          padding: 8px 12px;
          background: rgba(239, 68, 68, 0.1);
          border-radius: 8px;
          font-size: 13px;
          color: #991b1b;
        }

        .proof-review-banner {
          background: var(--surface);
          border: 1px solid var(--border-solid);
          border-left: 4px solid #f59e0b;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }
        .proof-review-banner__title {
          font-size: 14px;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 4px 0;
        }
        .proof-review-banner__text {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0;
        }
      `}</style>

        {checkoutModals}
      </div>
    )
  }

  return null
}
