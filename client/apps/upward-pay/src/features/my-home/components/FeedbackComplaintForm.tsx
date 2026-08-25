'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/common/Modal'
import { useToast } from '@/components/common/Toast'
import {
  COMPLAINT_FEEDBACK_QUESTIONS,
  COMPLAINT_VENDOR_FEEDBACK_QUESTIONS,
} from '../constants'
import { submitComplaintFeedback, type ComplaintFeedbackItem } from '../services/myHomeService'
import type { Complaint } from '../types'

type Props = {
  isOpen: boolean
  onClose: () => void
  propertyUuid: string | null
  complaint: Complaint | null
}

export function FeedbackComplaintForm({ isOpen, onClose, propertyUuid, complaint }: Props) {
  const { success, error } = useToast()
  const queryClient = useQueryClient()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [information, setInformation] = useState('')
  const [triedToSubmit, setTriedToSubmit] = useState(false)

  const questions = complaint?.has_vendor
    ? [...COMPLAINT_FEEDBACK_QUESTIONS, ...COMPLAINT_VENDOR_FEEDBACK_QUESTIONS]
    : [...COMPLAINT_FEEDBACK_QUESTIONS]

  const mutation = useMutation({
    mutationFn: () => {
      const feedback: ComplaintFeedbackItem[] = questions.map((question) => ({
        question: question.question,
        answer: answers[question.key] || '',
      }))
      feedback.push({
        question: 'Any other information?',
        answer: information.trim(),
      })
      return submitComplaintFeedback(propertyUuid as string, complaint!.complaint_id, feedback)
    },
    onSuccess: () => {
      success('Feedback submitted successfully.')
      queryClient.invalidateQueries({ queryKey: ['my-home', 'complaints'] })
      queryClient.invalidateQueries({ queryKey: ['my-home', 'complaint'] })
      onClose()
    },
    onError: (err: { message?: string }) => {
      error(err?.message || 'Could not submit feedback')
    },
  })

  useEffect(() => {
    if (!isOpen) {
      setAnswers({})
      setInformation('')
      setTriedToSubmit(false)
      mutation.reset()
    }
  }, [isOpen])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!propertyUuid || !complaint) {
      error('Select a home before submitting feedback')
      return
    }
    if (questions.some((question) => !answers[question.key])) {
      setTriedToSubmit(true)
      return
    }
    mutation.mutate()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <form className="my-home-form" onSubmit={handleSubmit}>
        <h3 className="my-home-detail__title">Rate Your Experience</h3>
        <p className="my-home-form__lede">How was your issue handled? Your feedback helps us improve complaint resolution.</p>

        {questions.map((question, index) => (
          <div key={question.key} className="my-home-form__field">
            {complaint?.has_vendor && index === COMPLAINT_FEEDBACK_QUESTIONS.length ? (
              <p className="my-home-form__section-title">Rate the Vendor</p>
            ) : null}
            <span className="my-home-form__label">{question.question}</span>
            <div className="my-home-form__choices" role="radiogroup" aria-label={question.question}>
              {question.options.map((option) => {
                const selected = answers[question.key] === option
                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`my-home-form__choice${selected ? ' my-home-form__choice--active' : ''}`}
                    onClick={() => setAnswers((current) => ({ ...current, [question.key]: option }))}
                    disabled={mutation.isPending}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
            {triedToSubmit && !answers[question.key] ? (
              <span className="my-home-form__error">Please select an option</span>
            ) : null}
          </div>
        ))}

        <label className="my-home-form__field">
          <span className="my-home-form__label">Any other information?</span>
          <textarea
            className="my-home-form__input my-home-form__input--area"
            placeholder="Add more details (optional)"
            value={information}
            onChange={(event) => setInformation(event.target.value)}
            rows={4}
            disabled={mutation.isPending}
          />
        </label>

        <div className="my-home-confirm__actions">
          <button type="button" className="my-home-detail__secondary-btn" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </button>
          <button type="submit" className="my-home-detail__copy-btn" disabled={mutation.isPending}>
            {mutation.isPending ? 'Submitting…' : 'Submit Feedback'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
