'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Home } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import {
  PayFlowPrimaryButton,
  PayPageShell,
} from '@/features/dashboard/components/payment/PayPageShell'
import {
  SAVE_FOR_HOME_BUDGETS,
  SAVE_FOR_HOME_TIMELINES,
  type SaveForHomeBudget,
  type SaveForHomeTimeline,
} from '@/features/dashboard/constants/saveForHome'

type FormState = {
  timeline: SaveForHomeTimeline | ''
  budget: SaveForHomeBudget | ''
}

export function SaveForHomeFlow() {
  const router = useRouter()
  const { user } = useAuth()
  const { error } = useToast()

  const [formData, setFormData] = useState<FormState>({ timeline: '', budget: '' })
  const [isSuccess, setIsSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isValid = !!formData.timeline && !!formData.budget

  const handleSubmit = async () => {
    if (!isValid) return

    setIsSubmitting(true)
    try {
      await api.post('/public/feedback', {
        userId: user?.id,
        email: user?.email,
        name: user ? `${user.firstName} ${user.lastName}`.trim() : undefined,
        type: 'SAVE_FOR_HOME',
        message: JSON.stringify({
          timeline: formData.timeline,
          budget: formData.budget,
        }),
      })
      setIsSuccess(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit. Please try again.'
      error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="savings-success dashboard--nav-offset">
        <div className="savings-success__badge">
          <CheckCircle2 size={40} />
        </div>
        <h1 className="savings-success__title">Awesome! We will share updates soon.</h1>
        <p className="savings-success__text">
          Thanks for letting us know your home savings goals. We&apos;ll keep you posted as this
          feature takes shape.
        </p>

        <div className="savings-success__actions">
          <PayFlowPrimaryButton onClick={() => router.push('/dashboard')}>
            Back to dashboard
          </PayFlowPrimaryButton>
        </div>
      </div>
    )
  }

  return (
    <PayPageShell
      title="Save for Home"
      showBack
      onBack={() => router.back()}
      footer={
        <PayFlowPrimaryButton
          onClick={handleSubmit}
          disabled={!isValid}
          loading={isSubmitting}
        >
          Submit
        </PayFlowPrimaryButton>
      }
    >
      <section className="upcoming-page__hero">
        <div className="upcoming-page__hero-icon">
          <Home size={22} />
        </div>
        <p className="upcoming-page__hero-text">
          We&apos;re happy to see you&apos;re interested in saving toward your future home.
          We&apos;re working on this already.
        </p>
      </section>

      <div className="savings-form">
        <div className="savings-form__field">
          <label htmlFor="save-home-timeline">How long are you looking at?</label>
          <div className="savings-form__input-wrap">
            <select
              id="save-home-timeline"
              value={formData.timeline}
              onChange={(e) =>
                setFormData({ ...formData, timeline: e.target.value as SaveForHomeTimeline })
              }
            >
              <option value="" disabled>
                Select a timeline
              </option>
              {SAVE_FOR_HOME_TIMELINES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="savings-form__field">
          <label htmlFor="save-home-budget">What&apos;s your budget?</label>
          <div className="savings-form__input-wrap">
            <select
              id="save-home-budget"
              value={formData.budget}
              onChange={(e) =>
                setFormData({ ...formData, budget: e.target.value as SaveForHomeBudget })
              }
            >
              <option value="" disabled>
                Select a budget range
              </option>
              {SAVE_FOR_HOME_BUDGETS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </PayPageShell>
  )
}
