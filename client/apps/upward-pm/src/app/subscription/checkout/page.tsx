'use client';

import React, { useState, Suspense } from 'react';
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
  Zap
} from 'lucide-react';
import { useSubscription } from '@/features/pm/hooks/useSubscription';
import { useTenants } from '@/features/pm/hooks/useTenants';
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

  const { subscription, wallet, selectTier, isSelectingTier, topUp } = useSubscription();
  const { data: tenants = [] } = useTenants();
  const { user } = useAuth();

  // Unit count calculation
  const occupiedUnits = tenants.filter((t: any) => t.status === 'ACTIVE' || t.unitStatus === 'OCCUPIED' || !!t.unitUuid).length;
  const totalUnits = tenants.length;
  const unitCount = billingMode === 'all' ? Math.max(totalUnits, 1) : occupiedUnits;

  // Pricing rates
  const yearlyRate = tier === 'TIER_3' ? 2250 : 1500;
  const monthlyRatePerUnit = yearlyRate / 12;

  // Minimum required deposit: 0 units -> flat ₦50,000, >0 units -> unitCount * rate * 6
  const minRequiredDeposit = unitCount === 0 ? 50000 : unitCount * yearlyRate * 6;
  const currentBalance = wallet?.balance ?? 0;
  const deficit = Math.max(0, minRequiredDeposit - currentBalance);
  const isBalanceSufficient = currentBalance >= minRequiredDeposit;

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

    // Perform wallet top-up
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
    <div className="checkout-container animate-fade-in">
      <div className="checkout-header">
        <button className="checkout-header__back" onClick={() => router.back()}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <h1 className="checkout-header__title">Complete Subscription Setup</h1>
        <p className="checkout-header__subtitle">
          Review your plan parameters, verify minimum wallet deposit, and activate your tier.
        </p>
      </div>

      <div className="checkout-grid">
        {/* Left Column: Plan & Deposit Breakdown */}
        <div className="checkout-main">
          {/* Plan Summary Card */}
          <div className="checkout-card">
            <div className="checkout-card__title">
              <span>Selected Plan</span>
              <span className={`checkout-tier-badge ${tier === 'TIER_3' ? 'checkout-tier-badge--tier3' : ''}`}>
                <Sparkles size={14} /> {tier === 'TIER_3' ? 'Tier 3 - Enterprise' : 'Tier 2 - Professional'}
              </span>
            </div>

            <div className="checkout-breakdown">
              <div className="checkout-breakdown__row">
                <span className="checkout-breakdown__label">Base Rate</span>
                <span className="checkout-breakdown__value">₦{yearlyRate.toLocaleString()} / unit / year</span>
              </div>
              <div className="checkout-breakdown__row">
                <span className="checkout-breakdown__label">Unit Billing Mode</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setBillingMode('active')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: billingMode === 'active' ? 'var(--clay)' : '#f8fafc',
                      color: billingMode === 'active' ? '#fff' : 'var(--text-muted)',
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    Active Only ({occupiedUnits})
                  </button>
                  <button
                    onClick={() => setBillingMode('all')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: billingMode === 'all' ? 'var(--clay)' : '#f8fafc',
                      color: billingMode === 'all' ? '#fff' : 'var(--text-muted)',
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    All Managed Units ({totalUnits})
                  </button>
                </div>
              </div>
              <div className="checkout-breakdown__row">
                <span className="checkout-breakdown__label">Estimated Monthly Rate</span>
                <span className="checkout-breakdown__value">
                  ₦{Math.round(unitCount * monthlyRatePerUnit).toLocaleString()} / month ({unitCount} units)
                </span>
              </div>
            </div>
          </div>

          {/* Deposit Rule & Wallet Status Card */}
          <div className="checkout-card">
            <div className="checkout-card__title">
              <span>Initial Deposit Validation</span>
              <ShieldCheck size={20} color="var(--clay)" />
            </div>

            <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 20 }}>
              Deposit lands directly in your company's wallet balance as a flexible top-up. Funds are never locked in a rigid contract and remain available for your monthly anniversary deductions.
            </p>

            <div className="checkout-breakdown">
              <div className="checkout-breakdown__row">
                <span className="checkout-breakdown__label">Calculation Basis</span>
                <span className="checkout-breakdown__value">
                  {unitCount === 0 ? 'No units (Flat Deposit)' : `${unitCount} units × ₦${yearlyRate.toLocaleString()} × 6`}
                </span>
              </div>
              <div className="checkout-breakdown__row">
                <span className="checkout-breakdown__label">Minimum Required Balance</span>
                <span className="checkout-breakdown__value checkout-breakdown__value--highlight">
                  ₦{minRequiredDeposit.toLocaleString()}
                </span>
              </div>
              <div className="checkout-breakdown__row">
                <span className="checkout-breakdown__label">Current Wallet Balance</span>
                <span className="checkout-breakdown__value">₦{currentBalance.toLocaleString()}</span>
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              {isBalanceSufficient ? (
                <div className="wallet-status-banner wallet-status-banner--ok">
                  <CheckCircle2 size={18} />
                  <span>Wallet balance is sufficient to activate {tier === 'TIER_3' ? 'Enterprise' : 'Professional'}.</span>
                </div>
              ) : (
                <div className="wallet-status-banner wallet-status-banner--warn">
                  <AlertCircle size={18} />
                  <span>Top-up of ₦{deficit.toLocaleString()} needed to satisfy initial deposit rule.</span>
                </div>
              )}

              <button
                className="btn-checkout-primary"
                onClick={handleActivatePlan}
                disabled={!isBalanceSufficient || isSelectingTier}
              >
                <Zap size={18} />
                {isSelectingTier ? 'Activating Plan…' : 'Activate Plan Now'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Payment Options (Top-up) */}
        <div className="checkout-side">
          <div className="checkout-card" style={{ position: 'sticky', top: 24 }}>
            <div className="checkout-card__title">
              <span>Deposit & Top-up Wallet</span>
              <WalletIcon size={18} />
            </div>

            <div className="payment-methods-tabs">
              <button
                className={`payment-tab ${paymentMethod === 'card' ? 'payment-tab--active' : ''}`}
                onClick={() => setPaymentMethod('card')}
              >
                <CreditCard size={16} /> Paystack
              </button>
              <button
                className={`payment-tab ${paymentMethod === 'bank' ? 'payment-tab--active' : ''}`}
                onClick={() => setPaymentMethod('bank')}
              >
                <Building2 size={16} /> Bank Transfer
              </button>
            </div>

            {paymentMethod === 'card' ? (
              <div className="topup-form">
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
                  Top-up Amount (₦)
                </label>
                <input
                  type="number"
                  className="topup-input"
                  placeholder={deficit > 0 ? `Minimum ₦${deficit.toLocaleString()}` : 'Enter amount e.g. 50000'}
                  value={customTopUpAmount}
                  onChange={(e) => setCustomTopUpAmount(e.target.value)}
                />
                <button
                  className="btn-checkout-primary"
                  style={{ background: '#0f172a' }}
                  onClick={handlePaystackTopUp}
                  disabled={isProcessingPayment}
                >
                  {isProcessingPayment ? 'Processing Deposit…' : 'Pay via Paystack'}
                </button>
              </div>
            ) : (
              <div>
                <div className="bank-transfer-box">
                  <div className="bank-detail-row">
                    <span>Bank Name</span>
                    <strong>Wema Bank / Upward DVA</strong>
                  </div>
                  <div className="bank-detail-row">
                    <span>Account Number</span>
                    <strong>9928374102</strong>
                  </div>
                  <div className="bank-detail-row">
                    <span>Account Name</span>
                    <strong>Upward PM - {user?.businessName || user?.firstName || 'Company Wallet'}</strong>
                  </div>
                  <div className="bank-detail-row">
                    <span>Payment Ref</span>
                    <strong>PM-{user?.id || 'REF'}-DEP</strong>
                  </div>
                </div>
                <button
                  className="btn-checkout-primary"
                  style={{ background: '#0f172a' }}
                  onClick={handlePaystackTopUp}
                  disabled={isProcessingPayment}
                >
                  Confirm Transfer Received
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="checkout-container"><p>Loading checkout...</p></div>}>
      <CheckoutContent />
    </Suspense>
  );
}
