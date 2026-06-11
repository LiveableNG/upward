'use client'
import React, { useState } from 'react'
import { Sparkles, TrendingUp, DollarSign, Percent, ShieldCheck } from 'lucide-react'

export function GrowthSimulator() {
  const [rent, setRent] = useState(250000) // Default 250,000 Naira
  const [years, setYears] = useState(3) // Default 3 years

  // Calculate results
  const score = Math.min(880, 560 + (years * 32))
  const points = rent * 0.12 * years * 12
  const equity = rent * 12 * years * 0.08

  // Discount percentage based on score
  let discount = 0
  if (score >= 800) discount = 15
  else if (score >= 700) discount = 10
  else if (score >= 650) discount = 8
  else if (score >= 600) discount = 5
  else discount = 2

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(val)
  }

  // Format points
  const formatPoints = (val: number) => {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(val)
  }

  return (
    <section className="sim-section">
      <div className="sim-container">
        
        {/* Header */}
        <div className="sim-header">
          <div className="sim-badge">
            <Sparkles size={14} />
            <span>Interactive Tool</span>
          </div>
          <h2 className="sim-title">Simulate Your Growth</h2>
          <p className="sim-subtitle">
            Drag the sliders to estimate how your monthly rent payment and consistency can build your Rent Passport™ credentials and unlock financial advantages.
          </p>
        </div>

        {/* Dashboard Calculator */}
        <div className="sim-card">
          <div className="sim-layout">
            
            {/* Left Column: Sliders */}
            <div className="sim-sliders">
              <h3 className="sim-sidebar-title">Your Rental Inputs</h3>
              
              {/* Slider 1: Rent */}
              <div className="sim-slider-group">
                <div className="sim-slider-labels">
                  <span className="sim-slider-label">Monthly Rent</span>
                  <span className="sim-slider-value">{formatCurrency(rent)}</span>
                </div>
                <input
                  type="range"
                  min="50000"
                  max="1500000"
                  step="25000"
                  value={rent}
                  onChange={(e) => setRent(Number(e.target.value))}
                  className="sim-range-input"
                />
                <div className="sim-range-bounds">
                  <span>₦50k</span>
                  <span>₦1.5M</span>
                </div>
              </div>

              {/* Slider 2: Years */}
              <div className="sim-slider-group">
                <div className="sim-slider-labels">
                  <span className="sim-slider-label">Duration of Renting</span>
                  <span className="sim-slider-value">
                    {years} {years === 1 ? 'Year' : 'Years'}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={years}
                  onChange={(e) => setYears(Number(e.target.value))}
                  className="sim-range-input"
                />
                <div className="sim-range-bounds">
                  <span>1 Year</span>
                  <span>10 Years</span>
                </div>
              </div>

              <div className="sim-hint">
                <ShieldCheck size={16} style={{ color: 'var(--accent)' }} />
                <span>Estimates assume consistent, verified on-time payments through Upward Pay.</span>
              </div>
            </div>

            {/* Right Column: Results Dashboard */}
            <div className="sim-results">
              <h3 className="sim-results-title">Simulated Unlocks</h3>
              
              <div className="sim-stats-grid">
                
                {/* Score Widget */}
                <div className="sim-stat-box sim-stat-box--highlight">
                  <span className="sim-stat-label">Estimated Rent Score</span>
                  <div className="sim-score-wrapper">
                    <span className="sim-score-big">{score}</span>
                    <span className="sim-score-max">/900</span>
                  </div>
                  <div className="sim-score-progress-track">
                    <div 
                      className="sim-score-progress-bar"
                      style={{ width: `${(score / 900) * 100}%` }}
                    />
                  </div>
                  <span className="sim-score-tier">
                    {score >= 750 ? 'Platinum Tier' : score >= 680 ? 'Gold Tier' : 'Silver Tier'}
                  </span>
                </div>

                {/* Other Unlocks */}
                <div className="sim-substats-grid">
                  
                  {/* Points */}
                  <div className="sim-stat-box">
                    <div className="sim-stat-header">
                      <TrendingUp size={16} className="sim-stat-icon" />
                      <span className="sim-substat-label">Reward Points Earned</span>
                    </div>
                    <span className="sim-stat-value">{formatPoints(points)} pts</span>
                  </div>

                  {/* Equity */}
                  <div className="sim-stat-box">
                    <div className="sim-stat-header">
                      <DollarSign size={16} className="sim-stat-icon" />
                      <span className="sim-substat-label">Mortgage Equity Track</span>
                    </div>
                    <span className="sim-stat-value">{formatCurrency(equity)}</span>
                  </div>

                  {/* Discount */}
                  <div className="sim-stat-box">
                    <div className="sim-stat-header">
                      <Percent size={16} className="sim-stat-icon" />
                      <span className="sim-substat-label">Unlocked Rent Discount</span>
                    </div>
                    <span className="sim-stat-value">{discount}% Off</span>
                  </div>

                </div>

              </div>

              <button
                onClick={() => (window.location.href = '/signup')}
                className="sim-cta-btn"
              >
                Start Building Free
              </button>

            </div>

          </div>
        </div>

      </div>

      <style>{`
        .sim-section {
          padding: 100px 40px;
          background: var(--bg);
          position: relative;
          z-index: 1;
        }

        .sim-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 60px;
        }

        .sim-header {
          text-align: center;
          max-width: 720px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .sim-badge {
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

        .sim-title {
          font-family: var(--font-head);
          font-weight: 500;
          font-size: var(--font-h2);
          line-height: 1.15;
          letter-spacing: -0.04em;
          background: var(--heading-mix);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .sim-subtitle {
          font-size: clamp(14px, 1.4vw, 18px);
          color: var(--muted);
          line-height: 1.6;
        }

        /* Card container */
        .sim-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 28px;
          padding: 48px;
          width: 100%;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.02);
        }

        .sim-layout {
          display: grid;
          grid-template-columns: 45% 55%;
          gap: 48px;
          align-items: start;
        }

        /* Sliders block */
        .sim-sliders {
          display: flex;
          flex-direction: column;
          gap: 36px;
        }

        .sim-sidebar-title {
          font-family: var(--font-head);
          font-weight: 700;
          font-size: 20px;
          color: var(--text);
          letter-spacing: -0.02em;
        }

        .sim-slider-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .sim-slider-labels {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .sim-slider-label {
          font-size: var(--font-sm);
          color: var(--muted);
          font-weight: 600;
        }

        .sim-slider-value {
          font-family: var(--font-head);
          font-size: var(--font-lg);
          font-weight: 800;
          color: var(--accent);
        }

        /* Styled Sliders */
        .sim-range-input {
          -webkit-appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 100px;
          background: var(--surface2);
          outline: none;
          cursor: pointer;
          transition: background 0.3s;
        }

        .sim-range-input::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--accent);
          border: 3px solid var(--surface);
          box-shadow: 0 4px 10px rgba(217, 119, 87, 0.4);
          cursor: pointer;
          transition: transform 0.1s ease;
        }

        .sim-range-input::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }

        .sim-range-bounds {
          display: flex;
          justify-content: space-between;
          font-size: var(--font-xs);
          color: var(--muted);
        }

        .sim-hint {
          display: flex;
          gap: 8px;
          align-items: center;
          font-size: 12.5px;
          color: var(--muted);
          line-height: 1.4;
        }

        /* Results dashboard */
        .sim-results {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 36px;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .sim-results-title {
          font-family: var(--font-head);
          font-weight: 700;
          font-size: 20px;
          color: var(--text);
          letter-spacing: -0.02em;
        }

        .sim-stats-grid {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 20px;
          width: 100%;
        }

        .sim-stat-box {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.01);
        }

        .sim-stat-box--highlight {
          border-color: var(--accent-muted);
          background: var(--accent-faint);
          position: relative;
          overflow: hidden;
          justify-content: center;
        }

        .sim-stat-label {
          font-size: 12px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 700;
        }

        .sim-score-wrapper {
          display: flex;
          align-items: baseline;
          gap: 2px;
        }

        .sim-score-big {
          font-family: var(--font-head);
          font-size: 48px;
          font-weight: 800;
          color: var(--text);
          line-height: 1;
        }

        .sim-score-max {
          font-size: var(--font-base);
          color: var(--muted);
        }

        .sim-score-progress-track {
          width: 100%;
          height: 6px;
          background: var(--surface2);
          border-radius: 10px;
          overflow: hidden;
          margin-top: 4px;
        }

        .sim-score-progress-bar {
          height: 100%;
          background: var(--accent);
          border-radius: 10px;
          transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .sim-score-tier {
          font-size: 13px;
          font-weight: 700;
          color: var(--accent);
          letter-spacing: 0.02em;
        }

        .sim-substats-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .sim-stat-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sim-stat-icon {
          color: var(--accent);
        }

        .sim-substat-label {
          font-size: 11px;
          color: var(--muted);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .sim-stat-value {
          font-family: var(--font-head);
          font-size: 18px;
          font-weight: 800;
          color: var(--text);
        }

        .sim-cta-btn {
          width: 100%;
          padding: 18px;
          border-radius: 100px;
          background: var(--accent);
          color: var(--btn-text);
          border: none;
          font-family: var(--font-head);
          font-weight: 600;
          font-size: 15px;
          letter-spacing: 0.05em;
          cursor: pointer;
          box-shadow: 0 10px 30px rgba(217, 119, 87, 0.2);
          transition: all 0.3s ease;
          text-align: center;
        }

        .sim-cta-btn:hover {
          background: var(--swatch--clay-interactive);
          transform: translateY(-2px);
          box-shadow: 0 15px 45px rgba(217, 119, 87, 0.35);
        }

        @media (max-width: 992px) {
          .sim-layout {
            grid-template-columns: 1fr;
            gap: 40px;
          }
        }

        @media (max-width: 768px) {
          .sim-section {
            padding: 60px 20px;
          }
          .sim-card {
            padding: 24px;
          }
          .sim-stats-grid {
            grid-template-columns: 1fr;
          }
          .sim-results {
            padding: 24px;
          }
        }
      `}</style>
    </section>
  )
}
