import React from 'react';

interface BillingConfigurationCardProps {
  billingMode: 'active' | 'all';
  occupiedUnits: number;
  totalUnits: number;
  yearlyRate: number;
  unitCount: number;
  tierName?: string;
  onBillingModeChange: (mode: 'active' | 'all') => void;
}

export function BillingConfigurationCard({
  billingMode,
  occupiedUnits,
  totalUnits,
  yearlyRate,
  unitCount,
  tierName,
  onBillingModeChange,
}: BillingConfigurationCardProps) {
  const normalizedMode = (billingMode as string)?.toLowerCase() === 'active' ? 'active' : 'all';
  const isActive = normalizedMode === 'active';
  const isAll = normalizedMode === 'all';

  return (
    <div className="checkout-card">
      <div className="checkout-card__title">
        <span>Configure your {tierName || 'Subscription'} plan</span>
      </div>

      <div className="billing-mode-cards" role="radiogroup" aria-label="Unit Billing Mode">
        <div
          className={`billing-mode-card ${isActive ? 'billing-mode-card--active' : ''}`}
          onClick={() => onBillingModeChange('active')}
          role="radio"
          aria-checked={isActive}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              onBillingModeChange('active');
            }
          }}
        >
          <div className="billing-mode-radio-circle">
            {isActive && <div className="billing-mode-radio-inner" style={{ display: 'block' }} />}
          </div>
          <div className="billing-mode-details">
            <span className="billing-mode-name">Active Units ({occupiedUnits})</span>
            <span className="billing-mode-desc">Bill only for units with active tenants</span>
          </div>
        </div>

        <div
          className={`billing-mode-card ${isAll ? 'billing-mode-card--active' : ''}`}
          onClick={() => onBillingModeChange('all')}
          role="radio"
          aria-checked={isAll}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              onBillingModeChange('all');
            }
          }}
        >
          <div className="billing-mode-radio-circle">
            {isAll && <div className="billing-mode-radio-inner" style={{ display: 'block' }} />}
          </div>
          <div className="billing-mode-details">
            <span className="billing-mode-name">All Units ({totalUnits})</span>
            <span className="billing-mode-desc">Bill for every unit regardless of occupancy</span>
          </div>
        </div>
      </div>

      <div className="checkout-breakdown">
        <div className="checkout-breakdown__row">
          <span className="checkout-breakdown__label">Price Per Unit</span>
          <span className="checkout-breakdown__value">₦{yearlyRate.toLocaleString()} / year</span>
        </div>
        <div className="checkout-breakdown__row">
          <span className="checkout-breakdown__label">Billing Frequency</span>
          <span className="checkout-breakdown__value">Yearly (Billed Monthly)</span>
        </div>
        <div className="checkout-breakdown__row">
          <span className="checkout-breakdown__label">Units Included</span>
          <span className="checkout-breakdown__value">{unitCount} units</span>
        </div>
      </div>
    </div>
  );
}
