import React from 'react'
import { OrdersListScreen } from '@/features/goals/components/OrdersListScreen'

export const metadata = {
  title: 'My Orders & Fulfillment | Upward',
  description: 'Track your lifestyle marketplace orders and service appointments',
}

export default function LifestyleOrdersPage() {
  return <OrdersListScreen />
}
