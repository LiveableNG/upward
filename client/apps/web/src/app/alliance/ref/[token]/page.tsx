import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { fetchReferralContext } from '@/lib/alliance';
import { LegalHeader } from '@/components/layout/legal-header';
import { Footer } from '@/components/layout/footer';
import { AlertCircle, ArrowLeft } from 'lucide-react';

interface ReferralRedirectPageProps {
  params: Promise<{ token: string }>;
}

export default async function WebAllianceReferralRedirectPage({
  params,
}: ReferralRedirectPageProps) {
  const { token } = await params;
  const referralContext = await fetchReferralContext(token);

  if (referralContext?.listing?.uuid) {
    redirect(`/alliance/${referralContext.listing.uuid}?ref=${encodeURIComponent(token)}`);
  }

  return (
    <div style={{ background: '#faf9f5', minHeight: '100vh', color: '#141413' }}>
      <LegalHeader />
      <main
        style={{
          maxWidth: 600,
          margin: '0 auto',
          padding: '160px 24px 80px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: '#fee2e2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <AlertCircle size={28} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 10px' }}>
          Invalid or Expired Referral Link
        </h1>
        <p style={{ fontSize: 14, color: '#685c49', margin: '0 0 28px', lineHeight: 1.6 }}>
          This referral link is no longer active or the property listing is no longer published.
        </p>
        <Link
          href="/alliance"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 24px',
            borderRadius: 12,
            background: '#141413',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} />
          <span>Browse Alliance Marketplace</span>
        </Link>
      </main>
      <Footer />
    </div>
  );
}
