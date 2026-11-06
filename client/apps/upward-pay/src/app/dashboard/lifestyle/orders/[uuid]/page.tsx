import React from 'react'
import { redirect } from 'next/navigation'
import { OrderTrackingScreen } from '@/features/goals/components/OrderTrackingScreen'

export const metadata = {
  title: 'Live Order Tracking | Upward',
  description: 'Live order tracking and milestone timeline',
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
  return <OrderTrackingScreen orderUuid={uuid} />
}
