import React, { Suspense } from 'react';
import ClientPage from './page.client';

export function generateStaticParams() {
  return [{ uuid: 'placeholder' }];
}

export default function Page({ params }: any) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      {/* @ts-ignore */}
      <ClientPage params={params} />
    </Suspense>
  );
}
