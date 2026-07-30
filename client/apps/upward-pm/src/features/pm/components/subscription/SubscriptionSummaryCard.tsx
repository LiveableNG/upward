import React from 'react';
import { Sparkles } from 'lucide-react';

interface SubscriptionSummaryCardProps {
  tier: 'TIER_2' | 'TIER_3';
  unitCount: number;
  yearlyRate: number;
  billingMode: 'active' | 'all';
  onEditClick: () => void;
}

export function SubscriptionSummaryCard({
  tier,
  unitCount,
  yearlyRate,
  billingMode,
  onEditClick,
}: SubscriptionSummaryCardProps) {
  return (
    <div className="checkout-card">
      <div className="sub-summary-container">
        <div className="sub-summary-info" style={{ width: '100%' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            {tier === 'TIER_3' ? 'Enterprise Tier' : 'Professional Tier'}
            <span className={`checkout-tier-badge ${tier === 'TIER_3' ? 'checkout-tier-badge--tier3' : ''}`}>
              <Sparkles size={12} /> {tier === 'TIER_3' ? 'Tier 3' : 'Tier 2'}
            </span>
            <span className="checkout-tier-badge" style={{ background: '#EEEFF9', color: '#4E53A2', borderColor: 'rgba(78, 83, 162, 0.1)' }}>
              {billingMode === 'all' ? 'All Units Billing' : 'Active Units Billing'}
            </span>
            <button
              onClick={onEditClick}
              className="copy-pill-button"
              style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 700, marginLeft: 8, height: 'auto' }}
            >
              Change Plan
            </button>
          </h3>
          <p>
            {tier === 'TIER_3' 
              ? 'Designed for large-scale portfolios with complete feature capabilities.' 
              : 'Best for professional property managers scaling their business operations.'}
          </p>
        </div>
        <div className="sub-summary-price" style={{ flexShrink: 0, textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
          {tier === 'TIER_3' ? (
            <>
              <span style={{ textDecoration: 'line-through', color: '#EF4444', fontSize: '13px', fontWeight: 600, marginBottom: 2 }}>
                ₦{(unitCount * 3000).toLocaleString()}
              </span>
              <span className="amount">₦{(unitCount * 2250).toLocaleString()}</span>
            </>
          ) : (
            <span className="amount">₦{(unitCount * yearlyRate).toLocaleString()}</span>
          )}
          <span className="term" style={{ marginTop: 2 }}>per year ({unitCount} {unitCount === 1 ? 'Unit' : 'Units'})</span>
        </div>
      </div>
    </div>
  );
}
