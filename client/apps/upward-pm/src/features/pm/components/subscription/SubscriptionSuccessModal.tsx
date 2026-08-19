import React, { useEffect } from 'react';
import { Modal } from '@/components/ui/Modal/Modal';
import { playSuccessChime, playActivationChime } from '@/lib/sound';

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

  useEffect(() => {
    if (!isOpen) return;
    if (isCheckout && isSufficient) {
      playActivationChime();
    } else {
      playSuccessChime();
    }
  }, [isOpen, isCheckout, isSufficient]);

  // Auto-close simple deposit modal
  useEffect(() => {
    if (!isOpen || isCheckout) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3500);
    return () => clearTimeout(timer);
  }, [isOpen, onClose, isCheckout]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Deposit Received"
      maxWidth={440}
    >
      <style>{`
        @keyframes scaleIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes drawCheck {
          0% { stroke-dashoffset: 48; }
          100% { stroke-dashoffset: 0; }
        }
        .animated-success-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #E8F5E9;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 16px auto 24px;
          box-shadow: 0 0 20px rgba(76, 175, 80, 0.2);
          animation: scaleIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
        }
        .checkmark-svg {
          width: 48px;
          height: 48px;
          stroke: #2E7D32;
          stroke-width: 4;
          stroke-linecap: round;
          stroke-linejoin: round;
          fill: none;
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          animation: drawCheck 0.6s cubic-bezier(0.65, 0, 0.45, 1) 0.3s forwards;
        }
      `}</style>
      <div style={{ textAlign: 'center', padding: '16px 8px' }}>
        <div className="animated-success-icon">
          <svg className="checkmark-svg" viewBox="0 0 24 24">
            <path d="M20 6L9 17L4 12" />
          </svg>
        </div>
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

