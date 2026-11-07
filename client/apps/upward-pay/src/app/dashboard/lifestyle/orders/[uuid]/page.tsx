import React, { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { OrderTrackingScreen } from '@/features/goals/components/OrderTrackingScreen'
import FallbackSuspense from '@/components/FallbackSuspense'

export const metadata = {
  title: 'Live Order Tracking | Upward',
  description: 'Live order tracking and milestone timeline',
}

export function generateStaticParams() {
  return [{ uuid: 'placeholder' }]
}

export default async function LifestyleOrderTrackingPage({
  params,
}: {
  params: Promise<{ uuid: string }>
}) {
  const { uuid } = await params
  if (uuid === 'new') {
    redirect('/dashboard/lifestyle')
  }
  return (
    <Suspense fallback={<FallbackSuspense message="Loading order details…" />}>
      <OrderTrackingScreen orderUuid={uuid} />
    </Suspense>
  )
}
