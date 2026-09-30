import { Suspense } from 'react';
import FallbackSuspense from '@/components/FallbackSuspense';
import { AllianceListingDetailClient } from './AllianceListingDetailClient';

export function generateStaticParams() {
  return [{ uuid: 'placeholder' }];
}

export default function AllianceListingDetailPage() {
  return (
    <Suspense fallback={<FallbackSuspense message="Loading listing details..." />}>
      <AllianceListingDetailClient />
    </Suspense>
  );
}
