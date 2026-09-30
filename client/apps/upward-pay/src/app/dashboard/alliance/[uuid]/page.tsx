import { Suspense } from 'react';
import FallbackSuspense from '@/components/FallbackSuspense';
import { DashboardAllianceDetailClient } from './DashboardAllianceDetailClient';

export function generateStaticParams() {
  return [{ uuid: 'placeholder' }];
}

export default function DashboardAllianceDetailPage() {
  return (
    <Suspense fallback={<FallbackSuspense message="Loading listing details..." />}>
      <DashboardAllianceDetailClient />
    </Suspense>
  );
}
