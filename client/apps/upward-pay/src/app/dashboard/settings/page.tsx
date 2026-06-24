/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Eye, EyeOff, Lock, LogOut, MessageSquare } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { BiometricSwitch } from '@/features/auth/component/BiometricSwitch'
import { NotificationSwitch } from '@/features/notifications/components/NotificationSwitch'
import { PayFlowPrimaryButton, PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'

export default function SettingsPage() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { success, error } = useToast()

  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })
  const [saving, setSaving] = useState(false)

  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [feedback, setFeedback] = useState({ type: 'SUGGESTION', message: '' })
  const [submittingFeedback, setSubmittingFeedback] = useState(false)

  if (!user) return null

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwords.new !== passwords.confirm) {
      error('New passwords do not match')
      return
    }
    setSaving(true)
    try {
      await api.post('/user/auth/change-password', passwords)
      success('Password updated successfully')
      setIsChangingPassword(false)
      setPasswords({ current: '', new: '', confirm: '' })
    } catch (err: any) {
      error(err.message || 'Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedback.message.trim()) {
      error('Feedback message cannot be empty')
      return
    }
    setSubmittingFeedback(true)
    try {
      await api.post('/public/feedback', {
        userId: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        type: feedback.type,
        message: feedback.message,
      })
      success('Thank you! Your feedback has been submitted.')
      setIsFeedbackOpen(false)
      setFeedback({ type: 'SUGGESTION', message: '' })
    } catch (err: any) {
      error(err.message || 'Failed to submit feedback')
    } finally {
      setSubmittingFeedback(false)
    }
  }

  return (
    <PayPageShell
      title="Settings"
      subtitle="Security, notifications, and account preferences."
      showBack
      onBack={() => router.push('/dashboard/me')}
    >
      <section className="settings-page__section profile-page__section">
        <h3 className="profile-page__section-label">Security &amp; notifications</h3>
        <div className="settings-page__menu-card">
          <NotificationSwitch />
          <BiometricSwitch />

          <button
            type="button"
            className="settings-page__row"
            onClick={() => setIsChangingPassword((open) => !open)}
          >
            <span className="settings-page__row-left">
              <span className="settings-page__row-icon">
                <Lock size={18} />
              </span>
              <span className="settings-page__row-text">
                <span className="settings-page__row-title">Change password</span>
                <span className="settings-page__row-desc">Update your account password</span>
              </span>
            </span>
            <ChevronRight
              size={18}
              className={`settings-page__row-chevron ${isChangingPassword ? 'settings-page__row-chevron--open' : ''}`}
            />
          </button>

          {isChangingPassword ? (
            <form className="settings-page__panel" onSubmit={handlePasswordChange}>
              <div className="personal-field">
                <label htmlFor="currentPassword">Current password</label>
                <div className="settings-page__field-wrap">
                  <input
                    id="currentPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={passwords.current}
                    onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    className="settings-page__password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="personal-field">
                <label htmlFor="newPassword">New password</label>
                <input
                  id="newPassword"
                  type="password"
                  value={passwords.new}
                  onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                  required
                />
              </div>

              <div className="personal-field">
                <label htmlFor="confirmPassword">Confirm new password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  required
                />
              </div>

              <PayFlowPrimaryButton type="submit" loading={saving} disabled={saving}>
                {saving ? 'Updating…' : 'Update password'}
              </PayFlowPrimaryButton>
            </form>
          ) : null}
        </div>
      </section>

      <section className="settings-page__section profile-page__section">
        <h3 className="profile-page__section-label">Feedback &amp; support</h3>
        <div className="settings-page__menu-card">
          <button
            type="button"
            className="settings-page__row"
            onClick={() => setIsFeedbackOpen((open) => !open)}
          >
            <span className="settings-page__row-left">
              <span className="settings-page__row-icon">
                <MessageSquare size={18} />
              </span>
              <span className="settings-page__row-text">
                <span className="settings-page__row-title">Share feedback</span>
                <span className="settings-page__row-desc">
                  Report a bug or suggest improvements
                </span>
              </span>
            </span>
            <ChevronRight
              size={18}
              className={`settings-page__row-chevron ${isFeedbackOpen ? 'settings-page__row-chevron--open' : ''}`}
            />
          </button>

          {isFeedbackOpen ? (
            <form className="settings-page__panel" onSubmit={handleFeedbackSubmit}>
              <div className="personal-field">
                <label htmlFor="feedbackType">Feedback type</label>
                <select
                  id="feedbackType"
                  value={feedback.type}
                  onChange={(e) => setFeedback({ ...feedback, type: e.target.value })}
                  required
                >
                  <option value="SUGGESTION">Suggestion</option>
                  <option value="BUG">Report a bug</option>
                  <option value="DIFFICULTY">Difficulty using app</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="personal-field">
                <label htmlFor="feedbackMessage">Your message</label>
                <textarea
                  id="feedbackMessage"
                  className="settings-page__textarea"
                  value={feedback.message}
                  onChange={(e) => setFeedback({ ...feedback, message: e.target.value })}
                  placeholder="Tell us what you think or describe the issue…"
                  required
                />
              </div>

              <PayFlowPrimaryButton
                type="submit"
                loading={submittingFeedback}
                disabled={submittingFeedback}
              >
                {submittingFeedback ? 'Submitting…' : 'Submit feedback'}
              </PayFlowPrimaryButton>
            </form>
          ) : null}
        </div>
      </section>

      <section className="settings-page__section profile-page__section">
        <button type="button" className="settings-page__sign-out" onClick={logout}>
          <LogOut size={18} />
          Sign out
        </button>
      </section>
    </PayPageShell>
  )
}
