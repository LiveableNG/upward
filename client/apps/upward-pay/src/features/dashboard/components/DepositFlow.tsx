'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StepByStep } from '@/components/common/StepByStep'
import { CreditCard, Landmark, ShieldCheck, Copy, Check, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import PaystackEmbeddedCheckout from './payment/PaystackEmbeddedCheckout'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/common/Toast'

export function DepositFlow() {
  const router = useRouter()
  const { user } = useAuth()
  const { success, error } = useToast()
  const [amount, setAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank_transfer' | null>(null)
  const [copied, setCopied] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [txRef, setTxRef] = useState<string | null>(null)

  // Fetch wallet details to get DVA
  const { data: wallet, isLoading: loadingWallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const res = await api.get('/wallet')
      return res
    },
  })

  // Mutation to initialize transaction
  const initTx = useMutation({
    mutationFn: async (data: { amount: number }) => {
      const res = await api.post('/wallet/fund', data)
      return res
    },
    onSuccess: (data) => {
      setTxRef(data.reference)
      setShowCheckout(true)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to initialize payment')
    },
  })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const steps = [
    {
      title: 'How much do you want to deposit?',
      subtitle: 'Funds will be added to your Upward Wallet.',
      isValid: amount >= 100,
      content: (
        <div className="auth-form">
          <div className="auth-form__field">
            <label>Amount (₦)</label>
            <div className="input-with-icon">
              <span style={{ fontWeight: 700, opacity: 0.5 }}>₦</span>
              <input
                type="number"
                placeholder="e.g. 50,000"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="deposit-presets">
            {[5000, 10000, 20000, 50000].map((p) => (
              <button key={p} className="deposit-preset-btn" onClick={() => setAmount(p)}>
                +{formatCurrency(p, 'NGN')}
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: 'Choose payment method',
      subtitle: "Select how you'd like to fund your wallet.",
      isValid: !!paymentMethod,
      content: (
        <div className="payment-methods">
          <div
            className={`payment-method-card ${paymentMethod === 'bank_transfer' ? 'is-selected' : ''}`}
            onClick={() => setPaymentMethod('bank_transfer')}
          >
            <div className="payment-method-card__icon">
              <Landmark size={24} />
            </div>
            <div className="payment-method-card__info">
              <h3>Bank Transfer (DVA)</h3>
              <p>Transfer to your dedicated account. Reflects instantly.</p>
            </div>
          </div>

          <div
            className={`payment-method-card ${paymentMethod === 'card' ? 'is-selected' : ''}`}
            onClick={() => setPaymentMethod('card')}
          >
            <div className="payment-method-card__icon">
              <CreditCard size={24} />
            </div>
            <div className="payment-method-card__info">
              <h3>Debit Card</h3>
              <p>Secure payment via Paystack checkout.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: paymentMethod === 'bank_transfer' ? 'Transfer Funds' : 'Confirm Deposit',
      subtitle:
        paymentMethod === 'bank_transfer'
          ? 'Transfer exactly the amount to the details below.'
          : "You will be redirected to Paystack's secure checkout.",
      isValid: true,
      content:
        paymentMethod === 'bank_transfer' ? (
          <div className="dva-display">
            {loadingWallet ? (
              <div className="loading-state" style={{ padding: 40, textAlign: 'center' }}>
                <Loader2 className="animate-spin" size={32} />
                <p style={{ marginTop: 16 }}>Retrieving your secure account...</p>
              </div>
            ) : wallet?.accountNumber ? (
              <div className="dva-card">
                <div className="dva-card__row">
                  <span className="dva-card__label">Bank Name</span>
                  <span className="dva-card__value">{wallet.bankName}</span>
                </div>
                <div className="dva-card__row">
                  <span className="dva-card__label">Account Number</span>
                  <button
                    className="dva-card__copy-btn"
                    onClick={() => copyToClipboard(wallet.accountNumber)}
                  >
                    <span className="dva-card__value">{wallet.accountNumber}</span>
                    {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                  </button>
                </div>
                <div className="dva-card__row">
                  <span className="dva-card__label">Account Name</span>
                  <span className="dva-card__value">
                    {wallet.accountName || `UPWARD / ${user?.fullName.toUpperCase()}`}
                  </span>
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ textAlign: 'center', padding: 20 }}>
                <p>Virtual account not found. Please try again or contact support.</p>
              </div>
            )}
            <div
              className="signup-info-card"
              style={{
                marginTop: 24,
                background: 'var(--clay-faint)',
                borderColor: 'rgba(217, 119, 87, 0.2)',
              }}
            >
              <p
                style={{
                  color: 'var(--clay)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <ShieldCheck size={14} style={{ marginRight: 4 }} />
                Instant confirmation. Your wallet will be credited as soon as we receive the alert.
              </p>
            </div>
          </div>
        ) : (
          <div className="deposit-summary">
            <div className="summary-item">
              <span>Deposit Amount</span>
              <strong>{formatCurrency(amount, 'NGN')}</strong>
            </div>
            <div className="summary-item">
              <span>Processing Fee</span>
              <strong>{formatCurrency(amount * 0.015, 'NGN')}</strong>
            </div>
            <div className="summary-divider" />
            <div className="summary-item total">
              <span>Total Payable</span>
              <strong>{formatCurrency(amount * 1.015, 'NGN')}</strong>
            </div>
            <div className="paystack-badge">
              <ShieldCheck size={16} /> Secured by Paystack
            </div>

            {showCheckout && user && txRef && (
              <PaystackEmbeddedCheckout
                email={user.email}
                amount={amount}
                reference={txRef}
                companyName="Upward Pay Wallet"
                onSuccess={() => {
                  success('Payment received! Processing your deposit...')
                  router.push('/dashboard/savings')
                }}
                onClose={() => setShowCheckout(false)}
              />
            )}
          </div>
        ),
    },
  ]

  return (
    <StepByStep
      steps={steps}
      onComplete={() => {
        if (paymentMethod === 'card') {
          initTx.mutate({ amount })
        } else {
          router.push('/dashboard/savings')
        }
      }}
      onCancel={() => router.back()}
      completeLabel={
        paymentMethod === 'bank_transfer' ? 'I have made the transfer' : 'Pay with Card'
      }
      loading={initTx.isPending}
    />
  )
}
