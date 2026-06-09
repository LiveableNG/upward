'use client'
import { PressLogos } from './press-logos'
import { ShieldCheck, Percent, Home, Award, ChevronDown } from 'lucide-react'

export function HeroSection({
  onOpenSignup: _onOpenSignup,
  onExplorePm: _onExplorePm,
  variant = 'A',
}: {
  onOpenSignup: (email?: string) => void
  onExplorePm?: () => void
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

  const benefits = [
    {
      id: 'bias',
      icon: <ShieldCheck size={20} />,
      title: 'Zero-Bias Renting',
      desc: 'Eliminates discrimination bias using verified credentials.',
      className: 'floating-card--top-left',
    },
    {
      id: 'discounts',
      icon: <Percent size={20} />,
      title: 'Rent Discounts',
      desc: 'Access lower rent rates and friendly deposit financing.',
      className: 'floating-card--bottom-left',
    },
    {
      id: 'ownership',
      icon: <Home size={20} />,
      title: 'Path to Ownership',
      desc: 'Helps transition from renting to buying a home.',
      className: 'floating-card--top-right',
    },
    {
      id: 'rewards',
      icon: <Award size={20} />,
      title: 'Upward Club',
      desc: 'Unlock members-only benefits and cashback.',
      className: 'floating-card--bottom-right',
    },
  ]

  return (
    <section style={{ position: 'relative', zIndex: 1 }}>
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '120px 40px 40px',
          width: '100%',
          position: 'relative',
        }}
        className="hero-container"
      >
        <div
          style={{
            animation: 'fadeUp 0.6s ease both',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: 'var(--font-xs)',
            letterSpacing: '0.25em',
            textTransform: 'uppercase' as const,
            color: 'var(--accent)',
            marginBottom: '28px',
            width: '100%',
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
            fontSize: 'var(--font-h1)',
            lineHeight: 1.05,
            letterSpacing: '-0.04em',
            marginBottom: '32px',
            maxWidth: '950px',
            textAlign: 'center',
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
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <p
            style={{
              fontSize: 'var(--font-lg)',
              color: 'var(--muted)',
              maxWidth: '650px',
              lineHeight: 1.6,
              marginBottom: '28px',
              textAlign: 'center',
            }}
            className="hero-p"
          >
            {content.sub}
          </p>

          <div className="hero-cta-container">
            <button
              onClick={() => {
                const el = document.getElementById('showcase-section')
                if (el) {
                  const navHeight = 80
                  const top = el.getBoundingClientRect().top + window.pageYOffset - navHeight
                  window.scrollTo({ top, behavior: 'smooth' })
                }
              }}
              style={{
                background: 'var(--accent)',
                color: 'var(--btn-text)',
                fontFamily: 'var(--font-head)',
                fontWeight: 800,
                fontSize: 'var(--font-sm)',
                letterSpacing: '0.1em',
                padding: '17px 34px',
                borderRadius: '100px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 10px 40px rgba(217, 119, 87, 0.2)',
              }}
              className="desktop-btn"
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.boxShadow = '0 15px 45px rgba(217, 119, 87, 0.35)'
                e.currentTarget.style.background = 'var(--swatch--clay-interactive)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 10px 40px rgba(217, 119, 87, 0.2)'
                e.currentTarget.style.background = 'var(--accent)'
              }}
            >
              See the benefits
              <ChevronDown
                size={18}
                style={{
                  animation: 'arrow-beam 2s infinite ease-in-out',
                }}
              />
            </button>
          </div>

          {/* Benefits Cards Container */}
          <div className="hero-benefits-container">
            {benefits.map((benefit) => (
              <div key={benefit.id} className={`floating-card ${benefit.className}`}>
                <div className="floating-card__icon-wrapper">
                  {benefit.icon}
                </div>
                <div className="floating-card__content">
                  <span className="floating-card__title">{benefit.title}</span>
                  <span className="floating-card__desc">{benefit.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            marginTop: '20px',
            justifyContent: 'center',
          }}
          className="audience-tags"
        >
          {['Salary earners', 'Freelancers', 'Creatives', 'Business Owners'].map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 'var(--font-xs)',
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

        <div style={{ marginTop: '40px', width: '100%' }}>
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
          @keyframes float-gentle {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
          }
          @keyframes arrow-beam {
            0%, 100% { transform: translateY(0); opacity: 0.7; filter: drop-shadow(0 0 2px rgba(255,255,255,0.4)); }
            50% { transform: translateY(4px); opacity: 1; filter: drop-shadow(0 0 8px rgba(255,255,255,1)); }
          }
          .hero-cta-container {
            display: flex;
            gap: 16px;
            align-items: center;
          }
          
          /* Benefits Container & Card Styles */
          .floating-card {
            display: flex;
            align-items: center;
            gap: 16px;
            background: var(--nav-bg);
            backdrop-filter: blur(16px) saturate(180%);
            -webkit-backdrop-filter: blur(16px) saturate(180%);
            border: 1px solid var(--accent-muted);
            border-radius: 20px;
            padding: 14px 18px;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.06);
            max-width: 260px;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            z-index: 10;
            text-align: left;
          }
          .floating-card:hover {
            transform: translateY(-5px) scale(1.02) !important;
            border-color: var(--accent);
            box-shadow: 0 12px 40px var(--accent-faint);
          }
          .floating-card__icon-wrapper {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            border-radius: 12px;
            background: var(--accent-faint);
            color: var(--accent);
            flex-shrink: 0;
          }
          .floating-card__content {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .floating-card__title {
            font-family: var(--font-head);
            font-weight: 800;
            font-size: var(--font-sm);
            color: var(--text);
            line-height: 1.2;
            letter-spacing: -0.01em;
          }
          .floating-card__desc {
            font-size: var(--font-xs);
            color: var(--muted);
            line-height: 1.3;
          }

          @media (min-width: 1250px) {
            .hero-benefits-container {
              position: absolute;
              inset: 0;
              pointer-events: none;
              width: 100%;
              height: 100%;
            }
            .floating-card {
              position: absolute;
              pointer-events: auto;
            }
            .floating-card--top-left {
              top: 25%;
              left: 4%;
              animation: float-gentle 6s ease-in-out infinite;
            }
            .floating-card--bottom-left {
              top: 54%;
              left: 2%;
              animation: float-gentle 7s ease-in-out infinite 1s;
            }
            .floating-card--top-right {
              top: 27%;
              right: 4%;
              animation: float-gentle 6.5s ease-in-out infinite 0.5s;
            }
            .floating-card--bottom-right {
              top: 56%;
              right: 2%;
              animation: float-gentle 7.5s ease-in-out infinite 1.5s;
            }
          }

          @media (max-width: 1249px) {
            .hero-benefits-container {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 16px;
              max-width: 600px;
              margin: 40px auto 0;
              width: 100%;
            }
            .floating-card {
              position: relative;
              max-width: none;
              transform: none !important;
              animation: none !important;
            }
          }

          @media (max-width: 768px) {
            .hero-container {
              padding: 100px 20px 60px !important;
              text-align: center;
              align-items: center;
            }
            .hero-cta-container {
              display: flex;
              flex-direction: column;
              gap: 12px;
              align-items: stretch;
              width: 100%;
              margin-top: 32px;
              max-width: 320px;
            }
            .desktop-btn {
              display: flex !important;
              width: 100% !important;
              justify-content: center;
              padding: 16px 24px !important;
            }
            .hero-p {
              margin-left: auto;
              margin-right: auto;
              font-size: var(--font-base) !important;
            }
            .audience-tags {
              justify-content: center;
            }
            .hero-benefits-container {
              grid-template-columns: 1fr;
              gap: 12px;
              padding: 0 10px;
              margin-top: 32px;
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