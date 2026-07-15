'use client'

import { Shield } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { EMPLOYMENT_TYPE_OPTIONS, RSI_PRODUCT_NAME } from '../constants'
import type { RsiEnrolmentRecord } from '../types'
import { calculateAnnualPremium, parseAnnualRent } from '../utils'

interface InsuranceStatusViewProps {
  enrolment: RsiEnrolmentRecord
  onReEnrol?: () => void
}

export function InsuranceStatusView({ enrolment, onReEnrol }: InsuranceStatusViewProps) {
  const annualRent = parseAnnualRent(enrolment.form.annualRent)
  const premium = calculateAnnualPremium(annualRent)
  const employmentLabel =
    EMPLOYMENT_TYPE_OPTIONS.find((option) => option.value === enrolment.form.employmentType)
      ?.label || enrolment.form.employmentType

  return (
    <div className="rsi-flow">
      <div className={`rsi-flow__badge ${enrolment.status === 'pending_activation' ? '' : 'is-active'}`}>
        <Shield size={22} />
        <div>
          <strong>
            {enrolment.status === 'pending_activation'
              ? 'Enrolment pending activation'
              : 'Cover active'}
          </strong>
          <p>
            {enrolment.status === 'pending_activation'
              ? 'Waiting for landlord premium payment and policy inception.'
              : `${RSI_PRODUCT_NAME} is active on your tenancy.`}
          </p>
        </div>
      </div>

      <section className="rsi-flow__card">
        <h3 className="rsi-flow__card-title">Your enrolment</h3>
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
            <dt>Employment type</dt>
            <dd>{employmentLabel}</dd>
          </div>
          <div className="rsi-flow__summary-row">
            <dt>Submitted</dt>
            <dd>{formatDate(enrolment.submittedAt)}</dd>
          </div>
        </dl>
      </section>

      {onReEnrol ? (
        <div className="rsi-flow__dev-note">
          <button type="button" className="rsi-flow__link-btn" onClick={onReEnrol}>
            Reset enrolment (dev preview)
          </button>
        </div>
      ) : null}
    </div>
  )
}
