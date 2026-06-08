'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Home, CreditCard, Key, ShieldCheck, ArrowRight } from 'lucide-react'

export function BenefitsGrid({
  onOpenSignup,
}: {
  onOpenSignup?: (email?: string) => void
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const progressInterval = useRef<NodeJS.Timeout | null>(null)

  const benefits = [
    {
      id: 0,
      icon: <ShieldCheck size={20} />,
      title: 'Rent Passport™',
      short: 'Build your digital rental history score.',
      desc: 'Build your digital rental history score. Turn your track record of timely payments into a trusted credit resume.',
      image: '/attachments/upwardPay-dashboard.png',
      alt: 'Upward Rent Passport Dashboard Mockup',
    },
    {
      id: 1,
      icon: <CreditCard size={20} />,
      title: 'Seamless Payments',
      short: 'Secure checkouts via card, DVA bank transfers, or USSD.',
      desc: 'Secure checkouts via card, Dedicated Virtual Account (DVA) bank transfers, or USSD code. Reconcile transactions instantly.',
      image: '/attachments/upwardPay-payment-page.png',
      alt: 'Flexible Rental Checkout Mockup',
    },
    {
      id: 2,
      icon: <Key size={20} />,
      title: 'Collective Financing',
      short: 'Friendly financing for rent deposits & low rate mortgage.',
      desc: 'Unlock friendly financing for rent deposits, home furniture, and single-digit interest rates for your first home mortgage.',
      image: '/attachments/upwardPaySignup.png',
      alt: 'Collective Financing and Pathways to Ownership Mockup',
    },
  ]

  // Auto-rotate logic
  useEffect(() => {
    if (isHovered) {
      if (progressInterval.current) clearInterval(progressInterval.current)
      return
    }

    const duration = 6000 // 6 seconds per benefit
    const steps = 100
    const stepTime = duration / steps

    progressInterval.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveIndex((prevIndex) => (prevIndex + 1) % benefits.length)
          return 0
        }
        return prev + 1
      })
    }, stepTime)

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current)
    }
  }, [isHovered, activeIndex, benefits.length])

  const handleSelect = (index: number) => {
    setActiveIndex(index)
    setProgress(0)
  }

  const activeBenefit = benefits[activeIndex]

  return (
    <section
      id="how"
      className="benefits-showcase"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="benefits-showcase__container">
        
        {/* LEFT COLUMN: Stepper Tabs */}
        <div className="benefits-showcase__left">
          <div className="benefits-showcase__header">
            <span className="section-label">Features & Perks</span>
            <h2 className="benefits-showcase__title">Why Upward Pay?</h2>
            <p className="benefits-showcase__subtitle">
              Get verified and reported to build a digital financial identity that works for you.
            </p>
          </div>

          <div className="benefits-showcase__steps">
            {benefits.map((benefit, index) => {
              const isActive = index === activeIndex
              return (
                <div
                  key={benefit.id}
                  onClick={() => handleSelect(index)}
                  className={`benefit-step ${isActive ? 'benefit-step--active' : ''}`}
                >
                  {/* Step Left: Icon Badge */}
                  <div className="benefit-step__badge-wrapper">
                    <div className="benefit-step__badge">
                      {isActive ? (
                        <div className="benefit-step__badge-active-bg" />
                      ) : null}
                      <span className="benefit-step__icon">{benefit.icon}</span>
                    </div>
                  </div>

                  {/* Step Right: Content */}
                  <div className="benefit-step__text">
                    <h3 className="benefit-step__title">{benefit.title}</h3>
                    <p className="benefit-step__short">{benefit.short}</p>
                    
                    {/* Animated Progress Line */}
                    <div className="benefit-step__progress-track">
                      <div
                        className="benefit-step__progress-bar"
                        style={{ width: isActive ? `${progress}%` : '0%' }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="benefits-showcase__right">
          <div className="preview-card-wrapper">
            <div className="preview-card">
              <div className="preview-card__glow" />
              
              <div className="preview-card__text-content">
                <p
                  className="preview-card__desc"
                  key={activeIndex}
                  style={{ animation: 'fadeSlideIn 0.3s ease both' }}
                >
                  {activeBenefit?.desc}
                </p>
                
                <button
                  onClick={() => onOpenSignup?.()}
                  className="preview-card__cta"
                >
                  <span>Get Started Now</span>
                  <ArrowRight size={16} />
                </button>
              </div>

              {/* High-Fidelity Mockup Frame */}
              <div className="preview-card__mockup">
                <div className="device-frame">
                  <div className="device-frame__header">
                    <div className="device-frame__dots">
                      <span className="device-frame__dot device-frame__dot--red" />
                      <span className="device-frame__dot device-frame__dot--yellow" />
                      <span className="device-frame__dot device-frame__dot--green" />
                    </div>
                    <div className="device-frame__address">
                      <span>upward.pay/dashboard</span>
                    </div>
                  </div>
                  <div className="device-frame__body" style={{ aspectRatio: '16/10', width: '100%', position: 'relative', overflow: 'hidden' }}>
                    {benefits.map((b, i) => (
                      <img
                        key={b.id}
                        src={b.image}
                        alt={b.alt}
                        className="device-frame__img"
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          opacity: i === activeIndex ? 1 : 0,
                          transform: i === activeIndex ? 'scale(1)' : 'scale(0.96)',
                          transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                          pointerEvents: i === activeIndex ? 'auto' : 'none',
                          zIndex: i === activeIndex ? 2 : 1,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        .benefits-showcase {
          padding: 100px 40px;
          max-width: 1360px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .benefits-showcase__container {
          display: grid;
          grid-template-columns: 45% 55%;
          gap: 60px;
          align-items: flex-start;
        }

        .benefits-showcase__left {
          display: flex;
          flex-direction: column;
          gap: 40px;
        }

        .benefits-showcase__header {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .benefits-showcase__title {
          font-family: var(--font-head);
          font-weight: 800;
          font-size: clamp(2rem, 4vw, 3rem);
          line-height: 1.15;
          letter-spacing: -0.03em;
          color: var(--text);
          background: var(--heading-mix);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .benefits-showcase__subtitle {
          font-size: 15px;
          color: var(--muted);
          line-height: 1.6;
          max-width: 480px;
        }

        .benefits-showcase__steps {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Stepper Tabs */
        .benefit-step {
          display: flex;
          gap: 20px;
          padding: 20px;
          border-radius: 20px;
          border: 1px solid var(--border);
          background: var(--surface2);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
        }

        .benefit-step:hover {
          background: var(--surface);
          border-color: var(--accent-muted);
          transform: scale(1.03) translateY(-2px);
          box-shadow: 0 12px 24px rgba(217, 119, 87, 0.08);
        }

        .benefit-step--active {
          background: var(--accent-faint);
          border-color: var(--accent);
          box-shadow: 0 10px 30px rgba(217, 119, 87, 0.12);
        }

        .benefit-step:not(.benefit-step--active):hover {
          animation: pulseSoft 1.5s infinite ease-in-out alternate;
        }

        @keyframes pulseSoft {
          0% { transform: scale(1.02) translateY(-2px); }
          100% { transform: scale(1.04) translateY(-3px); }
        }

        .benefit-step__badge-wrapper {
          flex-shrink: 0;
        }

        .benefit-step__badge {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border);
          background: var(--surface2);
          color: var(--muted);
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .benefit-step--active .benefit-step__badge {
          color: #ffffff;
          border-color: var(--accent);
        }

        .benefit-step__badge-active-bg {
          position: absolute;
          inset: 0;
          background: var(--accent);
          z-index: 1;
          animation: scaleUpBg 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .benefit-step__icon {
          position: relative;
          z-index: 2;
        }

        .benefit-step__text {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .benefit-step__title {
          font-family: var(--font-head);
          font-weight: 700;
          font-size: 16px;
          color: var(--text);
          line-height: 1.3;
        }

        .benefit-step__short {
          font-size: 13.5px;
          color: var(--muted);
          line-height: 1.4;
        }

        /* Progress indicator bar */
        .benefit-step__progress-track {
          width: 100%;
          height: 3px;
          background: rgba(0, 0, 0, 0.04);
          border-radius: 10px;
          margin-top: 10px;
          overflow: hidden;
          display: none; /* Only show on desktop active */
        }

        .theme--dark .benefit-step__progress-track {
          background: rgba(255, 255, 255, 0.04);
        }

        .benefit-step--active .benefit-step__progress-track {
          display: block;
        }

        .benefit-step__progress-bar {
          height: 100%;
          background: var(--accent);
          border-radius: 10px;
          width: 0%;
        }

        /* Preview Card Showcase */
        .benefits-showcase__right {
          position: sticky;
          top: 100px;
        }

        .preview-card-wrapper {
          animation: fadeSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .preview-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 28px;
          padding: 40px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 30px 60px -20px var(--hover-shadow);
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .preview-card__glow {
          position: absolute;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, var(--accent-faint) 0%, transparent 70%);
          filter: blur(60px);
          top: -200px;
          right: -200px;
          pointer-events: none;
        }

        .preview-card__text-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 20px;
        }

        .preview-card__desc {
          font-size: 16px;
          color: var(--text);
          line-height: 1.7;
          font-weight: 300;
        }

        .preview-card__cta {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--accent);
          color: var(--btn-text);
          font-family: var(--font-head);
          font-weight: 700;
          font-size: 13.5px;
          border: none;
          padding: 14px 24px;
          border-radius: 100px;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(217, 119, 87, 0.2);
          transition: all 0.3s;
        }

        .preview-card__cta:hover {
          background: var(--swatch--clay-interactive);
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(217, 119, 87, 0.35);
        }

        /* browser mockup frame */
        .preview-card__mockup {
          position: relative;
          z-index: 1;
        }

        .device-frame {
          border-radius: 16px;
          background: var(--surface2);
          border: 1px solid var(--border);
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        }

        .device-frame__header {
          height: 32px;
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          padding: 0 16px;
          position: relative;
        }

        .device-frame__dots {
          display: flex;
          gap: 6px;
        }

        .device-frame__dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .device-frame__dot--red { background: #ff5f56; }
        .device-frame__dot--yellow { background: #ffbd2e; }
        .device-frame__dot--green { background: #27c93f; }

        .device-frame__address {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          font-size: 11px;
          color: var(--muted);
          background: var(--surface2);
          padding: 2px 24px;
          border-radius: 6px;
          border: 1px solid var(--border);
          font-family: monospace;
        }

        .device-frame__body {
          position: relative;
          padding: 8px;
          background: #ffffff;
        }

        .theme--dark .device-frame__body {
          background: #141413;
        }

        .device-frame__img {
          width: 100%;
          height: auto;
          display: block;
          border-radius: 8px;
          border: 1px solid var(--border);
          transition: transform 0.6s ease;
        }

        .device-frame:hover .device-frame__img {
          transform: scale(1.02);
        }

        /* Animations */
        @keyframes scaleUpBg {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Responsive Layout styling */
        @media (max-width: 1024px) {
          .benefits-showcase__container {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          .benefits-showcase__right {
            position: relative;
            top: 0;
          }
        }

        @media (max-width: 768px) {
          .benefits-showcase {
            padding: 60px 20px;
          }
          .benefit-step {
            padding: 12px;
          }
          .benefit-step__badge {
            width: 36px;
            height: 36px;
            border-radius: 10px;
          }
          .preview-card {
            padding: 24px;
          }
        }
      `}</style>
    </section>
  )
}
