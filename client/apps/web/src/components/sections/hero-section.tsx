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
      icon: <ShieldCheck />,
      title: 'Zero-Bias Renting',
      className: 'floating-icon-badge--top-left',
      bg: 'rgba(16, 185, 129, 0.06)', // Emerald Green
      borderColor: 'rgba(16, 185, 129, 0.15)',
      color: '#10b981',
    },
    {
      id: 'discounts',
      icon: <Percent />,
      title: 'Rent Discounts & Loans',
      className: 'floating-icon-badge--bottom-left',
      bg: 'rgba(245, 158, 11, 0.06)', // Amber/Orange
      borderColor: 'rgba(245, 158, 11, 0.15)',
      color: '#f59e0b',
    },
    {
      id: 'ownership',
      icon: <Home />,
      title: 'Path to Ownership',
      className: 'floating-icon-badge--top-right',
      bg: 'rgba(59, 130, 246, 0.06)', // Royal Blue
      borderColor: 'rgba(59, 130, 246, 0.15)',
      color: '#3b82f6',
    },
    {
      id: 'rewards',
      icon: <Award />,
      title: 'Upward Club Rewards',
      className: 'floating-icon-badge--bottom-right',
      bg: 'rgba(236, 72, 153, 0.06)', // Rose/Pink
      borderColor: 'rgba(236, 72, 153, 0.15)',
      color: '#ec4899',
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
        </div>

        {/* Benefits Floating Icons Container */}
        <div className="hero-benefits-container">
          {benefits.map((benefit) => (
            <div
              key={benefit.id}
              className={`floating-icon-badge ${benefit.className}`}
              style={{
                backgroundColor: benefit.bg,
                borderColor: benefit.borderColor,
                color: benefit.color,
              }}
            >
              <div className="floating-icon-badge__icon-wrapper">
                {benefit.icon}
              </div>
              <span className="floating-icon-badge__label">{benefit.title}</span>
            </div>
          ))}
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
          @keyframes fadeInSimple {
            from { opacity: 0; }
            to { opacity: 1; }
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
          
          /* Benefits Floating Icon Badge Styles */
          .hero-benefits-container {
            animation: fadeInSimple 0.8s 0.3s ease both;
          }
          .floating-icon-badge {
            position: absolute;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 18px 8px 12px;
            border-radius: 100px;
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--border);
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            z-index: 10;
            pointer-events: auto;
            white-space: nowrap;
          }
          .floating-icon-badge:hover {
            transform: translateY(-5px) scale(1.03) !important;
            box-shadow: 0 15px 45px rgba(0, 0, 0, 0.25);
            background-color: rgba(255, 255, 255, 0.08) !important;
            border-color: currentColor !important;
          }
          .floating-icon-badge svg {
            width: 18px;
            height: 18px;
            transition: transform 0.3s ease;
          }
          .floating-icon-badge:hover svg {
            transform: scale(1.1);
          }
          .floating-icon-badge__icon-wrapper {
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .floating-icon-badge__label {
            font-family: var(--font-head);
            font-size: var(--font-xs);
            font-weight: 700;
            color: var(--text);
            letter-spacing: 0.02em;
          }

          @media (min-width: 769px) {
            .hero-benefits-container {
              position: absolute;
              inset: 0;
              pointer-events: none;
              width: 100%;
              height: 100%;
            }
            .floating-icon-badge--top-left {
              top: 25%;
              left: 5%;
              animation: float-gentle 6s ease-in-out infinite;
            }
            .floating-icon-badge--bottom-left {
              top: 55%;
              left: 3%;
              animation: float-gentle 7s ease-in-out infinite 1s;
            }
            .floating-icon-badge--top-right {
              top: 27%;
              right: 5%;
              animation: float-gentle 6.5s ease-in-out infinite 0.5s;
            }
            .floating-icon-badge--bottom-right {
              top: 57%;
              right: 3%;
              animation: float-gentle 7.5s ease-in-out infinite 1.5s;
            }
          }

          @media (max-width: 768px) {
            .hero-benefits-container {
              position: absolute;
              inset: 0;
              pointer-events: none;
              width: 100%;
              height: 100%;
            }
            .floating-icon-badge {
              padding: 6px 12px 6px 8px;
              gap: 6px;
              height: 32px;
            }
            .floating-icon-badge svg {
              width: 14px;
              height: 14px;
            }
            .floating-icon-badge__label {
              font-size: 10px;
            }
            .floating-icon-badge--top-left {
              top: 14%;
              left: 8px;
              animation: float-gentle 6s ease-in-out infinite;
            }
            .floating-icon-badge--bottom-left {
              top: 66%;
              left: 6px;
              animation: float-gentle 7s ease-in-out infinite 1s;
            }
            .floating-icon-badge--top-right {
              top: 23%;
              right: 8px;
              animation: float-gentle 6.5s ease-in-out infinite 0.5s;
            }
            .floating-icon-badge--bottom-right {
              top: 74%;
              right: 6px;
              animation: float-gentle 7.5s ease-in-out infinite 1.5s;
            }
            
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