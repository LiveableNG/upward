import React from 'react';

interface BillingConfigurationCardProps {
  billingMode: 'active' | 'all';
  occupiedUnits: number;
  totalUnits: number;
  yearlyRate: number;
  unitCount: number;
  onBillingModeChange: (mode: 'active' | 'all') => void;
}

export function BillingConfigurationCard({
  billingMode,
  occupiedUnits,
  totalUnits,
  yearlyRate,
  unitCount,
  onBillingModeChange,
}: BillingConfigurationCardProps) {
  return (
    <div className="checkout-card">
      <div className="checkout-card__title">
        <span>Billing Configuration</span>
      </div>

      <div className="billing-mode-cards">
        <div
          className={`billing-mode-card ${billingMode === 'active' ? 'billing-mode-card--active' : ''}`}
          onClick={() => onBillingModeChange('active')}
        >
          <div className="billing-mode-radio-circle">
            <div className="billing-mode-radio-inner" />
          </div>
          <div className="billing-mode-details">
            <span className="billing-mode-name">Active Units ({occupiedUnits})</span>
            <span className="billing-mode-desc">Bill only for units with active tenants</span>
          </div>
        </div>

        <div
          className={`billing-mode-card ${billingMode === 'all' ? 'billing-mode-card--active' : ''}`}
          onClick={() => onBillingModeChange('all')}
        >
          <div className="billing-mode-radio-circle">
            <div className="billing-mode-radio-inner" />
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
