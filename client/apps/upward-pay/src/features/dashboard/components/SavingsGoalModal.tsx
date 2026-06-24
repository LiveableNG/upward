'use client'

import { useState } from 'react'
import { X, Check, Zap, Bell, Calendar } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/utils'

interface SavingsGoalModalProps {
  onDone: () => void
  onSkip: () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  existingGoal?: any
}

type ModalStep = 'goal' | 'auto' | 'reminders'

export function SavingsGoalModal({ onDone, onSkip, existingGoal }: SavingsGoalModalProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  const [goal, setGoal] = useState(existingGoal?.targetAmount?.toString() || '')
  const [autoSave, setAutoSave] = useState(existingGoal?.autoSaveEnabled ?? true)
  const [reminderEnabled, setReminderEnabled] = useState(existingGoal?.reminderEnabled ?? true)
  const [reminderFrequency, setReminderFrequency] = useState(
    existingGoal?.reminderFrequency || 'MONTHLY',
  )
  const [reminderDay, setReminderDay] = useState(existingGoal?.reminderDay?.toString() || '27')
  const [autoSaveAmount, setAutoSaveAmount] = useState(
    existingGoal?.autoSaveAmount?.toString() || '',
  )
  const [step, setStep] = useState<ModalStep>('goal')
  const [isSuccess, setIsSuccess] = useState(false)

  const PRESETS = [150000, 250000, 500000, 1000000]

  const saveGoal = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: (data: any) => {
      if (existingGoal?.id) {
        return api.updateSavingsGoal(existingGoal.id, data)
      }
      return api.createSavingsGoal(data)
    },
    onSuccess: () => {
      success(existingGoal ? 'Savings goal updated!' : 'Savings goal set successfully!')
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] })
      setIsSuccess(true)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to save goal. Please try again.')
    },
  })

  const handleFinalSave = () => {
    const parsedGoal = parseCurrencyInput(goal) ?? 0
    const parsedAutoSaveAmount = parseCurrencyInput(autoSaveAmount) ?? 0
    saveGoal.mutate({
      name: existingGoal?.name || 'Rent Savings',
      targetAmount: parsedGoal,
      autoSaveEnabled: autoSave,
      autoSaveAmount: autoSave ? parsedAutoSaveAmount : undefined,
      reminderEnabled,
      reminderFrequency: reminderEnabled ? reminderFrequency : undefined,
      reminderDay: reminderEnabled ? Number(reminderDay) : undefined,
      startDate: existingGoal?.startDate || new Date().toISOString(),
    })
  }

  if (isSuccess) {
    return (
      <div className="modal-overlay">
        <div
          className="modal-card modal-card--success"
          style={{ textAlign: 'center', padding: '40px 24px' }}
        >
          <div
            className="success-icon-wrap"
            style={{
              background: 'rgba(52, 211, 153, 0.1)',
              width: 80,
              height: 80,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <Check size={40} color="#10b981" />
          </div>

          <h2 className="modal-card__title" style={{ fontSize: 24, marginBottom: 12 }}>
            {existingGoal ? 'Goal Updated!' : 'Rent Goal Set!'}
          </h2>

          <div
            className="success-reward-card"
            style={{
              background: 'var(--dark)',
              borderRadius: 16,
              padding: 20,
              marginBottom: 24,
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginBottom: 8,
              }}
            >
              <Zap size={18} color="var(--clay)" fill="var(--clay)" />
              <span style={{ color: 'var(--clay)', fontWeight: 600, fontSize: 14 }}>
                CREDIT BOOST!
              </span>
            </div>
            <p style={{ color: 'var(--text)', fontSize: 15, margin: 0 }}>
              {existingGoal
                ? 'Your consistency is being rewarded. Keep it up to stay ahead!'
                : 'Your credit score just went up! Setting a goal shows financial discipline.'}
            </p>
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 32 }}>
            Consistent savings are the fastest way to build your <strong>Reliability Rank</strong>{' '}
            and unlock better housing deals.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              className="btn btn--primary btn--full"
              onClick={() => {
                onDone()
                router.push('/dashboard/savings/deposit')
              }}
            >
              Deposit to Goal
            </button>
            <button className="btn btn--secondary btn--full" onClick={onDone}>
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onSkip}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-card__header">
          <div>
            <span className="modal-card__badge">Savings Setup</span>
            <h3 className="modal-card__title">
              {existingGoal
                ? 'Edit Your Goal'
                : step === 'goal'
                  ? 'Set Your Rent Goal'
                  : step === 'auto'
                    ? 'Auto-Save Plan'
                    : 'Reminders'}
            </h3>
          </div>
          <button className="modal-card__close" onClick={onSkip}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-card__body">
          {step === 'goal' ? (
            <>
              <p className="modal-card__text">
                Saving regularly toward your rent improves your <strong>Discipline Score</strong>{' '}
                and helps you always be ready when rent is due.
              </p>
              <div className="savings-presets">
                {PRESETS.map((preset) => (
                  <button
                    key={preset}
                    className={`savings-preset ${(parseCurrencyInput(goal) ?? 0) === preset ? 'savings-preset--active' : ''}`}
                    onClick={() => setGoal(formatCurrencyInput(preset))}
                  >
                    ₦{preset.toLocaleString()}
                  </button>
                ))}
              </div>
              <div className="savings-input">
                <span className="savings-input__symbol">₦</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="savings-input__field"
                  placeholder="Enter your goal amount"
                  value={goal}
                  onChange={(e) => setGoal(formatCurrencyInput(parseCurrencyInput(e.target.value) ?? 0))}
                />
              </div>
              <button
                className="btn btn--primary btn--full"
                disabled={(parseCurrencyInput(goal) ?? 0) < 1000}
                onClick={() => setStep('auto')}
              >
                Continue
              </button>
            </>
          ) : step === 'auto' ? (
            <>
              <p className="modal-card__text">
                Would you like Upward to automatically set aside savings toward your rent goal of{' '}
                <strong>₦{formatCurrencyInput(parseCurrencyInput(goal) ?? 0) || '0'}</strong>?
              </p>
              <div
                className={`autosave-toggle ${autoSave ? 'autosave-toggle--on' : ''}`}
                onClick={() => setAutoSave(!autoSave)}
              >
                <div
                  className={`autosave-toggle__check ${autoSave ? 'autosave-toggle__check--on' : ''}`}
                >
                  {autoSave && <Check size={14} color="#fff" />}
                </div>
                <div className="autosave-toggle__info">
                  <p className="autosave-toggle__title">Enable Auto-Save</p>
                  <p className="autosave-toggle__sub">
                    Automatically save each month toward your goal
                  </p>
                </div>
                <Zap
                  size={18}
                  className={`autosave-toggle__icon ${autoSave ? 'autosave-toggle__icon--on' : ''}`}
                />
              </div>

              {autoSave && (
                <div className="auth-form__field animate-fade-in" style={{ marginTop: 24 }}>
                  <label>Auto-save Amount (₦)</label>
                  <div className="input-with-icon">
                    <span
                      style={{
                        position: 'absolute',
                        left: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      ₦
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="savings-input__field"
                      style={{ paddingLeft: 30 }}
                      placeholder="e.g. 50,000"
                      value={autoSaveAmount}
                      onChange={(e) =>
                        setAutoSaveAmount(formatCurrencyInput(parseCurrencyInput(e.target.value) ?? 0))
                      }
                    />
                  </div>
                  <p className="input-hint">How much should we automatically set aside for you?</p>
                </div>
              )}
              <button className="btn btn--primary btn--full" onClick={() => setStep('reminders')}>
                Continue
              </button>
              <button
                className="btn btn--secondary btn--full"
                style={{ marginTop: 10 }}
                onClick={() => setStep('goal')}
              >
                Back
              </button>
            </>
          ) : (
            <div className="reminders-setup">
              <p className="modal-card__text">
                Stay on track with friendly reminders to fund your savings goal.
              </p>

              <div
                className={`autosave-toggle ${reminderEnabled ? 'autosave-toggle--on' : ''}`}
                onClick={() => setReminderEnabled(!reminderEnabled)}
                style={{ marginBottom: 20 }}
              >
                <div
                  className={`autosave-toggle__check ${reminderEnabled ? 'autosave-toggle__check--on' : ''}`}
                >
                  {reminderEnabled && <Check size={14} color="#fff" />}
                </div>
                <div className="autosave-toggle__info">
                  <p className="autosave-toggle__title">Enable Reminders</p>
                  <p className="autosave-toggle__sub">Get notified when it's time to save</p>
                </div>
                <Bell
                  size={18}
                  className={`autosave-toggle__icon ${reminderEnabled ? 'autosave-toggle__icon--on' : ''}`}
                />
              </div>

              {reminderEnabled && (
                <div className="reminder-options animate-fade-in">
                  <div className="auth-form__field">
                    <label>How often?</label>
                    <div className="reminder-frequencies">
                      {[
                        { id: 'DAILY', label: 'Daily' },
                        { id: 'TWO_DAYS', label: 'Every 2 Days' },
                        { id: 'WEEKLY', label: 'Weekly' },
                        { id: 'MONTHLY', label: 'Monthly' },
                      ].map((freq) => (
                        <button
                          key={freq.id}
                          className={`reminder-freq ${reminderFrequency === freq.id ? 'reminder-freq--active' : ''}`}
                          onClick={() => setReminderFrequency(freq.id)}
                        >
                          {freq.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {reminderFrequency === 'MONTHLY' && (
                    <div className="auth-form__field">
                      <label>Which day of the month?</label>
                      <div className="input-with-icon">
                        <Calendar size={18} />
                        <input
                          type="number"
                          min="1"
                          max="31"
                          placeholder="e.g. 27"
                          value={reminderDay}
                          onChange={(e) => setReminderDay(e.target.value)}
                        />
                      </div>
                      <p className="input-hint">
                        Pro tip: Choosing your salary date (e.g. 27th) helps you save before
                        spending.
                      </p>
                    </div>
                  )}

                  {reminderFrequency === 'WEEKLY' && (
                    <div className="auth-form__field">
                      <label>Which day of the week?</label>
                      <select
                        className="reminder-select"
                        value={reminderDay}
                        onChange={(e) => setReminderDay(e.target.value)}
                      >
                        <option value="1">Monday</option>
                        <option value="2">Tuesday</option>
                        <option value="3">Wednesday</option>
                        <option value="4">Thursday</option>
                        <option value="5">Friday</option>
                        <option value="6">Saturday</option>
                        <option value="0">Sunday</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              <button
                className="btn btn--primary btn--full"
                onClick={handleFinalSave}
                disabled={saveGoal.isPending}
              >
                {saveGoal.isPending ? 'Saving...' : 'Save Goal & Continue'}
              </button>
              <button
                className="btn btn--secondary btn--full"
                style={{ marginTop: 10 }}
                onClick={() => setStep('auto')}
              >
                Back
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .reminder-frequencies {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-bottom: 20px;
        }
        .reminder-freq {
          padding: 10px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text-muted);
          font-size: 14px;
          transition: all 0.2s;
        }
        .reminder-freq--active {
          background: var(--clay);
          color: white;
          border-color: var(--clay);
        }
        .reminder-select {
          width: 100%;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
          font-size: 15px;
        }
        .input-hint {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 8px;
          font-style: italic;
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
