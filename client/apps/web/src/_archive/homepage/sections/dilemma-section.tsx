'use client'
import React from 'react'
import { AlertCircle, AlertTriangle, Home, ChevronDown } from 'lucide-react'

export function DilemmaSection() {
  const handleScroll = () => {
    const el = document.getElementById('showcase-section')
    if (el) {
      const navHeight = 80
      const top = el.getBoundingClientRect().top + window.pageYOffset - navHeight
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  return (
    <section id="problem" className="dilemma-section">
      <div className="dilemma-container">
        {/* Section Header */}
        <div className="dilemma-header">
          <div className="dilemma-badge">
            <AlertCircle size={14} />
            <span>The Rental Dilemma</span>
          </div>
          <h2 className="dilemma-main-title">
            Paid millions in rent? What do you have to show for it?
          </h2>
          <p className="dilemma-subtitle">
            Most Nigerians spend over 40% of their income on rent with zero return. It's time to
            change the equation.
          </p>
        </div>

        {/* Comparison Grid */}
        <div className="dilemma-grid">
          {/* Card 1: Dead End */}
          <div className="dilemma-card">
            <div className="dilemma-card__icon-wrapper dilemma-card__icon-wrapper--red">
              <AlertTriangle size={24} />
            </div>
            <h3 className="dilemma-card__title">Current Rental Model is a Dead End</h3>
            <p className="dilemma-card__desc">
              Typical rental payments leave no paper trail that banks or lenders recognize. You're
              effectively building your landlord's future while yours stays out of sight.
            </p>
          </div>

          {/* Card 2: Homeownership Struggle */}
          <div className="dilemma-card">
            <div className="dilemma-card__icon-wrapper dilemma-card__icon-wrapper--orange">
              <Home size={24} />
            </div>
            <h3 className="dilemma-card__title">Homeownership Struggle</h3>
            <p className="dilemma-card__desc">
              Without a verified rental history or a specialized housing score, homeownership in
              Nigeria feels like an impossible dream for most professionals.
            </p>
          </div>
        </div>

        {/* Scroll Action Indicator */}
        <div className="dilemma-action">
          <span className="dilemma-action-text">See how we solve this below</span>
          <button
            onClick={handleScroll}
            className="dilemma-action-btn"
            aria-label="Scroll to solution"
          >
            <ChevronDown size={24} />
          </button>
        </div>
      </div>

      <style>{`
        .dilemma-section {
          padding: 100px 40px;
          background: var(--bg);
          position: relative;
          z-index: 1;
        }

        .dilemma-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 60px;
        }

        .dilemma-header {
          text-align: center;
          max-width: 800px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .dilemma-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 100px;
          font-size: var(--font-xs);
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          background: var(--accent-faint);
          border: 1px solid var(--accent-muted);
          color: var(--accent);
        }

        .dilemma-main-title {
          font-family: var(--font-head);
          font-weight: 500;
          font-size: var(--font-h2);
          line-height: 1.2;
          color: var(--text);
          letter-spacing: -0.04em;
        }

        .dilemma-subtitle {
          font-family: var(--font-body);
          font-size: clamp(14px, 1.4vw, 18px);
          color: var(--muted);
          line-height: 1.6;
          max-width: 600px;
        }

        .dilemma-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
          width: 100%;
        }

        .dilemma-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 28px;
          padding: 48px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 20px;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.01);
        }

        .dilemma-card:hover {
          transform: translateY(-6px);
          border-color: var(--accent-muted);
          background: var(--surface2);
          box-shadow: 0 16px 36px rgba(217, 119, 87, 0.08);
        }

        .dilemma-card__icon-wrapper {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.3s ease;
        }

        .dilemma-card__icon-wrapper--red {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .dilemma-card__icon-wrapper--orange {
          background: rgba(249, 115, 22, 0.08);
          border: 1px solid rgba(249, 115, 22, 0.2);
          color: #f97316;
        }

        .dilemma-card:hover .dilemma-card__icon-wrapper {
          transform: scale(1.1);
        }

        .dilemma-card__title {
          font-family: var(--font-head);
          font-weight: 700;
          font-size: var(--font-xl);
          color: var(--text);
          letter-spacing: -0.02em;
        }

        .dilemma-card__desc {
          font-family: var(--font-body);
          font-size: var(--font-base);
          color: var(--muted);
          line-height: 1.7;
        }

        .dilemma-action {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin-top: 16px;
        }

        .dilemma-action-text {
          font-family: var(--font-body);
          font-size: var(--font-sm);
          color: var(--muted);
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .dilemma-action-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--accent);
          color: #ffffff;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(217, 119, 87, 0.4);
          transition: background 0.3s, transform 0.2s;
          animation: beam-pulsate 2s infinite ease-in-out;
        }

        .dilemma-action-btn:hover {
          background: var(--swatch--clay-interactive);
        }

        @keyframes beam-pulsate {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(217, 119, 87, 0.6);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 0 12px rgba(217, 119, 87, 0);
          }
        }

        @media (max-width: 768px) {
          .dilemma-section {
            padding: 60px 20px;
          }
          .dilemma-container {
            gap: 40px;
          }
          .dilemma-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .dilemma-card {
            padding: 32px;
          }
        }
      `}</style>
    </section>
  )
}
