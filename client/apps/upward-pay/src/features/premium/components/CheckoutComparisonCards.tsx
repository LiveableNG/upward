'use client'

import { ShieldCheck, Sparkles } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { PREMIUM_BENEFITS } from '../constants/premiumBenefits'
import { CHECKOUT_VARIANTS } from '../constants/checkoutVariant'
import { useCheckoutExperimentTracking } from '../hooks/useCheckoutExperimentTracking'
import { CHECKOUT_EXPERIMENT_EVENTS } from '../utils/checkoutExperimentTracking'

interface CheckoutComparisonCardsProps {
  currency: string
  transactionFee: number
  benefitsFee: number
  isPremiumSelected: boolean
  onSelectStandard: () => void
  onSelectPremium: () => void
}

export function CheckoutComparisonCards({
  currency,
  transactionFee,
  benefitsFee,
  isPremiumSelected,
  onSelectStandard,
  onSelectPremium,
}: CheckoutComparisonCardsProps) {
  const { track } = useCheckoutExperimentTracking()

  const handlePremiumClick = () => {
    track(
      CHECKOUT_EXPERIMENT_EVENTS.PREMIUM_CLICK,
      CHECKOUT_VARIANTS.PREMIUM,
      true,
    )
    onSelectPremium()
  }

  return (
    <section className="checkout-comparison-cards">
      <div className="comparison-grid">
        <button
          type="button"
          className={`comparison-option-row ${!isPremiumSelected ? 'is-selected' : ''}`}
          onClick={onSelectStandard}
        >
          <span className="comparison-option-row__radio" aria-hidden />
          <div className="comparison-option-row__content">
            <div className="comparison-option-row__top">
              <h4 className="comparison-option-row__title">Pay Rent Only</h4>
            </div>
            <p className="comparison-option-row__subtitle">Simple, fast, no extra costs.</p>
          </div>
        </button>

        <button
          type="button"
          className={`comparison-option-row comparison-option-row--premium ${isPremiumSelected ? 'is-selected' : ''}`}
          onClick={handlePremiumClick}
        >
          <span className="comparison-option-row__radio" aria-hidden />
          <div className="comparison-option-row__content">
            <div className="comparison-option-row__top">
              <h4 className="comparison-option-row__title">Pay Rent + Get Protected</h4>
              <span className="comparison-card__badge">RECOMMENDED</span>
            </div>
            <p className="comparison-option-row__subtitle">
              + {formatCurrency(benefitsFee, currency)} Rent Protection Insurance
            </p>
            <ul className="comparison-card__benefits comparison-card__benefits--inline">
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
          </div>
        </button>
      </div>

    </section>
  )
}
