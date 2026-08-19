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
import { api } from '@/lib/api';
import { useUnits } from '@/features/pm/hooks/useProperties';
import { useAuth } from '@/features/auth/AuthContext';
import { SubscriptionTier } from '@/features/pm/types/subscription';
import { Modal } from '@/components/ui/Modal/Modal';
import { useToast } from '@/components/common/Toast';
import { useQueryClient } from '@tanstack/react-query';
import { PlanSelectionCard } from '@/features/pm/components/subscription/PlanSelectionCard';
import { SubscriptionSummaryCard } from '@/features/pm/components/subscription/SubscriptionSummaryCard';
import { BillingConfigurationCard } from '@/features/pm/components/subscription/BillingConfigurationCard';
import { PricingBreakdownCard } from '@/features/pm/components/subscription/PricingBreakdownCard';
import { OrderSummaryCard } from '@/features/pm/components/subscription/OrderSummaryCard';
import { SubscriptionSuccessModal } from '@/features/pm/components/subscription/SubscriptionSuccessModal';
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
  const [paying, setPaying] = useState(false);

  // Polling states
  const [isPolling, setIsPolling] = useState(false);
  const [pollInitialBalance, setPollInitialBalance] = useState<number | null>(null);

  // Success modal state
  const [successModalData, setSuccessModalData] = useState<{
    isOpen: boolean;
    amount: number;
    balance: number;
    isSufficient: boolean;
  } | null>(null);

  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const { success, error, info } = useToast();
  const queryClient = useQueryClient();

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

  // Minimum required deposit: Math.max(₦50,000, unitCount * yearlyRate)
  const minRequiredDeposit = Math.max(50000, unitCount * yearlyRate);
  const currentBalance = wallet?.balance ?? 0;
  const deficit = Math.max(0, minRequiredDeposit - currentBalance);
  const isBalanceSufficient = currentBalance >= minRequiredDeposit;

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
          isSufficient: newBalance >= minRequiredDeposit,
        });
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isPolling, pollInitialBalance, queryClient, minRequiredDeposit]);

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
    const minRequired = deficit > 0 ? deficit : 100;
    if (isNaN(amountToTopUp) || paying) return;
    if (amountToTopUp < minRequired) {
      error(`Minimum top-up amount required to activate subscription is ₦${minRequired.toLocaleString()}`);
      return;
    }

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
              amount: Math.round(amountToTopUp * 100),
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
        { amount: amountToTopUp, reference: response.reference },
        {
          onSuccess: () => {
            setCustomTopUpAmount('');
            setSuccessModalData({
              isOpen: true,
              amount: amountToTopUp,
              balance: currentBalance + amountToTopUp,
              isSufficient: currentBalance + amountToTopUp >= minRequiredDeposit,
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
            <SubscriptionSummaryCard
              tier={tier}
              unitCount={unitCount}
              yearlyRate={yearlyRate}
              billingMode={billingMode}
              onEditClick={() => setIsConfigOpen(true)}
            />

            {/* Card 2 — Billing Configuration */}
            <BillingConfigurationCard
              billingMode={billingMode}
              occupiedUnits={occupiedUnits}
              totalUnits={totalUnits}
              yearlyRate={yearlyRate}
              unitCount={unitCount}
              onBillingModeChange={setBillingMode}
            />

            {/* Card 3 — Pricing Breakdown */}
            <PricingBreakdownCard
              unitCount={unitCount}
              yearlyRate={yearlyRate}
              tier={tier}
            />
          </div>

          {/* RIGHT COLUMN (35%) */}
          <div className="checkout-sidebar">
            <OrderSummaryCard
              unitCount={unitCount}
              yearlyRate={yearlyRate}
              minRequiredDeposit={minRequiredDeposit}
              currentBalance={currentBalance}
              deficit={deficit}
              isBalanceSufficient={isBalanceSufficient}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              customTopUpAmount={customTopUpAmount}
              onCustomTopUpAmountChange={setCustomTopUpAmount}
              paying={paying}
              onPaystackTopUp={handlePaystackTopUp}
              onActivatePlan={handleActivatePlan}
              isSelectingTier={isSelectingTier}
              dva={dva}
              isGeneratingDva={isGeneratingDva}
              isDvaLoading={isDvaLoading}
              onGenerateDva={() => generateDva()}
              isPolling={isPolling}
              onStartPolling={() => {
                setPollInitialBalance(currentBalance);
                setIsPolling(true);
                info('Started polling virtual account deposits...');
              }}
            />
          </div>
        </div>
      </div>

      {/* Configure Options Modal */}
      <Modal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        title="Configure Subscription Plan"
        maxWidth={520}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
          <PlanSelectionCard
            currentTier={tier}
            onSelectPlan={(newTier) => {
              setIsConfigOpen(false);
              router.replace(`/subscription/checkout?tier=${newTier}&billingMode=${billingMode}`);
            }}
          />
        </div>
      </Modal>

      {/* Success Modal */}
      <SubscriptionSuccessModal
        isOpen={!!successModalData?.isOpen}
        onClose={() => setSuccessModalData(null)}
        amount={successModalData?.amount ?? 0}
        balance={successModalData?.balance ?? 0}
        isCheckout={true}
        isSufficient={successModalData?.isSufficient}
        tierName={tier === 'TIER_3' ? 'Enterprise (Tier 3)' : 'Professional (Tier 2)'}
        minRequiredDeposit={minRequiredDeposit}
        onActivatePlan={handleActivatePlan}
        isSelectingTier={isSelectingTier}
      />
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
