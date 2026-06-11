'use client'
import React from 'react'
import { Coins, UserCheck, Gift, Key, Calendar } from 'lucide-react'

export function UnfairAdvantages() {
  const advantages = [
    {
      icon: <Coins size={24} />,
      title: 'Low-Deposit Moves',
      desc: 'Qualified high-score renters can move into select apartments with highly discounted security deposit upfront.',
    },
    {
      icon: <UserCheck size={24} />,
      title: 'Verified Reputation',
      desc: 'No more "introductions" needed or being judged by tribe or religion. Your Upward score speaks for your character.',
    },
    {
      icon: <Gift size={24} />,
      title: 'Rent and Home Savings Rewards',
      desc: 'Earn points every month you save towards rent and your future home simultaneously.',
    },
    {
      icon: <Key size={24} />,
      title: 'Path to Ownership',
      desc: 'Convert verified rental history into single-digit interest mortgage equity when you\'re ready to buy your first home.',
    },
    {
      icon: <Calendar size={24} />,
      title: 'Flexible Rent Financing',
      desc: 'Access the opportunity to pay your rent in predefined installments when you have a good Upward Score.',
    },
  ]

  return (
    <section className="advantages-section">
      <div className="advantages-container">
        
        {/* Section Header */}
        <div className="advantages-header">
          <span className="advantages-label">Member Benefits</span>
          <h2 className="advantages-title">Unfair Advantages for Excellent Renters</h2>
          <p className="advantages-subtitle">
            Unlock exclusive rewards, financial flexibility, and a smoother path to your own home simply by paying your rent on time.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="advantages-grid">
          {advantages.map((adv, idx) => (
            <div key={idx} className="advantages-card">
              <div className="advantages-card__icon-wrapper">
                {adv.icon}
              </div>
              <h3 className="advantages-card__title">{adv.title}</h3>
              <p className="advantages-card__desc">{adv.desc}</p>
            </div>
          ))}
        </div>

      </div>

      <style>{`
        .advantages-section {
          padding: 100px 40px;
          background: var(--bg);
          position: relative;
          z-index: 1;
        }

        .advantages-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 60px;
        }

        .advantages-header {
          text-align: center;
          max-width: 720px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .advantages-label {
          font-size: var(--font-xs);
          font-weight: 700;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: var(--accent);
        }

        .advantages-title {
          font-family: var(--font-head);
          font-weight: 500;
          font-size: var(--font-h2);
          line-height: 1.15;
          letter-spacing: -0.04em;
          background: var(--heading-mix);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .advantages-subtitle {
          font-size: clamp(14px, 1.4vw, 18px);
          color: var(--muted);
          line-height: 1.6;
        }

        .advantages-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
          width: 100%;
        }

        /* Adjusting for 5 items to look balanced on large screens */
        @media (min-width: 1024px) {
          .advantages-grid {
            grid-template-columns: repeat(6, 1fr);
          }
          .advantages-card:nth-child(1),
          .advantages-card:nth-child(2),
          .advantages-card:nth-child(3) {
            grid-column: span 2;
          }
          .advantages-card:nth-child(4) {
            grid-column: 2 / span 2;
          }
          .advantages-card:nth-child(5) {
            grid-column: 4 / span 2;
          }
        }

        .advantages-card {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 36px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 16px;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.01);
        }

        .advantages-card:hover {
          transform: translateY(-5px);
          border-color: var(--accent);
          background: var(--accent-faint);
          box-shadow: 0 16px 32px rgba(217, 119, 87, 0.08);
        }

        .advantages-card__icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: var(--accent-faint);
          border: 1px solid var(--accent-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent);
          transition: transform 0.3s ease;
        }

        .advantages-card:hover .advantages-card__icon-wrapper {
          transform: scale(1.1);
          background: var(--accent);
          color: #ffffff;
        }

        .advantages-card__title {
          font-family: var(--font-head);
          font-weight: 700;
          font-size: 18px;
          color: var(--text);
          letter-spacing: -0.01em;
        }

        .advantages-card__desc {
          font-size: var(--font-sm);
          color: var(--muted);
          line-height: 1.6;
        }

        @media (max-width: 1024px) {
          .advantages-grid {
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          }
        }

        @media (max-width: 768px) {
          .advantages-section {
            padding: 60px 20px;
          }
          .advantages-card {
            padding: 28px;
          }
        }
      `}</style>
    </section>
  )
}
