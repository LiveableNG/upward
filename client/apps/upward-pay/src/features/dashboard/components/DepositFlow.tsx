'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '@/lib/utils'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import PaystackEmbeddedCheckout from './payment/PaystackEmbeddedCheckout'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/common/Toast'
import { SetupPageShell, SetupPrimaryButton } from '@/features/dashboard/setup/components/SetupPageShell'

export function DepositFlow() {
  const router = useRouter()
  const { user } = useAuth()
  const { success, error } = useToast()
  const [amount, setAmount] = useState(0)
  const [showCheckout, setShowCheckout] = useState(false)
  const [txRef, setTxRef] = useState<string | null>(null)
  const [accessCode, setAccessCode] = useState<string | null>(null)

  const initTx = useMutation({
    mutationFn: (data: { amount: number }) => api.fundWallet(data),
    onSuccess: (data) => {
      setTxRef(data.reference)
      setAccessCode(data.accessCode || null)
      setShowCheckout(true)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to initialize payment')
    },
  })

  return (
    <>
      <SetupPageShell
        title="Add funds"
        subtitle="Funds will be added to your Upward wallet."
        onBack={() => router.back()}
        footer={
          <SetupPrimaryButton
            onClick={() => initTx.mutate({ amount })}
            disabled={amount < 100 || initTx.isPending}
          >
            {initTx.isPending ? (
              'Processing...'
            ) : (
              <>
                Continue to Paystack
                <ArrowRight size={18} aria-hidden />
              </>
            )}
          </SetupPrimaryButton>
        }
      >
        <div className="savings-form">
          <div className="savings-form__field">
            <label>Amount (₦)</label>
            <div className="savings-form__input-wrap savings-form__input-wrap--amount">
              <span className="savings-form__currency">₦</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 50,000"
                value={formatCurrencyInput(amount)}
                onChange={(e) => setAmount(parseCurrencyInput(e.target.value) ?? 0)}
              />
            </div>
          </div>
          <div className="deposit-presets">
            {[5000, 10000, 20000, 50000].map((p) => (
              <button key={p} type="button" className="deposit-preset-btn" onClick={() => setAmount(p)}>
                +{formatCurrency(p, 'NGN')}
              </button>
            ))}
          </div>
        </div>
      </SetupPageShell>

      {showCheckout && user && txRef && accessCode && (
        <PaystackEmbeddedCheckout
          email={user.email}
          amount={amount}
          accessCode={accessCode}
          reference={txRef}
          companyName="Upward Pay Wallet"
          paymentType="Savings deposit"
          onSuccess={() => {
            success('Payment received! Processing your deposit...')
            router.push('/dashboard/savings')
          }}
          onClose={() => setShowCheckout(false)}
        />
      )}
    </>
  )
}
