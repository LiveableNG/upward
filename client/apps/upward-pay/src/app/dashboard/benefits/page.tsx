'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, ShieldCheck } from 'lucide-react'
import { PayPageShell, PayFlowPrimaryButton } from '@/features/dashboard/components/payment/PayPageShell'
import { PREMIUM_BENEFITS } from '@/features/premium/constants/premiumBenefits'
import {
  confirmBenefitsPayment,
  getBenefitsStatus,
  initializeBenefitsPayment,
  type BenefitsStatus,
} from '@/features/payments/services/benefitsService'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useToast } from '@/components/common/Toast'
import { useQueryClient } from '@tanstack/react-query'

export default function BenefitsPage() {
  const router = useRouter()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<BenefitsStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getBenefitsStatus()
      setStatus(data)
    } catch (err: any) {
      const message = err?.message || 'Failed to load benefits status'
      setError(message)
      if (
        message.toLowerCase().includes('expired') ||
        message.toLowerCase().includes('auth') ||
        err?.status === 401
      ) {
        router.push('/login')
      }
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const openPaystack = (accessCode: string) =>
    new Promise<string>((resolve, reject) => {
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

  const handlePay = async () => {
    if (!status || status.isActive || paying) return
    try {
      setPaying(true)
      const init = await initializeBenefitsPayment()
      if (!init?.accessCode) {
        throw new Error('Could not start Paystack checkout')
      }
      const reference = await openPaystack(init.accessCode)
      await confirmBenefitsPayment(reference)
      toast.success('Upward Benefits is now active for one year', 'Protected')
      await queryClient.invalidateQueries({ queryKey: ['benefits-status'] })
      await loadStatus()
    } catch (err: any) {
      if (err?.message === 'Payment cancelled') {
        toast.info('Payment was cancelled', 'Checkout')
      } else {
        toast.error(err?.message || 'Failed to complete benefits payment', 'Payment failed')
      }
    } finally {
      setPaying(false)
    }
  }

  const fee = status?.benefitsFee || 0
  const currency = status?.currency || 'NGN'
  const canPay = !!status && !status.isActive && !loading && !error

  return (
    <PayPageShell
      title="Upward Benefits"
      subtitle={PREMIUM_BENEFITS.tagline}
      showBack
      onBack={() => router.push('/dashboard')}
    >
      {loading ? (
        <div className="benefits-page__loading">
          <Loader2 size={22} className="benefits-page__spinner" />
          <p>Loading protection status…</p>
        </div>
      ) : error ? (
        <div className="benefits-page__error">
          <p>{error}</p>
          <button type="button" className="btn btn--secondary" onClick={loadStatus}>
            Retry
          </button>
        </div>
      ) : (
        <div className="benefits-page">
          <div className={`benefits-page__badge ${status?.isActive ? 'is-active' : ''}`}>
            <ShieldCheck size={22} />
            <div>
              <strong>{status?.isActive ? 'Protected' : 'Not protected yet'}</strong>
              <p>
                {status?.isActive && status.endsAt
                  ? `Active until ${formatDate(status.endsAt)}`
                  : 'Annual cover for your Upward account'}
              </p>
            </div>
          </div>

          <section className="benefits-page__card">
            <h2>{status?.packageName || PREMIUM_BENEFITS.packageName}</h2>
            <p className="benefits-page__proof">{PREMIUM_BENEFITS.socialProof}</p>
            <ul className="benefits-page__list">
              {(status?.benefits || [...PREMIUM_BENEFITS.items]).map((item) => (
                <li key={item}>
                  <Check size={16} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="benefits-page__card benefits-page__card--price">
            <div className="benefits-page__price-row">
              <span>Annual fee</span>
              <strong>{formatCurrency(fee > 0 ? fee : 1000, currency)}</strong>
            </div>
            <p className="benefits-page__meta">One payment covers your account for 12 months.</p>
          </section>

          {canPay && (
            <div className="benefits-page__cta">
              <PayFlowPrimaryButton onClick={handlePay} disabled={paying} loading={paying}>
                {paying ? 'Processing…' : `Pay ${formatCurrency(fee > 0 ? fee : 1000, currency)} / year`}
              </PayFlowPrimaryButton>
            </div>
          )}
        </div>
      )}
    </PayPageShell>
  )
}
