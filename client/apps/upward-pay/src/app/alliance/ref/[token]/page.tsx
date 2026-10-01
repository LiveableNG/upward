import { Suspense } from 'react';
import FallbackSuspense from '@/components/FallbackSuspense';
import { AllianceReferralRedirectClient } from './AllianceReferralRedirectClient';

export function generateStaticParams() {
  return [{ token: 'placeholder' }];
}

export default function AllianceReferralRedirectPage() {
  return (
    <Suspense fallback={<FallbackSuspense message="Resolving referral..." />}>
      <AllianceReferralRedirectClient />
    </Suspense>
  );
}
