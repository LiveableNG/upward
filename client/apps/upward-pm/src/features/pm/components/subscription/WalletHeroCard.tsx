import React from 'react';
import { Plus, TrendingUp } from 'lucide-react';

interface WalletHeroCardProps {
  currentBalance: number;
  onTopUpClick: () => void;
  onManagePlanClick: () => void;
}

export function WalletHeroCard({
  currentBalance,
  onTopUpClick,
  onManagePlanClick,
}: WalletHeroCardProps) {
  return (
    <div className="wallet-hero-card">
      <div className="wallet-hero-card__header">
        <div>
          <span className="wallet-hero-card__label">Available Balance</span>
          <h2 className="wallet-hero-card__balance">
            ₦{currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
        </div>
        <div className="wallet-hero-card__meta">
          <div className="wallet-hero-card__status-pill">
            <div className="wallet-hero-card__status-indicator" style={{ 
              backgroundColor: '#34D399' 
            }} />
            <span>Active Wallet</span>
          </div>
          <span className="wallet-hero-card__desc">Funds available for subscription renewals</span>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="wallet-hero-card__actions">
        <button className="wallet-hero-action-btn" onClick={onTopUpClick}>
          <Plus size={16} /> Top Up
        </button>
        <button className="wallet-hero-action-btn" onClick={onManagePlanClick}>
          <TrendingUp size={16} /> Manage Plan
        </button>
      </div>
    </div>
  );
}
