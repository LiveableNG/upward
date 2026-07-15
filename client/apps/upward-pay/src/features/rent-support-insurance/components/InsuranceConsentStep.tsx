'use client'

import { useState } from 'react'
import { RSI_CONSENT_ITEMS } from '../constants'

interface InsuranceConsentStepProps {
  onContinue: () => void
}

export function InsuranceConsentStep({ onContinue }: InsuranceConsentStepProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  const allChecked = RSI_CONSENT_ITEMS.every((item) => checked[item.id])

  const toggle = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="rsi-flow">
      <section className="rsi-flow__card">
        <h3 className="rsi-flow__card-title">Your consent</h3>
        <p className="rsi-flow__card-lead">
          Because insurance is being taken on your life, please confirm you understand the
          following before completing enrolment.
        </p>

        <div className="rsi-flow__consent-list">
          {RSI_CONSENT_ITEMS.map((item) => (
            <label key={item.id} className="rsi-flow__consent-item">
              <input
                type="checkbox"
                checked={!!checked[item.id]}
                onChange={() => toggle(item.id)}
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </section>

      <p className="rsi-flow__legal-note">
        Full policy wording will be shared as part of your tenancy documentation. By continuing, you
        agree to the terms above.
      </p>

      <div className="rsi-flow__step-cta">
        <button
          type="button"
          className="pay-flow__cta"
          disabled={!allChecked}
          onClick={onContinue}
        >
          Continue to enrolment
        </button>
      </div>
    </div>
  )
}
