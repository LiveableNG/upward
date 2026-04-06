'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StepByStep } from '@/components/common/StepByStep'
import { Target, Calendar, Wallet, CheckCircle2, Zap, Bell, Check } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'

export function SavingsGoalFlow() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { error } = useToast()
  const [formData, setFormData] = useState({
    name: 'Rent Savings',
    targetAmount: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    reminderEnabled: true,
    reminderFrequency: 'MONTHLY',
    reminderDay: 27,
    autoSaveEnabled: true,
  })

  const [isSuccess, setIsSuccess] = useState(false)

  const createGoal = useMutation({
    mutationFn: (data: typeof formData) => api.createSavingsGoal(data),
    onSuccess: () => {
      setIsSuccess(true)
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to create savings goal. Please try again.')
    },
  })

  const steps = [
    {
      title: 'What are you saving for?',
      subtitle: 'Give your savings goal a name to stay motivated.',
      isValid: formData.name.length > 2,
      content: (
        <div className="auth-form">
          <div className="auth-form__field">
            <label>Goal Name</label>
            <div className="input-with-icon">
              <Target size={18} />
              <input
                type="text"
                placeholder="e.g. Annual Rent, Security Deposit"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'How much is the target?',
      subtitle: 'Set the total amount you want to save.',
      isValid: formData.targetAmount > 100,
      content: (
        <div className="auth-form">
          <div className="auth-form__field">
            <label>Target Amount (₦)</label>
            <div className="input-with-icon">
              <Wallet size={18} />
              <input
                type="number"
                placeholder="e.g. 500,000"
                value={formData.targetAmount || ''}
                onChange={(e) => setFormData({ ...formData, targetAmount: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Reminders & Automation',
      subtitle: 'How would you like to stay on track?',
      isValid: true,
      content: (
        <div className="auth-form">
          <div
            className={`autosave-toggle ${formData.autoSaveEnabled ? 'autosave-toggle--on' : ''}`}
            onClick={() => setFormData({ ...formData, autoSaveEnabled: !formData.autoSaveEnabled })}
            style={{ marginBottom: 16 }}
          >
            <div
              className={`autosave-toggle__check ${formData.autoSaveEnabled ? 'autosave-toggle__check--on' : ''}`}
            >
              {formData.autoSaveEnabled && <Check size={14} color="#fff" />}
            </div>
            <div className="autosave-toggle__info">
              <p className="autosave-toggle__title">Enable Auto-Save</p>
              <p className="autosave-toggle__sub">Plan for your rent automatically</p>
            </div>
            <Zap
              size={18}
              className={`autosave-toggle__icon ${formData.autoSaveEnabled ? 'autosave-toggle__icon--on' : ''}`}
            />
          </div>

          <div
            className={`autosave-toggle ${formData.reminderEnabled ? 'autosave-toggle--on' : ''}`}
            onClick={() => setFormData({ ...formData, reminderEnabled: !formData.reminderEnabled })}
            style={{ marginBottom: 20 }}
          >
            <div
              className={`autosave-toggle__check ${formData.reminderEnabled ? 'autosave-toggle__check--on' : ''}`}
            >
              {formData.reminderEnabled && <Check size={14} color="#fff" />}
            </div>
            <div className="autosave-toggle__info">
              <p className="autosave-toggle__title">Enable Reminders</p>
              <p className="autosave-toggle__sub">Get notified when it's time to save</p>
            </div>
            <Bell
              size={18}
              className={`autosave-toggle__icon ${formData.reminderEnabled ? 'autosave-toggle__icon--on' : ''}`}
            />
          </div>

          {formData.reminderEnabled && (
            <div
              className="animate-fade-in"
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              <div className="auth-form__field">
                <label>Frequency</label>
                <select
                  className="reminder-select"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                  }}
                  value={formData.reminderFrequency}
                  onChange={(e) => setFormData({ ...formData, reminderFrequency: e.target.value })}
                >
                  <option value="DAILY">Daily</option>
                  <option value="TWO_DAYS">Every 2 Days</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>

              {formData.reminderFrequency === 'MONTHLY' && (
                <div className="auth-form__field">
                  <label>Day of Month</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                    }}
                    value={formData.reminderDay}
                    onChange={(e) =>
                      setFormData({ ...formData, reminderDay: Number(e.target.value) })
                    }
                  />
                </div>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'When is the deadline?',
      subtitle: 'Tell us your target date to help you track progress.',
      isValid: !!formData.endDate,
      content: (
        <div className="auth-form">
          <div className="auth-form__field">
            <label>Target Date</label>
            <div className="input-with-icon">
              <Calendar size={18} />
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>
        </div>
      ),
    },
  ]

  if (isSuccess) {
    return (
      <div className="step-by-step">
        <div className="complete-profile__done">
          <div className="complete-profile__done-badge">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="complete-profile__done-title">Goal Set!</h1>
          <p className="complete-profile__done-text">
            Your savings goal "<strong>{formData.name}</strong>" has been created. Ready to make
            your first deposit?
          </p>

          <div className="complete-profile__done-perks">
            <div className="complete-profile__done-perk">🚀 Automation: Fund via Bank Transfer</div>
            <div className="complete-profile__done-perk">
              📈 Insights: Track milestones & growth
            </div>
          </div>

          <div className="auth-page__actions" style={{ width: '100%', maxWidth: 300 }}>
            <button
              className="btn btn--primary btn--full"
              onClick={() => router.push('/dashboard/savings')}
            >
              Go to Savings Dashboard
            </button>
            <button
              className="btn btn--secondary btn--full"
              style={{ marginTop: 12 }}
              onClick={() => router.push('/dashboard/savings/deposit')}
            >
              Deposit Now
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <StepByStep
      steps={steps}
      onComplete={() => createGoal.mutate(formData)}
      onCancel={() => router.back()}
      completeLabel="Set Savings Goal"
      loading={createGoal.isPending}
    />
  )
}
