'use client'
import React from 'react'
import { Lock } from 'lucide-react'

export function CtaSection({
  onOpenSignup,
}: {
  onOpenSignup: () => void
}) {
  return (
    <section className="cta-section">
      <div className="cta-container">
        
        {/* Decorative outlines */}
        <div className="cta-decor cta-decor--top-left" />
        <div className="cta-decor cta-decor--bottom-right" />

        <div className="cta-content">
          <h2 className="cta-title">Ready to make your rent work for you?</h2>
          <p className="cta-subtext">
            Join 5,000+ Nigerian professionals building their path to home ownership with every rental payment. Stop letting your rent go to waste.
          </p>

          <div className="cta-actions">
            <button onClick={onOpenSignup} className="cta-btn">
              Join Upward Today
            </button>
            <div className="cta-security">
              <Lock size={14} />
              <span>Secured with 256-bit encryption</span>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        .cta-section {
          padding: 80px 40px 120px;
          background: var(--bg);
          position: relative;
          z-index: 1;
        }

        .cta-container {
          max-width: 1120px;
          margin: 0 auto;
          background: linear-gradient(135deg, var(--accent) 0%, var(--swatch--clay-interactive) 100%);
          border-radius: 36px;
          padding: 80px 40px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(217, 119, 87, 0.2);
        }

        /* Decorative Background Circles */
        .cta-decor {
          position: absolute;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.08);
          pointer-events: none;
        }

        .cta-decor--top-left {
          width: 300px;
          height: 300px;
          top: -100px;
          left: -100px;
          border-width: 4px;
        }

        .cta-decor--bottom-right {
          width: 400px;
          height: 400px;
          bottom: -150px;
          right: -150px;
          border-width: 8px;
        }

        .cta-content {
          position: relative;
          z-index: 2;
          max-width: 800px;
          margin: 0 auto;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 28px;
        }

        .cta-title {
          font-family: var(--font-head);
          font-weight: 800;
          font-size: clamp(28px, 4vw, 48px);
          line-height: 1.15;
          color: #ffffff;
          letter-spacing: -0.03em;
        }

        .cta-subtext {
          font-size: clamp(15px, 1.6vw, 19px);
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.6;
          max-w: 640px;
        }

        .cta-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          margin-top: 12px;
          width: 100%;
        }

        .cta-btn {
          width: auto;
          min-width: 240px;
          padding: 20px 48px;
          border-radius: 100px;
          background: #ffffff;
          color: var(--accent);
          border: none;
          font-family: var(--font-head);
          font-weight: 600;
          font-size: 18px;
          letter-spacing: 0.02em;
          cursor: pointer;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .cta-btn:hover {
          transform: scale(1.04);
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.25);
          background: var(--swatch--gray-050);
        }

        .cta-security {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: var(--font-xs);
          color: rgba(255, 255, 255, 0.7);
        }

        @media (max-width: 768px) {
          .cta-section {
            padding: 60px 20px;
          }
          .cta-container {
            padding: 60px 24px;
            border-radius: 28px;
          }
          .cta-btn {
            width: 100%;
          }
        }
      `}</style>
    </section>
  )
}
