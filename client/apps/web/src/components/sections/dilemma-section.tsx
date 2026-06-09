'use client'
import React from 'react'
import { ChevronDown, AlertCircle } from 'lucide-react'

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
    <section className="dilemma-section">
      <div className="dilemma-layout">
        
        {/* Left: Image display */}
        <div className="dilemma-visual">
          <div className="dilemma-image-container">
            <img
              src="/attachments/distress-man.png"
              alt="Distressed tenant looking at rental application paperwork"
              className="dilemma-img"
            />
          </div>
        </div>

        {/* Right: Compelling text content */}
        <div className="dilemma-info">
          <div className="dilemma-badge">
            <AlertCircle size={14} />
            <span>The Hard Truth</span>
          </div>

          <h2 className="dilemma-title">
            Still struggling to secure a home despite years of on-time payments?
          </h2>
          
          <p className="dilemma-desc">
            You pay your rent on time, month after month, year after year. It is your largest monthly expense. 
            Yet, this massive financial commitment is completely invisible to credit bureaus and future landlords. 
            Traditional scoring ignores your dedication, leaving you starting from scratch every single time you move.
          </p>

          <p className="dilemma-desc">
            We believe it is time your rent starts working for you. Turn your biggest liability into your greatest credit asset.
          </p>

          <div className="dilemma-scroll-hint" onClick={handleScroll}>
            <span>Discover how we turn rent into your resume</span>
            <ChevronDown size={18} className="dilemma-scroll-hint__icon" />
          </div>
        </div>

      </div>

      <style>{`
        .dilemma-section {
          padding: 100px 40px;
          max-width: 1360px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .dilemma-layout {
          display: grid;
          grid-template-columns: 46% 54%;
          gap: 80px;
          align-items: center;
        }

        .dilemma-visual {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .dilemma-image-container {
          position: relative;
          width: 100%;
          max-width: 440px;
        }

        .dilemma-img {
          width: 100%;
          height: auto;
          display: block;
          transition: transform 0.5s ease;
        }

        .dilemma-visual:hover .dilemma-img {
          transform: scale(1.03);
        }

        .dilemma-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 20px;
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

        .dilemma-title {
          font-family: var(--font-head);
          font-weight: 800;
          font-size: var(--font-h2);
          line-height: 1.2;
          color: var(--text);
          letter-spacing: -0.02em;
        }

        .dilemma-desc {
          font-size: var(--font-base);
          color: var(--muted);
          line-height: 1.65;
        }

        .dilemma-scroll-hint {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-head);
          font-weight: 800;
          font-size: var(--font-sm);
          color: var(--accent);
          letter-spacing: 0.05em;
          text-transform: uppercase;
          cursor: pointer;
          margin-top: 10px;
          transition: all 0.3s ease;
        }

        .dilemma-scroll-hint:hover {
          color: var(--swatch--clay-interactive);
        }

        .dilemma-scroll-hint__icon {
          animation: bounce-vertical-hint 2s infinite ease-in-out;
        }

        @keyframes bounce-vertical-hint {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(4px); }
        }

        @media (max-width: 992px) {
          .dilemma-layout {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          .dilemma-info {
            text-align: center;
            align-items: center;
          }
          .dilemma-image-container {
            max-width: 360px;
          }
        }

        @media (max-width: 768px) {
          .dilemma-section {
            padding: 60px 20px;
          }
          .dilemma-title {
            font-size: 1.8rem;
          }
        }
      `}</style>
    </section>
  )
}
