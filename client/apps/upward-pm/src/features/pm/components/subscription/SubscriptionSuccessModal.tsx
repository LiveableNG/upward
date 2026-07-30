import React from 'react';
import { Modal } from '@/components/ui/Modal/Modal';
import { CheckCircle2 } from 'lucide-react';

interface SubscriptionSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  balance: number;
  isCheckout?: boolean;
  isSufficient?: boolean;
  tierName?: string;
  minRequiredDeposit?: number;
  onActivatePlan?: () => void;
  isSelectingTier?: boolean;
}

export function SubscriptionSuccessModal({
  isOpen,
  onClose,
  amount,
  balance,
  isCheckout = false,
  isSufficient = false,
  tierName = '',
  minRequiredDeposit = 0,
  onActivatePlan,
  isSelectingTier = false,
}: SubscriptionSuccessModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Deposit Received! 🎉"
      maxWidth={440}
    >
      <div style={{ textAlign: 'center', padding: '16px 8px' }}>
        <CheckCircle2 size={56} color="var(--forest)" style={{ margin: '0 auto 20px' }} />
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#1A1A17' }}>
          ₦{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Added
        </h3>
        
        {isCheckout ? (
          isSufficient ? (
            <>
              <p style={{ color: '#5D5954', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
                Your payment was successfully received! Your wallet balance has been updated to <strong>₦{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>, which is sufficient to fund this subscription.
                <br /><br />
                Do you want to activate the <strong>{tierName}</strong> plan now?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button 
                  className="btn-checkout-primary"
                  onClick={() => {
                    onClose();
                    if (onActivatePlan) onActivatePlan();
                  }}
                  disabled={isSelectingTier}
                >
                  {isSelectingTier ? 'Activating plan...' : 'Yes, Activate Subscription Plan'}
                </button>
                <button 
                  className="btn-checkout-secondary"
                  onClick={onClose}
                >
                  No, Keep in Wallet
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ color: '#5D5954', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
                Your payment was successfully received. Your wallet balance has been updated to <strong>₦{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>.
                <br /><br />
                Note: An additional deposit of <strong>₦{Math.max(0, minRequiredDeposit - balance).toLocaleString()}</strong> is still required to meet the minimum required deposit for this plan.
              </p>
              <button 
                className="btn-checkout-primary"
                onClick={onClose}
              >
                Close Window
              </button>
            </>
          )
        ) : (
          <>
            <p style={{ color: '#5D5954', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
              Your transaction was successfully processed. Your wallet balance has been updated to <strong>₦{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>.
            </p>
            <button 
              className="btn-checkout-primary"
              onClick={onClose}
            >
              Go to Wallet
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
