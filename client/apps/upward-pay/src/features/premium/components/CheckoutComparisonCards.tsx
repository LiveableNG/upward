'use client'

import { ShieldCheck, Sparkles } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { PREMIUM_BENEFITS } from '../constants/premiumBenefits'

interface CheckoutComparisonCardsProps {
  currency: string
  transactionFee: number
  benefitsFee: number
  isPremiumSelected: boolean
  onSelectStandard: () => void
  onSelectPremium: () => void
  onDecideLater: () => void
}

export function CheckoutComparisonCards({
  currency,
  transactionFee,
  benefitsFee,
  isPremiumSelected,
  onSelectStandard,
  onSelectPremium,
  onDecideLater,
}: CheckoutComparisonCardsProps) {
  return (
    <section className="checkout-comparison-cards">
      <div className="comparison-grid">
        <button
          type="button"
          className={`comparison-card ${!isPremiumSelected ? 'is-selected' : ''}`}
          onClick={onSelectStandard}
        >
          <div className="comparison-card__title-row">
            <h4 className="comparison-card__title">Pay Rent Only</h4>
          </div>
          <p className="comparison-card__subtitle">Simple, fast, no extra costs.</p>
          <div className="comparison-card__price-row">
            <span>Transaction fee</span>
            <strong>{formatCurrency(transactionFee, currency)}</strong>
          </div>
        </button>

        <button
          type="button"
          className={`comparison-card comparison-card--premium ${isPremiumSelected ? 'is-selected' : ''}`}
          onClick={onSelectPremium}
        >
          <div className="comparison-card__title-row">
            <h4 className="comparison-card__title">Pay Rent + Get Protected</h4>
            <span className="comparison-card__badge">Most Popular</span>
          </div>
          <p className="comparison-card__subtitle">{PREMIUM_BENEFITS.tagline}</p>

          <div className="comparison-card__price-row">
            <span>Transaction fee</span>
            <strong>{formatCurrency(transactionFee, currency)}</strong>
          </div>
          <div className="comparison-card__price-row">
            <span>Rent Protection Insurance</span>
            <strong>+ {formatCurrency(benefitsFee, currency)}</strong>
          </div>

          <ul className="comparison-card__benefits">
            {PREMIUM_BENEFITS.items.map((item) => (
              <li key={item}>
                <ShieldCheck size={14} />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <p className="comparison-card__social-proof">
            <Sparkles size={14} />
            <span>{PREMIUM_BENEFITS.socialProof}</span>
          </p>
        </button>
      </div>

      <button type="button" className="comparison-cards__later-btn" onClick={onDecideLater}>
        Decide Later - pay rent without insurance for now
      </button>
    </section>
  )
}
