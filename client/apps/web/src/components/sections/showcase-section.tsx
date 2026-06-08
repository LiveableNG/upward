'use client'

import React from 'react'
import { ArrowRight, CheckCircle2, Smartphone, ShieldCheck, CreditCard, Sparkles, Building } from 'lucide-react'

export function ShowcaseSection() {
  return (
    <section className="showcase">
      {/* Section Header */}
      <div className="showcase__header">
        <span className="showcase__label">The Smart Renter App</span>
        <h2 className="showcase__title">Your Rent is Your Resume</h2>
        <p className="showcase__subtitle">
          Upward Pay helps you record every payment, establish a verified Rent Passport™, 
          and unlock exclusive financial advantages as you rent.
        </p>
      </div>

      {/* Renter Showcase Container */}
      <div className="showcase__layout">
        
        {/* Left: Product Information */}
        <div className="showcase__info">
          <div className="showcase-card__badge showcase-card__badge--clay">
            <Smartphone size={14} className="showcase-card__badge-icon" />
            <span>Upward Pay for Tenants</span>
          </div>

          <h3 className="showcase__name">Build Credibility, Unlock Financing</h3>
          <p className="showcase__desc">
            Stop paying rent without anything to show for it. With Upward Pay, every transaction 
            is verified and reported to build a digital financial identity that works for you.
          </p>

          <ul className="showcase__list">
            <li className="showcase__item">
              <div className="showcase__item-icon-wrapper">
                <ShieldCheck size={20} className="showcase__item-icon" />
              </div>
              <div className="showcase__item-text">
                <strong>Rent Passport™</strong>
                <span>Build your digital rental history score. Turn your track record of timely payments into a trusted credit resume.</span>
              </div>
            </li>
            <li className="showcase__item">
              <div className="showcase__item-icon-wrapper">
                <CreditCard size={20} className="showcase__item-icon" />
              </div>
              <div className="showcase__item-text">
                <strong>Seamless Payments</strong>
                <span>Secure checkouts via card, Dedicated Virtual Account (DVA) bank transfers, or USSD code. Reconcile transactions instantly.</span>
              </div>
            </li>
            <li className="showcase__item">
              <div className="showcase__item-icon-wrapper">
                <Sparkles size={20} className="showcase__item-icon" />
              </div>
              <div className="showcase__item-text">
                <strong>Collective Financing</strong>
                <span>Unlock friendly financing for rent deposits, home furniture, and single-digit interest rates for your first home mortgage.</span>
              </div>
            </li>
          </ul>

          <button
            onClick={() => (window.location.href = '/signup')}
            className="showcase__btn"
          >
            <span>Access Renter Portal</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Right: Premium Mockups Display */}
        <div className="showcase__visual">
          <div className="showcase__image-container">
            {/* Payment Page Mockup (Underlay) */}
            <img
              src="/attachments/upwardPay-payment-page.png"
              alt="Upward Pay checkout screen"
              className="showcase__img showcase__img--underlay"
            />
            {/* Dashboard / Signup Page Mockup (Foreground) */}
            <img
              src="/attachments/upwardPaySignup.png"
              alt="Upward Pay dashboard interface"
              className="showcase__img showcase__img--foreground"
            />
          </div>
        </div>

      </div>

      {/* Landlord Call to Action Banner */}
      <div className="showcase__pm-banner">
        <div className="showcase__pm-banner-glow" />
        <div className="showcase__pm-banner-content">
          <div className="showcase__pm-banner-left">
            <div className="showcase__pm-banner-badge">
              <Building size={14} />
              <span>For Owners & Landlords</span>
            </div>
            <h3 className="showcase__pm-banner-title">Are you a Property Manager?</h3>
            <p className="showcase__pm-banner-desc">
              Discover Upward PM, our executive package built for real estate portfolios. 
              Automate commission splits, matching ledgers, and prefitted tenant onboarding.
            </p>
          </div>
          <button
            onClick={() => (window.location.href = '/pm')}
            className="showcase__pm-banner-btn"
          >
            <span>Explore Upward PM</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <style>{`
        .showcase {
          padding: 100px 40px;
          max-width: 1360px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .showcase__header {
          text-align: center;
          max-width: 720px;
          margin: 0 auto 64px;
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
          background: var(--heading-mix);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .showcase__subtitle {
          font-size: 15px;
          color: var(--muted);
          line-height: 1.6;
        }

        /* Layout */
        .showcase__layout {
          display: grid;
          grid-template-columns: 50% 50%;
          gap: 60px;
          align-items: center;
          margin-bottom: 80px;
        }

        .showcase__info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .showcase-card__badge--clay {
          background: var(--accent-faint);
          border: 1px solid var(--accent-muted);
          color: var(--accent);
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

        .showcase__name {
          font-family: var(--font-head);
          font-weight: 800;
          font-size: 28px;
          line-height: 1.25;
          color: var(--text);
          margin-bottom: 16px;
          letter-spacing: -0.01em;
        }

        .showcase__desc {
          font-size: 15px;
          color: var(--muted);
          line-height: 1.6;
          margin-bottom: 32px;
        }

        /* List details */
        .showcase__list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 24px;
          margin-bottom: 40px;
        }

        .showcase__item {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .showcase__item-icon-wrapper {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: var(--accent-faint);
          border: 1px solid var(--accent-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent);
          flex-shrink: 0;
        }

        .showcase__item-text {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .showcase__item-text strong {
          font-family: var(--font-head);
          font-weight: 700;
          font-size: 15px;
          color: var(--text);
        }

        .showcase__item-text span {
          font-size: 13.5px;
          color: var(--muted);
          line-height: 1.5;
        }

        .showcase__btn {
          padding: 16px 32px;
          border-radius: 100px;
          font-family: var(--font-head);
          font-weight: 800;
          font-size: 14px;
          letter-spacing: 0.05em;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: var(--accent);
          color: var(--btn-text);
          box-shadow: 0 6px 20px rgba(217, 119, 87, 0.2);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .showcase__btn:hover {
          background: var(--swatch--clay-interactive);
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(217, 119, 87, 0.35);
        }

        /* Mockup visuals */
        .showcase__visual {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          height: 420px;
        }

        .showcase__image-container {
          position: relative;
          width: 100%;
          height: 100%;
          max-width: 440px;
        }

        .showcase__img {
          border-radius: 20px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
          position: absolute;
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          border: 1px solid var(--border);
        }

        .showcase__img--foreground {
          z-index: 2;
          left: 5%;
          top: 15%;
          width: 70%;
        }

        .showcase__img--underlay {
          z-index: 1;
          right: 5%;
          bottom: 10%;
          width: 65%;
          opacity: 0.85;
          transform: rotate(3deg);
        }

        .showcase__visual:hover .showcase__img--foreground {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.25);
        }

        .showcase__visual:hover .showcase__img--underlay {
          transform: rotate(6deg) translate(8px, 8px);
          opacity: 0.95;
        }

        /* PM Call to Action Banner */
        .showcase__pm-banner {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 40px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.02);
        }

        .showcase__pm-banner-glow {
          position: absolute;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(22, 101, 52, 0.08) 0%, transparent 70%);
          filter: blur(50px);
          bottom: -150px;
          right: -100px;
          pointer-events: none;
        }

        .showcase__pm-banner-content {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 40px;
        }

        .showcase__pm-banner-left {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
          max-width: 700px;
        }

        .showcase__pm-banner-badge {
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
        }

        .theme--dark .showcase__pm-banner-badge {
          color: #22c55e;
        }

        .showcase__pm-banner-title {
          font-family: var(--font-head);
          font-weight: 800;
          font-size: 22px;
          color: var(--text);
          letter-spacing: -0.01em;
        }

        .showcase__pm-banner-desc {
          font-size: 14px;
          color: var(--muted);
          line-height: 1.6;
        }

        .showcase__pm-banner-btn {
          padding: 16px 28px;
          border-radius: 100px;
          font-family: var(--font-head);
          font-weight: 800;
          font-size: 13.5px;
          letter-spacing: 0.05em;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: #166534;
          color: #ffffff;
          box-shadow: 0 6px 20px rgba(22, 101, 52, 0.15);
          transition: all 0.3s;
          flex-shrink: 0;
        }

        .showcase__pm-banner-btn:hover {
          background: #0f4c24;
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(22, 101, 52, 0.3);
        }

        /* Responsive */
        @media (max-width: 992px) {
          .showcase__layout {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          .showcase__visual {
            height: 380px;
          }
          .showcase__pm-banner-content {
            flex-direction: column;
            align-items: flex-start;
            gap: 24px;
          }
          .showcase__pm-banner-btn {
            width: 100%;
          }
        }

        @media (max-width: 768px) {
          .showcase {
            padding: 60px 20px;
          }
          .showcase__pm-banner {
            padding: 24px;
          }
        }
      `}</style>
    </section>
  )
}
