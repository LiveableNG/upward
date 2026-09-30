'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAllianceReferral } from '@/features/alliance/hooks/useAllianceMarketplace';
import { Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export function AllianceReferralRedirectClient() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const { data: referralContext, isLoading, isError, error } = useAllianceReferral(token);

  useEffect(() => {
    if (referralContext?.listing?.uuid) {
      // Forward to listing detail with the ref token in searchParams
      router.replace(`/alliance/${referralContext.listing.uuid}?ref=${encodeURIComponent(token)}`);
    }
  }, [referralContext, token, router]);

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div style={{ color: 'var(--clay)', marginBottom: '16px' }}>
          <Loader2 size={36} className="animate-spin" />
        </div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 6px 0' }}>
          Resolving Your Property Referral...
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
          Connecting you directly with your verified property opportunity.
        </p>
      </div>
    );
  }

  if (isError || !referralContext) {
    return (
      <div
        className="pay-alliance-empty"
        style={{ maxWidth: '460px', margin: '80px auto' }}
      >
        <div className="pay-alliance-empty__icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
          <AlertCircle size={28} />
        </div>
        <h3 className="pay-alliance-empty__title" style={{ color: '#991b1b' }}>
          Invalid or Expired Referral Link
        </h3>
        <p className="pay-alliance-empty__desc">
          {(error as any)?.message ||
            'This referral link is no longer active or could not be found.'}
        </p>
        <Link href="/alliance" className="pay-alliance-empty__btn">
          Explore Alliance Marketplace
        </Link>
      </div>
    );
  }

  return null;
}
