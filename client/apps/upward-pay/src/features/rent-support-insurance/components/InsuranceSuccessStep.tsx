'use client'

import { CheckCircle2 } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { RSI_INTRO_PERIOD_DAYS, RSI_PRODUCT_NAME } from '../constants'
import type { RsiEnrolmentRecord } from '../types'
import { calculateAnnualPremium, parseAnnualRent } from '../utils'

interface InsuranceSuccessStepProps {
  enrolment: RsiEnrolmentRecord
  onDone: () => void
}

export function InsuranceSuccessStep({ enrolment, onDone }: InsuranceSuccessStepProps) {
  const annualRent = parseAnnualRent(enrolment.form.annualRent)
  const premium = calculateAnnualPremium(annualRent)

  return (
    <div className="rsi-flow">
      <div className="rsi-flow__success">
        <div className="rsi-flow__success-icon">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="rsi-flow__success-title">Enrolment submitted</h2>
        <p className="rsi-flow__success-desc">
          Your {RSI_PRODUCT_NAME} enrolment has been received. Cover is not active yet — your
          landlord must complete premium payment before the policy incepts.
        </p>
      </div>

      <section className="rsi-flow__card">
        <h3 className="rsi-flow__card-title">Summary</h3>
        <dl className="rsi-flow__summary">
          <div className="rsi-flow__summary-row">
            <dt>Life assured</dt>
            <dd>{enrolment.form.fullName}</dd>
          </div>
          <div className="rsi-flow__summary-row">
            <dt>Policyholder</dt>
            <dd>{enrolment.form.landlordName}</dd>
          </div>
          <div className="rsi-flow__summary-row">
            <dt>Sum assured</dt>
            <dd>{formatCurrency(annualRent)}</dd>
          </div>
          <div className="rsi-flow__summary-row">
            <dt>Annual premium</dt>
            <dd>{formatCurrency(premium)}</dd>
          </div>
          <div className="rsi-flow__summary-row">
            <dt>Rent start date</dt>
            <dd>{formatDate(enrolment.form.rentStartDate)}</dd>
          </div>
          <div className="rsi-flow__summary-row">
            <dt>Submitted</dt>
            <dd>{formatDate(enrolment.submittedAt)}</dd>
          </div>
          <div className="rsi-flow__summary-row">
            <dt>Status</dt>
            <dd>
              <span className="rsi-flow__status-pill">Pending activation</span>
            </dd>
          </div>
        </dl>
      </section>

      <div className="rsi-flow__info">
        <p>
          Once active, a {RSI_INTRO_PERIOD_DAYS}-day introductory period applies. Claims are not
          payable during this period, except where death is caused by accident.
        </p>
      </div>

      <div className="rsi-flow__step-cta">
        <button type="button" className="pay-flow__cta" onClick={onDone}>
          Back to dashboard
        </button>
      </div>
    </div>
  )
}
