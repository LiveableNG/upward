'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  Copy, 
  Check, 
  X, 
  Building2, 
  CreditCard, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  Info,
  ChevronRight,
  TrendingUp,
  Download
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal/Modal';
import { useSubscription } from '@/features/pm/hooks/useSubscription';
import { useUnits } from '@/features/pm/hooks/useProperties';
import { useAuth } from '@/features/auth/AuthContext';
import '@/styles/subscription-checkout.css';

export default function WalletPage() {
  const router = useRouter();
  const { 
    subscription,
    wallet, 
    dva, 
    transactions = [], 
    topUp, 
    isToppingUp, 
    generateDva, 
    isGeneratingDva 
  } = useSubscription();
  const { data: units = [] } = useUnits();
  const { user } = useAuth();

  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [topUpMethod, setTopUpMethod] = useState<'card' | 'bank'>('card');
  const [topUpAmount, setTopUpAmount] = useState('');
  const [copied, setCopied] = useState(false);
  const [showSentOverlay, setShowSentOverlay] = useState(false);

  // Dynamic calculations for stats row
  const occupiedUnits = units.filter((u: any) => u.status === 'OCCUPIED').length;
  const totalUnits = units.length;
  const billingMode = subscription?.unitBillingMode === 'all' ? 'all' : 'active';
  const unitCount = billingMode === 'all' ? Math.max(totalUnits, 1) : occupiedUnits;
  
  const isFreeTier = !subscription?.tier || subscription?.tier === 'FREE';
  const yearlyRate = subscription?.tier === 'TIER_3' ? 2250 : 1500;
  const monthlyRatePerUnit = yearlyRate / 12;
  const monthlySpend = isFreeTier ? 0 : unitCount * monthlyRatePerUnit;

  const currentBalance = wallet?.balance ?? 0;
  const walletStatus = isFreeTier 
    ? 'Healthy' 
    : currentBalance >= (monthlySpend * 6) 
      ? 'Healthy' 
      : currentBalance >= (monthlySpend * 2) 
        ? 'Low Balance' 
        : 'Action Required';

  const coverageMonths = isFreeTier 
    ? Infinity 
    : monthlySpend > 0 
      ? currentBalance / monthlySpend 
      : 0;

  const getNextBillingDate = () => {
    if (!subscription?.anniversaryDate) return 'N/A';
    const today = new Date();
    const nextDate = new Date();
    nextDate.setDate(subscription.anniversaryDate);
    if (nextDate < today) {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
    return nextDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const getFundingRecommendation = () => {
    if (isFreeTier) return 'Auto-renewal is paused on the Free plan. No top-up required.';
    const targetMin = monthlySpend * 6;
    if (currentBalance >= targetMin) {
      return 'Your wallet is healthy and has sufficient coverage for the next 6+ months.';
    }
    const requiredTopUp = targetMin - currentBalance;
    return `Top up ₦${Math.round(requiredTopUp).toLocaleString()} to reach the recommended 6-month coverage balance.`;
  };

  const handleCopy = () => {
    if (!dva?.accountNumber) return;
    navigator.clipboard.writeText(dva.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePaystackTopUp = () => {
    const amt = parseFloat(topUpAmount);
    if (isNaN(amt) || amt <= 0) return;
    topUp(
      { amount: amt },
      {
        onSuccess: () => {
          setIsTopUpOpen(false);
          setTopUpAmount('');
        }
      }
    );
  };

  return (
    <div className="checkout-page-wrapper animate-fade-in" style={{ padding: '32px 0' }}>
      <div className="checkout-container">
        
        {/* Wallet Page Header */}
        <div className="wallet-header">
          <div className="wallet-header__info">
            <h1>Company Wallet</h1>
            <p>Manage subscription funds, virtual account details, and payment activity.</p>
          </div>
          <button 
            className="btn-checkout-primary" 
            style={{ width: 'auto', padding: '0 24px', gap: 8 }}
            onClick={() => setIsTopUpOpen(true)}
          >
            <Plus size={18} /> Top Up Wallet
          </button>
        </div>

        {/* Hero Wallet Card */}
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
            <button className="wallet-hero-action-btn" onClick={() => setIsTopUpOpen(true)}>
              <Plus size={16} /> Top Up
            </button>
            <button className="wallet-hero-action-btn" onClick={() => router.push('/subscription/checkout?tier=TIER_2')}>
              <TrendingUp size={16} /> Manage Plan
            </button>
          </div>

          <div className="wallet-hero-card__watermark">
            <Wallet size={160} />
          </div>
        </div>

        {/* Stats Row */}
        <div className="wallet-stats-grid">
          <div className="wallet-stat-card">
            <span className="wallet-stat-card__label">Monthly Spend</span>
            <span className="wallet-stat-card__value">₦{Math.round(monthlySpend).toLocaleString()}</span>
            <span className="wallet-stat-card__sub">{unitCount} managed units</span>
          </div>

          <div className="wallet-stat-card">
            <span className="wallet-stat-card__label">Next Billing</span>
            <span className="wallet-stat-card__value">{getNextBillingDate()}</span>
            <span className="wallet-stat-card__sub">Recurring date cycle</span>
          </div>

          <div className="wallet-stat-card">
            <span className="wallet-stat-card__label">Auto Renewal</span>
            <span className="wallet-stat-card__value">{!isFreeTier ? 'Enabled' : 'Disabled'}</span>
            <span className="wallet-stat-card__sub">{!isFreeTier ? 'Continuous billing active' : 'Choose tier to activate'}</span>
          </div>
        </div>

        {/* 8-Column layout split */}
        <div className="wallet-dashboard-grid">
          
          {/* Left Column: Dedicated Funding Account details */}
          <div className="checkout-card">
            <div className="checkout-card__title">
              <span>Dedicated Funding Account</span>
              <Building2 size={20} color="var(--forest)" />
            </div>

            {!dva ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <p style={{ color: '#5D5954', marginBottom: 24, fontSize: 14, lineHeight: 1.6 }}>
                  Generate a dedicated virtual account to instantly fund your wallet via bank transfers.
                </p>
                <button 
                  className="btn-checkout-primary"
                  onClick={() => generateDva()}
                  disabled={isGeneratingDva}
                  style={{ width: 'auto', padding: '0 24px' }}
                >
                  {isGeneratingDva ? 'Generating account...' : 'Generate Bank Account'}
                </button>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 13, color: '#5D5954', lineHeight: 1.6, marginBottom: 20 }}>
                  Send transfers to this account to automatically fund your wallet. Funds will reflect in your wallet balance in real-time.
                </p>

                <div className="checkout-breakdown" style={{ marginTop: 12 }}>
                  <div className="checkout-breakdown__row">
                    <span className="checkout-breakdown__label">Bank Name</span>
                    <span className="checkout-breakdown__value">{dva.bankName}</span>
                  </div>

                  <div className="checkout-breakdown__row" style={{ padding: '12px 0' }}>
                    <span className="checkout-breakdown__label">Account Number</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="checkout-breakdown__value" style={{ fontFamily: 'monospace', fontSize: 15 }}>
                        {dva.accountNumber}
                      </span>
                      <button className="copy-pill-button" onClick={handleCopy}>
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="checkout-breakdown__row">
                    <span className="checkout-breakdown__label">Account Name</span>
                    <span className="checkout-breakdown__value">{dva.accountName}</span>
                  </div>

                  <div className="checkout-breakdown__row">
                    <span className="checkout-breakdown__label">Payment Reference</span>
                    <span className="checkout-breakdown__value" style={{ fontFamily: 'monospace' }}>
                      PM-{user?.id || 'REF'}-DEP
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11, color: '#8A857F', marginTop: 24 }}>
                  <Info size={14} style={{ flexShrink: 0 }} />
                  <span>Settlements reflect instantly. Service subject to standard banking network uptime.</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Transaction History */}
          <div className="checkout-card">
            <div className="checkout-card__title">
              <span>Recent Transactions</span>
              <Clock size={20} color="#8A857F" />
            </div>

            {transactions.length === 0 ? (
              <div className="transaction-empty-state">
                <Clock size={32} />
                <p>No recent activity recorded yet.</p>
              </div>
            ) : (
              <div className="transaction-list-container">
                {transactions.map((tx: any) => {
                  const isDeposit = tx.type === 'DEPOSIT';
                  return (
                    <div className="transaction-item" key={tx.id}>
                      <div className="transaction-item-left">
                        <div className={`transaction-icon ${isDeposit ? 'transaction-icon--deposit' : 'transaction-icon--deduction'}`}>
                          {isDeposit ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                        </div>
                        <div className="transaction-info">
                          <span className="transaction-name">{tx.narration || (isDeposit ? 'Wallet Top-up' : 'Subscription Charge')}</span>
                          <span className="transaction-meta">
                            {new Date(tx.createdAt).toLocaleDateString(undefined, { 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="transaction-item-right">
                        <span className={`transaction-amount ${isDeposit ? 'transaction-amount--plus' : 'transaction-amount--minus'}`}>
                          {isDeposit ? '+' : '-'} ₦{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <span className="transaction-reference">{tx.reference}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Top Up Modal Overlay */}
      <Modal
        isOpen={isTopUpOpen}
        onClose={() => {
          setIsTopUpOpen(false);
          setShowSentOverlay(false);
        }}
        title={showSentOverlay ? "Transfer Receipt Flagged" : "Top Up Wallet"}
        maxWidth={480}
      >
        {!showSentOverlay ? (
          <>
            <div className="payment-methods-tabs">
              <div
                className={`payment-tab ${topUpMethod === 'card' ? 'payment-tab--active' : ''}`}
                onClick={() => setTopUpMethod('card')}
              >
                <div className="payment-tab-left">
                  <CreditCard size={16} style={{ color: topUpMethod === 'card' ? 'var(--forest)' : '#8A857F' }} />
                  <span>Paystack</span>
                </div>
                <div className="payment-tab-indicator">
                  <div className="payment-tab-indicator-inner" />
                </div>
              </div>

              <div
                className={`payment-tab ${topUpMethod === 'bank' ? 'payment-tab--active' : ''}`}
                onClick={() => setTopUpMethod('bank')}
              >
                <div className="payment-tab-left">
                  <Building2 size={16} style={{ color: topUpMethod === 'bank' ? 'var(--forest)' : '#8A857F' }} />
                  <span>Bank Transfer</span>
                </div>
                <div className="payment-tab-indicator">
                  <div className="payment-tab-indicator-inner" />
                </div>
              </div>
            </div>

            {topUpMethod === 'card' ? (
              <div className="topup-form" style={{ marginTop: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#5D5954' }}>
                  Enter Top-up Amount
                </label>
                <div className="topup-input-wrapper">
                  <span className="topup-input-prefix">₦</span>
                  <input 
                    type="number" 
                    className="topup-input" 
                    placeholder="50000"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                  />
                </div>
                <button 
                  className="btn-checkout-primary"
                  onClick={handlePaystackTopUp}
                  disabled={isToppingUp}
                  style={{ marginTop: 12 }}
                >
                  {isToppingUp ? 'Processing...' : 'Pay via Paystack'}
                </button>
              </div>
            ) : (
              <div style={{ marginTop: 20 }}>
                {!dva ? (
                  <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <p style={{ color: '#5D5954', marginBottom: 20, fontSize: 13 }}>
                      You need to generate a Dedicated Virtual Account first.
                    </p>
                  </div>
                ) : (
                  <>
                    <p style={{ fontSize: 13, color: '#5D5954', lineHeight: 1.5, marginBottom: 20, textAlign: 'center' }}>
                      Transfer the desired amount to your dedicated bank account below.
                    </p>

                    <div className="bank-transfer-box" style={{ marginBottom: 24, padding: 16 }}>
                      <div className="bank-detail-row" style={{ marginBottom: 12 }}>
                        <span>Bank Name</span>
                        <strong>{dva.bankName}</strong>
                      </div>
                      <div className="bank-detail-row bank-detail-row--number" style={{ marginBottom: 12 }}>
                        <span>Account Number</span>
                        <strong>{dva.accountNumber}</strong>
                      </div>
                      <div className="bank-detail-row">
                        <span>Account Name</span>
                        <strong>{dva.accountName}</strong>
                      </div>
                    </div>

                    <button 
                      className="btn-checkout-primary"
                      onClick={() => setShowSentOverlay(true)}
                    >
                      I have sent the money
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <CheckCircle2 size={56} color="var(--forest)" style={{ margin: '0 auto 20px' }} />
            <p style={{ color: '#5D5954', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
              We are listening for the payment webhook from your bank. Your wallet balance will automatically update as soon as the funds clear!
            </p>
            <button 
              className="btn-checkout-primary"
              onClick={() => {
                setIsTopUpOpen(false);
                setShowSentOverlay(false);
              }}
            >
              Close Window
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
