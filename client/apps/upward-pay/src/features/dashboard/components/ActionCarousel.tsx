'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import { type PendingPayment } from '../types'

interface ActionCarouselProps {
  pendingPayments: PendingPayment[]
  showKYC: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rentReminders: any[]
  isIdentityVerified: boolean
  skin?: 'default' | 'proto'
}

type ActionUrgency = 'critical' | 'pending' | 'neutral'

interface ActionSlide {
  id: string
  type: string
  title: string
  meta: string
  actionLabel: string
  action: () => void
  urgency: ActionUrgency
}

const buildPaymentMeta = (p: PendingPayment) => {
  const remaining = p.total_amount - (p.amountPaid || 0)
  const isPartial = (p.amountPaid || 0) > 0
  const dateStr = p.due_date || p.dueDate
  const isOverdue = dateStr ? new Date(dateStr) < new Date() : false
  const amount = isPartial ? remaining : p.total_amount
  const amountStr = formatCurrency(amount, p.currency)
  const dueStr = dateStr ? formatDate(dateStr) : null

  if (isOverdue) {
    return dueStr ? `${amountStr} past due · Due ${dueStr}` : `${amountStr} past due`
  }
  if (isPartial) {
    return dueStr ? `${amountStr} remaining · Due ${dueStr}` : `${amountStr} remaining`
  }
  return dueStr ? `${amountStr} requested · Due ${dueStr}` : `${amountStr} requested`
}

const buildPaymentTitle = (p: PendingPayment) => {
  const remaining = p.total_amount - (p.amountPaid || 0)
  const isPartial = (p.amountPaid || 0) > 0
  const dateStr = p.due_date || p.dueDate
  const isOverdue = dateStr ? new Date(dateStr) < new Date() : false
  const isSelfInitiated =
    p.isManual || (!p.company_name && !p.manager_name) || p.company_name === 'Manual Payment'

  if (isSelfInitiated) {
    return isOverdue ? 'Outstanding Payment' : 'Self-initiated Payment'
  }
  if (isOverdue && isPartial) return 'Overdue Balance'
  if (isOverdue) return 'Payment Overdue'
  if (isPartial) return 'Balance Remaining'
  return 'New Invoice'
}

function ActionItem({ slide, onAction }: { slide: ActionSlide; onAction: () => void }) {
  return (
    <button
      type="button"
      className={`action-carousel__item action-carousel__item--${slide.urgency}`}
      onClick={onAction}
    >
      <span className="action-carousel__accent" aria-hidden />
      <span className="action-carousel__body">
        <span className="action-carousel__title">{slide.title}</span>
        <span className="action-carousel__meta">{slide.meta}</span>
        <span className="action-carousel__cta">
          {slide.actionLabel}
          <ArrowRight size={14} aria-hidden />
        </span>
      </span>
    </button>
  )
}

export function ActionCarousel({
  pendingPayments,
  showKYC,
  rentReminders,
  isIdentityVerified,
  skin = 'default',
}: ActionCarouselProps) {
  const router = useRouter()
  const [index, setIndex] = useState(0)

  const slides: ActionSlide[] = []

  if (!isIdentityVerified) {
    slides.push({
      type: 'identity_verification',
      id: 'verify-identity-alert',
      title: 'Verify Your Identity',
      meta: 'Required for secure payments and compliance',
      actionLabel: 'Verify Now',
      action: () => router.push('/dashboard/verify-identity'),
      urgency: 'critical',
    })
  }

  pendingPayments.forEach((p: PendingPayment) => {
    if (p.type === 'refund_alert') {
      const refundAmount = (p as PendingPayment & { amount?: number }).amount ?? p.total_amount
      slides.push({
        type: 'refund',
        id: p.uuid,
        title: 'Refund Pending',
        meta: `${formatCurrency(refundAmount, p.currency)} waiting · Add bank details`,
        actionLabel: 'Claim Refund',
        action: () => router.push('/dashboard/me?view=banking&edit=true'),
        urgency: 'critical',
      })
      return
    }

    if (p.status !== 'PAID' && (p.amountPaid || 0) < p.total_amount) {
      const dateStr = p.due_date || p.dueDate
      const isOverdue = dateStr ? new Date(dateStr) < new Date() : false

      slides.push({
        type: 'pending',
        id: p.uuid,
        title: buildPaymentTitle(p),
        meta: buildPaymentMeta(p),
        actionLabel: 'Pay Now',
        action: () => router.push(`/pay/${p.uuid}`),
        urgency: isOverdue ? 'critical' : 'pending',
      })
    }
  })

  rentReminders
    .filter((r) => r.urgency === 'overdue' || r.isCritical)
    .forEach((r) => {
      const dueStr = r.rentEndDate ? formatDate(r.rentEndDate) : null
      slides.push({
        type: 'rent_reminder',
        id: r.id,
        title: r.title || 'Rent Overdue',
        meta: dueStr
          ? `Due ${dueStr}${r.property_address ? ` · ${r.property_address}` : ''}`
          : r.property_address || 'Rent payment is past due',
        actionLabel: r.actionLabel || 'Pay Overdue Rent',
        action: r.action,
        urgency: r.urgency === 'overdue' || r.isCritical ? 'critical' : 'pending',
      })
    })

  if (slides.length === 0) {
    if (showKYC) {
      slides.push({
        type: 'kyc',
        id: 'kyc-alert',
        title: 'Complete Your Profile',
        meta: 'Add property details to build your credibility score',
        actionLabel: 'Add Property',
        action: () => router.push('/dashboard/setup'),
        urgency: 'pending',
      })
    } else {
      slides.push({
        type: 'welcome',
        id: 'welcome',
        title: 'Dashboard Active',
        meta: 'Rent tracking and credibility building are live',
        actionLabel: 'View Profile',
        action: () => router.push('/dashboard/me'),
        urgency: 'neutral',
      })
    }
  }

  const useStack = slides.length <= 3
  const current = slides[index]

  const nextSlide = () => setIndex((prev) => (prev + 1) % slides.length)
  const prevSlide = () => setIndex((prev) => (prev - 1 + slides.length) % slides.length)

  return (
    <div className={`action-carousel${skin === 'proto' ? ' action-carousel--proto' : ''}`}>
      {useStack ? (
        <div className="action-carousel__stack">
          {slides.map((slide) => (
            <ActionItem key={slide.id} slide={slide} onAction={slide.action} />
          ))}
        </div>
      ) : (
        <>
          <ActionItem slide={current} onAction={current.action} />
          <div className="action-carousel__nav">
            <button type="button" className="action-carousel__nav-btn" onClick={prevSlide} aria-label="Previous action">
              <ChevronLeft size={16} />
            </button>
            <div className="action-carousel__dots">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  className={`action-carousel__dot ${i === index ? 'action-carousel__dot--active' : ''}`}
                  onClick={() => setIndex(i)}
                  aria-label={`Go to action ${i + 1}`}
                />
              ))}
            </div>
            <button type="button" className="action-carousel__nav-btn" onClick={nextSlide} aria-label="Next action">
              <ChevronRight size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
