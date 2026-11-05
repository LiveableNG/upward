'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import {
  Truck,
  Wrench,
  Clock,
  AlertTriangle,
  ChevronRight,
  Package,
} from 'lucide-react'
import { useTenantOrders } from '../hooks/useCommerceOrders'
import type { CustomerFulfilmentStatus, TenantOrderSummaryDto } from '../types/commerce.types'

function getStatusDetails(status: CustomerFulfilmentStatus, isService: boolean) {
  switch (status) {
    case 'ORDER_CONFIRMED':
      return {
        label: isService ? 'Booking Confirmed' : 'Order Confirmed',
        description: 'Vendor received order & is preparing fulfillment',
        color: 'var(--clay)',
        bg: 'var(--clay-tint, rgba(182, 91, 55, 0.08))',
        progress: 25,
      }
    case 'PROCESSING':
      return {
        label: 'Order in Preparation',
        description: isService ? 'Service team assigned' : 'Item is being inspected and packed',
        color: 'var(--clay)',
        bg: 'var(--clay-tint, rgba(182, 91, 55, 0.08))',
        progress: 45,
      }
    case 'DISPATCHED':
      return {
        label: 'Dispatched to Carrier',
        description: 'Package handed over to delivery partner',
        color: '#0D9488',
        bg: 'rgba(13, 148, 136, 0.08)',
        progress: 65,
      }
    case 'OUT_FOR_DELIVERY':
      return {
        label: 'Out for Delivery',
        description: 'Driver is on the way to your address',
        color: '#059669',
        bg: 'rgba(5, 150, 105, 0.08)',
        progress: 85,
        pulse: true,
      }
    case 'SERVICE_SCHEDULED':
      return {
        label: 'Appointment Confirmed',
        description: 'Technician appointment scheduled',
        color: '#0D9488',
        bg: 'rgba(13, 148, 136, 0.08)',
        progress: 60,
      }
    case 'TECHNICIAN_EN_ROUTE':
      return {
        label: 'Technician En Route',
        description: 'Specialist is travelling to your location',
        color: '#059669',
        bg: 'rgba(5, 150, 105, 0.08)',
        progress: 85,
        pulse: true,
      }
    case 'DELIVERED':
    case 'SERVICE_COMPLETED':
    case 'RECEIVED_CONFIRMED':
      return {
        label: isService ? 'Service Completed' : 'Delivered',
        description: 'Fulfillment completed. Thank you!',
        color: '#10B981',
        bg: 'rgba(16, 185, 129, 0.08)',
        progress: 100,
      }
    case 'DISPUTED':
      return {
        label: 'Inquiry with Concierge',
        description: 'Upward Support investigating ticket',
        color: '#D97706',
        bg: 'rgba(217, 119, 6, 0.08)',
        progress: 50,
      }
    default:
      return {
        label: 'Order Processing',
        description: 'Awaiting next operational milestone',
        color: 'var(--text-muted)',
        bg: 'var(--bg-card)',
        progress: 30,
      }
  }
}

export function LiveOrderTrackingCard() {
  const router = useRouter()
  const { data, isLoading } = useTenantOrders({ take: 5 })

  if (isLoading || !data?.orders || data.orders.length === 0) {
    return null
  }

  // Find the most relevant active order (not cancelled/refunded and not fully received over 24h)
  const activeOrder: TenantOrderSummaryDto | undefined = data.orders.find((ord) => {
    if (['CANCELLED', 'REFUNDED'].includes(ord.status)) return false
    return ['ORDER_CONFIRMED', 'PROCESSING', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'SERVICE_SCHEDULED', 'TECHNICIAN_EN_ROUTE', 'DISPUTED'].includes(
      ord.primaryStatus,
    )
  })

  if (!activeOrder) {
    return null
  }

  const isService = activeOrder.itemsPreview.some((i) => i.offeringType === 'SERVICE')
  const statusInfo = getStatusDetails(activeOrder.primaryStatus, isService)
  const firstItem = activeOrder.itemsPreview[0]

  return (
    <div
      className="live-order-card"
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/dashboard/lifestyle/orders/${activeOrder.uuid}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          router.push(`/dashboard/lifestyle/orders/${activeOrder.uuid}`)
        }
      }}
      aria-label={`Track active order ${activeOrder.orderNumber}`}
    >
      <div className="live-order-card__header">
        <div className="live-order-card__beacon-wrap">
          <span
            className={`live-order-card__beacon ${statusInfo.pulse ? 'live-order-card__beacon--pulse' : ''}`}
            style={{ backgroundColor: statusInfo.color }}
          />
          <span className="live-order-card__tag">Live Order Activity</span>
        </div>
        <div className="live-order-card__order-number">{activeOrder.orderNumber}</div>
      </div>

      <div className="live-order-card__content">
        <div className="live-order-card__icon-wrap">
          {isService ? <Wrench size={20} color="var(--clay)" /> : <Truck size={20} color="var(--clay)" />}
        </div>
        <div className="live-order-card__info">
          <div className="live-order-card__status-title" style={{ color: statusInfo.color }}>
            {statusInfo.label}
          </div>
          <div className="live-order-card__status-desc">
            {firstItem ? `${firstItem.title} (${activeOrder.itemsCount} ${activeOrder.itemsCount === 1 ? 'item' : 'items'})` : statusInfo.description}
          </div>
        </div>
        <div className="live-order-card__action">
          <span className="live-order-card__action-text">Track</span>
          <ChevronRight size={16} />
        </div>
      </div>

      <div className="live-order-card__progress-track">
        <div
          className="live-order-card__progress-bar"
          style={{
            width: `${statusInfo.progress}%`,
            backgroundColor: statusInfo.color,
          }}
        />
      </div>
    </div>
  )
}
