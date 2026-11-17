'use client'

import { Shield } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { EMPLOYMENT_TYPE_OPTIONS, RSI_PRODUCT_NAME } from '../constants'
import type { RsiEnrolmentRecord } from '../types'
import { calculateAnnualPremium, parseAnnualRent } from '../utils'

interface InsuranceStatusViewProps {
  enrolment: RsiEnrolmentRecord
  paying?: boolean
  onPayPending?: () => void
  onReEnrol?: () => void
}

export function InsuranceStatusView({
  enrolment,
  paying = false,
  onPayPending,
  onReEnrol,
}: InsuranceStatusViewProps) {
  const annualRent = parseAnnualRent(enrolment.form.annualRent)
  const ratePct = enrolment.premiumRatePct ?? 2
  const premium = enrolment.premiumPaid || calculateAnnualPremium(annualRent, ratePct)
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
              ? `Complete the ${ratePct}% annual premium payment to activate your policy.`
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
            <dt>Annual premium ({ratePct}%)</dt>
            <dd>{formatCurrency(premium)}</dd>
          </div>
          {enrolment.paymentReference ? (
            <div className="rsi-flow__summary-row">
              <dt>Reference</dt>
              <dd>{enrolment.paymentReference}</dd>
            </div>
          ) : null}
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

      {enrolment.status === 'pending_activation' && onPayPending && premium > 0 ? (
        <div className="rsi-flow__step-cta">
          <button
            type="button"
            className="pay-flow__cta"
            disabled={paying}
            onClick={onPayPending}
          >
            {paying ? 'Processing payment…' : `Pay ${formatCurrency(premium)} to activate`}
          </button>
        </div>
      ) : null}

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
