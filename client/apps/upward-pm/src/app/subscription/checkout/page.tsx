'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, 
  CheckCircle2, 
  ShieldCheck, 
  CreditCard, 
  Building2, 
  Sparkles, 
  Wallet as WalletIcon,
  AlertCircle,
  Zap,
  Lock,
  Percent
} from 'lucide-react';
import { UpwardLogo } from '@/components/common/UpwardLogo';
import { useSubscription } from '@/features/pm/hooks/useSubscription';
import { useUnits } from '@/features/pm/hooks/useProperties';
import { useAuth } from '@/features/auth/AuthContext';
import { SubscriptionTier } from '@/features/pm/types/subscription';
import '@/styles/subscription-checkout.css';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTier = searchParams.get('tier') as SubscriptionTier | null;
  const tier: SubscriptionTier = rawTier === 'TIER_3' ? 'TIER_3' : 'TIER_2';
  const initialMode = (searchParams.get('billingMode') as 'active' | 'all') || 'active';

  const [billingMode, setBillingMode] = useState<'active' | 'all'>(initialMode);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank'>('card');
  const [customTopUpAmount, setCustomTopUpAmount] = useState<string>('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const { subscription, wallet, selectTier, isSelectingTier, topUp, dva, isDvaLoading, generateDva, isGeneratingDva } = useSubscription();
  const { data: units = [] } = useUnits();
  const { user } = useAuth();

  // Unit count calculation
  const occupiedUnits = units.filter((u: any) => u.status === 'OCCUPIED').length;
  const totalUnits = units.length;
  const unitCount = billingMode === 'all' ? Math.max(totalUnits, 1) : occupiedUnits;

  // Pricing rates
  const yearlyRate = tier === 'TIER_3' ? 2250 : 1500;
  const monthlyRatePerUnit = yearlyRate / 12;

  // Minimum required deposit: 0 units -> flat ₦50,000, >0 units -> unitCount * rate * 6
  const minRequiredDeposit = unitCount === 0 ? 50000 : unitCount * yearlyRate * 6;
  const currentBalance = wallet?.balance ?? 0;
  const deficit = Math.max(0, minRequiredDeposit - currentBalance);
  const isBalanceSufficient = currentBalance >= minRequiredDeposit;

  // Auto-fill top-up amount with deficit when it changes
  useEffect(() => {
    if (deficit > 0) {
      setCustomTopUpAmount(String(deficit));
    } else {
      setCustomTopUpAmount('');
    }
  }, [deficit]);

  const handleActivatePlan = async () => {
    if (!isBalanceSufficient) return;
    try {
      selectTier(
        { tier, billingMode },
        {
          onSuccess: () => {
            router.push('/dashboard?subscription=activated');
          },
        }
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handlePaystackTopUp = async () => {
    const amountToTopUp = customTopUpAmount ? parseFloat(customTopUpAmount) : deficit;
    if (!amountToTopUp || amountToTopUp <= 0) return;

    setIsProcessingPayment(true);

    topUp(
      { amount: amountToTopUp },
      {
        onSuccess: () => {
          setIsProcessingPayment(false);
          setCustomTopUpAmount('');
        },
        onError: () => {
          setIsProcessingPayment(false);
        },
      }
    );
  };

  return (
    <div className="checkout-page-wrapper animate-fade-in">
      {/* Improved Header */}
      <nav className="checkout-navbar">
        <div className="checkout-navbar__left">
          <button className="checkout-navbar__back" onClick={() => router.back()}>
            <ArrowLeft size={16} /> Back
          </button>
          <div className="checkout-navbar__divider" />
          <div className="checkout-navbar__title-group">
            <span className="checkout-navbar__title">Checkout</span>
            <span className="checkout-navbar__subtitle">{tier === 'TIER_3' ? 'Enterprise Plan' : 'Professional Plan'} Selection</span>
          </div>
        </div>
        <div className="checkout-navbar__security">
          <Lock size={14} />
          <span>Secure payment protected by Upward 🔒</span>
        </div>
      </nav>

      <div className="checkout-container">
        <div className="checkout-grid">
          {/* LEFT COLUMN (65%) */}
          <div className="checkout-main">
            {/* Card 1 — Subscription Summary */}
            <div className="checkout-card">
              <div className="sub-summary-container">
                <div className="sub-summary-info">
                  <h3>
                    {tier === 'TIER_3' ? 'Enterprise Tier' : 'Professional Tier'}
                    <span className={`checkout-tier-badge ${tier === 'TIER_3' ? 'checkout-tier-badge--tier3' : ''}`}>
                      <Sparkles size={12} /> {tier === 'TIER_3' ? 'Tier 3' : 'Tier 2'}
                    </span>
                  </h3>
                  <p>
                    {tier === 'TIER_3' 
                      ? 'Designed for large-scale portfolios with complete feature capabilities.' 
                      : 'Best for professional property managers scaling their business operations.'}
                  </p>
                </div>
                <div className="sub-summary-price">
                  <span className="amount">₦{(unitCount * yearlyRate).toLocaleString()}</span>
                  <span className="term">per year ({unitCount} {unitCount === 1 ? 'Unit' : 'Units'})</span>
                </div>
              </div>
            </div>

            {/* Card 2 — Billing Configuration */}
            <div className="checkout-card">
              <div className="checkout-card__title">
                <span>Billing Configuration</span>
              </div>

              <div className="billing-mode-cards">
                <div 
                  className={`billing-mode-card ${billingMode === 'active' ? 'billing-mode-card--active' : ''}`}
                  onClick={() => setBillingMode('active')}
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
                  onClick={() => setBillingMode('all')}
                >
                  <div className="billing-mode-radio-circle">
                    <div className="billing-mode-radio-inner" />
                  </div>
                  <div className="billing-mode-details">
                    <span className="billing-mode-name">All Units ({totalUnits})</span>
                    <span className="billing-mode-desc">Bill for every unit regardless of tenant occupancy</span>
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

            {/* Card 3 — Pricing Breakdown */}
            <div className="checkout-card">
              <div className="checkout-card__title">
                <span>Pricing Breakdown</span>
              </div>

              <div className="checkout-breakdown">
                <div className="checkout-breakdown__row">
                  <span className="checkout-breakdown__label">Subtotal</span>
                  <span className="checkout-breakdown__value">₦{(unitCount * yearlyRate).toLocaleString()} / year</span>
                </div>
                <div className="checkout-breakdown__row">
                  <span className="checkout-breakdown__label">VAT (0%)</span>
                  <span className="checkout-breakdown__value">₦0</span>
                </div>
                <div className="checkout-breakdown__row">
                  <span className="checkout-breakdown__label">Total Contract Value</span>
                  <span className="checkout-breakdown__value" style={{ fontWeight: 700 }}>
                    ₦{(unitCount * yearlyRate).toLocaleString()} / year
                  </span>
                </div>
              </div>

              <div className="pricing-formula-row">
                <span>Calculation Basis</span>
                <span>{unitCount} Units × ₦{yearlyRate.toLocaleString()} = ₦{(unitCount * yearlyRate).toLocaleString()} / year</span>
              </div>
            </div>

            {/* Card 4 — Deposit Notice */}
            <div className="deposit-notice-box">
              <div className="deposit-notice-header">
                <ShieldCheck size={18} />
                <span>Minimum Wallet Deposit Required</span>
              </div>
              <p className="deposit-notice-body">
                This plan requires a minimum deposit equivalent to 6 months of subscription fees in your company wallet.
                These funds are not a locked contract — they remain in your wallet and are deducted incrementally on your monthly billing anniversary.
              </p>
              <div className="checkout-breakdown" style={{ marginTop: 8 }}>
                <div className="checkout-breakdown__row" style={{ borderColor: 'rgba(22, 101, 52, 0.1)' }}>
                  <span className="checkout-breakdown__label" style={{ color: '#2F3E32' }}>Deposit Requirement Basis</span>
                  <span className="checkout-breakdown__value" style={{ color: 'var(--forest)' }}>
                    {unitCount === 0 ? 'No units (Flat Minimum)' : `${unitCount} units × ₦${yearlyRate.toLocaleString()} × 6 months`}
                  </span>
                </div>
                <div className="checkout-breakdown__row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                  <span className="checkout-breakdown__label" style={{ color: '#2F3E32', fontWeight: 700 }}>Minimum Deposit Amount</span>
                  <span className="checkout-breakdown__value" style={{ color: 'var(--forest)', fontWeight: 800, fontSize: 16 }}>
                    ₦{minRequiredDeposit.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (35% - Sticky) */}
          <div className="checkout-side">
            <div className="checkout-card" style={{ padding: '24px' }}>
              <div className="order-summary-title">Order Summary</div>
              
              <div className="order-summary-row">
                <span className="order-summary-row__label">Annual Subscription</span>
                <span className="order-summary-row__value">₦{(unitCount * yearlyRate).toLocaleString()}</span>
              </div>
              <div className="order-summary-row">
                <span className="order-summary-row__label">Required Wallet Balance</span>
                <span className="order-summary-row__value">₦{minRequiredDeposit.toLocaleString()}</span>
              </div>
              <div className="order-summary-row">
                <span className="order-summary-row__label">Current Wallet Balance</span>
                <span className="order-summary-row__value">₦{currentBalance.toLocaleString()}</span>
              </div>

              <div className="order-summary-total-row">
                <span className="order-summary-total-row__label">Pay Today</span>
                <span className="order-summary-total-row__value">₦{minRequiredDeposit.toLocaleString()}</span>
              </div>

              {/* Payment Method Selector */}
              <div style={{ marginTop: 24 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A17' }}>Payment Method</span>
                <div className="payment-methods-tabs">
                  <div
                    className={`payment-tab ${paymentMethod === 'card' ? 'payment-tab--active' : ''}`}
                    onClick={() => setPaymentMethod('card')}
                  >
                    <div className="payment-tab-left">
                      <CreditCard size={16} style={{ color: paymentMethod === 'card' ? 'var(--forest)' : '#8A857F' }} />
                      <span>Paystack</span>
                    </div>
                    <div className="payment-tab-indicator">
                      <div className="payment-tab-indicator-inner" />
                    </div>
                  </div>

                  <div
                    className={`payment-tab ${paymentMethod === 'bank' ? 'payment-tab--active' : ''}`}
                    onClick={() => setPaymentMethod('bank')}
                  >
                    <div className="payment-tab-left">
                      <Building2 size={16} style={{ color: paymentMethod === 'bank' ? 'var(--forest)' : '#8A857F' }} />
                      <span>Bank Transfer</span>
                    </div>
                    <div className="payment-tab-indicator">
                      <div className="payment-tab-indicator-inner" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Fields (Input / DVA details / CTA Button) */}
              <div style={{ marginTop: 24 }}>
                {paymentMethod === 'card' ? (
                  <div className="topup-form">
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#5D5954' }}>
                      Top-up Amount
                    </label>
                    <div className="topup-input-wrapper">
                      <span className="topup-input-prefix">₦</span>
                      <input
                        type="number"
                        className="topup-input"
                        placeholder={deficit > 0 ? `${deficit}` : '50000'}
                        value={customTopUpAmount}
                        onChange={(e) => setCustomTopUpAmount(e.target.value)}
                      />
                    </div>

                    {isBalanceSufficient ? (
                      <div className="wallet-status-banner wallet-status-banner--ok">
                        <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span>Sufficient wallet balance. You are ready to activate this tier.</span>
                      </div>
                    ) : (
                      <div className="wallet-status-banner wallet-status-banner--warn">
                        <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span>Additional deposit of ₦{deficit.toLocaleString()} is required.</span>
                      </div>
                    )}

                    {!isBalanceSufficient ? (
                      <button
                        className="btn-checkout-primary"
                        onClick={handlePaystackTopUp}
                        disabled={isProcessingPayment || !customTopUpAmount || parseFloat(customTopUpAmount) <= 0}
                      >
                        <Zap size={16} />
                        {isProcessingPayment ? 'Processing payment...' : `Pay ₦${parseFloat(customTopUpAmount || '0').toLocaleString()}`}
                      </button>
                    ) : (
                      <button
                        className="btn-checkout-primary"
                        onClick={handleActivatePlan}
                        disabled={isSelectingTier}
                      >
                        <Zap size={16} />
                        {isSelectingTier ? 'Activating plan...' : 'Activate Plan Now'}
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    {!dva ? (
                      <div style={{ textAlign: 'center', padding: '8px 0' }}>
                        <p style={{ color: '#5D5954', marginBottom: 16, fontSize: 13, lineHeight: 1.5 }}>
                          Generate a dedicated virtual bank account to instantly fund your wallet via bank transfer.
                        </p>
                        <button
                          className="btn-checkout-secondary"
                          onClick={() => generateDva()}
                          disabled={isGeneratingDva || isDvaLoading}
                        >
                          {isGeneratingDva ? 'Generating account...' : 'Generate Bank Account'}
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="bank-transfer-box">
                          <div className="bank-detail-row">
                            <span>Bank Name</span>
                            <strong>{dva.bankName}</strong>
                          </div>
                          <div className="bank-detail-row bank-detail-row--number">
                            <span>Account Number</span>
                            <strong>{dva.accountNumber}</strong>
                          </div>
                          <div className="bank-detail-row">
                            <span>Account Name</span>
                            <strong>{dva.accountName}</strong>
                          </div>
                          <div className="bank-detail-row">
                            <span>Payment Reference</span>
                            <strong>PM-{user?.id || 'REF'}-DEP</strong>
                          </div>
                        </div>
                        <p style={{ fontSize: 11, color: '#8A857F', lineHeight: 1.5, textAlign: 'center', marginTop: 12 }}>
                          All transfers sent to this account number will instantly credit your wallet balance.
                        </p>
                      </>
                    )}

                    <div style={{ marginTop: 16 }}>
                      {isBalanceSufficient ? (
                        <button
                          className="btn-checkout-primary"
                          onClick={handleActivatePlan}
                          disabled={isSelectingTier}
                        >
                          <Zap size={16} />
                          {isSelectingTier ? 'Activating plan...' : 'Activate Plan Now'}
                        </button>
                      ) : (
                        <button
                          className="btn-checkout-primary"
                          disabled={true}
                        >
                          <Zap size={16} />
                          Awaiting Deposit
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="checkout-page-wrapper" style={{ justifyContent: 'center', alignItems: 'center' }}><p>Loading checkout...</p></div>}>
      <CheckoutContent />
    </Suspense>
  );
}
