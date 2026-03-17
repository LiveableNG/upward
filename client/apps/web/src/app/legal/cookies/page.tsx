'use client'
import { LegalHeader } from '@/components/layout/legal-header'
import { Footer } from '@/components/layout/footer'

export default function CookiesPage() {
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
            Cookie Policy
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
              fontSize: '18px',
              color: '#5e5d59',
              lineHeight: 1.55,
              maxWidth: '640px',
            }}
          >
            Last updated: March 17, 2026
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
          <h2 className="legal-h2">1. What are Cookies?</h2>
          <p style={{ marginBottom: '32px' }}>
            Liveable Smartcity Technologies uses Cookies to identify the areas of our Website that
            you have visited. A Cookie is a small piece of data stored on your web browser by a
            website. Cookies help us recognise your browser, collect analytics, and remember
            preferences (like language or login information) to enhance your experience on our
            Website.
          </p>

          <h2 className="legal-h2">2. How we use Cookies</h2>
          <p style={{ marginBottom: '32px' }}>
            We use Cookies to enhance the performance and functionality of our Website but they are
            non-essential to its use. For instance, a cookie may allow you to access our Services
            without having to repeatedly enter your password during a single visit.
          </p>
          <p style={{ marginBottom: '48px' }}>
            In all cases in which we use Cookies, we will not collect Personal Data except with your
            permission or use information gathered for tracking purposes. We never store Personal
            Data in Cookies.
          </p>

          <h2 className="legal-h2">3. Blocking and Disabling Cookies</h2>
          <p style={{ marginBottom: '32px' }}>
            Wherever you are located, you may also set your browser to block Cookies and similar
            technologies, but this action may block our essential Cookies and prevent our Website
            from functioning properly, and you may not be able to fully utilise all of its features
            and services.
          </p>
          <p style={{ marginBottom: '48px' }}>
            Different browsers make different controls available to you. Disabling a cookie or
            category of Cookies does not delete the cookie from your browser; you will need to do
            this yourself from within your browser. You should visit your browser's help menu for
            more information.
          </p>

          <h2 className="legal-h2">4. Types of Cookies we use</h2>
          <ul className="legal-list">
            <li>
              <strong>Essential Cookies:</strong> These cookies are strictly necessary to provide
              you with services available through our Website.
            </li>
            <li>
              <strong>Performance and Functionality Cookies:</strong> These cookies are used to
              enhance the performance and functionality of our Website but are non-essential to
              their use.
            </li>
            <li>
              <strong>Analytics and Customization Cookies:</strong> These cookies collect
              information that is used either in aggregate form to help us understand how our
              Website is being used or to help us customise our Website for you.
            </li>
          </ul>

          <h2 className="legal-h2">5. Changes to our Cookie Policy</h2>
          <p style={{ marginBottom: '64px' }}>
            We may need to make changes to this Cookie Policy so that they accurately reflect our
            Services and policies. Unless otherwise required by law, we will notify you before we
            make changes and give you an opportunity to review them before they go into effect.
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
          letter-spacing: -0.01em;
        }
        .legal-list {
          list-style: none;
          padding: 0;
          margin-bottom: 48px;
        }
        .legal-list li {
          margin-bottom: 16px;
          padding-left: 24px;
          position: relative;
          color: #3d3d3a;
        }
        .legal-list li::before {
          content: "—";
          position: absolute;
          left: 0;
          color: var(--accent);
          font-weight: bold;
        }
        @media (max-width: 768px) {
          .legal-main {
            padding-top: 140px;
            padding-bottom: 80px;
          }
          .legal-h2 {
            font-size: 24px;
            margin-top: 48px;
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
