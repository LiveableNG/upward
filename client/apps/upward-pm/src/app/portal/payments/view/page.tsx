import React, { Suspense } from 'react';
import { DetailSkeleton } from '@/components/skeletons';
import ClientPage from './ClientPage';

export default function Page() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <ClientPage />
    </Suspense>
  );
}
