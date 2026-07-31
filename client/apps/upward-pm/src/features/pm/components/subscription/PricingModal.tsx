import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Check, X, Sparkles } from 'lucide-react';
import { useSubscription } from '@/features/pm/hooks/useSubscription';
import { SubscriptionTier } from '@/features/pm/types/subscription';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import '@/styles/features/pricing-modal.css';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const router = useRouter();
  const { subscription, wallet, selectTier, isSelectingTier } = useSubscription();
  const [mounted, setMounted] = useState(false);
  const [isDowngradeConfirmOpen, setIsDowngradeConfirmOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!isOpen || !mounted) return null;

  const handleSelectTier = (tier: SubscriptionTier) => {
    if (tier === 'FREE') {
      setIsDowngradeConfirmOpen(true);
    } else {
      onClose();
      router.push(`/subscription/checkout?tier=${tier}&billingMode=active`);
    }
  };

  const getButtonProps = (tier: SubscriptionTier) => {
    const isCurrent = subscription?.tier === tier;
    const isPendingThis = subscription?.pendingTier === tier;
    const hasAnyPending = !!subscription?.pendingTier;

    if (isCurrent) {
      if (hasAnyPending) {
        return {
          label: 'Keep Current Plan',
          className: 'pricing-card__btn primary',
          disabled: isSelectingTier,
          onClick: () => selectTier({ tier: subscription.tier, billingMode: subscription.unitBillingMode }),
        };
      }
      return {
        label: 'Current Plan',
        className: 'pricing-card__btn disabled',
        disabled: true,
        onClick: () => {},
      };
    }

    if (isPendingThis) {
      return {
        label: 'Downgrade Scheduled',
        className: 'pricing-card__btn disabled',
        disabled: true,
        onClick: () => {},
      };
    }

    const isDowngrade = (tier === 'FREE') || (tier === 'TIER_2' && subscription?.tier === 'TIER_3');
    const label = isDowngrade ? 'Downgrade to ' + (tier === 'FREE' ? 'Free' : 'Professional') : 'Activate ' + (tier === 'TIER_2' ? 'Professional' : 'Enterprise');
    const className = tier === 'TIER_2' ? 'pricing-card__btn primary' : 'pricing-card__btn';

    return {
      label,
      className,
      disabled: isSelectingTier,
      onClick: () => handleSelectTier(tier),
    };
  };

  const modalContent = (
    <div className="modal-overlay">
      <div className="pricing-modal">
        <button className="pricing-modal__close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="pricing-modal__header">
          <span className="pricing-modal__badge">UPWARD PM PLAN SELECTION</span>
          <h2>Subscription Plans</h2>
          <p>Select your subscription tier to access premium features.</p>
        </div>

        {subscription?.pendingTier && (
          <div className="pricing-modal__pending-banner" style={{
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid #F59E0B',
            color: '#F59E0B',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Sparkles size={16} />
            <span>
              Your plan is scheduled to downgrade to <strong>{subscription.pendingTier === 'FREE' ? 'Free' : subscription.pendingTier === 'TIER_2' ? 'Professional' : 'Enterprise'}</strong> on your next billing date. You can cancel this by clicking <strong>Keep Current Plan</strong>.
            </span>
          </div>
        )}

        {/* 3-Tier Grid */}
        <div className="pricing-grid">
          {/* Free Tier */}
          <div className="pricing-card">
            <h3>Tier 1 - Free</h3>
            <div className="price">₦0</div>
            <ul>
              <li><Check size={14} /> Tenancy Data Upload</li>
              <li><Check size={14} /> Rent Collection</li>
              <li className="locked"><X size={14} /> Document Management</li>
              <li className="locked"><X size={14} /> Service Charge Payments</li>
              <li className="locked"><X size={14} /> Listing & Brokerage</li>
            </ul>
            {(() => {
              const btn = getButtonProps('FREE');
              return (
                <button 
                  className={btn.className}
                  disabled={btn.disabled}
                  onClick={btn.onClick}
                >
                  {btn.label}
                </button>
              );
            })()}
          </div>

          {/* Professional Tier */}
          <div className="pricing-card featured">
            <span className="card-badge">Professional</span>
            <h3>Tier 2 - Professional</h3>
            <div className="price">₦1,500<span>/unit/year</span></div>
            <div className="deposit-info">
              Flexible wallet top-up · Initial deposit applies once
            </div>
            <ul>
              <li><Check size={14} /> Tenancy Data Upload</li>
              <li><Check size={14} /> Rent Collection</li>
              <li><Check size={14} /> Document Management</li>
              <li><Check size={14} /> Service Charge Payments</li>
              <li><Check size={14} /> 30% Listing Announcements</li>
            </ul>
            {(() => {
              const btn = getButtonProps('TIER_2');
              return (
                <button 
                  className={btn.className}
                  disabled={btn.disabled}
                  onClick={btn.onClick}
                >
                  {btn.label}
                </button>
              );
            })()}
          </div>

          {/* Enterprise Tier */}
          <div className="pricing-card promo">
            <span className="card-badge">25% OFF (2 Yrs)</span>
            <h3>Tier 3 - Enterprise</h3>
            <div className="price">
              <span style={{ textDecoration: 'line-through', color: '#EF4444', fontSize: '18px', fontWeight: 600, marginRight: 8 }}>₦3,000</span>
              ₦2,250<span>/unit/year</span>
            </div>
            <div className="deposit-info">
              Flexible wallet top-up · Initial deposit applies once
            </div>
            <ul>
              <li><Check size={14} /> Tenancy Data Upload</li>
              <li><Check size={14} /> Rent Collection</li>
              <li><Check size={14} /> Document Management</li>
              <li><Check size={14} /> Service Charge Payments</li>
              <li><Check size={14} /> 100% Listing Announcements</li>
            </ul>
            {(() => {
              const btn = getButtonProps('TIER_3');
              return (
                <button 
                  className={btn.className}
                  disabled={btn.disabled}
                  onClick={btn.onClick}
                >
                  {btn.label}
                </button>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(
    <>
      {modalContent}
      <ConfirmationModal
        isOpen={isDowngradeConfirmOpen}
        onClose={() => setIsDowngradeConfirmOpen(false)}
        onConfirm={() => {
          selectTier({ tier: 'FREE', billingMode: 'active' });
          setIsDowngradeConfirmOpen(false);
        }}
        title="Confirm Scheduled Downgrade"
        message="Are you sure you want to schedule a downgrade to the Free tier? Your premium benefits will remain active until your next billing date."
        confirmText="Schedule Downgrade"
        cancelText="Keep Current Plan"
        type="primary"
        isPending={isSelectingTier}
      />
    </>,
    document.body
  );
}
