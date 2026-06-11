'use client'
import React, { useState } from 'react'
import { CalendarCheck, Home, ArrowUp } from 'lucide-react'

export function GrowthSimulator() {
  const [score, setScore] = useState(500)

  const SCORE_MIN = 300
  const SCORE_MAX = 900
  const pct = ((score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100

  const milestones = [
    { value: 300, bottom: '0%' },
    { value: 500, bottom: '33.33%' },
    { value: 650, bottom: '58.33%' },
    { value: 750, bottom: '75%' },
    { value: 850, bottom: '91.67%' },
    { value: 900, bottom: '100%' },
  ]

  const steps = [
    { min: 300, title: '300+', desc: 'Initial profile established' },
    { min: 500, title: '500+', desc: 'Verified rental history certificate' },
    { min: 650, title: '650+', desc: 'Zero-deposit moves program' },
    { min: 750, title: '750+', desc: 'Priority mortgage-ready listings' },
    { min: 850, title: '850+', desc: 'Single-digit mortgage financing' },
    { min: 900, title: '900 · Peak', desc: 'Home ownership', highlight: true },
  ]

  // Find the highest step currently unlocked
  let activeMin = 300
  steps.forEach((step) => {
    if (score >= step.min) {
      activeMin = step.min
    }
  })

  return (
    <section id="interactive-score" className="interactive-score-section">
      <div className="interactive-score-container">
        
        {/* Left side: Info */}
        <div className="score-info-panel">
          <div className="score-info-glow" />
          <div className="score-info-content">
            <h2 className="score-info-title">Your Digital Housing Asset</h2>
            <p className="score-info-desc">
              Every rent payment is an investment in your future credibility. Our proprietary algorithm calculates two critical metrics for lenders.
            </p>
            
            <div className="score-metrics-list">
              <div className="score-metric-item">
                <div className="score-metric-icon-box">
                  <CalendarCheck size={24} />
                </div>
                <div>
                  <h4 className="score-metric-title">Payment Consistency</h4>
                  <p className="score-metric-desc">Historical rent punctuality (24+ months)</p>
                </div>
              </div>
              <div className="score-metric-item">
                <div className="score-metric-icon-box">
                  <Home size={24} />
                </div>
                <div>
                  <h4 className="score-metric-title">Property Care Score</h4>
                  <p className="score-metric-desc">Verified landlord feedback on maintenance</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side: Climb Score Widget */}
        <div className="climb-widget-panel">
          <div className="climb-widget-header">
            <h3 className="climb-widget-title">Climb Your Upward Score</h3>
            <p className="climb-widget-subtitle">Drag upward. Each step unlocks a new benefit — all the way to home ownership.</p>
          </div>

          <div className="climb-widget-body">
            {/* Score display */}
            <div className="score-panel">
              <span className="score-panel__value">{score}</span>
              <p className="score-panel__label">Upward Score</p>
            </div>

            {/* Vertical climb slider */}
            <div className="climb-track-wrapper">
              <div className="climb-track-header">
                <ArrowUp size={16} />
                <span>Home</span>
              </div>

              <div className="upward-climb">
                <div className="upward-climb-rail">
                  <div className="upward-climb-fill" style={{ height: `${pct}%` }} />
                </div>
                {milestones.map((m) => (
                  <div 
                    key={m.value}
                    className={`upward-milestone ${score >= m.value ? 'unlocked' : ''}`}
                    style={{ bottom: m.bottom }}
                  />
                ))}
                <div className="upward-thumb" style={{ bottom: `${pct}%` }} />
                <input 
                  type="range" 
                  min={SCORE_MIN} 
                  max={SCORE_MAX} 
                  value={score} 
                  onChange={(e) => setScore(Number(e.target.value))}
                  className="upward-slider" 
                  aria-label="Upward score slider"
                />
              </div>

              <p className="climb-track-footer">Start</p>
            </div>

            {/* Benefit steps */}
            <div className="benefit-ladder">
              {steps.map((step) => {
                const unlocked = score >= step.min
                const active = activeMin === step.min
                return (
                  <div 
                    key={step.min}
                    className={`benefit-step ${unlocked ? 'unlocked' : ''} ${active ? 'active' : ''}`}
                  >
                    <p className={`benefit-step__title ${step.highlight ? 'benefit-step__title--highlight' : ''}`}>
                      {step.title}
                    </p>
                    <p className="benefit-step__desc">{step.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

      </div>

      <style>{`
        .interactive-score-section {
          padding: 100px 40px;
          background: var(--bg);
          position: relative;
          z-index: 1;
        }

        .interactive-score-container {
          max-width: 1440px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 5fr 7fr;
          gap: 64px;
          align-items: stretch;
        }

        /* Left Panel */
        .score-info-panel {
          background: var(--accent2);
          color: #ffffff;
          border-radius: 40px;
          padding: 64px;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
        }

        .score-info-glow {
          position: absolute;
          top: 0;
          right: 0;
          width: 250px;
          height: 250px;
          background: rgba(212, 129, 102, 0.15);
          border-radius: 50%;
          filter: blur(100px);
          pointer-events: none;
        }

        .score-info-content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .score-info-title {
          font-family: var(--font-head);
          font-weight: 500;
          font-size: var(--font-h2);
          line-height: 1.2;
          color: #ffffff;
        }

        .score-info-desc {
          font-family: var(--font-body);
          font-size: var(--font-base);
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.6;
        }

        .score-metrics-list {
          display: flex;
          flex-direction: column;
          gap: 32px;
          margin-top: 16px;
        }

        .score-metric-item {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .score-metric-icon-box {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.10);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent);
          flex-shrink: 0;
        }

        .score-metric-title {
          font-family: var(--font-head);
          font-weight: 700;
          font-size: 18px;
          color: #ffffff;
        }

        .score-metric-desc {
          font-family: var(--font-body);
          font-size: var(--font-sm);
          color: rgba(255, 255, 255, 0.5);
        }

        /* Right Panel */
        .climb-widget-panel {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 40px;
          padding: 64px;
          display: flex;
          flex-direction: column;
          gap: 40px;
        }

        .climb-widget-header {
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .climb-widget-title {
          font-family: var(--font-head);
          font-weight: 500;
          font-size: 28px;
          color: var(--text);
          margin: 0;
        }

        .climb-widget-subtitle {
          font-family: var(--font-body);
          font-size: var(--font-sm);
          color: var(--muted);
          max-width: 440px;
          margin: 0 auto;
        }

        .climb-widget-body {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 32px;
          width: 100%;
        }

        .score-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 90px;
          text-align: center;
          align-self: stretch;
        }

        .score-panel__value {
          font-family: var(--font-head);
          font-weight: 900;
          font-size: 44px;
          color: var(--text);
          line-height: 1;
        }

        .score-panel__label {
          font-family: var(--font-body);
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--accent);
          margin-top: 8px;
        }

        /* Vertical slider track center */
        .climb-track-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
        }

        .climb-track-header {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--accent);
          font-family: var(--font-head);
          font-size: var(--font-xs);
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 16px;
        }

        .upward-climb {
          position: relative;
          height: 320px;
          width: 52px;
        }

        .upward-climb-rail {
          position: absolute;
          left: 50%;
          top: 0;
          bottom: 0;
          width: 12px;
          transform: translateX(-50%);
          border-radius: 9999px;
          background: var(--surface2);
          overflow: hidden;
        }

        .upward-climb-fill {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 0%;
          border-radius: 9999px;
          background: linear-gradient(to top, var(--accent2), var(--accent));
          transition: height 0.35s ease-out;
        }

        .upward-slider {
          position: absolute;
          inset: 0;
          margin: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: ns-resize;
          z-index: 20;
          -webkit-appearance: slider-vertical;
          appearance: slider-vertical;
          writing-mode: vertical-lr;
          direction: rtl;
          touch-action: manipulation;
        }

        .upward-thumb {
          position: absolute;
          left: 50%;
          width: 28px;
          height: 28px;
          transform: translate(-50%, 50%);
          border-radius: 50%;
          background: #ffffff;
          border: 3px solid var(--accent);
          box-shadow: 0 4px 12px rgba(217, 119, 87, 0.3);
          transition: bottom 0.35s ease-out;
          z-index: 10;
          pointer-events: none;
        }

        .upward-milestone {
          position: absolute;
          left: 50%;
          width: 10px;
          height: 10px;
          transform: translate(-50%, 50%);
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid var(--border);
          transition: all 0.3s ease-out;
          z-index: 5;
        }

        .upward-milestone.unlocked {
          background: var(--accent);
          border-color: var(--accent);
          box-shadow: 0 0 0 4px rgba(217, 119, 87, 0.15);
        }

        .climb-track-footer {
          margin-top: 16px;
          font-family: var(--font-body);
          font-size: var(--font-xs);
          font-weight: 700;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        /* Right benefit step ladder */
        .benefit-ladder {
          display: flex;
          flex-direction: column-reverse;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }

        .benefit-step {
          background: #ffffff;
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 12px 18px;
          opacity: 0.35;
          transform: translateY(0);
          transition: all 0.35s ease-out;
        }

        .benefit-step.unlocked {
          opacity: 1;
        }

        .benefit-step.active {
          border-color: var(--accent);
          box-shadow: 0 10px 24px rgba(217, 119, 87, 0.1);
          transform: translateY(-2px);
        }

        .benefit-step__title {
          font-family: var(--font-body);
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--muted);
          margin-bottom: 2px;
        }

        .benefit-step__title--highlight {
          color: var(--accent);
        }

        .benefit-step__desc {
          font-family: var(--font-head);
          font-weight: 700;
          font-size: 13px;
          color: var(--text);
          line-height: 1.3;
        }

        @media (max-width: 1024px) {
          .interactive-score-container {
            grid-template-columns: 1fr;
            gap: 40px;
          }
        }

        @media (max-width: 768px) {
          .interactive-score-section {
            padding: 60px 20px;
          }
          
          .score-info-panel {
            padding: 36px;
          }

          .climb-widget-panel {
            padding: 36px 20px;
          }

          .climb-widget-body {
            flex-direction: column;
            gap: 40px;
          }

          .score-panel {
            width: 100%;
            height: auto;
            flex-direction: row;
            gap: 12px;
            justify-content: center;
          }

          .score-panel__value {
            font-size: 36px;
          }

          .score-panel__label {
            margin-top: 0;
          }

          .benefit-ladder {
            width: 100%;
          }
        }
      `}</style>
    </section>
  )
}
