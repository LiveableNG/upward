'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal/Modal';
import { useSubscription } from '@/features/pm/hooks/useSubscription';
import { api } from '@/lib/api';
import { useUnits } from '@/features/pm/hooks/useProperties';
import { useAuth } from '@/features/auth/AuthContext';
import { useToast } from '@/components/common/Toast';
import { WalletHeroCard } from '@/features/pm/components/subscription/WalletHeroCard';
import { WalletStatsRow } from '@/features/pm/components/subscription/WalletStatsRow';
import { DedicatedAccountRow } from '@/features/pm/components/subscription/DedicatedAccountRow';
import { TransactionList } from '@/features/pm/components/subscription/TransactionList';
import { SubscriptionSuccessModal } from '@/features/pm/components/subscription/SubscriptionSuccessModal';
import '@/styles/subscription-checkout.css';

export default function WalletPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { success, error, info } = useToast();
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
  const [paying, setPaying] = useState(false);
  const lastObservedBalanceRef = useRef<number | null>(null);

  // Polling states
  const [isPolling, setIsPolling] = useState(false);
  const [pollInitialBalance, setPollInitialBalance] = useState<number | null>(null);

  // Success modal state
  const [successModalData, setSuccessModalData] = useState<{
    isOpen: boolean;
    amount: number;
    balance: number;
  } | null>(null);

  useEffect(() => {
    const nextBalance = wallet?.balance ?? 0;

    if (lastObservedBalanceRef.current === null) {
      lastObservedBalanceRef.current = nextBalance;
      return;
    }

    const previousBalance = lastObservedBalanceRef.current;
    lastObservedBalanceRef.current = nextBalance;

    if (isPolling || nextBalance <= previousBalance) {
      return;
    }

    setSuccessModalData({
      isOpen: true,
      amount: nextBalance - previousBalance,
      balance: nextBalance,
    });
  }, [isPolling, wallet?.balance]);

  useEffect(() => {
    if (!isPolling) return;
    
    const interval = setInterval(async () => {
      const data = await queryClient.fetchQuery<any>({
        queryKey: ['wallet'],
        queryFn: () => api.get('/pm/wallet'),
      });
      
      const newBalance = data?.balance ?? 0;
      if (pollInitialBalance !== null && newBalance > pollInitialBalance) {
        setIsPolling(false);
        setPollInitialBalance(null);
        clearInterval(interval);
        
        // Show success modal
        setSuccessModalData({
          isOpen: true,
          amount: newBalance - pollInitialBalance,
          balance: newBalance,
        });
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isPolling, pollInitialBalance, queryClient]);

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
  const targetMin = monthlySpend * 6;
  const deficit = Math.max(0, targetMin - currentBalance);

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
    if (currentBalance >= targetMin) {
      return 'Your wallet is healthy and has sufficient coverage for the next 6+ months.';
    }
    return `Top up ₦${Math.round(deficit).toLocaleString()} to reach the recommended 6-month coverage balance.`;
  };

  const handleCopy = () => {
    if (!dva?.accountNumber) return;
    navigator.clipboard.writeText(dva.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePaystackTopUp = async () => {
    const amt = parseFloat(topUpAmount);
    if (isNaN(amt) || amt <= 0 || paying) return;
    
    try {
      setPaying(true);
      info('Launching secure checkout...');

      const response = await new Promise<any>((resolve, reject) => {
        const scriptId = 'paystack-inline-js';
        let script = document.getElementById(scriptId) as HTMLScriptElement | null;

        const launch = () => {
          try {
            const popup = new (window as any).PaystackPop();
            popup.newTransaction({
              key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
              email: user?.email,
              amount: Math.round(amt * 100),
              currency: 'NGN',
              onSuccess: (res: any) => resolve(res),
              onCancel: () => reject(new Error('Payment cancelled')),
            });
          } catch (err) {
            reject(err);
          }
        };

        if (!script) {
          script = document.createElement('script');
          script.id = scriptId;
          script.src = 'https://js.paystack.co/v2/inline.js';
          script.async = true;
          script.onload = launch;
          script.onerror = () => reject(new Error('Failed to load Paystack'));
          document.body.appendChild(script);
          return;
        }

        if ((window as any).PaystackPop) launch();
        else script.addEventListener('load', launch);
      });

      topUp(
        { amount: amt, reference: response.reference },
        {
          onSuccess: () => {
            setIsTopUpOpen(false);
            setTopUpAmount('');
            setSuccessModalData({
              isOpen: true,
              amount: amt,
              balance: currentBalance + amt,
            });
          }
        }
      );
    } catch (err: any) {
      if (err?.message === 'Payment cancelled') {
        info('Payment was cancelled');
      } else {
        error(err?.message || 'Failed to complete transaction');
      }
    } finally {
      setPaying(false);
    }
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
        <WalletHeroCard
          currentBalance={currentBalance}
          onTopUpClick={() => setIsTopUpOpen(true)}
          onManagePlanClick={() => router.push('/subscription/checkout?tier=TIER_2')}
        />

        {/* Stats Row */}
        <WalletStatsRow
          monthlySpend={monthlySpend}
          nextBillingDate={getNextBillingDate()}
          isFreeTier={isFreeTier}
          unitCount={unitCount}
          status={subscription?.status}
          tier={subscription?.tier}
        />

        {/* Info Box */}
        <div className="wallet-info-alert" style={{ 
          background: '#F2F8F3', 
          border: '1px solid rgba(22, 101, 52, 0.1)', 
          borderRadius: '16px', 
          padding: '16px 20px', 
          display: 'flex', 
          gap: '12px', 
          alignItems: 'flex-start',
          fontSize: '13px',
          color: '#2F3E32',
          lineHeight: '1.5',
          fontWeight: 500,
          marginBottom: '24px',
          marginTop: '24px'
        }}>
          <Info size={18} style={{ color: 'var(--forest)', flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Renewal Alert:</strong> {getFundingRecommendation()}
          </div>
        </div>

        <div className="wallet-dashboard-grid">
          {/* Left Column: Bank details */}
          <DedicatedAccountRow
            dva={dva}
            copied={copied}
            onCopy={handleCopy}
            generateDva={generateDva}
            isGeneratingDva={isGeneratingDva}
          />

          {/* Right Column: Transaction History */}
          <TransactionList transactions={transactions} />
        </div>

      </div>

      <Modal
        isOpen={isTopUpOpen}
        onClose={() => {
          setIsTopUpOpen(false);
        }}
        title="Top Up Wallet"
        maxWidth={480}
      >
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
              disabled={paying || !topUpAmount || parseFloat(topUpAmount) <= 0}
              style={{ marginTop: 12 }}
            >
              {paying ? 'Processing...' : 'Pay via Paystack'}
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {isPolling ? (
                    <div style={{ textAlign: 'center', padding: '12px 0', border: '1px dashed var(--border)', borderRadius: '8px', background: '#F8F7F4' }}>
                      <Clock className="animate-pulse" size={24} color="var(--forest)" style={{ margin: '0 auto 8px', display: 'inline-block' }} />
                      <p style={{ fontSize: 12, color: '#5D5954', fontWeight: 600, margin: 0 }}>Listening for payment...</p>
                      <p style={{ fontSize: 10, color: '#8A857F', margin: '4px 0 0' }}>We will credit your wallet as soon as the transfer clears.</p>
                    </div>
                  ) : (
                    <button 
                      className="btn-checkout-primary"
                      onClick={() => {
                        setPollInitialBalance(currentBalance);
                        setIsPolling(true);
                        info('Started polling virtual account deposits...');
                      }}
                    >
                      I Have Made the Payment
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Success Modal */}
      <SubscriptionSuccessModal
        isOpen={!!successModalData?.isOpen}
        onClose={() => setSuccessModalData(null)}
        amount={successModalData?.amount ?? 0}
        balance={successModalData?.balance ?? 0}
      />
    </div>
  );
}
