import React from 'react';
import { 
  CreditCard, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  Clock 
} from 'lucide-react';

interface OrderSummaryCardProps {
  unitCount: number;
  yearlyRate: number;
  minRequiredDeposit: number;
  currentBalance: number;
  deficit: number;
  isBalanceSufficient: boolean;
  paymentMethod: 'card' | 'bank';
  onPaymentMethodChange: (method: 'card' | 'bank') => void;
  customTopUpAmount: string;
  onCustomTopUpAmountChange: (amount: string) => void;
  paying: boolean;
  onPaystackTopUp: () => void;
  onActivatePlan: () => void;
  isSelectingTier: boolean;
  dva: any;
  isGeneratingDva: boolean;
  isDvaLoading: boolean;
  onGenerateDva: () => void;
  isPolling: boolean;
  onStartPolling: () => void;
  tier: 'TIER_2' | 'TIER_3';
  currentSubscriptionTier?: string;
  isCurrentPlanActive?: boolean;
  isBillingModeChanged?: boolean;
}

export function OrderSummaryCard({
  unitCount,
  yearlyRate,
  minRequiredDeposit,
  currentBalance,
  deficit,
  isBalanceSufficient,
  paymentMethod,
  onPaymentMethodChange,
  customTopUpAmount,
  onCustomTopUpAmountChange,
  paying,
  onPaystackTopUp,
  onActivatePlan,
  isSelectingTier,
  dva,
  isGeneratingDva,
  isDvaLoading,
  onGenerateDva,
  isPolling,
  onStartPolling,
  tier,
  currentSubscriptionTier,
  isCurrentPlanActive = false,
  isBillingModeChanged = false,
}: OrderSummaryCardProps) {
  const isUpgrade = currentSubscriptionTier === 'TIER_2' && tier === 'TIER_3';
  const isDowngrade = currentSubscriptionTier === 'TIER_3' && tier === 'TIER_2';
  const effectiveDeficit = isCurrentPlanActive && !isBillingModeChanged ? 0 : deficit;

  return (
    <div className="checkout-card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div className="order-summary-title" style={{ margin: 0 }}>Order Summary</div>
        <span className="order-summary-plan-badge">
          {tier === 'TIER_3' ? 'Enterprise Plan' : 'Professional Plan'}
        </span>
      </div>
      
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
        <span className="order-summary-total-row__label">Deposit Needed</span>
        <span className="order-summary-total-row__value">₦{effectiveDeficit.toLocaleString()}</span>
      </div>

      {/* Memory Status & Actions */}
      {isCurrentPlanActive && !isBillingModeChanged ? (
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="wallet-status-banner wallet-status-banner--ok">
            <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              You are currently subscribed to the {tier === 'TIER_3' ? 'Enterprise' : 'Professional'} plan. Renewals are automatically debited from your wallet on your billing anniversary.
            </span>
          </div>
          <button 
            type="button"
            className="btn-checkout-primary" 
            disabled 
            style={{ opacity: 0.9, cursor: 'default', background: 'var(--forest, #166534)' }}
          >
            <CheckCircle2 size={16} />
            <span>Current Plan Active</span>
          </button>
        </div>
      ) : isCurrentPlanActive && isBillingModeChanged ? (
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="wallet-status-banner wallet-status-banner--ok">
            <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              Billing mode updated. Click below to save your new plan configuration.
            </span>
          </div>
          <button
            type="button"
            className="btn-checkout-primary"
            onClick={onActivatePlan}
            disabled={isSelectingTier}
          >
            <Zap size={16} />
            <span>{isSelectingTier ? 'Updating...' : 'Update Billing Configuration'}</span>
          </button>
        </div>
      ) : isDowngrade ? (
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="wallet-status-banner wallet-status-banner--warn">
            <Clock size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              Downgrading to Upward Professional will take effect at your next billing date.
            </span>
          </div>
          <button
            type="button"
            className="btn-checkout-primary"
            onClick={onActivatePlan}
            disabled={isSelectingTier}
          >
            <Clock size={16} />
            <span>{isSelectingTier ? 'Scheduling...' : 'Schedule Downgrade to Professional'}</span>
          </button>
        </div>
      ) : (
        <>
          {/* Payment Method Selector */}
          <div style={{ marginTop: 24 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A17' }}>Payment Method</span>
            <div className="payment-methods-tabs">
              <div
                className={`payment-tab ${paymentMethod === 'card' ? 'payment-tab--active' : ''}`}
                onClick={() => onPaymentMethodChange('card')}
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
                onClick={() => onPaymentMethodChange('bank')}
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

          {/* Action Fields */}
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
                    placeholder={effectiveDeficit > 0 ? `${effectiveDeficit}` : '50000'}
                    value={customTopUpAmount}
                    onChange={(e) => onCustomTopUpAmountChange(e.target.value)}
                  />
                </div>
                <p style={{ fontSize: 11, color: '#8A857F', margin: '4px 0 8px 0' }}>
                  * Minimum top-up amount required to activate subscription via Paystack is ₦{(effectiveDeficit > 0 ? effectiveDeficit : 100).toLocaleString()}.
                </p>

                {isBalanceSufficient ? (
                  <div className="wallet-status-banner wallet-status-banner--ok">
                    <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>
                      {isUpgrade
                        ? 'Sufficient wallet balance. You are ready to upgrade to Enterprise.'
                        : 'Sufficient wallet balance. You are ready to activate this tier.'}
                    </span>
                  </div>
                ) : (
                  <div className="wallet-status-banner wallet-status-banner--warn">
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>Additional deposit of ₦{effectiveDeficit.toLocaleString()} is required.</span>
                  </div>
                )}

                {!isBalanceSufficient ? (
                  <button
                    type="button"
                    className="btn-checkout-primary"
                    onClick={onPaystackTopUp}
                    disabled={paying || !customTopUpAmount || parseFloat(customTopUpAmount) < (effectiveDeficit > 0 ? effectiveDeficit : 100)}
                  >
                    <Zap size={16} />
                    {paying ? 'Processing payment...' : `Pay ₦${parseFloat(customTopUpAmount || '0').toLocaleString()}`}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-checkout-primary"
                    onClick={onActivatePlan}
                    disabled={isSelectingTier}
                  >
                    <Zap size={16} />
                    {isSelectingTier
                      ? 'Activating...'
                      : isUpgrade
                      ? 'Upgrade to Enterprise Now'
                      : 'Activate Plan Now'}
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
                      type="button"
                      className="btn-checkout-secondary"
                      onClick={onGenerateDva}
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
                    </div>
                    <p style={{ fontSize: 11, color: '#8A857F', lineHeight: 1.5, textAlign: 'center', marginTop: 12 }}>
                      All transfers sent to this account number will instantly credit your wallet balance.
                    </p>
                  </>
                )}

                {dva && (
                  <div style={{ marginTop: 16 }}>
                    {isBalanceSufficient ? (
                      <button
                        type="button"
                        className="btn-checkout-primary"
                        onClick={onActivatePlan}
                        disabled={isSelectingTier}
                      >
                        <Zap size={16} />
                        {isSelectingTier
                          ? 'Activating...'
                          : isUpgrade
                          ? 'Upgrade to Enterprise Now'
                          : 'Activate Plan Now'}
                      </button>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {isPolling ? (
                          <div style={{ textAlign: 'center', padding: '12px 0', border: '1px dashed var(--border)', borderRadius: '8px', background: '#F8F7F4' }}>
                            <Clock className="animate-pulse" size={24} color="var(--forest)" style={{ margin: '0 auto 8px', display: 'inline-block' }} />
                            <p style={{ fontSize: 12, color: '#5D5954', fontWeight: 600, margin: 0 }}>Listening for payment...</p>
                            <p style={{ fontSize: 10, color: '#8A857F', margin: '4px 0 0' }}>We will credit your wallet as soon as the transfer clears.</p>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn-checkout-primary"
                            onClick={onStartPolling}
                          >
                            I Have Made the Payment
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
