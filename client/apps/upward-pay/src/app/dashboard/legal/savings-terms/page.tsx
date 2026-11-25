'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { FileCheck2, ShieldCheck } from 'lucide-react'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import {
  ARM_CONSENT_MANDATE_CLAUSES,
  RENT_SAVINGS_TERMS_SECTIONS,
  SAVINGS_CONSENT_DOC_VERSION,
  SAVINGS_FUND_CODE,
  SAVINGS_FUND_MANAGER,
  SAVINGS_FUND_NAME,
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
            Draft Version: {SAVINGS_TERMS_VERSION} · Mandate: {SAVINGS_CONSENT_DOC_VERSION}
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

          <h2>Part A — Rent Savings Terms &amp; Conditions</h2>
          {RENT_SAVINGS_TERMS_SECTIONS.map((sec) => (
            <div key={sec.heading} style={{ marginBottom: 16 }}>
              <h3>{sec.heading}</h3>
              <p>{sec.body}</p>
            </div>
          ))}

          <h2>Part B — ARM B2B2C Customer Transact Consent Mandate</h2>
          <p>
            By confirming the consent checkbox in the Upward app before activating your Rent Savings
            vault, you electronically execute the following B2B2C investment mandate:
          </p>
          <ul>
            {ARM_CONSENT_MANDATE_CLAUSES.map((clause, idx) => (
              <li key={idx}>
                <FileCheck2
                  size={13}
                  style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }}
                />
                {clause}
              </li>
            ))}
          </ul>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 20 }}>
            Note: This is a structured draft document pending final Legal sign-off. A timestamped PDF
            copy of your signed Consent Mandate is available anytime inside your Rent Savings
            dashboard.
          </p>
        </section>
      </div>
    </PayPageShell>
  )
}
