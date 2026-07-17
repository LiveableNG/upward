'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/features/auth/AuthContext'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import { RSI_PRODUCT_NAME } from '../constants'
import { useRsiEnrolment } from '../hooks/useRsiEnrolment'
import { clearRsiEnrolment, saveRsiEnrolment } from '../storage'
import type { RsiEnrolmentFormData, RsiFlowStep } from '../types'
import { buildDefaultFormData } from '../utils'
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
  form: 'Provide the details needed to complete your enrolment.',
  success: 'Your enrolment has been submitted.',
}

export function RentSupportInsuranceFlow() {
  const router = useRouter()
  const { user } = useAuth()
  const { enrolments, loaded, setEnrolments } = useRsiEnrolment()
  const [step, setStep] = useState<RsiFlowStep>('property')
  const [selectedPropertyUuid, setSelectedPropertyUuid] = useState('')
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

  const handleSubmit = (form: RsiEnrolmentFormData) => {
    const record = saveRsiEnrolment(form)
    setEnrolments((current) => [
      ...current.filter((item) => item.form.propertyUuid !== form.propertyUuid),
      record,
    ])
    setSubmittedEnrolment(record)
    setStep('success')
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
      {step === 'details' ? <InsuranceDetailsStep onContinue={() => setStep('consent')} /> : null}
      {step === 'consent' ? (
        <InsuranceConsentStep onContinue={() => setStep('form')} />
      ) : null}
      {step === 'form' ? (
        <InsuranceEnrolmentForm
          initialData={defaultFormData}
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
