'use client'

import React, { useState } from 'react'
import { CheckCircle2, FileCheck2, FileText, ShieldCheck } from 'lucide-react'
import { BottomSheetModal } from '@/components/common/BottomSheetModal'
import {
  ARM_CONSENT_MANDATE_CLAUSES,
  RENT_SAVINGS_TERMS_SECTIONS,
  SAVINGS_CONSENT_DOC_VERSION,
  SAVINGS_FUND_CODE,
  SAVINGS_FUND_MANAGER,
  SAVINGS_FUND_NAME,
  SAVINGS_TERMS_VERSION,
} from '../constants/savingsLegal'

import type { SavingsLockMode, SavingsProductOption } from '../services/savingsService'

interface SavingsConsentCardProps {
  acceptedTerms: boolean
  acceptedArmMandate: boolean
  onAcceptedTermsChange: (checked: boolean) => void
  onAcceptedArmMandateChange: (checked: boolean) => void
  annualRatePct?: number
  fundName?: string
  lockMode?: SavingsLockMode
  productOption?: SavingsProductOption
  disabled?: boolean
}

export function SavingsConsentCard({
  acceptedTerms,
  acceptedArmMandate,
  onAcceptedTermsChange,
  onAcceptedArmMandateChange,
  annualRatePct = 16,
  fundName = SAVINGS_FUND_NAME,
  lockMode = 'LOCKED',
  productOption = 'SAVE_AND_EARN',
  disabled = false,
}: SavingsConsentCardProps) {
  const [activeDoc, setActiveDoc] = useState<'TERMS' | 'CONSENT' | null>(null)
  const isFlexible = lockMode === 'FLEXIBLE' && productOption !== 'RENT_PROTEC'

  return (
    <>
      <div className="savings-consent">
        <div className="savings-consent__header">
          <ShieldCheck size={16} className="savings-consent__header-icon" />
          <div className="savings-consent__header-copy">
            <span className="savings-consent__title">Terms</span>
            <span className="savings-consent__subtitle">
              {fundName} · {annualRatePct}% p.a.
            </span>
          </div>
        </div>

        <p className="savings-consent__lock-summary">
          {isFlexible
            ? 'You can withdraw anytime, with no fee.'
            : productOption === 'RENT_PROTEC'
              ? 'Held until 30 days before rent day.'
              : 'Held until 30 days before rent day. You cannot withdraw before then.'}
        </p>

        <div className="savings-consent__checkboxes">
          <label className="savings-consent__checkbox-row">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => onAcceptedTermsChange(e.target.checked)}
              disabled={disabled}
              className="savings-consent__checkbox"
            />
            <span>
              I agree to the{' '}
              <button
                type="button"
                className="savings-consent__inline-link"
                onClick={(e) => {
                  e.preventDefault()
                  setActiveDoc('TERMS')
                }}
              >
                Savings Terms
              </button>
              .
            </span>
          </label>

          <label className="savings-consent__checkbox-row">
            <input
              type="checkbox"
              checked={acceptedArmMandate}
              onChange={(e) => onAcceptedArmMandateChange(e.target.checked)}
              disabled={disabled}
              className="savings-consent__checkbox"
            />
            <span>
              I agree to the{' '}
              <button
                type="button"
                className="savings-consent__inline-link"
                onClick={(e) => {
                  e.preventDefault()
                  setActiveDoc('CONSENT')
                }}
              >
                ARM Consent
              </button>
              .
            </span>
          </label>
        </div>
      </div>

      <BottomSheetModal
        isOpen={activeDoc !== null}
        onClose={() => setActiveDoc(null)}
        title={
          activeDoc === 'TERMS'
            ? 'Rent Savings Terms & Conditions'
            : 'ARM B2B2C Customer Consent Mandate'
        }
        subtitle={
          activeDoc === 'TERMS'
            ? `${fundName} (${SAVINGS_FUND_CODE}) · Draft ${SAVINGS_TERMS_VERSION}`
            : `Managed by ${SAVINGS_FUND_MANAGER} · Draft ${SAVINGS_CONSENT_DOC_VERSION}`
        }
        icon={activeDoc === 'TERMS' ? <FileText size={18} /> : <FileCheck2 size={18} />}
        maxWidth="540px"
      >
        <div className="savings-consent__modal-body">
          {activeDoc === 'TERMS' ? (
            RENT_SAVINGS_TERMS_SECTIONS.map((section) => (
              <div key={section.heading} className="savings-consent__modal-section">
                <h4 className="savings-consent__modal-heading">{section.heading}</h4>
                <p className="savings-consent__modal-text">{section.body}</p>
              </div>
            ))
          ) : (
            <>
              <div className="savings-consent__legal-banner">
                <ShieldCheck size={16} />
                <div>
                  <strong>
                    {fundName} ({SAVINGS_FUND_CODE}) — B2B2C Transact Mandate
                  </strong>
                  <span>Electronic consent recorded with timestamp and downloadable PDF</span>
                </div>
              </div>
              <div className="savings-consent__clause-list">
                {ARM_CONSENT_MANDATE_CLAUSES.map((clause, idx) => (
                  <div key={idx} className="savings-consent__clause-item">
                    <CheckCircle2 size={15} className="savings-consent__clause-icon" />
                    <p className="savings-consent__modal-text">{clause}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          <p className="savings-consent__draft-note">
            Draft notice: Legal copy shown for ARM implementation review; final approved wording
            will update automatically.
          </p>

          <button
            type="button"
            className="vault-btn-primary"
            style={{ width: '100%' }}
            onClick={() => {
              if (activeDoc === 'TERMS') onAcceptedTermsChange(true)
              if (activeDoc === 'CONSENT') onAcceptedArmMandateChange(true)
              setActiveDoc(null)
            }}
          >
            Accept
          </button>
        </div>
      </BottomSheetModal>
    </>
  )
}
