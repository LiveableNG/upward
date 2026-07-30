import React from 'react';
import { Clock, TrendingUp } from 'lucide-react';

interface WalletStatsRowProps {
  monthlySpend: number;
  nextBillingDate: string;
  isFreeTier: boolean;
  unitCount?: number;
  status?: string;
  tier?: string;
}

export function WalletStatsRow({
  monthlySpend,
  nextBillingDate,
  isFreeTier,
  unitCount = 0,
  status = 'ACTIVE',
  tier = 'FREE',
}: WalletStatsRowProps) {
  const getStatusDetails = () => {
    if (isFreeTier) {
      return {
        text: 'Awaiting Activation',
        color: '#8A857F',
        sub: 'Upgrade to Professional/Enterprise',
      };
    }
    
    switch (status) {
      case 'ACTIVE':
        return {
          text: 'Active Plan',
          color: '#166534',
          sub: `${tier === 'TIER_3' ? 'Enterprise (Tier 3)' : 'Professional (Tier 2)'} active`,
        };
      case 'GRACE':
        return {
          text: 'Grace Period',
          color: '#D97757',
          sub: 'Please fund wallet to renew',
        };
      case 'LOCKED':
        return {
          text: 'Locked',
          color: '#991B1B',
          sub: 'Features suspended due to unpaid invoice',
        };
      default:
        return {
          text: 'Active',
          color: '#166534',
          sub: 'Account in good standing',
        };
    }
  };

  const statusInfo = getStatusDetails();

  return (
    <div className="wallet-stats-grid">
      <div className="wallet-stat-card">
        <span className="wallet-stat-card__label">Monthly Spend</span>
        <div className="wallet-stat-card__value">
          ₦{monthlySpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <span className="wallet-stat-card__sub">{unitCount} managed units</span>
      </div>

      <div className="wallet-stat-card">
        <span className="wallet-stat-card__label">Next Billing Date</span>
        <div className="wallet-stat-card__value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={18} color="#8A857F" />
          {nextBillingDate}
        </div>
        <span className="wallet-stat-card__sub">Anniversary cycle</span>
      </div>

      <div className="wallet-stat-card">
        <span className="wallet-stat-card__label">Subscription Status</span>
        <span className="wallet-stat-card__value" style={{ color: statusInfo.color }}>
          {statusInfo.text}
        </span>
        <span className="wallet-stat-card__sub">
          {statusInfo.sub}
        </span>
      </div>
    </div>
  );
}
