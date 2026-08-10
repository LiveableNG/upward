import React, { Suspense } from 'react'
import HomeRequestDetailRouteClient from './page.client'

export function generateStaticParams() {
  return [{ id: 'placeholder' }]
}

export default function Page({ params }: any) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      {/* @ts-ignore */}
      <HomeRequestDetailRouteClient params={params} />
    </Suspense>
  )
}

