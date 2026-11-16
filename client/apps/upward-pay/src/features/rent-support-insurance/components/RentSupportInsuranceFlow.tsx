'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/common/Toast'
import { usePlatformRates } from '@/features/payments/hooks/usePlatformRates'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import { RSI_PRODUCT_NAME } from '../constants'
import { useRsiEnrolment } from '../hooks/useRsiEnrolment'
import { clearRsiEnrolment, saveRsiEnrolment } from '../storage'
import type { RsiEnrolmentFormData, RsiFlowStep } from '../types'
import { buildDefaultFormData, calculateAnnualPremium, parseAnnualRent } from '../utils'
import { InsuranceConsentStep } from './InsuranceConsentStep'
import { InsuranceDetailsStep } from './InsuranceDetailsStep'
import { InsuranceEnrolmentForm } from './InsuranceEnrolmentForm'
import { InsurancePropertyStep } from './InsurancePropertyStep'
import { InsuranceStatusView } from './InsuranceStatusView'
import { InsuranceSuccessStep } from './InsuranceSuccessStep'

const STEP_SUBTITLES: Record<RsiFlowStep, string> = {
  property: 'Select the rental property you want to insure.',
  details: 'Understand what this insurance covers before you enrol.',
  consent: 'Confirm you understand how this policy works.',
  form: 'Provide your details and pay the annual premium to activate cover.',
  success: 'Your insurance cover is now active.',
}

function openPaystackInline(accessCode: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const scriptId = 'paystack-inline-js'
    let script = document.getElementById(scriptId) as HTMLScriptElement | null

    const launch = () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const popup = new (window as any).PaystackPop()
        popup.resumeTransaction(accessCode, {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      script.onerror = () => reject(new Error('Failed to load Paystack checkout'))
      document.body.appendChild(script)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).PaystackPop) launch()
    else script.addEventListener('load', launch)
  })
}

export function RentSupportInsuranceFlow() {
  const router = useRouter()
  const { user } = useAuth()
  const toast = useToast()
  const { rates: platformRates } = usePlatformRates()
  const premiumRatePct = platformRates.insurancePremiumPct
  const { enrolments, loaded, setEnrolments } = useRsiEnrolment()
  const [step, setStep] = useState<RsiFlowStep>('property')
  const [selectedPropertyUuid, setSelectedPropertyUuid] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submittedEnrolment, setSubmittedEnrolment] = useState<
    (typeof enrolments)[number] | null
  >(null)

  const activeProperties = useMemo(
    () => (user?.properties || []).filter((property) => !property.isPastTenancy),
    [user?.properties],
  )
  const selectedEnrolment =
    enrolments.find((record) => record.form.propertyUuid === selectedPropertyUuid) || null
  const defaultFormData = useMemo(
    () => buildDefaultFormData(user, selectedPropertyUuid),
    [selectedPropertyUuid, user],
  )

  const handleBack = () => {
    if (step === 'details') {
      setSelectedPropertyUuid('')
      setStep('property')
      return
    }
    if (step === 'consent') {
      setStep('details')
      return
    }
    if (step === 'form') {
      setStep('consent')
      return
    }
    router.push('/dashboard')
  }

  const handleSubmit = async (form: RsiEnrolmentFormData) => {
    if (submitting) return
    const annualRent = parseAnnualRent(form.annualRent)
    if (!annualRent || annualRent <= 0) {
      toast.error('Please enter a valid annual rent amount.', 'Invalid rent')
      return
    }

    try {
      setSubmitting(true)
      type InitResult = {
        enrolmentUuid: string
        reference: string
        accessCode?: string
        premiumAmount: number
        premiumRatePct: number
      }
      const initRes = await api.post<{ data?: InitResult } | InitResult>(
        '/payments/insurance/enrolments/initialize',
        {
          propertyUuid: form.propertyUuid || undefined,
          fullName: form.fullName,
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          phone: form.phone,
          address: form.address,
          occupation: form.occupation,
          employmentType: form.employmentType,
          rentStartDate: form.rentStartDate,
          annualRent,
          landlordName: form.landlordName,
          propertyAddress: form.propertyAddress,
        },
      )

      const init =
        'data' in initRes && initRes.data ? initRes.data : (initRes as InitResult)
      if (!init?.accessCode || !init?.enrolmentUuid) {
        throw new Error('Could not initialize insurance payment. Please try again.')
      }

      const reference = await openPaystackInline(init.accessCode)

      await api.post(`/payments/insurance/enrolments/${init.enrolmentUuid}/confirm`, {
        reference,
      })

      const appliedRatePct = Number(init.premiumRatePct ?? premiumRatePct)
      const paidAmount = Number(
        init.premiumAmount ?? calculateAnnualPremium(annualRent, appliedRatePct),
      )

      const record = saveRsiEnrolment(form, {
        uuid: init.enrolmentUuid,
        status: 'active',
        premiumPaid: paidAmount,
        premiumRatePct: appliedRatePct,
        paymentReference: reference,
      })
      setEnrolments((current) => [
        ...current.filter((item) => item.form.propertyUuid !== form.propertyUuid),
        record,
      ])
      setSubmittedEnrolment(record)
      toast.success(
        `${formatCurrency(paidAmount)} insurance premium paid (${appliedRatePct}%). Your cover is active.`,
        'Insurance Activated',
      )
      setStep('success')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to complete insurance payment'
      if (message === 'Payment cancelled') {
        toast.info('Payment was cancelled', 'Checkout')
      } else {
        toast.error(message, 'Payment failed')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleReEnrol = () => {
    clearRsiEnrolment(selectedPropertyUuid)
    setEnrolments((current) =>
      current.filter((item) => item.form.propertyUuid !== selectedPropertyUuid),
    )
    setSubmittedEnrolment(null)
    setStep('details')
  }

  if (!loaded) {
    return (
      <PayPageShell title={RSI_PRODUCT_NAME} showBack onBack={() => router.push('/dashboard')}>
        <div className="rsi-flow__loading">Loading…</div>
      </PayPageShell>
    )
  }

  if (selectedEnrolment && step !== 'success') {
    return (
      <PayPageShell
        title={RSI_PRODUCT_NAME}
        subtitle="View your enrolment status."
        showBack
        onBack={() => {
          setSelectedPropertyUuid('')
          setStep('property')
        }}
      >
        <InsuranceStatusView
          enrolment={selectedEnrolment}
          paying={submitting}
          onPayPending={() => handleSubmit(selectedEnrolment.form)}
          onReEnrol={process.env.NODE_ENV === 'development' ? handleReEnrol : undefined}
        />
      </PayPageShell>
    )
  }

  return (
    <PayPageShell
      title={RSI_PRODUCT_NAME}
      subtitle={STEP_SUBTITLES[step]}
      showBack
      onBack={handleBack}
    >
      {step === 'property' ? (
        <InsurancePropertyStep
          properties={activeProperties}
          enrolments={enrolments}
          onSelect={(propertyUuid) => {
            setSelectedPropertyUuid(propertyUuid)
            setStep('details')
          }}
        />
      ) : null}
      {step === 'details' ? (
        <InsuranceDetailsStep
          premiumRatePct={premiumRatePct}
          onContinue={() => setStep('consent')}
        />
      ) : null}
      {step === 'consent' ? (
        <InsuranceConsentStep onContinue={() => setStep('form')} />
      ) : null}
      {step === 'form' ? (
        <InsuranceEnrolmentForm
          initialData={defaultFormData}
          premiumRatePct={premiumRatePct}
          submitting={submitting}
          onSubmit={handleSubmit}
        />
      ) : null}
      {step === 'success' && submittedEnrolment ? (
        <InsuranceSuccessStep
          enrolment={submittedEnrolment}
          onDone={() => router.push('/dashboard')}
        />
      ) : null}
    </PayPageShell>
  )
}
