'use client'

import React from 'react'
import { Home, CreditCard } from 'lucide-react'

export function ShowcaseSection() {
  return (
    <section id="showcase-section" className="showcase">
      {/* Section Header */}
      <div className="showcase__header">
        <span className="showcase__label">The Smart Renter App</span>
        <h2 className="showcase__title">Your Rent is Your Resume</h2>
        <p className="showcase__subtitle">
          Upward Pay helps you record every payment, establish a verified Rent Passport™, 
          and unlock exclusive financial advantages as you rent.
        </p>
      </div>

      <div className="showcase__layout">
        <div className="showcase__info">
          <ul className="showcase__list">
            <li className="showcase__item">
              <div className="showcase__item-icon-wrapper">
                <Home size={20} className="showcase__item-icon" />
              </div>
              <div className="showcase__item-text">
                <strong>Rent Next Home with Ease</strong>
                <span>Get prioritized by trusted owners using verified application credentials.</span>
              </div>
            </li>
            <li className="showcase__item">
              <div className="showcase__item-icon-wrapper">
                <CreditCard size={20} className="showcase__item-icon" />
              </div>
              <div className="showcase__item-text">
                <strong>Exclusive Financial Benefits</strong>
                <span>Unlock rent discounts, flexible payment plans, and affordable financing.</span>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <style>{`
        .showcase {
          padding: 100px 40px;
          max-width: 1200px;
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
          font-size: var(--font-xs);
          font-weight: 700;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: var(--accent);
        }

        .showcase__title {
          font-family: var(--font-head);
          font-weight: 500;
          font-size: var(--font-h2);
          line-height: 1.15;
          letter-spacing: -0.04em;
          background: var(--heading-mix);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .showcase__subtitle {
          font-size: clamp(14px, 1.5vw, 18px);
          color: var(--muted);
          line-height: clamp(20px, 2.2vw, 30px);
          font-weight: 400;
        }

        /* Layout */
        .showcase__layout {
          display: flex;
          justify-content: center;
          width: 100%;
        }

        .showcase__info {
          width: 100%;
          max-width: 960px;
        }

        /* List details */
        .showcase__list {
          list-style: none;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          width: 100%;
        }

        .showcase__item {
          display: flex;
          gap: 20px;
          align-items: flex-start;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 32px;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .showcase__item:hover {
          transform: translateY(-4px);
          border-color: var(--accent-muted);
          background: var(--surface);
          box-shadow: 0 16px 32px rgba(217, 119, 87, 0.06);
        }

        .showcase__item-icon-wrapper {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: var(--accent-faint);
          border: 1px solid var(--accent-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent);
          flex-shrink: 0;
          transition: all 0.3s ease;
        }

        .showcase__item:hover .showcase__item-icon-wrapper {
          transform: scale(1.1);
          background: var(--accent);
          color: #ffffff;
        }

        .showcase__item-text {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .showcase__item-text strong {
          font-family: var(--font-head);
          font-weight: 700;
          font-size: 17px;
          color: var(--text);
        }

        .showcase__item-text span {
          font-size: var(--font-sm);
          color: var(--muted);
          line-height: 1.6;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .showcase {
            padding: 60px 20px;
          }
          .showcase__list {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .showcase__item {
            padding: 24px;
          }
        }
      `}</style>
    </section>
  )
}
