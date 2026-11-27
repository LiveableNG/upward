'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import {
  LETTER_OF_CONSENT,
  RENT_SAVINGS_TERMS_HEADER,
  RENT_SAVINGS_TERMS_SECTIONS,
  SAVINGS_CONSENT_DOC_VERSION,
  SAVINGS_FUND_CODE,
  SAVINGS_FUND_MANAGER,
  SAVINGS_FUND_NAME,
  SAVINGS_TERMS_EFFECTIVE_DATE,
  SAVINGS_TERMS_VERSION,
} from '@/features/savings/constants/savingsLegal'

export default function SavingsTermsPage() {
  const router = useRouter()

  return (
    <PayPageShell
      title="Rent Savings Terms & Consent"
      showBack
      onBack={() => router.back()}
    >
      <div className="legal-document">
        <header className="legal-document__header">
          <p className="legal-document__update-date">
            Effective Date: {SAVINGS_TERMS_EFFECTIVE_DATE} · Version: {SAVINGS_TERMS_VERSION} ·
            Consent: {SAVINGS_CONSENT_DOC_VERSION}
          </p>
        </header>

        <section className="legal-document__content">
          <div className="savings-consent__legal-banner">
            <ShieldCheck size={18} />
            <div>
              <strong>
                {SAVINGS_FUND_NAME} ({SAVINGS_FUND_CODE})
              </strong>
              <span>Managed by {SAVINGS_FUND_MANAGER}</span>
            </div>
          </div>

          <h2>Part A — Letter of Consent</h2>
          <p>
            <strong>To:</strong>
            <br />
            {LETTER_OF_CONSENT.to.map((line, i) => (
              <React.Fragment key={i}>
                {line}
                {i < LETTER_OF_CONSENT.to.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
          <p>
            <strong>From:</strong> {LETTER_OF_CONSENT.from}
          </p>
          <p>{LETTER_OF_CONSENT.intro}</p>

          {LETTER_OF_CONSENT.sections.map((sec) => (
            <div key={sec.heading} style={{ marginBottom: 14 }}>
              <h3>{sec.heading}</h3>
              <p>{sec.body}</p>
            </div>
          ))}

          <h2 style={{ marginTop: 28 }}>
            Part B — {RENT_SAVINGS_TERMS_HEADER.entity}: {RENT_SAVINGS_TERMS_HEADER.title}
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Effective Date: {RENT_SAVINGS_TERMS_HEADER.effectiveDate}
          </p>
          {RENT_SAVINGS_TERMS_HEADER.intro.map((para, i) => (
            <p key={i}>{para}</p>
          ))}

          {RENT_SAVINGS_TERMS_SECTIONS.map((sec) => (
            <div key={sec.heading} style={{ marginBottom: 16 }}>
              <h3>{sec.heading}</h3>
              {sec.paragraphs?.map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
              {sec.bullets && sec.bullets.length > 0 && (
                <ul>
                  {sec.bullets.map((bullet, idx) => (
                    <li key={idx}>{bullet}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 20 }}>
            A timestamped PDF copy of your digitally executed Letter of Consent is stored in your
            account and available anytime inside your Rent Savings dashboard.
          </p>
        </section>
      </div>
    </PayPageShell>
  )
}
