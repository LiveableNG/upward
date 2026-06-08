'use client'

import React, { useState, useEffect } from 'react'
import { ArrowRight, CheckCircle2, ShieldCheck, Shuffle, BookOpen, UserCheck } from 'lucide-react'

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

export function LandlordPmPage({
  onBack,
  onOpenSignup,
}: {
  onBack: () => void
  onOpenSignup: () => void
}) {
  const [showSplash, setShowSplash] = useState(false)
  const [splashFade, setSplashFade] = useState(false)

  const handlePmRedirect = (e: React.MouseEvent, path: string) => {
    e.preventDefault()
    setShowSplash(true)
    setSplashFade(false)

    // Wait 2.2 seconds for full effect, then redirect
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
    <div className="pm-page-container">
      {/* Background glow */}
      <div className="pm-page-container__glow" />

      {/* Back button */}
      <button
        onClick={onBack}
        className="pm-page-back-btn"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#166534"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to Home
      </button>

      {/* Hero layout */}
      <div className="pm-page-grid">
        
        {/* Left: Copy & Features */}
        <div className="pm-page-info">
          <div className="pm-page-badge">
            <ShieldCheck size={14} />
            <span>Executive Landlord Suite</span>
          </div>

          <h1 className="pm-page-title">Automate Rent splits & ledgers.</h1>
          <p className="pm-page-subtitle">
            Professional, automated occupancy ledgers and split commission routing. 
            Reconcile transactions instantly via Dedicated Virtual Accounts and automate 
            commission payouts directly to your portfolio.
          </p>

          {/* Pillars List */}
          <div className="pm-pillars">
            <div className="pm-pillar">
              <div className="pm-pillar__icon-wrapper">
                <Shuffle size={20} />
              </div>
              <div className="pm-pillar__text">
                <h3>Split Commission Engine</h3>
                <p>Automate agency split distributions and tax routing immediately upon tenant checkout confirmation.</p>
              </div>
            </div>

            <div className="pm-pillar">
              <div className="pm-pillar__icon-wrapper">
                <BookOpen size={20} />
              </div>
              <div className="pm-pillar__text">
                <h3>Auto Ledger Matching</h3>
                <p>Dedicated virtual accounts matching incoming payments directly to active lease items with zero manual entry.</p>
              </div>
            </div>

            <div className="pm-pillar">
              <div className="pm-pillar__icon-wrapper">
                <UserCheck size={20} />
              </div>
              <div className="pm-pillar__text">
                <h3>Tenant Claim Flow</h3>
                <p>Pre-fill digital lease files and invite tenants to claim their profile to start building their Rent Passport™.</p>
              </div>
            </div>
          </div>

          {/* Call to Actions */}
          <div className="pm-cta-group">
            <button
              onClick={(e) => handlePmRedirect(e, '/portal/login')}
              className="pm-cta-btn pm-cta-btn--primary"
            >
              <span>Access Landlord & PM Suite</span>
              <ArrowRight size={16} />
            </button>
            <button
              onClick={onOpenSignup}
              className="pm-cta-btn pm-cta-btn--secondary"
            >
              Contact Sales / Setup Demo
            </button>
          </div>
        </div>

        {/* Right: Mockup Display */}
        <div className="pm-page-visual">
          <div className="pm-visual-container">
            {/* Landlord Signup Underlay */}
            <img
              src="/attachments/landlord-signup.png"
              alt="Upward Landlord Onboarding"
              className="pm-img pm-img--underlay"
            />
            {/* PM Dashboard Foreground */}
            <img
              src="/attachments/pm-dashboard.png"
              alt="Upward PM Dashboard"
              className="pm-img pm-img--foreground"
            />
          </div>
        </div>

      </div>

      {/* Redirection banner back to Tenant */}
      <div className="pm-renter-banner">
        <div className="pm-renter-banner__content">
          <span>Are you a tenant or renter? Discover benefits designed for you.</span>
          <button onClick={onBack} className="pm-renter-banner__btn">
            <span>Learn About Upward Pay</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* ================= FULL-SCREEN REDIRECT SPLASH OVERLAY ================= */}
      {showSplash && (
        <div className={`showcase-splash ${splashFade ? 'showcase-splash--fadeout' : ''}`}>
          <div className="showcase-splash__glow" />
          <div className="showcase-splash__glow showcase-splash__glow--green" />
          
          <div className="showcase-splash__box">
            <div className="showcase-splash__logo-container">
              <div className="showcase-splash__pulse showcase-splash__pulse--1" />
              <div className="showcase-splash__pulse showcase-splash__pulse--2" />
              <div className="showcase-splash__logo-bg">
                <UpwardLogo size={56} color="#fcfbf7" />
              </div>
            </div>

            <h3 className="showcase-splash__title">UPWARD PM</h3>
            <p className="showcase-splash__subtitle">Entering Property Manager Portal</p>
            
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

      <style>{`
        .pm-page-container {
          min-height: 100vh;
          padding: 90px 20px 60px;
          maxWidth: 1360px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .pm-page-container__glow {
          position: absolute;
          top: 10%;
          right: 5%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(22, 101, 52, 0.08) 0%, transparent 70%);
          filter: blur(100px);
          z-index: -1;
        }

        .pm-page-back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--surface2);
          border: 1px solid var(--border);
          color: var(--text);
          cursor: pointer;
          font-family: var(--font-head);
          font-weight: 700;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          marginBottom: 40px;
          padding: 12px 20px;
          border-radius: 100px;
          transition: all 0.3s ease;
        }

        .pm-page-back-btn:hover {
          transform: translateX(-4px);
          background: rgba(22, 101, 52, 0.05);
          border-color: rgba(22, 101, 52, 0.2);
        }

        /* Grid */
        .pm-page-grid {
          display: grid;
          grid-template-columns: 50% 50%;
          gap: 60px;
          align-items: center;
          margin-bottom: 80px;
        }

        .pm-page-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          animation: fadeUp 0.8s ease backwards;
        }

        .pm-page-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.02em;
          background: rgba(34, 197, 94, 0.08);
          border: 1px solid rgba(34, 197, 94, 0.15);
          color: #166534;
          margin-bottom: 24px;
        }

        .theme--dark .pm-page-badge {
          color: #22c55e;
        }

        .pm-page-title {
          font-family: var(--font-head);
          font-weight: 800;
          font-size: clamp(2.2rem, 5vw, 3.8rem);
          line-height: 1.05;
          letter-spacing: -0.04em;
          background: linear-gradient(135deg, #0c2310 0%, #166534 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 24px;
        }

        .theme--dark .pm-page-title {
          background: linear-gradient(135deg, #ffffff 0%, #a3a3a3 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .pm-page-subtitle {
          font-size: 16px;
          color: var(--muted);
          line-height: 1.7;
          margin-bottom: 40px;
        }

        /* Pillars */
        .pm-pillars {
          display: flex;
          flex-direction: column;
          gap: 28px;
          margin-bottom: 40px;
          width: 100%;
        }

        .pm-pillar {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .pm-pillar__icon-wrapper {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(34, 197, 94, 0.08);
          border: 1px solid rgba(34, 197, 94, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #166534;
          flex-shrink: 0;
        }

        .theme--dark .pm-pillar__icon-wrapper {
          color: #22c55e;
        }

        .pm-pillar__text h3 {
          font-family: var(--font-head);
          font-weight: 700;
          font-size: 16px;
          color: var(--text);
          margin-bottom: 4px;
        }

        .pm-pillar__text p {
          font-size: 14px;
          color: var(--muted);
          line-height: 1.5;
        }

        /* CTA buttons */
        .pm-cta-group {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          width: 100%;
        }

        .pm-cta-btn {
          padding: 16px 28px;
          border-radius: 100px;
          font-family: var(--font-head);
          font-weight: 800;
          font-size: 13.5px;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .pm-cta-btn--primary {
          background: #166534;
          color: #ffffff;
          border: none;
          box-shadow: 0 6px 20px rgba(22, 101, 52, 0.2);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pm-cta-btn--primary:hover {
          background: #0f4c24;
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(22, 101, 52, 0.35);
        }

        .pm-cta-btn--secondary {
          background: var(--bg);
          color: #166534;
          border: 1.5px solid rgba(22, 101, 52, 0.3);
          box-shadow: none;
        }

        .theme--dark .pm-cta-btn--secondary {
          color: #22c55e;
          border-color: rgba(34, 197, 94, 0.3);
        }

        .pm-cta-btn--secondary:hover {
          background: rgba(22, 101, 52, 0.04);
          transform: translateY(-2px);
        }

        /* Mockup visuals */
        .pm-page-visual {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          height: 480px;
        }

        .pm-visual-container {
          position: relative;
          width: 100%;
          height: 100%;
          max-width: 460px;
        }

        .pm-img {
          border-radius: 20px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
          position: absolute;
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          border: 1px solid var(--border);
        }

        .pm-img--foreground {
          z-index: 2;
          left: 5%;
          top: 15%;
          width: 72%;
        }

        .pm-img--underlay {
          z-index: 1;
          right: 5%;
          bottom: 10%;
          width: 68%;
          opacity: 0.85;
          transform: rotate(3deg);
        }

        .pm-page-visual:hover .pm-img--foreground {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.35);
        }

        .pm-page-visual:hover .pm-img--underlay {
          transform: rotate(6deg) translate(8px, 8px);
          opacity: 0.95;
        }

        /* Redirection banner */
        .pm-renter-banner {
          background: var(--accent-faint);
          border: 1px solid var(--accent-muted);
          border-radius: 20px;
          padding: 24px 32px;
          width: 100%;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.02);
        }

        .pm-renter-banner__content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
          flex-wrap: wrap;
        }

        .pm-renter-banner__content span {
          font-size: 14.5px;
          color: var(--text);
          font-weight: 500;
        }

        .pm-renter-banner__btn {
          padding: 12px 24px;
          border-radius: 100px;
          background: var(--accent);
          color: var(--btn-text);
          border: none;
          font-family: var(--font-head);
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 4px 15px rgba(217, 119, 87, 0.15);
          transition: all 0.3s;
        }

        .pm-renter-banner__btn:hover {
          background: var(--swatch--clay-interactive);
          transform: translateY(-1px);
        }

        /* Splash Overlay */
        .showcase-splash {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: #07150a;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          animation: splashFadeIn 0.4s ease both;
        }

        .showcase-splash--fadeout {
          animation: splashFadeOut 0.4s ease both !important;
        }

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

        @keyframes beam {
          0% { transform: scale(0.9); opacity: 0.45; }
          100% { transform: scale(2.8); opacity: 0; }
        }

        @keyframes splashLoad {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(0%); }
        }

        @keyframes splashFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes splashFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        /* Responsive */
        @media (max-width: 992px) {
          .pm-page-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          .pm-page-visual {
            height: 380px;
          }
          .pm-renter-banner__content {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          .pm-renter-banner__btn {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 768px) {
          .pm-page-container {
            padding: 90px 20px 40px !important;
          }
          .pm-page-back-btn {
            margin-bottom: 24px;
          }
          .pm-cta-group {
            flex-direction: column;
          }
          .pm-cta-btn {
            width: 100%;
            text-align: center;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  )
}
