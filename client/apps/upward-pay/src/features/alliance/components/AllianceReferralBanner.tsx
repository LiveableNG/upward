'use client';

import React from 'react';
import { ShieldCheck, UserCheck } from 'lucide-react';
import type { PublicPmProfile } from '../types/alliance.types';

interface AllianceReferralBannerProps {
  referringPm: PublicPmProfile;
  clientName?: string;
}

export const AllianceReferralBanner: React.FC<AllianceReferralBannerProps> = ({
  referringPm,
  clientName,
}) => {
  return (
    <div className="pay-alliance-referral-banner">
      <div className="pay-alliance-referral-banner__icon">
        <UserCheck size={18} />
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            color: 'var(--clay)',
            marginBottom: '2px',
          }}
        >
          <span>Exclusive Partner Referral</span>
          <ShieldCheck size={14} />
        </div>
        <p className="pay-alliance-referral-banner__text">
          {clientName ? `Hello ${clientName}, this` : 'This'} opportunity was exclusively shared with you by{' '}
          <strong>{referringPm.displayName}</strong>
          {referringPm.companyName ? ` (${referringPm.companyName})` : ''}.
        </p>
      </div>
      <div
        style={{
          background: 'rgba(217, 119, 87, 0.12)',
          color: 'var(--clay)',
          padding: '4px 10px',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        Direct Referral Protected
      </div>
    </div>
  );
};
