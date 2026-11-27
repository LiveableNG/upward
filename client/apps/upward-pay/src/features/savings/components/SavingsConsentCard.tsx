'use client'

import React, { useState } from 'react'
import { FileCheck2, FileText, ShieldCheck } from 'lucide-react'
import { BottomSheetModal } from '@/components/common/BottomSheetModal'
import {
  LETTER_OF_CONSENT,
  RENT_SAVINGS_TERMS_HEADER,
  RENT_SAVINGS_TERMS_SECTIONS,
  SAVINGS_CONSENT_DOC_VERSION,
  SAVINGS_FUND_MANAGER,
  SAVINGS_FUND_NAME,
  SAVINGS_TERMS_EFFECTIVE_DATE,
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
            <span className="savings-consent__title">Terms &amp; Consent</span>
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
              I have read, understood, and agree to the{' '}
              <button
                type="button"
                className="savings-consent__inline-link"
                onClick={(e) => {
                  e.preventDefault()
                  setActiveDoc('TERMS')
                }}
              >
                Upward Rent Savings Terms of Service
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
              I adopt and agree to the{' '}
              <button
                type="button"
                className="savings-consent__inline-link"
                onClick={(e) => {
                  e.preventDefault()
                  setActiveDoc('CONSENT')
                }}
              >
                Letter of Consent
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
            ? 'Rent Savings Terms of Service'
            : 'Letter of Consent'
        }
        subtitle={
          activeDoc === 'TERMS'
            ? `Upward by Goodtenants Ltd · Effective ${SAVINGS_TERMS_EFFECTIVE_DATE} (${SAVINGS_TERMS_VERSION})`
            : `Upward by Goodtenants Limited · ${SAVINGS_FUND_MANAGER} (${SAVINGS_CONSENT_DOC_VERSION})`
        }
        icon={activeDoc === 'TERMS' ? <FileText size={18} /> : <FileCheck2 size={18} />}
        maxWidth="580px"
      >
        <div className="savings-consent__modal-body">
          {activeDoc === 'TERMS' ? (
            <>
              <div className="savings-consent__modal-section">
                {RENT_SAVINGS_TERMS_HEADER.intro.map((para, i) => (
                  <p key={i} className="savings-consent__modal-text" style={{ marginBottom: 8 }}>
                    {para}
                  </p>
                ))}
              </div>
              {RENT_SAVINGS_TERMS_SECTIONS.map((section) => (
                <div key={section.heading} className="savings-consent__modal-section">
                  <h4 className="savings-consent__modal-heading">{section.heading}</h4>
                  {section.paragraphs?.map((para, idx) => (
                    <p
                      key={idx}
                      className="savings-consent__modal-text"
                      style={{ marginBottom: 6 }}
                    >
                      {para}
                    </p>
                  ))}
                  {section.bullets && section.bullets.length > 0 && (
                    <ul style={{ margin: '4px 0 6px 18px', padding: 0 }}>
                      {section.bullets.map((bullet, idx) => (
                        <li
                          key={idx}
                          className="savings-consent__modal-text"
                          style={{ marginBottom: 4 }}
                        >
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="savings-consent__legal-banner">
                <ShieldCheck size={16} />
                <div>
                  <strong>To: {LETTER_OF_CONSENT.to.join(' ')}</strong>
                  <span>From: {LETTER_OF_CONSENT.from}</span>
                </div>
              </div>

              <div className="savings-consent__modal-section">
                <p className="savings-consent__modal-text">{LETTER_OF_CONSENT.intro}</p>
              </div>

              {LETTER_OF_CONSENT.sections.map((sec) => (
                <div key={sec.heading} className="savings-consent__modal-section">
                  <h4 className="savings-consent__modal-heading">{sec.heading}</h4>
                  <p className="savings-consent__modal-text">{sec.body}</p>
                </div>
              ))}
            </>
          )}

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
            I Agree
          </button>
        </div>
      </BottomSheetModal>
    </>
  )
}
