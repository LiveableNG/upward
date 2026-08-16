import React, { useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'

export function FeedbackTab() {
  const { user } = useAuth()
  const { success, error } = useToast()

  const [type, setType] = useState('SUGGESTION')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) {
      error('Feedback message cannot be empty')
      return
    }

    setSubmitting(true)
    try {
      await api.post('/public/feedback', {
        userId: user?.id,
        email: user?.email,
        name: user ? `${user.firstName} ${user.lastName}`.trim() : 'Guest',
        type,
        message,
      })
      success('Thank you! Your feedback has been submitted.')
      setMessage('')
      setType('SUGGESTION')
    } catch (err: any) {
      error(err.message || 'Failed to submit feedback')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="settings__section animate-fade-in" style={{ maxWidth: 600 }}>
      <div className="settings__section-header">
        <h2 className="settings__section-title">Share Feedback</h2>
        <p className="settings__section-subtitle">We would love to hear your suggestions, bug reports, or difficulties using the app.</p>
      </div>

      <form className="settings__form" onSubmit={handleSubmit}>
        <div className="settings__field" style={{ marginBottom: 20 }}>
          <label className="settings__label">Feedback Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="settings__input"
            required
          >
            <option value="SUGGESTION">Suggestion</option>
            <option value="BUG">Report a Bug</option>
            <option value="DIFFICULTY">Difficulty Using App</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div className="settings__field" style={{ marginBottom: 24 }}>
          <label className="settings__label">Your Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="settings__input"
            placeholder="Tell us what you think or describe the issue..."
            rows={6}
            style={{ resize: 'none', height: 'auto', padding: '12px 16px' }}
            required
          />
        </div>

        <button
          type="submit"
          className="settings__submit"
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </section>
  )
}
