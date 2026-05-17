'use client'

import React, { useState, useEffect } from 'react'
import { ArrowRight, CheckCircle2, Building2, Smartphone, ShieldCheck, HelpCircle } from 'lucide-react'

// Authentic Upward Logo SVG for branding consistency
function UpwardLogo({
  size = 36,
  color = '#166534',
  className = '',
}: {
  size?: number
  color?: string
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="7" y="15" width="10" height="17" rx="5" fill={color} />
      <rect x="23" y="15" width="10" height="17" rx="5" fill={color} />
      <path
        d="M12 30 Q12 37 20 37 Q28 37 28 30"
        stroke={color}
        strokeWidth="5.5"
        strokeLinecap="round"
        fill="none"
      />
      <polyline
        points="7,19 20,8 33,19"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="20" cy="5" r="3" fill="#22c55e" />
    </svg>
  )
}

export function ShowcaseSection() {
  const [showSplash, setShowSplash] = useState(false)
  const [splashFade, setSplashFade] = useState(false)

  const handlePmRedirect = (e: React.MouseEvent, path: string) => {
    e.preventDefault()
    // Trigger splash transition
    setShowSplash(true)
    setSplashFade(false)

    // Wait 2.2 seconds for full effect, then redirect on same domain
    setTimeout(() => {
      window.location.href = path
      
      // Fade out splash gracefully
      setSplashFade(true)
      setTimeout(() => {
        setShowSplash(false)
      }, 400)
    }, 2200)
  }

  // Prevent scroll when splash overlay is active
  useEffect(() => {
    if (showSplash) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [showSplash])

  return (
    <section className="showcase">
      {/* Section Header */}
      <div className="showcase__header">
        <span className="showcase__label">Unified Rental Ecosystem</span>
        <h2 className="showcase__title">Two Platforms. One Vision.</h2>
        <p className="showcase__subtitle">
          Whether you are a tenant building credit or a property manager automating rent payouts, 
          Upward syncs your rental ledgers to establish verified credibility.
        </p>
      </div>

      {/* Grid Container */}
      <div className="showcase__grid">
        
        {/* ================= TENANT CARD (UPWARD PAY) ================= */}
        <div className="showcase-card showcase-card--tenant">
          <div className="showcase-card__glow showcase-card__glow--clay" />
          
          <div className="showcase-card__content">
            <div className="showcase-card__badge showcase-card__badge--clay">
              <Smartphone size={14} className="showcase-card__badge-icon" />
              <span>For Renters & Tenants</span>
            </div>
            
            <h3 className="showcase-card__name">Upward Pay</h3>
            <p className="showcase-card__tagline">The Smart Renter App</p>
            
            <p className="showcase-card__desc">
              Your rent is your resume. Build a verified <strong>Rent Passport™</strong> recognized 
              by property owners, credit bureaus, and home finance collectives. Stop paying rent 
              without anything to show for it.
            </p>

            <ul className="showcase-card__list">
              <li className="showcase-card__item">
                <CheckCircle2 size={16} className="showcase-card__list-icon showcase-card__list-icon--clay" />
                <span><strong>Rent Passport™:</strong> Build your digital rental history score.</span>
              </li>
              <li className="showcase-card__item">
                <CheckCircle2 size={16} className="showcase-card__list-icon showcase-card__list-icon--clay" />
                <span><strong>Seamless Payments:</strong> Secure checkouts via card, DVA bank transfers, or USSD.</span>
              </li>
              <li className="showcase-card__item">
                <CheckCircle2 size={16} className="showcase-card__list-icon showcase-card__list-icon--clay" />
                <span><strong>Collective Financing:</strong> Unlock credit for home furniture and single-digit mortgages.</span>
              </li>
            </ul>

            <button
              onClick={() => (window.location.href = '/signup')}
              className="showcase-card__btn showcase-card__btn--clay"
            >
              <span>Access Renter Portal</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Interactive Screen Showcase */}
          <div className="showcase-card__visual">
            <div className="showcase-card__image-container">
              {/* Underlay Payment Screen */}
              <img
                src="/attachments/upwardPay-payment-page.png"
                alt="Upward Pay checkout screen"
                className="showcase-card__img showcase-card__img--underlay showcase-card__img--tenant-underlay"
              />
              {/* Foreground Dashboard */}
              <img
                src="/attachments/upwardPay-dashboard.png"
                alt="Upward Pay dashboard interface"
                className="showcase-card__img showcase-card__img--foreground"
              />
            </div>
          </div>
        </div>

        {/* ================= PROPERTY MANAGER CARD (UPWARD PM) ================= */}
        <div className="showcase-card showcase-card--pm">
          <div className="showcase-card__glow showcase-card__glow--forest" />
          
          <div className="showcase-card__content">
            <div className="showcase-card__badge showcase-card__badge--pm">
              <Building2 size={14} className="showcase-card__badge-icon" />
              <span>For Owners & Landlords</span>
            </div>
            
            <h3 className="showcase-card__name">Upward PM</h3>
            <p className="showcase-card__tagline">The Landlord Suite</p>
            
            <p className="showcase-card__desc">
              Professional, automated rent splits and occupancy ledgers. Reconcile transactions instantly via Dedicated Virtual Accounts and automate commission routing directly to your portfolio accounts.
            </p>

            <ul className="showcase-card__list">
              <li className="showcase-card__item">
                <CheckCircle2 size={16} className="showcase-card__list-icon showcase-card__list-icon--forest" />
                <span><strong>Split Commission Engine:</strong> Automate agency splits on payment confirmation.</span>
              </li>
              <li className="showcase-card__item">
                <CheckCircle2 size={16} className="showcase-card__list-icon showcase-card__list-icon--forest" />
                <span><strong>Auto Ledger Matching:</strong> Instant reconciliation matching payments to rent items.</span>
              </li>
              <li className="showcase-card__item">
                <CheckCircle2 size={16} className="showcase-card__list-icon showcase-card__list-icon--forest" />
                <span><strong>Tenant Claim Flow:</strong> Prefill profiles and invite tenants to claim their leases.</span>
              </li>
            </ul>

            <button
              onClick={(e) => handlePmRedirect(e, '/portal/login')}
              className="showcase-card__btn showcase-card__btn--pm"
            >
              <span>Access Landlord & PM Suite</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Interactive Screen Showcase */}
          <div className="showcase-card__visual">
            <div className="showcase-card__image-container">
              {/* Underlay Onboarding Page */}
              <img
                src="/attachments/landlord-signup.png"
                alt="Upward Landlord Signup Flow"
                className="showcase-card__img showcase-card__img--underlay showcase-card__img--pm-underlay"
              />
              {/* Foreground PM Dashboard */}
              <img
                src="/attachments/pm-dashboard.png"
                alt="Upward Property Manager Dashboard"
                className="showcase-card__img showcase-card__img--foreground"
              />
            </div>
          </div>
        </div>

      </div>

      {/* ================= FULL-SCREEN REDIRECT SPLASH OVERLAY ================= */}
      {showSplash && (
        <div className={`showcase-splash ${splashFade ? 'showcase-splash--fadeout' : ''}`}>
          <div className="showcase-splash__glow" />
          <div className="showcase-splash__glow showcase-splash__glow--green" />
          
          <div className="showcase-splash__box">
            {/* Pulsing Concentric Circles Logo */}
            <div className="showcase-splash__logo-container">
              <div className="showcase-splash__pulse showcase-splash__pulse--1" />
              <div className="showcase-splash__pulse showcase-splash__pulse--2" />
              <div className="showcase-splash__logo-bg">
                <UpwardLogo size={56} color="#fcfbf7" />
              </div>
            </div>

            <h3 className="showcase-splash__title">UPWARD PM</h3>
            <p className="showcase-splash__subtitle">Entering Property Manager Portal</p>
            
            {/* Premium Loader */}
            <div className="showcase-splash__loader-bar">
              <div className="showcase-splash__loader-progress" />
            </div>

            <div className="showcase-splash__message-box">
              <ShieldCheck size={14} className="showcase-splash__message-icon" />
              <span>Direct Secure Connection Activated</span>
            </div>
          </div>
        </div>
      )}

      {/* Scoped CSS styling for gorgeous aesthetics */}
      <style>{`
        /* Base Showcase Layout */
        .showcase {
          padding: 80px 40px;
          max-width: 1360px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .showcase__header {
          text-align: center;
          max-width: 720px;
          margin: 0 auto 56px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .showcase__label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: var(--accent);
        }

        .showcase__title {
          font-family: var(--font-head);
          font-weight: 800;
          font-size: clamp(2rem, 4vw, 3.2rem);
          line-height: 1.15;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, #0c2310 0%, #1c3d20 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          color: #0c2310;
        }

        .theme--dark .showcase__title {
          background: linear-gradient(135deg, #ffffff 0%, #a3a3a3 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          color: #ffffff;
        }

        .showcase__subtitle {
          font-size: 15px;
          color: var(--muted);
          line-height: 1.6;
        }

        .showcase__grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 32px;
          align-items: stretch;
        }

        /* Showcase Cards */
        .showcase-card {
          border-radius: 28px;
          border: 1px solid var(--border);
          padding: 48px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .showcase-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 30px 60px -15px var(--hover-shadow);
        }

        /* Theme Styling Configurations */
        /* --- Tenant Card --- */
        .showcase-card--tenant {
          background: var(--surface);
          border-color: var(--border);
        }
        
        .showcase-card--tenant:hover {
          border-color: var(--accent-muted);
        }

        /* --- PM Card (Forest & Ivory Integration) --- */
        /* Light Mode Styling */
        .theme--light .showcase-card--pm {
          background-color: #fcfbf7;
          border-color: rgba(30, 63, 32, 0.12);
        }
        .theme--light .showcase-card--pm:hover {
          border-color: rgba(30, 63, 32, 0.25);
          box-shadow: 0 30px 60px -15px rgba(22, 101, 52, 0.1);
        }
        .theme--light .showcase-card--pm .showcase-card__name {
          color: #0c2310;
        }
        .theme--light .showcase-card--pm .showcase-card__tagline {
          color: #166534;
        }
        .theme--light .showcase-card--pm .showcase-card__desc {
          color: #3f4c5a;
        }
        .theme--light .showcase-card--pm .showcase-card__item {
          color: #3f4c5a;
        }

        /* Dark Mode Styling */
        .theme--dark .showcase-card--pm {
          background-color: rgba(30, 63, 32, 0.08);
          border-color: rgba(34, 197, 94, 0.12);
        }
        .theme--dark .showcase-card--pm:hover {
          border-color: rgba(34, 197, 94, 0.25);
          box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.4);
        }
        .theme--dark .showcase-card--pm .showcase-card__name {
          color: #fcfbf7;
        }
        .theme--dark .showcase-card--pm .showcase-card__tagline {
          color: #22c55e;
        }
        .theme--dark .showcase-card--pm .showcase-card__desc {
          color: #8a8a8a;
        }
        .theme--dark .showcase-card--pm .showcase-card__item {
          color: #8a8a8a;
        }

        /* Radial Swatch Glow Elements */
        .showcase-card__glow {
          position: absolute;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
          opacity: 0.12;
          top: -120px;
          right: -120px;
        }

        .showcase-card__glow--clay {
          background: radial-gradient(circle, var(--accent) 0%, transparent 70%);
        }

        .showcase-card__glow--forest {
          background: radial-gradient(circle, #22c55e 0%, transparent 70%);
        }

        /* Inner Content */
        .showcase-card__content {
          position: relative;
          z-index: 1;
          margin-bottom: 40px;
        }

        /* Badges */
        .showcase-card__badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.02em;
          margin-bottom: 24px;
        }

        .showcase-card__badge--clay {
          background: var(--accent-faint);
          border: 1px solid var(--accent-muted);
          color: var(--accent);
        }

        .showcase-card__badge--pm {
          background: rgba(34, 197, 94, 0.08);
          border: 1px solid rgba(34, 197, 94, 0.15);
          color: #166534;
        }
        
        .theme--dark .showcase-card__badge--pm {
          color: #22c55e;
        }

        .showcase-card__badge-icon {
          flex-shrink: 0;
        }

        /* Card Headlines */
        .showcase-card__name {
          font-family: var(--font-head);
          font-weight: 800;
          font-size: 26px;
          line-height: 1.2;
          color: var(--text);
        }

        .showcase-card__tagline {
          font-family: var(--font-head);
          font-weight: 600;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 16px;
          color: var(--accent);
        }

        .showcase-card__desc {
          font-size: 14.5px;
          color: var(--muted);
          line-height: 1.6;
          margin-bottom: 24px;
        }

        /* Card Lists */
        .showcase-card__list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 32px;
        }

        .showcase-card__item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 13.5px;
          color: var(--muted);
          line-height: 1.5;
        }

        .showcase-card__list-icon {
          margin-top: 2.5px;
          flex-shrink: 0;
        }

        .showcase-card__list-icon--clay {
          color: var(--accent);
        }

        .showcase-card__list-icon--forest {
          color: #166534;
        }
        
        .theme--dark .showcase-card__list-icon--forest {
          color: #22c55e;
        }

        /* Buttons */
        .showcase-card__btn {
          width: 100%;
          padding: 16px 24px;
          border-radius: 14px;
          font-family: var(--font-head);
          font-weight: 700;
          font-size: 13.5px;
          letter-spacing: 0.05em;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Button Clay */
        .showcase-card__btn--clay {
          background: var(--accent);
          color: var(--btn-text);
          box-shadow: 0 6px 20px rgba(217, 119, 87, 0.2);
        }

        .showcase-card__btn--clay:hover {
          background: #bf5f43;
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(217, 119, 87, 0.35);
        }

        /* Button PM (Forest Green & Ivory transitions) */
        .showcase-card__btn--pm {
          background: #166534;
          color: #fcfbf7;
          box-shadow: 0 6px 20px rgba(22, 101, 52, 0.15);
        }

        .showcase-card__btn--pm:hover {
          background: #0f4c24;
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(22, 101, 52, 0.3);
        }

        .showcase-card__btn--pm-secondary {
          background: transparent;
          color: #166534;
          border: 1.5px solid rgba(22, 101, 52, 0.3) !important;
          box-shadow: none;
        }

        .showcase-card__btn--pm-secondary:hover {
          background: rgba(22, 101, 52, 0.04);
          border-color: #166534 !important;
          transform: translateY(-2px);
        }

        .theme--dark .showcase-card__btn--pm-secondary {
          color: #22c55e;
          border-color: rgba(34, 197, 94, 0.3) !important;
        }

        .theme--dark .showcase-card__btn--pm-secondary:hover {
          background: rgba(34, 197, 94, 0.04);
          border-color: #22c55e !important;
        }

        /* Visual Stack Elements */
        .showcase-card__visual {
          position: relative;
          z-index: 1;
          height: 280px;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 16px;
        }

        .showcase-card__image-container {
          position: relative;
          width: 100%;
          height: 100%;
          max-width: 420px;
        }

        .showcase-card__img {
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
          position: absolute;
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .showcase-card__img--foreground {
          z-index: 3;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 68%;
          border: 1px solid var(--border);
        }

        .showcase-card__img--underlay {
          z-index: 2;
          width: 60%;
          opacity: 0.8;
          filter: blur(0.3px);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        /* Floating Overlap Angles */
        .showcase-card__img--tenant-underlay {
          right: 2%;
          top: 12%;
          transform: rotate(4deg) scale(0.95);
        }

        .showcase-card__img--pm-underlay {
          left: 2%;
          top: 12%;
          transform: rotate(-4deg) scale(0.95);
        }

        /* Float Animations on Hover */
        .showcase-card:hover .showcase-card__img--foreground {
          transform: translate(-50%, -57%) scale(1.03);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.35);
        }

        .showcase-card:hover .showcase-card__img--tenant-underlay {
          transform: rotate(8deg) translate(8px, -10px) scale(0.97);
          opacity: 0.95;
        }

        .showcase-card:hover .showcase-card__img--pm-underlay {
          transform: rotate(-8deg) translate(-8px, -10px) scale(0.97);
          opacity: 0.95;
        }

        /* ================= FULL-SCREEN SPLASH REDIRECT OVERLAY ================= */
        .showcase-splash {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: #07150a; /* Premium Dark Forest Green */
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          animation: splashFadeIn 0.4s ease both;
        }

        .showcase-splash--fadeout {
          animation: splashFadeOut 0.4s ease both !important;
        }

        /* Splash Glow Layers */
        .showcase-splash__glow {
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, transparent 70%);
          filter: blur(100px);
          top: -150px;
          left: -150px;
          pointer-events: none;
        }

        .showcase-splash__glow--green {
          background: radial-gradient(circle, rgba(34, 197, 94, 0.2) 0%, transparent 70%);
          bottom: -150px;
          right: -150px;
        }

        .showcase-splash__box {
          text-align: center;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px;
        }

        /* Concentric Pulse Container */
        .showcase-splash__logo-container {
          position: relative;
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 32px;
        }

        .showcase-splash__logo-bg {
          width: 80px;
          height: 80px;
          border-radius: 22px;
          background: rgba(34, 197, 94, 0.15);
          border: 1.5px solid rgba(34, 197, 94, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(34, 197, 94, 0.3);
        }

        .showcase-splash__pulse {
          position: absolute;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #22c55e;
          opacity: 0;
          z-index: 1;
        }

        .showcase-splash__pulse--1 {
          animation: beam 2s infinite ease-out;
        }

        .showcase-splash__pulse--2 {
          animation: beam 2s infinite ease-out 1s;
        }

        .showcase-splash__title {
          font-family: var(--font-head);
          font-weight: 800;
          font-size: 24px;
          color: #fcfbf7;
          letter-spacing: 0.1em;
          margin-bottom: 8px;
        }

        .showcase-splash__subtitle {
          font-family: var(--font-body);
          font-size: 14px;
          font-weight: 300;
          color: rgba(252, 251, 247, 0.6);
          letter-spacing: 0.05em;
          margin-bottom: 32px;
        }

        /* Animated Loader Bar */
        .showcase-splash__loader-bar {
          width: 240px;
          height: 4px;
          background: rgba(252, 251, 247, 0.1);
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 24px;
        }

        .showcase-splash__loader-progress {
          width: 100%;
          height: 100%;
          background: #22c55e;
          border-radius: 10px;
          transform: translateX(-100%);
          animation: splashLoad 2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .showcase-splash__message-box {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(34, 197, 94, 0.08);
          border: 1px solid rgba(34, 197, 94, 0.15);
          padding: 8px 16px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 500;
          color: #22c55e;
          letter-spacing: 0.02em;
        }

        .showcase-splash__message-icon {
          flex-shrink: 0;
        }

        /* Scoped Keyframes */
        @keyframes beam {
          0% {
            transform: scale(0.9);
            opacity: 0.45;
          }
          100% {
            transform: scale(2.8);
            opacity: 0;
          }
        }

        @keyframes splashFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes splashFadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        @keyframes splashLoad {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(0);
          }
        }

        /* Responsive Breakpoints */
        @media (max-width: 960px) {
          .showcase {
            padding: 60px 24px;
          }

          .showcase__grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          
          .showcase-card {
            padding: 36px;
          }
        }

        @media (max-width: 480px) {
          .showcase-card {
            padding: 24px;
          }
          
          .showcase-card__visual {
            height: 220px;
          }
          
          .showcase-card__img--foreground {
            width: 76%;
          }

          .showcase-card__img--underlay {
            width: 66%;
          }
        }
      `}</style>
    </section>
  )
}
