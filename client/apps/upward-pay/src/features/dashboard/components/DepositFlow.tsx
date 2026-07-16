'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '@/lib/utils'
import { api } from '@/lib/api'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/common/Toast'
import { SetupPageShell, SetupPrimaryButton } from '@/features/dashboard/setup/components/SetupPageShell'
import { useQueryClient } from '@tanstack/react-query'

function openPaystack(accessCode: string) {
  return new Promise<string>((resolve, reject) => {
    const scriptId = 'paystack-inline-js'
    let script = document.getElementById(scriptId) as HTMLScriptElement | null

    const launch = () => {
      try {
        const popup = new (window as any).PaystackPop()
        popup.resumeTransaction(accessCode, {
          onSuccess: (transaction: any) => resolve(transaction.reference),
          onCancel: () => reject(new Error('Payment cancelled')),
        })
      } catch (err) {
        reject(err)
      }
    }

    if (!script) {
      script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://js.paystack.co/v2/inline.js'
      script.async = true
      script.onload = launch
      script.onerror = () => reject(new Error('Failed to load Paystack'))
      document.body.appendChild(script)
      return
    }

    if ((window as any).PaystackPop) launch()
    else script.addEventListener('load', launch)
  })
}

export function DepositFlow() {
  const router = useRouter()
  const { user } = useAuth()
  const { success, error, info } = useToast()
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState(0)
  const [paying, setPaying] = useState(false)

  const handlePay = async () => {
    if (!user || amount < 100 || paying) return

    try {
      setPaying(true)
      const init = await api.fundWallet({ amount })
      if (!init?.accessCode) {
        throw new Error('Could not start Paystack checkout')
      }

      await openPaystack(init.accessCode)
      success('Payment received! Processing your deposit...')
      await queryClient.invalidateQueries({ queryKey: ['wallet'] })
      router.push('/dashboard/savings')
    } catch (err: any) {
      if (err?.message === 'Payment cancelled') {
        info('Payment was cancelled')
      } else {
        error(err?.message || err?.response?.data?.message || 'Failed to complete deposit')
      }
    } finally {
      setPaying(false)
    }
  }

  return (
    <SetupPageShell
      title="Add funds"
      subtitle="Funds will be added to your Upward wallet."
      onBack={() => router.back()}
      footer={
        <SetupPrimaryButton onClick={handlePay} disabled={amount < 100 || paying}>
          {paying ? (
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
  )
}
