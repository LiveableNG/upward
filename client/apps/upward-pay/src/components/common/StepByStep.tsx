'use client'

import React, { useState } from 'react'
import { ArrowLeft, ChevronRight, Check } from 'lucide-react'
import { PayFlowPrimaryButton } from '@/features/dashboard/components/payment/PayPageShell'

interface Step {
  title: string
  subtitle?: string
  content: React.ReactNode
  isValid?: boolean
}

interface StepByStepProps {
  steps: Step[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onComplete: (data: any) => void
  onCancel?: () => void
  completeLabel?: string
  loading?: boolean
  variant?: 'default' | 'oat'
  navTitle?: string
}

export function StepByStep({
  steps,
  onComplete,
  onCancel,
  completeLabel = 'Complete Setup',
  loading = false,
  variant = 'default',
  navTitle,
}: StepByStepProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete({})
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    } else if (onCancel) {
      onCancel()
    }
  }

  const isLastStep = currentStep === steps.length - 1
  const step = steps[currentStep]

  const actions = (
    <PayFlowPrimaryButton onClick={nextStep} disabled={step.isValid === false || loading} loading={loading}>
      {loading ? (
        'Processing...'
      ) : isLastStep ? (
        completeLabel
      ) : (
        <>
          Continue <ChevronRight size={18} />
        </>
      )}
    </PayFlowPrimaryButton>
  )

  if (variant === 'oat') {
    return (
      <div className="pay-flow dashboard--nav-offset step-by-step step-by-step--oat">
        <div className="pay-flow__shell">
          <header className="pay-flow__header">
            <div className="pay-flow__header-row">
              <button type="button" className="pay-flow__back" onClick={prevStep} aria-label="Go back">
                <ArrowLeft size={15} />
              </button>
              <h1 className="pay-flow__title">{navTitle || step.title}</h1>
            </div>
          </header>

          <div className="pay-flow__scroll">
            <div className="pay-flow__inner">
              <div className="step-by-step__progress">
                <div
                  className="step-by-step__progress-bar"
                  style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                />
                <div className="step-by-step__dots">
                  {steps.map((_, i) => (
                    <div
                      key={i}
                      className={`step-by-step__dot ${
                        i === currentStep ? 'is-active' : i < currentStep ? 'is-done' : ''
                      }`}
                    >
                      {i < currentStep && <Check size={10} />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="step-by-step__content">
                <div className="step-by-step__header">
                  <h2 className="step-by-step__title">{step.title}</h2>
                  {step.subtitle && <p className="step-by-step__subtitle">{step.subtitle}</p>}
                </div>
                <div className="step-by-step__body">{step.content}</div>
              </div>
            </div>
          </div>

          <footer className="pay-flow__footer step-by-step__actions">{actions}</footer>
        </div>
      </div>
    )
  }

  return (
    <div className="step-by-step">
      <div className="step-by-step__progress">
        <div
          className="step-by-step__progress-bar"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
        <div className="step-by-step__dots">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`step-by-step__dot ${
                i === currentStep ? 'is-active' : i < currentStep ? 'is-done' : ''
              }`}
            >
              {i < currentStep && <Check size={10} />}
            </div>
          ))}
        </div>
      </div>

      <div className="step-by-step__content">
        <button type="button" className="step-by-step__back" onClick={prevStep}>
          <ArrowLeft size={18} /> Back
        </button>

        <div className="step-by-step__header">
          <h2 className="step-by-step__title">{step.title}</h2>
          {step.subtitle && <p className="step-by-step__subtitle">{step.subtitle}</p>}
        </div>

        <div className="step-by-step__body">{step.content}</div>

        <div className="step-by-step__actions">
          <button
            className="btn btn--primary btn--full btn--pay"
            onClick={nextStep}
            disabled={step.isValid === false || loading}
          >
            {loading ? (
              'Processing...'
            ) : isLastStep ? (
              completeLabel
            ) : (
              <>
                Continue <ChevronRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
