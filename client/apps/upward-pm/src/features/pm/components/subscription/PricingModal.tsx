 import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Check, X, Sparkles } from 'lucide-react';
import { useSubscription } from '@/features/pm/hooks/useSubscription';
import { SubscriptionTier } from '@/features/pm/types/subscription';
import '@/styles/features/pricing-modal.css';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const router = useRouter();
  const { subscription, wallet, selectTier, isSelectingTier } = useSubscription();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!isOpen || !mounted) return null;

  const handleSelectTier = (tier: SubscriptionTier) => {
    if (tier === 'FREE') {
      selectTier({ tier: 'FREE', billingMode: 'active' });
      onClose();
    } else {
      onClose();
      router.push(`/subscription/checkout?tier=${tier}&billingMode=active`);
    }
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
            <button 
              className={`pricing-card__btn ${subscription?.tier === 'FREE' ? 'disabled' : ''}`}
              disabled={subscription?.tier === 'FREE' || isSelectingTier}
              onClick={() => handleSelectTier('FREE')}
            >
              {subscription?.tier === 'FREE' ? 'Current Plan' : 'Downgrade to Free'}
            </button>
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
            <button 
              className={`pricing-card__btn primary ${subscription?.tier === 'TIER_2' ? 'disabled' : ''}`}
              disabled={subscription?.tier === 'TIER_2' || isSelectingTier}
              onClick={() => handleSelectTier('TIER_2')}
            >
              {subscription?.tier === 'TIER_2' ? 'Current Plan' : 'Activate Professional'}
            </button>
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
            <button 
              className={`pricing-card__btn ${subscription?.tier === 'TIER_3' ? 'disabled' : ''}`}
              disabled={subscription?.tier === 'TIER_3' || isSelectingTier}
              onClick={() => handleSelectTier('TIER_3')}
            >
              {subscription?.tier === 'TIER_3' ? 'Current Plan' : 'Activate Enterprise'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
