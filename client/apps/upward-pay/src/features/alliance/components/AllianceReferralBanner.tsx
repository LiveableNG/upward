'use client';

import React from 'react';
import { ShieldCheck, UserCheck } from 'lucide-react';
import { PublicPmProfile } from '../types/alliance.types';

interface AllianceReferralBannerProps {
  referringPm: PublicPmProfile;
  clientName?: string;
}

export const AllianceReferralBanner: React.FC<AllianceReferralBannerProps> = ({
  referringPm,
  clientName,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-950 backdrop-blur-sm dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
          <UserCheck className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span>Special Invitation</span>
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-xs text-emerald-800 dark:text-emerald-300">
            {clientName ? `Hello ${clientName}, this` : 'This'} opportunity was exclusively shared with you by{' '}
            <strong className="font-semibold">{referringPm.displayName}</strong>
            {referringPm.companyName ? ` (${referringPm.companyName})` : ''}.
          </p>
        </div>
      </div>
      <div className="rounded-lg bg-emerald-600/10 px-3 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
        Direct Referral Protected
      </div>
    </div>
  );
};
