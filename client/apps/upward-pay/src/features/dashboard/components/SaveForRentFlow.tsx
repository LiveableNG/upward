'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, PiggyBank } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import {
  PayFlowPrimaryButton,
  PayPageShell,
} from '@/features/dashboard/components/payment/PayPageShell'
import {
  SAVE_FOR_RENT_BUDGETS,
  SAVE_FOR_RENT_TIMELINES,
  type SaveForRentBudget,
  type SaveForRentTimeline,
} from '@/features/dashboard/constants/saveForRent'

type FormState = {
  timeline: SaveForRentTimeline | ''
  budget: SaveForRentBudget | ''
}

export function SaveForRentFlow() {
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
        type: 'SAVE_FOR_RENT',
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
          Thanks for sharing your rent savings plans. We&apos;ll keep you posted as this feature
          rolls out.
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
      title="Save for Rent"
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
          <PiggyBank size={22} />
        </div>
        <p className="upcoming-page__hero-text">
          Great choice. We&apos;re building smarter tools to help you save ahead for your next rent.
        </p>
      </section>

      <div className="savings-form">
        <div className="savings-form__field">
          <label htmlFor="save-rent-timeline">When are you planning for this rent?</label>
          <div className="savings-form__input-wrap">
            <select
              id="save-rent-timeline"
              value={formData.timeline}
              onChange={(e) =>
                setFormData({ ...formData, timeline: e.target.value as SaveForRentTimeline })
              }
            >
              <option value="" disabled>
                Select a timeline
              </option>
              {SAVE_FOR_RENT_TIMELINES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="savings-form__field">
          <label htmlFor="save-rent-budget">What&apos;s your rent budget?</label>
          <div className="savings-form__input-wrap">
            <select
              id="save-rent-budget"
              value={formData.budget}
              onChange={(e) =>
                setFormData({ ...formData, budget: e.target.value as SaveForRentBudget })
              }
            >
              <option value="" disabled>
                Select a budget range
              </option>
              {SAVE_FOR_RENT_BUDGETS.map((option) => (
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
