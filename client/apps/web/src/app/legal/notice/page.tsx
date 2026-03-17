'use client'
import { LegalHeader } from '@/components/layout/legal-header'
import { Footer } from '@/components/layout/footer'
import Link from 'next/link'

export default function LegalNoticePage() {
  return (
    <div
      style={{
        background: '#faf9f5',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <LegalHeader />

      <main
        className="legal-main container-padding"
        style={{
          flex: 1,
          maxWidth: '800px',
          margin: '0 auto',
          width: '100%',
          color: '#141413',
        }}
      >
        <header style={{ marginBottom: '80px' }}>
          <h1
            style={{
              fontFamily: 'serif',
              fontSize: 'clamp(40px, 6vw, 56px)',
              fontWeight: 500,
              marginBottom: '32px',
              color: '#141413',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}
          >
            Legal Notice
          </h1>
          <div
            style={{
              height: '1px',
              width: '60px',
              background: 'var(--accent)',
              marginBottom: '32px',
            }}
          />
          <p
            style={{
              fontSize: '20px',
              color: '#5e5d59',
              lineHeight: 1.55,
              maxWidth: '640px',
              fontStyle: 'italic',
            }}
          >
            Transparency and accountability are the foundations of our partnership with you.
          </p>
        </header>

        <section
          className="legal-content"
          style={{
            fontFamily: 'serif',
            fontSize: '18px',
            lineHeight: 1.7,
            color: '#141413',
          }}
        >
          <p style={{ marginBottom: '48px' }}>
            This page serves as a central hub for all legal documentation governing the use of
            Upward and our relationship with you. By engaging with our services, you enter into a
            binding legal contract with Liveable Smartcity Technologies. We urge you to review each
            document carefully.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '32px',
              marginBottom: '64px',
            }}
          >
            {[
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
            ].map((item) => (
              <Link
                key={item.title}
                href={item.href}
                style={{
                  padding: '32px',
                  background: 'white',
                  border: '1px solid rgba(20, 20, 19, 0.08)',
                  borderRadius: '16px',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1)',
                }}
                className="legal-card"
              >
                <h3
                  style={{
                    fontSize: '22px',
                    marginBottom: '16px',
                    color: '#141413',
                    fontFamily: 'serif',
                  }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    fontSize: '15px',
                    color: '#5e5d59',
                    lineHeight: '1.5',
                  }}
                >
                  {item.desc}
                </p>
                <div
                  style={{
                    marginTop: '24px',
                    color: '#d97757',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
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
                  >
                    <path d="M5 12h14m-7-7 7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>

          <h2 className="legal-h2">Corporate Information</h2>
          <p style={{ marginBottom: '32px' }}>
            Upward is a platform operated by{' '}
            <strong>Liveable Smartcity Technologies Limited</strong>.
          </p>
          <ul className="legal-list">
            <li>
              <strong>Principal Address:</strong> Funsho Link Street, Iwaya Yaba, Lagos, Nigeria.
            </li>
            <li>
              <strong>Contact:</strong> hello@goodtenants.africa
            </li>
            <li>
              <strong>Data Protection Officer:</strong> dpo@goodtenants.africa
            </li>
          </ul>

          <p
            style={{
              marginTop: '64px',
              padding: '32px',
              background: 'rgba(217, 119, 87, 0.04)',
              borderLeft: '4px solid #d97757',
              fontSize: '16px',
              color: '#3d3d3a',
            }}
          >
            <strong>Important:</strong> Your continued use of our services indicates your informed
            consent to these legal frameworks. We reserve the right to update these documents at any
            time to reflect software updates or regulatory changes.
          </p>
        </section>
      </main>

      <Footer />

      <style>{`
        .legal-main {
          padding-top: 160px;
          padding-bottom: 128px;
        }
        .legal-h2 {
          font-family: serif;
          font-size: 28px;
          font-weight: 500;
          margin-top: 64px;
          margin-bottom: 32px;
          color: #141413;
        }
        .legal-list {
          list-style: none;
          padding: 0;
        }
        .legal-list li {
          margin-bottom: 16px;
          color: #3d3d3a;
        }
        .legal-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(20, 20, 19, 0.04);
          border-color: rgba(217, 119, 87, 0.3) !important;
        }
        @media (max-width: 768px) {
          .legal-main {
            padding-top: 140px;
            padding-bottom: 80px;
          }
          .container-padding {
            padding-left: 24px !important;
            padding-right: 24px !important;
          }
        }
      `}</style>
    </div>
  )
}
