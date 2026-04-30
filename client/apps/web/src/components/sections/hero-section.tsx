'use client'
import { PressLogos } from './press-logos'

export function HeroSection({
  onOpenSignup,
  variant = 'A',
}: {
  onOpenSignup: (email?: string) => void
  variant?: 'A' | 'B'
}) {
  const content = {
    A: {
      titleLine1: 'Paid millions in rent?',
      titleLine2: 'What do you have to show for it?',
      sub: 'Upward records every payment, builds your housing reputation, unlocks benefits and opens the door to home ownership.',
    },
    B: {
      titleLine1: "Don't Just Pay Rent.",
      titleLine2: 'Build With It.',
      sub: 'Turn every rent payment into proof of financial responsibility—unlock rewards, credit opportunities, and pathways to owning your home.',
    },
  }[variant]

  return (
    <section style={{ position: 'relative', zIndex: 1 }}>
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '120px 40px 40px',
          width: '100%',
        }}
        className="hero-container"
      >
        <div
          style={{
            animation: 'fadeUp 0.6s ease both',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '11px',
            letterSpacing: '0.25em',
            textTransform: 'uppercase' as const,
            color: 'var(--accent)',
            marginBottom: '28px',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '24px',
              height: '1px',
              background: 'var(--accent)',
            }}
            className="mobile-hide"
          />
          Rent Passport Program — Now Live
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-head)',
            fontWeight: 800,
            fontSize: 'clamp(2.4rem, 6vw, 4.5rem)',
            lineHeight: 1.05,
            letterSpacing: '-0.04em',
            marginBottom: '32px',
            maxWidth: '850px',
            animation: 'fadeUp 0.7s 0.1s ease both',
          }}
        >
          <span
            style={{
              display: 'block',
              background: 'var(--heading-mix)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {content.titleLine1}
          </span>
          <span style={{ display: 'block' }}>{content.titleLine2}</span>
        </h1>

        <div
          style={{
            animation: 'fadeUp 0.7s 0.2s ease both',
            marginBottom: '40px',
          }}
        >
          <p
            style={{
              fontSize: '20px',
              color: 'var(--muted)',
              maxWidth: '650px',
              lineHeight: 1.6,
              marginBottom: '28px',
            }}
            className="hero-p"
          >
            {content.sub}
          </p>

          <div
            style={{
              display: 'flex',
              gap: '16px',
              alignItems: 'center',
              marginTop: '32px',
            }}
            className="hero-cta-container"
          >
            <button
              onClick={() => onOpenSignup()}
              style={{
                background: 'var(--accent)',
                color: 'var(--btn-text)',
                fontFamily: 'var(--font-head)',
                fontWeight: 800,
                fontSize: '14px',
                letterSpacing: '0.1em',
                padding: '18px 36px',
                borderRadius: '100px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 10px 40px rgba(217, 119, 87, 0.3)',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.boxShadow = '0 15px 45px rgba(217, 119, 87, 0.45)'
                e.currentTarget.style.background = '#bf5f43'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 10px 40px rgba(217, 119, 87, 0.3)'
                e.currentTarget.style.background = 'var(--accent)'
              }}
            >
              Get Started
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '-150%',
                  width: '100%',
                  height: '100%',
                  background:
                    'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
                  transform: 'skewX(-25deg)',
                  animation: 'beam 4s infinite ease-in-out',
                }}
              />
            </button>
            <button
              onClick={() => (window.location.href = '/login')}
              style={{
                background: 'transparent',
                color: 'var(--text)',
                fontFamily: 'var(--font-head)',
                fontWeight: 700,
                fontSize: '14px',
                letterSpacing: '0.1em',
                padding: '18px 36px',
                borderRadius: '100px',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--surface2)'
                e.currentTarget.style.borderColor = 'var(--accent)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = 'var(--border)'
              }}
              className="mobile-hide"
            >
              Sign In
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              marginTop: '40px',
            }}
            className="audience-tags"
          >
            {['Salary earners', 'Freelancers', 'Creatives', 'Business Owners'].map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text)',
                  background: 'var(--accent-faint)',
                  border: '1px solid var(--accent-muted)',
                  padding: '8px 16px',
                  borderRadius: '100px',
                  letterSpacing: '0.02em',
                }}
                className="audience-tag"
              >
                For {tag}
              </span>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '0px' }}>
          <PressLogos />
        </div>

        <style>{`
          @keyframes beam {
            0% { left: -150%; }
            30% { left: 150%; }
            100% { left: 150%; }
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @media (max-width: 768px) {
            .hero-container {
              padding: 100px 20px 60px !important;
              text-align: center;
              align-items: center;
            }
            .hero-cta-container {
                justify-content: center;
                width: 100%;
            }
            .hero-p {
              margin-left: auto;
              margin-right: auto;
              font-size: 16px !important;
            }
            .audience-tags {
              justify-content: center;
            }
          }
          @media (min-width: 769px) {
            .mobile-hide {
              display: initial;
            }
          }
        `}</style>
      </div>
    </section>
  )
}
