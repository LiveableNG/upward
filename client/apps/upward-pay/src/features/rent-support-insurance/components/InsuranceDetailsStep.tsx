'use client'

import { AlertCircle, Check, Info, Shield } from 'lucide-react'
import {
  RSI_COVERED_BENEFITS,
  RSI_EXCLUSIONS,
  RSI_KEY_LIMITS,
  RSI_PRODUCT_NAME,
} from '../constants'

interface InsuranceDetailsStepProps {
  onContinue: () => void
}

export function InsuranceDetailsStep({ onContinue }: InsuranceDetailsStepProps) {
  return (
    <div className="rsi-flow">
      <div className="rsi-flow__hero">
        <div className="rsi-flow__hero-icon">
          <Shield size={22} />
        </div>
        <div>
          <h2 className="rsi-flow__hero-title">{RSI_PRODUCT_NAME}</h2>
          <p className="rsi-flow__hero-desc">
            An insurance policy taken on your life. Your landlord is the policyholder and qualifying
            benefits are paid to them for rent-related obligations.
          </p>
        </div>
      </div>

      <div className="rsi-flow__notice">
        <AlertCircle size={16} />
        <p>
          This is <strong>not a rent guarantee</strong>. Cover applies only to specific insured
          events, subject to waiting periods, exclusions, and claim documentation.
        </p>
      </div>

      <section className="rsi-flow__card">
        <h3 className="rsi-flow__card-title">What is covered</h3>
        <ul className="rsi-flow__benefit-list">
          {RSI_COVERED_BENEFITS.map((item) => (
            <li key={item.title}>
              <Check size={15} />
              <span>
                <strong>{item.title}</strong>
                <span className="rsi-flow__benefit-desc">{item.description}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rsi-flow__card">
        <h3 className="rsi-flow__card-title">Key limits</h3>
        <dl className="rsi-flow__limits">
          {RSI_KEY_LIMITS.map((item) => (
            <div key={item.label} className="rsi-flow__limit-row">
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rsi-flow__card">
        <h3 className="rsi-flow__card-title">What is not covered</h3>
        <ul className="rsi-flow__exclusion-list">
          {RSI_EXCLUSIONS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <div className="rsi-flow__info">
        <Info size={15} />
        <p>
          After certain claims, specific riders may not be renewed. In the event of death, cover
          terminates and cannot be renewed.
        </p>
      </div>

      <div className="rsi-flow__step-cta">
        <button type="button" className="pay-flow__cta" onClick={onContinue}>
          Accept and continue
        </button>
      </div>
    </div>
  )
}
