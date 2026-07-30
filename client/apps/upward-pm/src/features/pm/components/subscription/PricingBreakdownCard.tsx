import React from 'react';

interface PricingBreakdownCardProps {
  unitCount: number;
  yearlyRate: number;
  tier: 'TIER_2' | 'TIER_3';
}

export function PricingBreakdownCard({
  unitCount,
  yearlyRate,
  tier,
}: PricingBreakdownCardProps) {
  const baseRate = tier === 'TIER_3' ? 3000 : 1500;
  const subtotal = unitCount * baseRate;
  const discount = tier === 'TIER_3' ? unitCount * (3000 - 2250) : 0;
  const total = subtotal - discount;

  return (
    <div className="checkout-card">
      <div className="checkout-card__title">
        <span>Pricing Breakdown</span>
      </div>

      <div className="checkout-breakdown">
        <div className="checkout-breakdown__row">
          <span className="checkout-breakdown__label">Subtotal</span>
          <span className="checkout-breakdown__value">₦{subtotal.toLocaleString()} / year</span>
        </div>
        
        {discount > 0 && (
          <div className="checkout-breakdown__row" style={{ color: 'var(--forest, #166534)' }}>
            <span className="checkout-breakdown__label">Special Promo Discount (25% off)</span>
            <span className="checkout-breakdown__value" style={{ fontWeight: 700 }}>
              -₦{discount.toLocaleString()} / year
            </span>
          </div>
        )}

        <div className="checkout-breakdown__row">
          <span className="checkout-breakdown__label">VAT (0%)</span>
          <span className="checkout-breakdown__value">₦0</span>
        </div>

        <div className="checkout-breakdown__row">
          <span className="checkout-breakdown__label">Total Contract Value</span>
          <span className="checkout-breakdown__value" style={{ fontWeight: 700 }}>
            ₦{total.toLocaleString()} / year
          </span>
        </div>
      </div>
    </div>
  );
}
