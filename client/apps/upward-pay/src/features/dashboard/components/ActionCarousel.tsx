'use client'

import { ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { type PendingPayment } from '../types'
import { isSelfInitiatedPayment } from './payment/paymentOrigin'
import type { GtActivityBill } from '@/features/my-home/hooks/useMyHome'
import type { TenantOrderSummaryDto } from '@/features/goals'

interface ActionCarouselProps {
  pendingPayments: PendingPayment[]
  gtBills?: GtActivityBill[]
  showKYC: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rentReminders: any[]
  isIdentityVerified: boolean
  skin?: 'default' | 'proto'
  showBenefitsUpsell?: boolean
  benefitsEndsAt?: string | null
  activeOrder?: TenantOrderSummaryDto | null
  activeOrders?: TenantOrderSummaryDto[]
  unpaidOrder?: TenantOrderSummaryDto | null
}

type Urgency = 'critical' | 'pending' | 'neutral'

interface ActionItem {
  id: string
  type: string
  title: string
  meta: string
  actionLabel: string
  action: () => void
  urgency: Urgency
}

function formatShortDue(date: string | Date | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })
}

function parseGtBillAmount(value: string) {
  return parseFloat(value.replace(/,/g, '')) || 0
}

function buildPaymentAlert(p: PendingPayment): Pick<ActionItem, 'title' | 'meta' | 'urgency'> {
  const remaining = p.total_amount - (p.amountPaid || 0)
  const isPartial = (p.amountPaid || 0) > 0
  const dateStr = p.due_date || p.dueDate
  const isOverdue = dateStr ? new Date(dateStr) < new Date() : false
  const dueLabel = formatShortDue(dateStr)
  const duePart = dueLabel ? `Due ${dueLabel}` : ''

  if (p.latestProof) {
    if (p.latestProof.status === 'PENDING') {
      return {
        title: 'Payment In Review',
        meta: `Your uploaded proof is being reviewed${duePart ? ` · ${duePart}` : ''}`,
        urgency: 'neutral',
      }
    }
    if (p.latestProof.status === 'REJECTED') {
      return {
        title: 'Proof Rejected',
        meta: `Action needed: ${p.latestProof.remarks || 'Document was rejected'}${duePart ? ` · ${duePart}` : ''}`,
        urgency: 'critical',
      }
    }
  }

  const isSelfInitiated = isSelfInitiatedPayment(p)
  const displayAmount = isPartial ? remaining : p.total_amount
  const amountSuffix = isPartial ? ' remaining' : ''

  if (isSelfInitiated) {
    if (isOverdue) {
      return {
        title: 'Outstanding Payment',
        meta: `${formatCurrency(remaining, p.currency)} past due${duePart ? ` · ${duePart}` : ''}`,
        urgency: 'critical',
      }
    }
    return {
      title: isPartial ? 'Partial Payment Remaining' : 'Self-initiated Payment',
      meta: `${formatCurrency(displayAmount, p.currency)}${amountSuffix}${duePart ? ` · ${duePart}` : ''}`,
      urgency: 'pending',
    }
  }

  if (isOverdue && isPartial) {
    return {
      title: 'Overdue Balance',
      meta: `${formatCurrency(remaining, p.currency)} past due${duePart ? ` · ${duePart}` : ''}`,
      urgency: 'critical',
    }
  }

  if (isOverdue) {
    return {
      title: 'Payment Overdue',
      meta: `${formatCurrency(p.total_amount, p.currency)} past due${duePart ? ` · ${duePart}` : ''}`,
      urgency: 'critical',
    }
  }

  if (isPartial) {
    return {
      title: 'Balance Remaining',
      meta: `${formatCurrency(remaining, p.currency)} pending${duePart ? ` · ${duePart}` : ''}`,
      urgency: 'pending',
    }
  }

  return {
    title: 'New Invoice',
    meta: `${formatCurrency(p.total_amount, p.currency)} requested${duePart ? ` · ${duePart}` : ''}`,
    urgency: 'pending',
  }
}

export function ActionCarousel({
  pendingPayments,
  gtBills = [],
  showKYC,
  rentReminders,
  isIdentityVerified,
  skin = 'default',
  showBenefitsUpsell = false,
  activeOrder,
  activeOrders,
  unpaidOrder,
}: ActionCarouselProps) {
  const router = useRouter()
  const items: ActionItem[] = []

  const effectiveActiveOrders = activeOrders ?? (activeOrder ? [activeOrder] : [])

  if (effectiveActiveOrders.length > 1) {
    items.push({
      type: 'live_order_multiple',
      id: 'live-orders-multiple',
      title: `${effectiveActiveOrders.length} Active Orders in Progress`,
      meta: 'Multiple shipments and services underway · Track all updates',
      actionLabel: 'View All Orders',
      action: () => router.push('/dashboard/lifestyle/orders'),
      urgency: 'pending',
    })
  } else if (effectiveActiveOrders.length === 1) {
    const singleOrder = effectiveActiveOrders[0]
    const isService = (singleOrder.itemsPreview || []).some((i) => i.offeringType === 'SERVICE')
    const firstItem = (singleOrder.itemsPreview || [])[0]
    const statusLabel =
      singleOrder.primaryStatus === 'OUT_FOR_DELIVERY'
        ? 'Out for Delivery'
        : singleOrder.primaryStatus === 'TECHNICIAN_EN_ROUTE'
          ? 'Technician En Route'
          : singleOrder.primaryStatus === 'DISPATCHED'
            ? 'Dispatched to Carrier'
            : singleOrder.primaryStatus === 'PROCESSING'
              ? 'Order in Preparation'
              : singleOrder.primaryStatus === 'SERVICE_SCHEDULED'
                ? 'Service Scheduled'
                : singleOrder.primaryStatus === 'DISPUTED'
                  ? 'Inquiry Logged'
                  : isService
                    ? 'Booking Confirmed'
                    : 'Order Confirmed'

    const itemTitle = firstItem ? firstItem.title : 'Lifestyle Order'
    const count = singleOrder.itemsCount ?? (singleOrder.itemsPreview?.length || 1)
    const countBadge = count > 1 ? ` (+${count - 1} more)` : ''

    items.push({
      type: 'live_order',
      id: `live-order-${singleOrder.uuid}`,
      title: `${statusLabel} · ${singleOrder.orderNumber}`,
      meta: `${itemTitle}${countBadge} · Tracking in progress`,
      actionLabel: 'Track Live',
      action: () => router.push(`/dashboard/lifestyle/orders?uuid=${singleOrder.uuid}`),
      urgency: 'pending',
    })
  }

  if (unpaidOrder) {
    const formattedAmt = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(unpaidOrder.totalAmountKobo) / 100)

    items.push({
      type: 'unpaid_order',
      id: `unpaid-order-${unpaidOrder.uuid}`,
      title: `Payment Pending · ${unpaidOrder.orderNumber}`,
      meta: `Complete payment of ${formattedAmt} to begin merchant fulfilment`,
      actionLabel: 'Pay Now',
      action: () => router.push(`/dashboard/lifestyle/orders?uuid=${unpaidOrder.uuid}`),
      urgency: 'critical',
    })
  }

  if (!isIdentityVerified) {
    items.push({
      type: 'identity_verification',
      id: 'verify-identity-alert',
      title: 'Verify Your Identity',
      meta: 'Required for secure payments',
      actionLabel: 'Verify Now',
      action: () => router.push('/dashboard/verify-identity'),
      urgency: 'critical',
    })
  }

  pendingPayments.forEach((p: PendingPayment & { type?: string; amount?: number }) => {
    if (p.type === 'refund_alert') {
      items.push({
        type: 'refund',
        id: p.uuid,
        title: 'Refund Pending',
        meta: `${formatCurrency(p.amount, p.currency)} ready to claim`,
        actionLabel: 'Claim Refund',
        action: () => router.push('/dashboard/me?view=banking&edit=true'),
        urgency: 'critical',
      })
      return
    }

    if (p.status !== 'PAID' && (p.amountPaid || 0) < p.total_amount) {
      const alert = buildPaymentAlert(p)
      const proofPending = p.latestProof?.status === 'PENDING'
      const proofRejected = p.latestProof?.status === 'REJECTED'

      items.push({
        type: 'pending',
        id: p.uuid,
        ...alert,
        actionLabel: proofPending ? 'View status' : proofRejected ? 'Fix payment' : 'Pay Now',
        action: () => {
          if (proofPending) {
            router.push('/dashboard/pay-rent')
            return
          }
          if (proofRejected && p.userPropertyUuid) {
            router.push(`/dashboard/pay-rent?propertyUuid=${p.userPropertyUuid}`)
            return
          }
          router.push(`/dashboard/pay-rent?paymentUuid=${p.uuid}`)
        },
      })
    }
  })

  gtBills.forEach((bill) => {
    const propertyHint = bill.unitName || bill.propertyLabel
    const amount = formatCurrency(parseGtBillAmount(bill.amount), 'NGN')
    const proofRejected = bill.proof_status?.toLowerCase() === 'rejected'
    const proofPending = bill.proof_status?.toLowerCase() === 'pending'

    items.push({
      type: 'gt_bill',
      id: `gt-${bill.propertyUuid}-${bill.id}`,
      title: proofRejected ? 'Proof Rejected' : bill.reason || 'Bill from Manager',
      meta: proofRejected
        ? `Action needed on ${amount}${propertyHint ? ` · ${propertyHint}` : ''}`
        : proofPending
          ? `${amount} in review${propertyHint ? ` · ${propertyHint}` : ''}`
          : `${amount} requested${propertyHint ? ` · ${propertyHint}` : ''}`,
      actionLabel: proofPending ? 'View status' : proofRejected ? 'Retry payment' : 'Pay Now',
      action: () => router.push('/dashboard/my-home/payments'),
      urgency: proofRejected ? 'critical' : 'pending',
    })
  })

  rentReminders
    .filter((r) => r.urgency === 'overdue' || r.isCritical)
    .forEach((r) => {
      const isOverdue = r.urgency === 'overdue'
      items.push({
        type: 'reminder',
        id: r.id || r.uuid || r.title,
        title: r.title,
        meta: r.meta || r.desc || '',
        actionLabel: r.actionLabel || 'View',
        action: r.action || (() => {}),
        urgency: isOverdue || r.isCritical ? 'critical' : 'pending',
      })
    })

  if (items.length === 0) {
    if (showBenefitsUpsell) {
      items.push({
        type: 'benefits',
        id: 'benefits-upsell',
        title: 'Get Rent Protection',
        meta: 'Activate Upward Benefits for one year',
        actionLabel: 'View Benefits',
        action: () => router.push('/dashboard/benefits'),
        urgency: 'pending',
      })
    } else if (showKYC) {
      items.push({
        type: 'kyc',
        id: 'kyc-alert',
        title: 'Complete Your Profile',
        meta: 'Add property details to build your score',
        actionLabel: 'Add Property',
        action: () => router.push('/dashboard/setup'),
        urgency: 'pending',
      })
    } else {
      items.push({
        type: 'welcome',
        id: 'welcome',
        title: 'Dashboard Active',
        meta: 'Rent tracking and credibility building are on',
        actionLabel: 'View Profile',
        action: () => router.push('/dashboard/me'),
        urgency: 'neutral',
      })
    }
  } else if (showBenefitsUpsell) {
    items.push({
      type: 'benefits',
      id: 'benefits-upsell',
      title: 'Get Rent Protection',
      meta: 'Optional annual Upward Benefits cover',
      actionLabel: 'Protect Now',
      action: () => router.push('/dashboard/benefits'),
      urgency: 'neutral',
    })
  }

  const rootClass = skin === 'proto' ? 'activity-alerts activity-alerts--proto' : 'activity-alerts'

  return (
    <div className={rootClass} role="region" aria-label="Action items" data-count={items.length}>
      {items.map((item) => (
        <article
          key={item.id}
          className={`activity-alerts__item activity-alerts__item--${item.urgency} ${item.type.startsWith('live_order') ? 'activity-alerts__item--live-order' : ''} ${item.type === 'unpaid_order' ? 'activity-alerts__item--unpaid-order' : ''}`}
          onClick={item.action}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              item.action()
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="activity-alerts__body">
            <div className="activity-alerts__header-row">
              {(item.type === 'live_order' || item.type === 'live_order_multiple') && (
                <span
                  className="live-order-card__beacon live-order-card__beacon--pulse"
                  style={{ backgroundColor: '#059669', flexShrink: 0, display: 'inline-block' }}
                  aria-hidden="true"
                />
              )}
              {item.type === 'unpaid_order' && (
                <span
                  className="live-order-card__beacon"
                  style={{ backgroundColor: '#D97706', flexShrink: 0, display: 'inline-block' }}
                  aria-hidden="true"
                />
              )}
              <h4 className="activity-alerts__title">{item.title}</h4>
            </div>
            {item.meta ? <p className="activity-alerts__meta">{item.meta}</p> : null}
            <span className="activity-alerts__cta">
              {item.actionLabel}
              <ArrowRight size={14} aria-hidden />
            </span>
          </div>
        </article>
      ))}
    </div>
  )
}
