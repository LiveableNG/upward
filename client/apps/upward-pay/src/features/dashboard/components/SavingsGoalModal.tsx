'use client'

import { useState } from 'react'
import { X, Check, Zap } from 'lucide-react'

interface SavingsGoalModalProps {
  onDone: () => void
  onSkip: () => void
}

type ModalStep = 'goal' | 'auto'

export function SavingsGoalModal({ onDone, onSkip }: SavingsGoalModalProps) {
  const [goal, setGoal] = useState('')
  const [autoSave, setAutoSave] = useState(true)
  const [step, setStep] = useState<ModalStep>('goal')

  const PRESETS = [150000, 250000, 500000, 1000000]

  return (
    <div className="modal-overlay" onClick={onSkip}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-card__header">
          <div>
            <span className="modal-card__badge">Savings Setup</span>
            <h3 className="modal-card__title">
              {step === 'goal' ? 'Set Your Rent Goal' : 'Auto-Save Plan'}
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
                    className={`savings-preset ${goal === String(preset) ? 'savings-preset--active' : ''}`}
                    onClick={() => setGoal(String(preset))}
                  >
                    ₦{preset.toLocaleString()}
                  </button>
                ))}
              </div>
              <div className="savings-input">
                <span className="savings-input__symbol">₦</span>
                <input
                  type="number"
                  className="savings-input__field"
                  placeholder="Enter your goal amount"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                />
              </div>
              <button
                className="btn btn--primary btn--full"
                disabled={!goal || Number(goal) < 1000}
                onClick={() => setStep('auto')}
              >
                Continue
              </button>
              <button
                className="btn btn--secondary btn--full"
                style={{ marginTop: 10 }}
                onClick={onSkip}
              >
                Skip for now
              </button>
            </>
          ) : (
            <>
              <p className="modal-card__text">
                Would you like Upward to automatically set aside savings toward your rent goal of{' '}
                <strong>₦{Number(goal).toLocaleString()}</strong>?
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
              <button className="btn btn--primary btn--full" onClick={onDone}>
                Save Goal &amp; Continue
              </button>
              <button
                className="btn btn--secondary btn--full"
                style={{ marginTop: 10 }}
                onClick={() => setStep('goal')}
              >
                Back
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
