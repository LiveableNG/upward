import Link from 'next/link'
import { LegalPageIntro } from '@/components/layout/legal-page-intro'

const LEGAL_DOCUMENTS = [
  {
    title: 'Privacy Policy',
    desc: 'How we collect, use, and safeguard your personal data in compliance with NDPA.',
    href: '/legal/privacy',
  },
  {
    title: 'Terms of Use',
    desc: 'The rules and regulations governing your access to and use of our platform.',
    href: '/legal/terms',
  },
  {
    title: 'Cookie Policy',
    desc: 'Detailed information about how we use cookies to improve your experience.',
    href: '/legal/cookies',
  },
] as const

export default function LegalNoticePage() {
  return (
    <>
      <LegalPageIntro
        title="Legal Notice"
        subtitle="Transparency and accountability are the foundations of our partnership with you."
      />

      <section className="legal-content">
        <p>
          This page serves as a central hub for all legal documentation governing the use of Upward
          and our relationship with you. By engaging with our services, you enter into a binding
          legal contract with Liveable Smartcity Technologies. We urge you to review each document
          carefully.
        </p>

        <div className="legal-card-grid">
          {LEGAL_DOCUMENTS.map((item) => (
            <Link key={item.href} href={item.href} className="legal-card">
              <h3 className="legal-card__title">{item.title}</h3>
              <p className="legal-card__desc">{item.desc}</p>
              <span className="legal-card__link">
                Read Document
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14m-7-7 7 7-7 7" />
                </svg>
              </span>
            </Link>
          ))}
        </div>

        <h2 className="legal-h2">Corporate Information</h2>
        <p>
          Upward is a platform operated by <strong>Liveable Smartcity Technologies Limited</strong>.
        </p>
        <ul className="legal-list">
          <li>
            <strong>Principal Address:</strong> NITDA Hub, 6 Commercial Rd, University Of Lagos,
            Lagos State.
          </li>
          <li>
            <strong>Contact:</strong> hello@goodtenants.africa
          </li>
          <li>
            <strong>Data Protection Officer:</strong> dpo@goodtenants.africa
          </li>
        </ul>

        <p className="legal-callout">
          <strong>Important:</strong> Your continued use of our services indicates your informed
          consent to these legal frameworks. We reserve the right to update these documents at any
          time to reflect software updates or regulatory changes.
        </p>
      </section>
    </>
  )
}
