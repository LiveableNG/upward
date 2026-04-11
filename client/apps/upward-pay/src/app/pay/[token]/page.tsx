'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  Lock, 
  CreditCard, 
  ArrowRight,
  ChevronRight
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, generateId } from '@/lib/utils'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/common/Toast'
import { UpwardLogo } from '@/components/PoweredByUpward'
import PaystackEmbeddedCheckout from '@/features/dashboard/components/payment/PaystackEmbeddedCheckout'
import FallbackSuspense from '@/components/FallbackSuspense'
import { setCookie } from '@/lib/cookie-utils'

// Sub-components
import { InvoiceHeader } from '@/features/payments/components/unified-pay/InvoiceHeader'
import { AmountDetailCard } from '@/features/payments/components/unified-pay/AmountDetailCard'
import { PaymentInput } from '@/features/payments/components/unified-pay/PaymentInput'
import { AllocationBreakdown } from '@/features/payments/components/unified-pay/AllocationBreakdown'
import { SuccessStep } from '@/features/payments/components/unified-pay/SuccessStep'
import { OnboardingStep } from '@/features/payments/components/unified-pay/OnboardingStep'

type PayStep = 'loading' | 'invoice' | 'checkout' | 'processing' | 'success' | 'onboarding' | 'error'

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
  const itemSum = items.reduce((acc, i) => acc + Math.max(0, i.totalAmount - i.amountPaid), 0)
  const discrepancy = Math.max(0, totalOwed - itemSum)

  const allocs: LineItemAllocation[] = items.map(i => ({
    id: i.id,
    name: i.name,
    totalAmount: i.totalAmount,
    amountPaid: i.amountPaid,
    remaining: Math.max(0, i.totalAmount - i.amountPaid),
    allocated: 0
  }))

  // Add virtual item for the discrepancy if it exists
  if (discrepancy > 0) {
    allocs.push({
      id: -1, // Use -1 as virtual ID
      name: 'Invoice Balance',
      totalAmount: discrepancy,
      amountPaid: 0,
      remaining: discrepancy,
      allocated: 0
    })
  }

  let remaining = amount
  for (const item of allocs) {
    if (item.remaining <= 0) continue
    const pay = Math.min(remaining, item.remaining)
    item.allocated = pay
    remaining -= pay
    if (remaining <= 0) break
  }

  return allocs
}

export default function UnifiedPayPage() {
  const router = useRouter()
  const { token: uuid } = useParams()
  const { user: authUser, login } = useAuth()
  const { success, error: toastError } = useToast()

  const [step, setStep] = useState<PayStep>('loading')
  const [paymentData, setPaymentData] = useState<any>(null)
  const [lineItems, setLineItems] = useState<LineItemRecord[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [amountInput, setAmountInput] = useState('')
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [manualAllocs, setManualAllocs] = useState<Record<number, number>>({})
  const [futureCreditAmount, setFutureCreditAmount] = useState(0)
  const [futureCreditName, setFutureCreditName] = useState('Future Credit')
  const [overpayConfirmed, setOverpayConfirmed] = useState(false)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: ''
  })

  useEffect(() => {
    if (uuid) loadPaymentDetails()
  }, [uuid])

  async function loadPaymentDetails() {
    try {
      const res = await api.get(`/payment-request/${uuid}`)
      if (res.success) {
        setPaymentData(res.data)
        const items = (res.data.payment.lineItemRecords || []) as LineItemRecord[]
        setLineItems(items)
        const due = res.data.payment.amount - (res.data.payment.amountPaid || 0)
        setAmountInput(due.toString())
        setFormData(prev => ({
          ...prev,
          firstName: res.data.user.firstName || '',
          lastName: res.data.user.lastName || '',
          email: res.data.user.email || '',
          phone: res.data.user.phone || '',
        }))
        setStep('invoice')
      } else {
        throw new Error('Could not retrieve payment details')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment request not found or expired')
      setStep('error')
    }
  }

  const totalOwed = useMemo(() => {
    if (!paymentData?.payment) return 0
    return Math.max(0, paymentData.payment.amount - (paymentData.payment.amountPaid || 0))
  }, [paymentData])

  const canPayPartial = !!(authUser && paymentData?.payment?.allowPartial)
  const minRequired = paymentData?.payment?.minAmount || 0
  const currency = paymentData?.payment?.currency || 'NGN'

  const parsedAmount = parseFloat(amountInput) || 0

  const isOverpaying = parsedAmount > totalOwed
  const isBelowMin = minRequired > 0 && parsedAmount > 0 && parsedAmount < minRequired
  const isValidAmount = parsedAmount > 0 && !isBelowMin && (isOverpaying ? overpayConfirmed : true)

  const autoAllocs = useMemo(() =>
    distributeAmount(Math.min(parsedAmount, totalOwed), lineItems, totalOwed)
  , [parsedAmount, lineItems, totalOwed])

  const effectiveAllocs: LineItemAllocation[] = useMemo(() => {
    if (!manualMode) return autoAllocs
    return autoAllocs.map(a => ({
      ...a,
      allocated: manualAllocs[a.id] ?? a.allocated
    }))
  }, [manualMode, autoAllocs, manualAllocs])

  const finalAmount = parsedAmount

  const finalLineItemPayments = effectiveAllocs
    .filter(a => a.allocated > 0 && a.id !== -1)
    .map(a => ({ id: a.id, amountPaid: a.allocated, name: a.name }))

  const progressPct = totalOwed > 0
    ? Math.min(100, (Math.min(parsedAmount, totalOwed) / totalOwed) * 100)
    : 0

  const enterManualMode = useCallback(() => {
    const init: Record<number, number> = {}
    autoAllocs.forEach(a => { init[a.id] = a.allocated })
    setManualAllocs(init)
    setManualMode(true)
  }, [autoAllocs])

  const handleAmountChange = (val: string) => {
    setAmountInput(val)
    setOverpayConfirmed(false)
    setManualMode(false)
    const n = parseFloat(val) || 0
    if (n <= totalOwed) {
      setFutureCreditAmount(0)
    } else {
      setFutureCreditAmount(n - totalOwed)
    }
  }

  const handlePaymentSuccess = async (reference: string) => {
    setStep('processing')
    try {
      const res = await api.post(`/payment-request/${uuid}/confirm`, {
        reference,
        lineItemPayments: finalLineItemPayments,
        futureCreditAmount: futureCreditAmount > 0 ? futureCreditAmount : undefined,
        futureCreditName: futureCreditAmount > 0 ? futureCreditName : undefined
      })
      if (res.success) {
        success('Payment successful!')
        if (!paymentData.hasPassword) {
          setStep('onboarding')
        } else {
          setStep('success')
        }
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
      const res = await api.post(`/public/invite/${uuid}/accept`, {
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        address: formData.address
      })
      if (res.success) {
        success('Account activated!')
        if (res.user && res.accessToken) {
          setCookie('access_token', res.accessToken)
          login(res.user)
          router.push('/dashboard')
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

  if (step === 'invoice' && paymentData) {
    const loginRequired = paymentData.hasPassword && !authUser
    const hasLineItems = lineItems.length > 0
    const showAmountEntry = !loginRequired

    const ctaLabel = () => {
      if (parsedAmount === 0) return 'Enter amount to continue'
      if (isBelowMin) return `Minimum is ${formatCurrency(minRequired, currency)}`
      if (isOverpaying && !overpayConfirmed) return 'Confirm overpayment'
      return `Pay ${formatCurrency(finalAmount, currency)} now`
    }

    return (
      <div className="auth-shell auth-shell--pay">
        <header className="pay-header">
           <div className="pay-header__content">
              <UpwardLogo size={24} color="var(--clay)" />
              {authUser && (
                <button
                  onClick={() => router.push('/dashboard')}
                  className="pay-header__dashboard-btn"
                >
                  <ChevronRight size={14} className="icon--left" />
                  <span>Dashboard</span>
                </button>
              )}
           </div>
        </header>

        <main className="pay-main">
          <div className="pay-container">
            <div className="pay-layout">
              {/* Left Column: Context, Amount, and Trust (for Desktop) */}
              <div className="pay-layout__left">
                <InvoiceHeader 
                  companyName={paymentData.company?.name} 
                  description={paymentData.payment?.description || 'Housing Invoice'} 
                  logo={paymentData.company?.logo}
                />

                <AmountDetailCard 
                  totalOwed={totalOwed}
                  currency={currency}
                  dueDate={paymentData.payment.dueDate}
                  parsedAmount={parsedAmount}
                  progressPct={progressPct}
                />

                {/* Desktop Trust View (Hidden on mobile) */}
                <div className="pay-trust pay-trust--desktop">
                  <p className="pay-footer__disclaimer">
                      All payments are processed securely via Paystack. By continuing, you agree to our 
                      <a href="#" className="link--dark">Terms of Service</a> and <a href="#" className="link--dark">Privacy Policy</a>.
                  </p>
                </div>
              </div>

              {/* Right Column: Interaction Form */}
              <div className="pay-layout__right">
                {showAmountEntry && (
                  <>
                    {authUser && (
                      <PaymentInput 
                        canPayPartial={canPayPartial}
                        isBelowMin={isBelowMin}
                        isOverpaying={isOverpaying}
                        amountInput={amountInput}
                        currency={currency}
                        totalOwed={totalOwed}
                        minRequired={minRequired}
                        futureCreditAmount={futureCreditAmount}
                        overpayConfirmed={overpayConfirmed}
                        onAmountChange={handleAmountChange}
                        onConfirmOverpay={() => setOverpayConfirmed(true)}
                      />
                    )}

                    <AllocationBreakdown 
                      showBreakdown={showBreakdown}
                      setShowBreakdown={setShowBreakdown}
                      manualMode={manualMode}
                      setManualMode={setManualMode}
                      effectiveAllocs={effectiveAllocs}
                      currency={currency}
                      lineItems={lineItems}
                      overpayConfirmed={overpayConfirmed}
                      futureCreditAmount={futureCreditAmount}
                      futureCreditName={futureCreditName}
                      setFutureCreditName={setFutureCreditName}
                      manualAllocs={manualAllocs}
                      setManualAllocs={setManualAllocs}
                      onEnterManualMode={enterManualMode}
                    />
                  </>
                )}

                <div className="pay-actions">
                  {loginRequired ? (
                    <div className="login-prompt">
                      <p className="login-prompt__text">This request is linked to an account. Login to pay.</p>
                      <button className="btn btn--primary btn--full btn--pill" onClick={() => router.push(`/login?redirect=/pay/${uuid}`)}>
                        <Lock size={16} className="mr-2" /> Login to Pay
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn--primary btn--full btn--pay btn--pill"
                      onClick={() => setStep('checkout')}
                      disabled={!isValidAmount}
                    >
                      <CreditCard size={18} className="icon--left" />
                      <span>{ctaLabel()}</span>
                      {isValidAmount && <ArrowRight size={18} className="icon--right" />}
                    </button>
                  )}
                  
                  <div className="pay-footer pay-trust--mobile">
                    <p className="pay-footer__disclaimer">
                        All payments are processed securely via Paystack. By continuing, you agree to our 
                        <a href="#" className="link--dark">Terms of Service</a> 
                        and 
                        <a href="#" className="link--dark">Privacy Policy</a>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

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
              background: var(--bg);
              opacity: 0.95;
              backdrop-filter: blur(12px); 
            }
          }
          .pay-header__content {
            width: 100%;
            max-width: 480px;
            margin: 0 auto;
            padding: 0 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            transition: max-width 0.4s ease;
          }
          .pay-header__dashboard-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            border-radius: 100px;
            background: var(--surface);
            border: 1px solid var(--border-solid);
            font-size: 11px;
            font-weight: 700;
            color: var(--text-muted);
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .pay-header__dashboard-btn:hover {
            color: var(--clay);
            border-color: rgba(217, 119, 87, 0.2);
            background: var(--clay-faint);
            transform: translateY(-1px);
          }
          .icon--left { margin-right: 4px; }
          .icon--right { margin-left: 8px; }
          .pay-header__dashboard-btn .icon--left {
            transform: rotate(180deg);
            margin-right: 0;
          }

          .pay-main {
            padding-top: 72px;
            padding-bottom: 60px;
            min-height: 100vh;
            background: radial-gradient(circle at 100% 0%, var(--clay-faint), transparent 400px), var(--oat-dim);
          }

          .pay-container {
            width: 100%;
            max-width: 480px;
            margin: 0 auto;
            background: var(--bg);
            border-radius: 40px;
            padding: 48px 40px;
            box-shadow: 0 40px 100px rgba(0,0,0,0.06), 0 10px 40px rgba(0,0,0,0.02);
            border: 1px solid var(--border-solid);
            transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease;
          }
          .pay-container:hover {
            box-shadow: 0 60px 120px rgba(0,0,0,0.08), 0 15px 50px rgba(0,0,0,0.03);
          }

          .pay-layout {
            display: flex;
            flex-direction: column;
          }
          .btn--pay {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 60px;
            font-size: 15px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            background: var(--clay);
            color: #fff;
            box-shadow: 0 12px 30px var(--clay-glow);
          }
          .btn--pay:not(:disabled):hover {
            transform: translateY(-3px) scale(1.01);
            box-shadow: 0 20px 40px var(--clay-glow);
            filter: brightness(1.1);
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
            padding: 32px 24px;
            background: var(--surface);
            border-radius: 28px;
            border: 1px solid var(--border-solid);
          }
          .login-prompt__text {
            font-size: 14px;
            color: var(--text-secondary);
            margin-bottom: 24px;
            font-weight: 600;
          }

          .pay-footer {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 24px;
            margin-top: 48px;
            padding-top: 32px;
            border-top: 1px solid var(--border-solid);
          }

          .pay-footer__disclaimer {
            font-size: 11px;
            font-weight: 500;
            color: var(--text-muted);
            text-align: center;
            line-height: 1.6;
            max-width: 320px;
          }
          .link--dark {
            margin: 0 4px;
            color: var(--text);
            font-weight: 600;
            text-decoration: underline;
            text-underline-offset: 3px;
            text-decoration-color: var(--border-solid);
          }


          @media (max-width: 520px) {
            .pay-container {
              border-radius: 0;
              padding: 24px;
              border: none;
              box-shadow: none;
              background: transparent;
            }
            .pay-main {
              background: var(--bg);
              padding-top: 64px;
            }
          }

          /* Desktop Scale/Split Screen Overrides */
          @media (min-width: 1024px) {
            .pay-container {
              max-width: 1100px;
              padding: 64px;
              border-radius: 48px;
              align-self: center;
              margin-top: 60px;
            }
            .pay-layout {
              flex-direction: row;
              align-items: stretch;
              gap: 80px;
            }
            .pay-layout__left {
              flex: 1;
              position: sticky;
              top: 100px;
              display: flex;
              flex-direction: column;
              justify-content: flex-start;
              gap: 32px;
            }
            .pay-layout__right {
              flex: 1.2;
              padding-left: 80px;
              border-left: 1px solid var(--border-solid);
              display: flex;
              flex-direction: column;
              justify-content: flex-start;
            }
            .pay-header__content {
              max-width: 1100px;
              padding: 0 64px;
            }
            .pay-main {
              padding-top: 100px;
            }
            .pay-trust--mobile {
              display: none;
            }
            .pay-trust--desktop {
              display: flex;
              align-items: flex-start;
              text-align: left;
              margin-top: 48px;
              padding-top: 48px;
              border-top: 1px solid var(--border-solid);
            }
            .pay-trust--desktop .pay-footer__disclaimer {
              text-align: left;
              max-width: 100%;
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
            amount={finalAmount}
            currency={currency}
            companyName={paymentData.company?.name}
            reference={generateId('PAY')}
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
        companyName={paymentData.company.name}
        handleActivation={handleActivation}
      />
    )
  }

  if (step === 'success') {
    return (
      <SuccessStep 
        finalAmount={finalAmount}
        futureCreditAmount={futureCreditAmount}
        futureCreditName={futureCreditName}
        currency={currency}
        companyName={paymentData.company.name}
        onDone={() => router.push('/dashboard')}
      />
    )
  }

  if (step === 'processing') return <FallbackSuspense message="Finalizing payment..." />

  return null
}