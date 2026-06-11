'use client'
import React from 'react'
import { Check } from 'lucide-react'

export function ShowcaseSection() {
  return (
    <section id="showcase-section" className="showcase-revamp">
      <div className="showcase-revamp__container">
        <div className="showcase-revamp__visual">
          <div className="showcase-revamp__glow" />
          <div className="showcase-revamp__img-wrapper">
            <img 
              className="showcase-revamp__img" 
              src="https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_730e6a5800_1ec8a961edf752ba.png" 
              alt="modern professional Nigerian woman in a sleek Lagos apartment balcony" 
            />
          </div>
        </div>

        <div className="showcase-revamp__content">
          <div className="showcase-revamp__header">
            <h2 className="showcase-revamp__title">
              Your Rent is <span className="showcase-revamp__title-highlight">Your Resume</span>
            </h2>
            <p className="showcase-revamp__desc">
              Upward Pay helps you record every payment, establish a verified Rent Passport™, and unlock exclusive financial advantages as you rent.
            </p>
          </div>

          <div className="showcase-revamp__list">
            <div className="showcase-revamp__item">
              <div className="showcase-revamp__icon-box">
                <Check size={18} />
              </div>
              <div className="showcase-revamp__item-text">
                <h4 className="showcase-revamp__item-title">Rent Next Home with Ease</h4>
                <p className="showcase-revamp__item-desc">Get prioritized by trusted owners using verified application credentials.</p>
              </div>
            </div>

            <div className="showcase-revamp__item">
              <div className="showcase-revamp__icon-box">
                <Check size={18} />
              </div>
              <div className="showcase-revamp__item-text">
                <h4 className="showcase-revamp__item-title">Exclusive Financial Benefits</h4>
                <p className="showcase-revamp__item-desc">Unlock rent discounts, flexible payment plans, and affordable financing.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .showcase-revamp {
          padding: 100px 40px;
          background: var(--surface);
          position: relative;
          z-index: 1;
        }

        .showcase-revamp__container {
          max-width: 1440px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: center;
        }

        .showcase-revamp__visual {
          position: relative;
          width: 100%;
        }

        .showcase-revamp__glow {
          position: absolute;
          top: -20px;
          left: -20px;
          width: 120px;
          height: 120px;
          background: var(--accent);
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.25;
          pointer-events: none;
        }

        .showcase-revamp__img-wrapper {
          border-radius: 40px;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0,0,0,0.06);
          height: 500px;
          border: 1px solid var(--border);
        }

        .showcase-revamp__img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .showcase-revamp__content {
          display: flex;
          flex-direction: column;
          gap: 40px;
        }

        .showcase-revamp__header {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .showcase-revamp__title {
          font-family: var(--font-head);
          font-weight: 500;
          font-size: var(--font-h2);
          line-height: 1.15;
          color: var(--text);
          letter-spacing: -0.03em;
        }

        .showcase-revamp__title-highlight {
          color: var(--accent);
        }

        .showcase-revamp__desc {
          font-family: var(--font-body);
          font-size: clamp(15px, 1.3vw, 18px);
          color: var(--muted);
          line-height: 1.6;
        }

        .showcase-revamp__list {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .showcase-revamp__item {
          display: flex;
          align-items: flex-start;
          gap: 20px;
        }

        .showcase-revamp__icon-box {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #ffffff;
          border: 1px solid var(--border);
          box-shadow: 0 4px 10px rgba(0,0,0,0.04);
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .showcase-revamp__item-text {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .showcase-revamp__item-title {
          font-family: var(--font-head);
          font-weight: 700;
          font-size: 17px;
          color: var(--text);
        }

        .showcase-revamp__item-desc {
          font-family: var(--font-body);
          font-size: var(--font-sm);
          color: var(--muted);
          line-height: 1.5;
        }

        @media (max-width: 1024px) {
          .showcase-revamp__container {
            grid-template-columns: 1fr;
            gap: 48px;
          }

          .showcase-revamp__img-wrapper {
            height: 400px;
          }
        }

        @media (max-width: 768px) {
          .showcase-revamp {
            padding: 60px 20px;
          }
        }
      `}</style>
    </section>
  )
}
