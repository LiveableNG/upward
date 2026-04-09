'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  Check, 
  ArrowRight, 
  Lock, 
  CreditCard, 
  AlertCircle, 
  Building,
  Calendar,
  Eye,
  EyeOff,
  ChevronRight
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, generateId } from '@/lib/utils'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/common/Toast'
import { UpwardLogo } from '@/components/PoweredByUpward'
import PaystackEmbeddedCheckout from '@/features/dashboard/components/payment/PaystackEmbeddedCheckout'
import FallbackSuspense from '@/components/FallbackSuspense'
import { OnboardingFields } from '@/features/auth/components/OnboardingFields'
import { setCookie } from '@/lib/cookie-utils'

type PayStep = 'loading' | 'invoice' | 'checkout' | 'processing' | 'success' | 'onboarding' | 'error'

export default function UnifiedPayPage() {
  const router = useRouter()
  const { token: uuid } = useParams()
  const { user: authUser, login } = useAuth()
  const { success, error: toastError } = useToast()

  const [step, setStep] = useState<PayStep>('loading')
  const [paymentData, setPaymentData] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
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
    if (uuid) {
      loadPaymentDetails()
    }
  }, [uuid])

  async function loadPaymentDetails() {
    try {
      const res = await api.get(`/payment-request/${uuid}`)
      if (res.success) {
        setPaymentData(res.data)
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

  const handlePaymentSuccess = async (reference: string) => {
    setStep('processing')
    try {
      const res = await api.post(`/payment-request/${uuid}/confirm`, { reference })
      if (res.success) {
        success('Payment successful!')
        // If guest (hasPassword === false), go to onboarding
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
      // Use the existing accept invite endpoint as it does exactly what we need
      // (sets password and returns tokens)
      const res = await api.post(`/public/invite/${uuid}/accept`, {
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        address: formData.address
      })

      if (res.success) {
        success('Account activated! Welcome to Upward.')
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
      <div className="flex-center min-h-screen">
        <div className="error-card text-center">
          <AlertCircle size={48} color="var(--error)" className="mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Unavailable</h2>
          <p className="text-muted mb-6">{errorMessage}</p>
          <button className="btn btn--secondary" onClick={() => router.push('/')}>Return Home</button>
        </div>
      </div>
    )
  }

  if (step === 'invoice' && paymentData) {
    const isGuest = !paymentData.hasPassword
    const loginRequired = paymentData.hasPassword && !authUser

    return (
      <div className="auth-shell auth-shell--pay">
        <div className="auth-shell__brand" style={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: '480px', margin: '0 auto' }}>
          <UpwardLogo size={28} color="var(--clay)" />
          {authUser && (
            <button 
              className="back-to-dash"
              onClick={() => router.push('/dashboard')}
              style={{
                marginLeft: 'auto',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <div style={{ transform: 'rotate(180deg)', display: 'flex' }}>
                <ChevronRight size={14} />
              </div>
              Back to Dashboard
            </button>
          )}
        </div>

        <div className="pay-invoice mt-8">
          <header className="pay-invoice__header">
            <span className="pay-invoice__tag">Secure Payment Request</span>
            <h1 className="pay-invoice__title">{paymentData.company.name}</h1>
            <p className="pay-invoice__subtitle">Requesting payment for {paymentData.payment.description || 'Rent'}</p>
          </header>

          <div className="pay-invoice__amount-card">
            <label>Amount Due</label>
            <div className="amount">{formatCurrency(paymentData.payment.amount, paymentData.payment.currency)}</div>
            <div className="due-date">
              <Calendar size={14} />
              <span>Due by {new Date(paymentData.payment.dueDate).toLocaleDateString()}</span>
            </div>
          </div>

          {paymentData.payment.lineItems && (
            <div className="pay-invoice__breakdown mt-6">
              <h3>Itemized Breakdown</h3>
              <div className="items-list">
                {paymentData.payment.lineItems.map((item: any, i: number) => (
                  <div key={i} className="item">
                    <span>{item.label || item.name || `Item #${i + 1}`}</span>
                    <span className="price">{formatCurrency(item.amount, paymentData.payment.currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pay-invoice__actions mt-10">
            {loginRequired ? (
              <div className="login-prompt text-center">
                <p className="mb-4 text-sm text-secondary">
                  This payment request is for an existing Upward account. 
                  Please login to proceed with payment.
                </p>
                <button 
                  className="btn btn--primary btn--full"
                  onClick={() => router.push(`/login?redirect=/pay/${uuid}`)}
                >
                  <Lock size={18} className="mr-2" /> Login to Pay
                </button>
              </div>
            ) : (
              <button 
                className="btn btn--primary btn--full btn--pay"
                onClick={() => setStep('checkout')}
              >
                <CreditCard size={18} className="mr-2" /> 
                {authUser ? 'Proceed to Payment' : 'Pay Now'}
                <ArrowRight size={18} className="ml-2" />
              </button>
            )}
          </div>

          <footer className="pay-invoice__footer mt-8">
            <div className="secure-badge">
              <Lock size={14} /> Encrypted & Secure Payment
            </div>
            <p className="text-xs text-muted mt-2">
              By paying, you agree to Upward Tenants terms and privacy policy. 
              Transaction fees may apply depending on payment method.
            </p>
          </footer>
        </div>

        <style jsx>{`
          .pay-invoice {
            max-width: 480px;
            margin: 0 auto;
            background: var(--bg);
            border-radius: var(--radius-xl);
            padding: 32px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.05);
          }
          .pay-invoice__header {
            text-align: center;
            margin-bottom: 24px;
          }
          .pay-invoice__tag {
            display: inline-block;
            background: var(--clay-faint);
            color: var(--clay);
            font-size: 11px;
            font-weight: 700;
            padding: 4px 12px;
            border-radius: 100px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 12px;
          }
          .pay-invoice__title {
            font-size: 20px;
            font-weight: 800;
            margin: 0;
          }
          .pay-invoice__subtitle {
            color: var(--text-secondary);
            font-size: 14px;
            margin-top: 4px;
          }
          .pay-invoice__amount-card {
            background: var(--surface);
            border: 1px solid var(--border-solid);
            padding: 24px;
            border-radius: var(--radius-lg);
            text-align: center;
          }
          .pay-invoice__amount-card label {
            font-size: 12px;
            color: var(--text-muted);
            text-transform: uppercase;
            font-weight: 600;
          }
          .pay-invoice__amount-card .amount {
            font-size: 32px;
            font-weight: 800;
            color: var(--text);
            margin: 8px 0;
          }
          .pay-invoice__amount-card .due-date {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            font-size: 13px;
            color: var(--text-secondary);
          }
          .pay-invoice__breakdown h3 {
            font-size: 13px;
            font-weight: 700;
            color: var(--text-muted);
            text-transform: uppercase;
            margin-bottom: 12px;
          }
          .items-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .item {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            color: var(--text-secondary);
            padding-bottom: 10px;
            border-bottom: 1px dashed var(--border-solid);
          }
          .item:last-child {
            border-bottom: none;
          }
          .price {
            font-weight: 600;
            color: var(--text);
          }
          .secure-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: var(--success);
            font-weight: 600;
          }
          .login-prompt {
            padding: 20px;
            background: var(--surface2);
            border-radius: var(--radius-md);
          }
          .flex-center {
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .mr-2 { margin-right: 8px; }
          .ml-2 { margin-left: 8px; }
          .mt-8 { margin-top: 32px; }
          .mt-10 { margin-top: 40px; }
        `}</style>
      </div>
    )
  }

  if (step === 'checkout') {
    return (
      <div className="checkout-shell flex-center min-h-screen" style={{ background: 'var(--surface)' }}>
        <div className="checkout-container">
          <PaystackEmbeddedCheckout
            email={paymentData.user.email}
            amount={paymentData.payment.amount}
            currency={paymentData.payment.currency}
            companyName={paymentData.company.name}
            reference={generateId('PAY')}
            subaccount={paymentData.payment.subaccountCode}
            onSuccess={handlePaymentSuccess}
            onClose={() => setStep('invoice')}
            lineItems={paymentData.payment.lineItems}
          />
        </div>
        <style jsx>{`
          .checkout-container {
            width: 100%;
            max-width: 500px;
            background: #fff;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 50px rgba(0,0,0,0.1);
          }
        `}</style>
      </div>
    )
  }

  if (step === 'onboarding') {
    return (
       <div className="auth-shell auth-shell--signup">
        <div className="auth-shell__brand">
          <UpwardLogo size={28} color="var(--clay)" />
        </div>

        <div className="auth-stage">
          <header className="auth-stage__header">
            <div className="success-icon mb-4">
              <Check size={32} color="white" />
            </div>
            <h1 className="auth-stage__title">Payment Successful!</h1>
            <p className="auth-stage__subtitle">
              We&apos;ve securely recorded your payment to <strong>{paymentData.company.name}</strong>. Now, let&apos;s get your profile set up to track your rent credibility.
            </p>
          </header>

          <form className="auth-form mt-8" onSubmit={handleActivation}>
            <OnboardingFields 
              formData={formData} 
              setFormData={setFormData}
            />

            <div className="auth-form__row mt-3">
              <div className="auth-form__field">
                <label>Set Password</label>
                <div className="input-with-icon">
                  <Lock size={17} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={8}
                    placeholder="Min. 8 chars"
                  />
                </div>
              </div>
              <div className="auth-form__field">
                <label>Confirm Password</label>
                <div className="input-with-icon">
                  <Lock size={17} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                  />
                  <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <button className="btn btn--primary btn--full mt-8" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Finalizing...' : 'Complete Account Setup'}
              <ArrowRight size={18} className="ml-2" />
            </button>
          </form>
        </div>

        <style jsx>{`
          .success-icon {
            width: 64px;
            height: 64px;
            background: var(--success);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto;
            box-shadow: 0 0 20px var(--success-glow);
          }
          .auth-form__row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .mt-3 { margin-top: 12px; }
          .password-toggle {
            position: absolute;
            right: 12px;
            background: none;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
          }
          @media (max-width: 480px) {
            .auth-form__row {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    )
  }

  if (step === 'success') {
     return (
       <div className="auth-shell flex-center">
         <div className="success-page text-center">
            <div className="success-icon mb-6">
              <Check size={48} color="white" />
            </div>
            <h1 className="text-2xl font-bold mb-4">Payment Confirmed</h1>
            <p className="text-secondary mb-8">
              Your payment of <strong>{formatCurrency(paymentData.payment.amount, paymentData.payment.currency)}</strong> to <strong>{paymentData.company.name}</strong> was successful.
            </p>
            <button className="btn btn--primary" onClick={() => router.push('/dashboard')}>
              Go to Dashboard <ChevronRight size={18} />
            </button>
         </div>
         <style jsx>{`
           .success-icon {
             width: 96px;
             height: 96px;
             background: var(--success);
             border-radius: 50%;
             display: flex;
             align-items: center;
             justify-content: center;
             margin: 0 auto;
             box-shadow: 0 10px 30px var(--success-glow);
           }
         `}</style>
       </div>
     )
  }

  return null
}
