'use client'

import React, { useState } from 'react'
import { ArrowLeft, ChevronRight, Check } from 'lucide-react'

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
}

export function StepByStep({
  steps,
  onComplete,
  onCancel,
  completeLabel = 'Complete Setup',
  loading = false,
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
        <button className="step-by-step__back" onClick={prevStep}>
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
