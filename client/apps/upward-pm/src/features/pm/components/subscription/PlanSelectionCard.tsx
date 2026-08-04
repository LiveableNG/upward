import React from 'react';

interface PlanSelectionCardProps {
  currentTier: 'TIER_2' | 'TIER_3';
  onSelectPlan: (tier: 'TIER_2' | 'TIER_3') => void;
}

export function PlanSelectionCard({
  currentTier,
  onSelectPlan,
}: PlanSelectionCardProps) {
  return (
    <div className="billing-mode-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div 
        className={`billing-mode-card ${currentTier === 'TIER_2' ? 'billing-mode-card--active' : ''}`}
        onClick={() => onSelectPlan('TIER_2')}
        style={{ cursor: 'pointer' }}
      >
        <div className="billing-mode-radio-circle">
          <div className="billing-mode-radio-inner" />
        </div>
        <div className="billing-mode-details">
          <span className="billing-mode-name" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Professional Plan (Tier 2)</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--forest, #166534)' }}>₦1,500/yr per unit</span>
          </span>
          <span className="billing-mode-desc">Best for scaling professional property managers</span>
        </div>
      </div>

      <div 
        className={`billing-mode-card ${currentTier === 'TIER_3' ? 'billing-mode-card--active' : ''}`}
        onClick={() => onSelectPlan('TIER_3')}
        style={{ cursor: 'pointer' }}
      >
        <div className="billing-mode-radio-circle">
          <div className="billing-mode-radio-inner" />
        </div>
        <div className="billing-mode-details">
          <span className="billing-mode-name" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>Enterprise Plan (Tier 3)</span>
            <span style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ textDecoration: 'line-through', color: '#EF4444', fontSize: 11 }}>₦3,000</span>
              <span style={{ color: 'var(--forest, #166534)' }}>₦2,250/yr per unit</span>
            </span>
          </span>
          <span className="billing-mode-desc">Designed for large-scale portfolios with complete capabilities</span>
        </div>
      </div>
    </div>
  );
}
