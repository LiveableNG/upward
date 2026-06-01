'use client'

import { Check, Info } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface BenefitsSelectorProps {
  benefitsFee: number
  currency: string
  isOptedIn: boolean
  rentValue: number
  onToggle: (checked: boolean) => void
}

export function BenefitsSelector({
  benefitsFee,
  currency,
  isOptedIn,
  rentValue,
  onToggle
}: BenefitsSelectorProps) {
  const coverageValue = rentValue * 0.10 // 10% of rent

  return (
    <div className="benefits-card">
      <div className="benefits-card__header">
        <h4 className="benefits-card__title">Upward Benefits</h4>
        <span className="benefits-card__badge">Recommended</span>
      </div>

      <p className="benefits-card__desc">
        Protect and maximize your tenancy experience with exclusive benefits worth up to{' '}
        <strong className="highlight">{formatCurrency(coverageValue, currency)}</strong>.
      </p>

      <ul className="benefits-card__list">
        <li className="benefits-card__list-item">
          <span className="benefits-card__icon-wrap">
            <Check size={12} />
          </span>
          <span>Tenancy Credit Scoring boost</span>
        </li>
        <li className="benefits-card__list-item">
          <span className="benefits-card__icon-wrap">
            <Check size={12} />
          </span>
          <span>Zero-interest deposit emergency loans</span>
        </li>
        <li className="benefits-card__list-item">
          <span className="benefits-card__icon-wrap">
            <Check size={12} />
          </span>
          <span>Upward reward point milestones</span>
        </li>
      </ul>

      <div className="benefits-card__divider" />

      <label className={`benefits-card__toggle-wrap ${isOptedIn ? 'is-active' : ''}`}>
        <div className="benefits-card__checkbox-container">
          <input
            type="checkbox"
            className="benefits-card__hidden-checkbox"
            checked={isOptedIn}
            onChange={(e) => onToggle(e.target.checked)}
          />
          <div className="benefits-card__custom-checkbox">
            {isOptedIn && <Check size={12} className="check-icon" />}
          </div>
        </div>
        <div className="benefits-card__toggle-label">
          <span className="toggle-title">Include Upward Benefits</span>
          <span className="toggle-amount">+{formatCurrency(benefitsFee, currency)}</span>
        </div>
      </label>

      <style jsx>{`
        .benefits-card {
          background: var(--surface);
          border: 1px solid var(--border-solid);
          border-radius: 24px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.02);
          transition: all 0.3s ease;
        }
        .benefits-card:hover {
          border-color: rgba(217, 119, 87, 0.2);
          transform: translateY(-1px);
        }
        .benefits-card__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .benefits-card__title {
          font-size: 14px;
          font-weight: 850;
          color: var(--text);
          margin: 0;
        }
        .benefits-card__badge {
          font-size: 9px;
          font-weight: 800;
          background: var(--clay-faint);
          color: var(--clay);
          padding: 4px 10px;
          border-radius: 100px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .benefits-card__desc {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0 0 16px 0;
        }
        .benefits-card__desc .highlight {
          color: var(--clay);
          font-weight: 800;
        }
        .benefits-card__list {
          list-style: none;
          padding: 0;
          margin: 0 0 20px 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .benefits-card__list-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
        }
        .benefits-card__icon-wrap {
          flex-shrink: 0;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: rgba(217, 119, 87, 0.1);
          color: var(--clay);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .benefits-card__divider {
          height: 1px;
          background: var(--border-solid);
          margin: 0 -20px 16px -20px;
        }
        .benefits-card__toggle-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 16px;
          background: var(--bg);
          border: 1.5px solid var(--border-solid);
          cursor: pointer;
          transition: all 0.2s ease;
          user-select: none;
        }
        .benefits-card__toggle-wrap:hover {
          border-color: var(--text-muted);
        }
        .benefits-card__toggle-wrap.is-active {
          border-color: var(--clay);
          background: var(--clay-faint);
        }
        .benefits-card__checkbox-container {
          position: relative;
          display: flex;
          align-items: center;
        }
        .benefits-card__hidden-checkbox {
          position: absolute;
          opacity: 0;
          cursor: pointer;
          height: 0; width: 0;
        }
        .benefits-card__custom-checkbox {
          width: 20px;
          height: 20px;
          border-radius: 6px;
          border: 2px solid var(--border-solid);
          background: var(--bg);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          transition: all 0.2s ease;
        }
        .benefits-card__toggle-wrap.is-active .benefits-card__custom-checkbox {
          border-color: var(--clay);
          background: var(--clay);
        }
        .benefits-card__toggle-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex: 1;
        }
        .toggle-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--text);
        }
        .toggle-amount {
          font-size: 13px;
          font-weight: 800;
          color: var(--clay);
        }
      `}</style>
    </div>
  )
}
