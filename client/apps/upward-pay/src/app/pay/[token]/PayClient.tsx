/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Lock,
  CreditCard,
  ArrowRight,
  ChevronRight
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, generateId, calculateCombinedFee, getNetAmountFromTotal } from '@/lib/utils'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/common/Toast'
import { UpwardLogo } from '@/components/PoweredByUpward'
import PaystackEmbeddedCheckout from '@/features/dashboard/components/payment/PaystackEmbeddedCheckout'
import FallbackSuspense from '@/components/FallbackSuspense'
import { setCookie } from '@/lib/cookie-utils'
import { Capacitor } from '@capacitor/core'
import { CapacitorGuard } from '@/components/common/CapacitorGuard'
import { BiometricsService } from '@/features/auth/services/biometricsService'
import { BiometricLoginButton } from '@/features/auth/component/BiometricLoginButton'
import { useLogin } from '@/features/auth/hooks/useLogin'

import { InvoiceHeader } from '@/features/payments/components/unified-pay/InvoiceHeader'
import { AmountDetailCard } from '@/features/payments/components/unified-pay/AmountDetailCard'
import { PaymentInput } from '@/features/payments/components/unified-pay/PaymentInput'
import { AllocationBreakdown } from '@/features/payments/components/unified-pay/AllocationBreakdown'
import { SuccessStep } from '@/features/payments/components/unified-pay/SuccessStep'
import { OnboardingStep } from '@/features/payments/components/unified-pay/OnboardingStep'
import { SettledStep } from '@/features/payments/components/unified-pay/SettledStep'
import { RenewalModal } from '@/features/payments/components/unified-pay/RenewalModal'

type PayStep = 'loading' | 'invoice' | 'checkout' | 'processing' | 'success' | 'onboarding' | 'already-paid' | 'cancelled' | 'error'

interface LineItemRecord {
  id: number
  name: string
  totalAmount: number
  amountPaid: number
  status: 'PENDING' | 'PARTIAL' | 'PAID'
}

interface LineItemAllocation {
  id: number
  name: string
  totalAmount: number
  amountPaid: number
  allocated: number
  remaining: number
}


function distributeAmount(amount: number, items: LineItemRecord[], totalOwed: number): LineItemAllocation[] {
  const allocs: LineItemAllocation[] = items.map(i => ({
    id: i.id,
    name: i.name,
    totalAmount: i.totalAmount,
    amountPaid: i.amountPaid,
    remaining: Math.max(0, i.totalAmount - i.amountPaid),
    allocated: 0
  }))

  let remaining = amount
  
  const feeItem = allocs.find(a => a.name === 'Processing Fee' || a.id === -2)
  if (feeItem) {

    const estimatedNet = getNetAmountFromTotal(amount)
    const dynamicFee = calculateCombinedFee(estimatedNet)
    
    feeItem.totalAmount = dynamicFee
    feeItem.remaining = dynamicFee
    
    const pay = Math.min(remaining, dynamicFee)
    feeItem.allocated = pay
    remaining -= pay
  }


  for (const item of allocs) {
    if (item.name === 'Processing Fee' || item.id === -2) continue
    if (item.remaining <= 0) continue
    const pay = Math.min(remaining, item.remaining)
    item.allocated = pay
    remaining -= pay
    if (remaining <= 0) break
  }

  return allocs
}



export default function PayClient({ overrideToken }: { overrideToken?: string }) {
  const router = useRouter()
  const params = useParams()
  const uuid = useMemo(() => {
    if (overrideToken) return overrideToken
    const t = params?.token
    if (Array.isArray(t)) return t[0]
    return t as string
  }, [params?.token, overrideToken])

  const { user: authUser, login } = useAuth()
  const { success, error: toastError } = useToast()

  const [step, setStep] = useState<PayStep>('loading')
  const [paymentData, setPaymentData] = useState<any>(null)
  const [lineItems, setLineItems] = useState<LineItemRecord[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [amountInput, setAmountInput] = useState('')
  const [manualAllocs, setManualAllocs] = useState<Record<number, number>>({})
  const [showBreakdown, setShowBreakdown] = useState(false)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: ''
  })

  const [showRenewalModal, setShowRenewalModal] = useState(false)

  const [autoPrompted, setAutoPrompted] = useState(false)
  const { login: executeLogin, loading: loginLoading } = useLogin(`/pay/${uuid}`)

  useEffect(() => {
    console.log('[PayClient] Component mounted. UUID from params:', uuid)
    if (uuid) {
      loadPaymentDetails()
    } else {
      console.warn('[PayClient] No UUID found in params after mount')
      // If no uuid after 5 seconds, show error
      const timer = setTimeout(() => {
        if (step === 'loading') {
          console.error('[PayClient] UUID still missing after 5s timeout')
          setErrorMessage('Invalid or missing payment link')
          setStep('error')
        }
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [uuid])

  // Automatic Biometric Prompt Logic
  useEffect(() => {
    async function triggerAutoBiometrics() {

      if (!Capacitor.isNativePlatform() || autoPrompted || authUser || step !== 'invoice' || !paymentData?.hasPassword) return

      const available = await BiometricsService.isAvailable()
      const enabled = await BiometricsService.isEnabled()

      if (available && enabled && !loginLoading) {
        setAutoPrompted(true)
        setTimeout(async () => {
          try {
            const authenticated = await BiometricsService.authenticate('Log in to Pay')
            if (authenticated) {
              const credentials = await BiometricsService.getCredentials()
              if (credentials) {
                executeLogin(credentials.email, credentials.password)
              }
            }
          } catch (e) {
            console.error('Auto-biometric login failed:', e)
          }
        }, 800)
      }
    }

    triggerAutoBiometrics()
  }, [step, paymentData, authUser, autoPrompted, loginLoading, executeLogin])

  async function loadPaymentDetails() {
    console.log('[PayClient] Loading payment details for uuid:', uuid)
    const timeout = setTimeout(() => {
      if (step === 'loading') {
        console.error('[PayClient] Loading timed out after 10s')
        setErrorMessage('Connection timed out. Please try again.')
        setStep('error')
      }
    }, 10000)

    try {
      const res = await api.get(`/payment-request/${uuid}`)
      clearTimeout(timeout)
      console.log('[PayClient] Load response:', res)
      if (res.success) {
        setPaymentData(res.data)
        let items = (res.data.payment.lineItemRecords || []) as LineItemRecord[]
        
        // Insert dynamic Processing Fee since backend does not include it
        items.unshift({
          id: -2,
          name: 'Processing Fee',
          totalAmount: 0,
          amountPaid: 0,
          status: 'PENDING'
        })
        
        setLineItems(items)
        const due = res.data.payment.amount - (res.data.payment.amountPaid || 0)

        if (res.data.payment.status === 'PAID' || due <= 0) {
          setStep('already-paid')
        } else if (res.data.payment.status === 'CANCELLED') {
          setStep('cancelled')
        } else {
          setStep('invoice')
        }

        const rentRemaining = items.reduce((sum, item) => {
          const isFee = item.name === 'Processing Fee' || item.id === -2
          if (isFee) return sum
          return sum + Math.max(0, item.totalAmount - item.amountPaid)
        }, 0)

        const finalDue = rentRemaining > 0 ? rentRemaining + calculateCombinedFee(rentRemaining) : 0
        setAmountInput(finalDue.toString())
        setFormData(prev => ({
          ...prev,
          firstName: res.data.user.firstName || '',
          lastName: res.data.user.lastName || '',
          email: res.data.user.email || '',
          phone: res.data.user.phone || '',
        }))

        if (res.data.property?.isPastTenancy) {
          setShowRenewalModal(true)
        }
      } else {
        throw new Error('Could not retrieve payment details')
      }
    } catch (err: any) {
      clearTimeout(timeout)
      console.error('[PayClient] Load error:', err)
      setErrorMessage(err.message || 'Payment request not found or expired')
      setStep('error')
    }
  }

  const totalOwed = useMemo(() => {
    if (!paymentData?.payment) return 0
    
    const items = paymentData.payment.lineItemRecords || []
    const rentRemaining = items.reduce((sum: number, item: any) => {
      const isFee = item.name === 'Processing Fee' || item.id === -2
      if (isFee) return sum
      return sum + Math.max(0, item.totalAmount - item.amountPaid)
    }, 0)
    
    if (rentRemaining <= 0) return 0
    
    return rentRemaining + calculateCombinedFee(rentRemaining)
  }, [paymentData])

  const canPayPartial = !!paymentData?.payment?.allowPartial
  const minRequired = paymentData?.payment?.minAmount || 0
  const currency = paymentData?.payment?.currency || 'NGN'

  const parsedAmount = parseFloat(amountInput) || 0
  const isBelowMin = minRequired > 0 && parsedAmount > 0 && parsedAmount < minRequired && parsedAmount < totalOwed
  const isValidAmount = parsedAmount > 0 && !isBelowMin && parsedAmount <= totalOwed

  const autoAllocs = useMemo(() =>
    distributeAmount(Math.min(parsedAmount, totalOwed), lineItems, totalOwed)
    , [parsedAmount, lineItems, totalOwed])

  const effectiveAllocs: LineItemAllocation[] = useMemo(() => {
    if (Object.keys(manualAllocs).length === 0) {
      return autoAllocs
    }

    // Manual Override Mode: Priority Fee + Manual Overrides
    const manualSum = Object.values(manualAllocs).reduce((acc, val) => acc + val, 0)
    const feeItem = lineItems.find(i => i.name === 'Processing Fee' || i.id === -2)
    
    // Calculate dynamic fee exactly from the net amount allocated manually
    const dynamicFee = calculateCombinedFee(manualSum)
    
    // The total amount applied towards the fee is whatever is leftover after manual rent items, capped at the dynamicFee
    const feePayment = Math.min(parsedAmount - manualSum, dynamicFee)

    return lineItems.map(item => {
      const isFee = item.name === 'Processing Fee' || item.id === -2
      if (isFee) {
        return {
          id: item.id,
          name: item.name,
          totalAmount: dynamicFee,
          amountPaid: item.amountPaid,
          remaining: dynamicFee,
          allocated: feePayment
        }
      }
      return {
        id: item.id,
        name: item.name,
        totalAmount: item.totalAmount,
        amountPaid: item.amountPaid,
        remaining: Math.max(0, item.totalAmount - item.amountPaid),
        allocated: manualAllocs[item.id] || 0
      }
    })
  }, [autoAllocs, manualAllocs, lineItems, parsedAmount])



  const finalLineItemPayments = effectiveAllocs
    .filter(a => a.allocated > 0)
    .map(a => ({ id: a.id, amountPaid: a.allocated, name: a.name }))

  const progressPct = totalOwed > 0
    ? Math.min(100, (Math.min(parsedAmount, totalOwed) / totalOwed) * 100)
    : 0

  const handleAmountChange = (val: string) => {
    setManualAllocs({})
    let n = parseFloat(val) || 0
    if (n > totalOwed) {
      n = totalOwed
      setAmountInput(totalOwed.toString())
    } else {
      setAmountInput(val)
    }
  }

  const handleAllocationChange = (id: number, amount: number) => {
    const item = lineItems.find(a => a.id === id)
    if (!item || item.name === 'Processing Fee' || item.id === -2 || item.status === 'PAID') return

    // Cap at remaining balance
    const remainingForThisItem = Math.max(0, item.totalAmount - item.amountPaid)
    const finalAmountForThisItem = Math.min(Math.max(0, amount), remainingForThisItem)

    let newManual = { ...manualAllocs }
    
    if (Object.keys(newManual).length === 0) {
      autoAllocs.forEach(a => {
        const isFee = a.name === 'Processing Fee' || a.id === -2
        if (!isFee) {
          newManual[a.id] = a.allocated
        }
      })
    }

    newManual[id] = finalAmountForThisItem
    setManualAllocs(newManual)
    
    // Calculate total: Sum of manual items + exact dynamic fee for that sum
    const manualSum = Object.values(newManual).reduce((acc, val) => acc + val, 0)
    const dynamicFee = calculateCombinedFee(manualSum)
    
    const newTotal = manualSum + dynamicFee
    setAmountInput(newTotal.toString())
  }

  const handlePaymentSuccess = async (reference: string) => {
    setStep('processing')
    try {
      let lineItemPayments = [...finalLineItemPayments]
      


      const res = await api.post(`/payment-request/${uuid}/confirm`, {
        reference,
        lineItemPayments
      })
      if (res.success) {
        success('Payment successful!')
        setStep(!paymentData.hasPassword ? 'onboarding' : 'success')
      }
    } catch (err: any) {
      toastError(err.message || 'Failed to verify payment')
      setStep('invoice')
    }
  }

  const handleActivation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      toastError('Passwords do not match')
      return
    }
    setIsSubmitting(true)
    try {
      const res = await api.post(`/public/invite/${paymentData.inviteToken || paymentData.user.uuid}/accept`, {
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        address: formData.address
      })
      if (res.success) {
        success('Account activated!')
        if (res.user && res.accessToken) {
          setCookie('pay_access_token', res.accessToken)
          login(res.user)
          router.replace('/dashboard')
        } else {
          router.push('/login')
        }
      }
    } catch (err: any) {
      toastError(err.message || 'Failed to activate account')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (step === 'loading') return <FallbackSuspense message="Retrieving secure payment details..." />

  if (step === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-white rounded-3xl shadow-xl max-w-sm border border-solid border-[var(--border-solid)]">
          <UpwardLogo size={40} className="mx-auto mb-6 opacity-20" />
          <h2 className="text-xl font-extrabold mb-2">Link Expired</h2>
          <p className="text-muted text-sm mb-6">{errorMessage}</p>
          <button className="btn btn--secondary btn--full" onClick={() => router.push('/')}>Return Home</button>
        </div>
      </div>
    )
  }

  if (step === 'cancelled') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-white rounded-3xl shadow-xl max-w-sm border border-solid border-[var(--border-solid)]">
          <UpwardLogo size={40} className="mx-auto mb-6 opacity-20" />
          <h2 className="text-xl font-extrabold mb-2">Request Cancelled</h2>
          <p className="text-muted text-sm mb-6">This payment request has been cancelled by the property manager and is no longer valid.</p>
          <button className="btn btn--secondary btn--full" onClick={() => router.push('/')}>Return Home</button>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    if (step === 'invoice' && paymentData) {
      const loginRequired = paymentData.hasPassword && !authUser
      const isGuest = !paymentData.hasPassword
      const isLoggedIn = !!authUser

      const ctaLabel = () => {
        if (parsedAmount === 0) return 'Enter amount to continue'
        if (isBelowMin) return `Minimum is ${formatCurrency(minRequired, currency)}`
        return `Pay ${formatCurrency(parsedAmount, currency)} now`
      }

      const ctaDisabled = !isValidAmount

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

                  {!loginRequired && isLoggedIn && (
                    <>
                      <PaymentInput
                        canPayPartial={canPayPartial}
                        isBelowMin={isBelowMin}
                        amountInput={amountInput}
                        currency={currency}
                        totalOwed={totalOwed}
                        minRequired={minRequired}
                        onAmountChange={handleAmountChange}
                        isGuest={false}
                      />
                      <AllocationBreakdown
                        showBreakdown={showBreakdown}
                        setShowBreakdown={setShowBreakdown}
                        effectiveAllocs={effectiveAllocs}
                        currency={currency}
                        lineItems={lineItems}
                        canPayPartial={canPayPartial}
                        onAllocationChange={handleAllocationChange}
                      />
                    </>
                  )}

                  {isGuest && (
                    <>
                      {canPayPartial && (
                        <PaymentInput
                          canPayPartial={canPayPartial}
                          isBelowMin={isBelowMin}
                          amountInput={amountInput}
                          currency={currency}
                          totalOwed={totalOwed}
                          minRequired={minRequired}
                          onAmountChange={handleAmountChange}
                          isGuest={true}
                        />
                      )}
                      <AllocationBreakdown
                        showBreakdown={showBreakdown}
                        setShowBreakdown={setShowBreakdown}
                        effectiveAllocs={effectiveAllocs}
                        currency={currency}
                        lineItems={lineItems}
                        canPayPartial={canPayPartial}
                        onAllocationChange={handleAllocationChange}
                      />
                    </>
                  )}

                  {!loginRequired && (
                    <div className="pay-cta">
                      <button
                        className="btn btn--primary btn--full btn--pay btn--pill"
                        onClick={() => setStep('checkout')}
                        disabled={ctaDisabled}
                      >
                        <CreditCard size={18} className="icon--left" />
                        <span>{ctaLabel()}</span>
                        {!ctaDisabled && <ArrowRight size={18} className="icon--right" />}
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </main>

          <footer className="pay-footer">
            <p className="pay-footer__disclaimer">
              All payments are processed securely via Paystack. By continuing, you agree to our{' '}
              <a href="#" className="link--dark">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="link--dark">Privacy Policy</a>.
            </p>
          </footer>

          <style jsx>{`
            .pay-header {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
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

            /* ── Page structure ── */
            .pay-main {
              padding-top: 64px;
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

            /* ── Layout ── */
            .pay-layout {
              display: flex;
              flex-direction: column;
              gap: 24px;
            }
            .pay-layout__left {
              display: flex;
              flex-direction: column;
              gap: 16px;
            }
            .pay-layout__right {
              display: flex;
              flex-direction: column;
              gap: 12px;
            }
            .pay-cta {
              margin-top: 8px;
            }

            /* ── Button ── */
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

            /* ── Login prompt ── */
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

            .pay-summary {
              display: flex;
              flex-direction: column;
              width: 100%;
            }
            .pay-summary__item {
              padding: 24px;
              background: var(--surface);
              border-radius: 20px;
              border: 1px solid var(--border-solid);
            }
            .mt-auto { margin-top: auto; }
            .mb-6 { margin-bottom: 24px; }
            .mb-2 { margin-bottom: 8px; }
            .mb-1 { margin-bottom: 4px; }
            .mr-2 { margin-right: 8px; }
            .font-black { font-weight: 900; }
            .tracking-widest { letter-spacing: 0.1em; }

            /* ── Footer (single disclaimer) ── */
            .pay-footer {
              height: 52px;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 0 24px;
              border-top: 1px solid var(--border-solid);
              background: var(--bg);
            }
            .pay-footer__disclaimer {
              font-size: 11px;
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

            /* ── Mobile: fixed footer, content fills viewport ── */
            @media (max-width: 520px) {
              .pay-main {
                background: var(--bg);
                min-height: auto;
              }
              .pay-container {
                border-radius: 0;
                padding: 20px 20px 24px;
                border: none;
                box-shadow: none;
                background: transparent;
              }
              .pay-layout { gap: 20px; }
              .pay-footer {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                z-index: 40;
              }
            }

            /* ── Desktop: two-column ── */
            @media (min-width: 1024px) {
              .auth-shell--pay {
                max-width: 100%;
                padding: 0;
              }
              .pay-main {
                padding-top: 80px;
                padding-bottom: 80px;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
              }
              .pay-container {
                max-width: 1080px;
                padding: 0;
                border-radius: 40px;
                margin: 0 auto;
                overflow: hidden;
                display: flex;
              }
              .pay-layout {
                flex-direction: row;
                align-items: stretch;
                gap: 0;
                width: 100%;
              }
              .pay-layout__left {
                flex: 1.1;
                gap: 32px;
                padding: 64px;
                background: var(--surface);
                border-right: 1px solid var(--border-solid);
              }
              .pay-layout__right {
                flex: 1;
                padding: 64px;
                justify-content: flex-start;
                gap: 40px;
              }
              .pay-cta {
                margin-top: auto;
                padding-top: 32px;
              }
              .pay-header__content {
                max-width: 960px;
                padding: 0 64px;
              }
              .pay-footer {
                position: static;
              }
            }
          `}</style>
        </div>
      )
    }

    if (step === 'checkout') {
      return (
        <div className="checkout-view flex items-center justify-center min-h-screen bg-[var(--surface)]">
          <div className="w-full max-w-[500px] bg-white rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <PaystackEmbeddedCheckout
              email={paymentData.user.email}
              amount={parsedAmount}
              gatewayFee={0}
              currency={currency}
              companyName={paymentData.company?.name}
              reference={generateId()}
              subaccount={paymentData.payment.subaccountCode}
              onSuccess={handlePaymentSuccess}
              onClose={() => setStep('invoice')}
              lineItems={finalLineItemPayments.map(p => ({ name: p.name, amount: p.amountPaid }))}
            />
          </div>
        </div>
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
          onDone={() => router.push('/dashboard')}
        />
      )
    }

    if (step === 'processing') return <FallbackSuspense message="Finalizing payment..." />

    return null
  }

  return (
    <>
      {renderContent()}
      
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
    </>
  )
}
