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
}: OrderSummaryCardProps) {
  return (
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
        <span className="order-summary-total-row__label">Deposit Needed</span>
        <span className="order-summary-total-row__value">₦{deficit.toLocaleString()}</span>
      </div>

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
                placeholder={deficit > 0 ? `${deficit}` : '50000'}
                value={customTopUpAmount}
                onChange={(e) => onCustomTopUpAmountChange(e.target.value)}
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
                onClick={onPaystackTopUp}
                disabled={paying || !customTopUpAmount || parseFloat(customTopUpAmount) <= 0}
              >
                <Zap size={16} />
                {paying ? 'Processing payment...' : `Pay ₦${parseFloat(customTopUpAmount || '0').toLocaleString()}`}
              </button>
            ) : (
              <button
                className="btn-checkout-primary"
                onClick={onActivatePlan}
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
                    className="btn-checkout-primary"
                    onClick={onActivatePlan}
                    disabled={isSelectingTier}
                  >
                    <Zap size={16} />
                    {isSelectingTier ? 'Activating plan...' : 'Activate Plan Now'}
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
    </div>
  );
}
