'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Clock, MapPin, Bell, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { type PendingPayment } from '../types'

interface ActionCarouselProps {
  pendingPayments: PendingPayment[]
  showKYC: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rentReminders: any[]
  isIdentityVerified: boolean
  skin?: 'default' | 'proto'
}
const buildPaymentMessage = (p: PendingPayment) => {
  const remaining = p.total_amount - (p.amountPaid || 0)
  const isPartial = (p.amountPaid || 0) > 0

  const dateStr = p.due_date || p.dueDate
  const isOverdue = dateStr ? new Date(dateStr) < new Date() : false

  const isSelfInitiated = p.isManual || (!p.company_name && !p.manager_name) || p.company_name === 'Manual Payment'

  if (isSelfInitiated) {
    if (isOverdue) {
      return {
        title: 'Outstanding Payment',
        desc: `You have an outstanding self-initiated payment of ${formatCurrency(remaining, p.currency)} for ${p.property_address || 'your property'}. Settle now to maintain your streak.`
      }
    }
    return {
      title: 'Self-initiated Payment',
      desc: `You started a payment for ${formatCurrency(p.total_amount, p.currency)} for ${p.property_address || 'your property'}. Complete this action to boost your credibility.`
    }
  }

  if (isOverdue && isPartial) {
    return {
      title: 'Overdue Balance',
      desc: `${p.company_name || p.manager_name || 'Your landlord'} is awaiting ${formatCurrency(remaining, p.currency)}. This payment is past due. Settle now to avoid further impact.`
    }
  }

  if (isOverdue) {
    return {
      title: 'Payment Overdue',
      desc: `${p.company_name || p.manager_name || 'Your landlord'} issued an invoice of ${formatCurrency(p.total_amount, p.currency)} which is now past due. Immediate payment is required.`
    }
  }

  if (isPartial) {
    return {
      title: 'Balance Remaining',
      desc: `${formatCurrency(remaining, p.currency)} is still pending for ${p.company_name || p.manager_name || 'your landlord'}. Complete payment before the deadline.`
    }
  }

  return {
    title: 'New Invoice',
    desc: `${p.company_name || p.manager_name || 'Your landlord'} requested ${formatCurrency(p.total_amount, p.currency)}. Review and complete payment before the due date.`
  }
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slides: any[] = []

  // Prepend verification warning if not verified
  if (!isIdentityVerified) {
    slides.push({
      type: 'identity_verification',
      id: 'verify-identity-alert',
      title: 'Verify Your Identity',
      desc: 'To comply with regulations and secure transactions, verify your identity using your BVN. We do not store your BVN.',
      actionLabel: 'Verify Now',
      action: () => router.push('/dashboard/verify-identity'),
      icon: <ShieldCheck size={20} color="white" />,
      bg: 'var(--error)',
      isCritical: true,
      beamClass: 'animate-beam-red',
    })
  }

  // Pending Payments & Refund Alerts
  pendingPayments.forEach((p: any) => {
    if (p.type === 'refund_alert') {
      slides.push({
        type: 'refund',
        id: p.uuid,
        title: 'Refund Pending',
        desc: `A payment of ${formatCurrency(p.amount, p.currency)} was intercepted due to a policy violation. Complete your bank details to claim your refund.`,
        actionLabel: 'Claim Refund',
        action: () => router.push('/dashboard/me?view=banking&edit=true'), // Points to banking section
        icon: <AlertCircle size={20} color="white" />,
        bg: 'var(--error)',
        isCritical: true,
        beamClass: 'animate-beam-red',
      })
      return
    }

    if (p.status !== 'PAID' && (p.amountPaid || 0) < p.total_amount) {
    const dateStr = p.due_date || p.dueDate
    const isOverdue = dateStr ? new Date(dateStr) < new Date() : false

    slides.push({
      type: 'pending',
      id: p.uuid,
      ...buildPaymentMessage(p),
      actionLabel: 'Pay Now',
      action: () => router.push(`/pay/${p.uuid}`),
      icon: <Clock size={20} color={isOverdue ? "white" : "var(--clay)"} />,
      bg: isOverdue ? 'var(--error)' : 'var(--clay-faint)',
      isCritical: isOverdue,
      beamClass: isOverdue ? 'animate-beam-red' : 'animate-beam-clay',
      })
    }
  })

  // Rent Reminders (Only if overdue)
  rentReminders
    .filter(r => r.urgency === 'overdue' || r.isCritical)
    .forEach((r) => {
      slides.push({
        ...r,
        icon: <Bell size={20} color={r.isCritical ? "white" : "var(--clay)"} />,
        beamClass: r.urgency === 'overdue' ? 'animate-beam-red' : (r.isCritical ? 'animate-beam-clay' : ''),
      })
    })

  // Fallbacks if no action items
  if (slides.length === 0) {
    if (showKYC) {
      slides.push({
        type: 'kyc',
        id: 'kyc-alert',
        title: 'Complete Your Profile',
        desc: 'Add your property details and rent due date to build your credibility score.',
        actionLabel: 'Add Property',
        action: () => router.push('/dashboard/setup'),
        icon: <MapPin size={20} color="var(--clay)" />,
        bg: 'var(--clay-faint)',
        beamClass: 'animate-beam-clay',
      })
    } else {
      slides.push({
        type: 'welcome',
        id: 'welcome',
        title: 'Dashboard Active',
        desc: 'Your rent tracking and credibility building are now active.',
        actionLabel: 'View Profile',
        action: () => router.push('/dashboard/me'),
        icon: <Bell size={20} color="var(--clay)" />,
        bg: 'var(--surface2)',
        beamClass: '',
      })
    }
  }

  const current = slides[index]

  const nextSlide = () => setIndex((prev) => (prev + 1) % slides.length)
  const prevSlide = () => setIndex((prev) => (prev - 1 + slides.length) % slides.length)

  return (
    <div className={`action-carousel${skin === 'proto' ? ' action-carousel--proto' : ''}`}>
      <div 
        className={`action-carousel__slide ${current.isCritical ? 'is-critical' : ''} ${current.type === 'pending' ? 'is-pending' : ''} ${current.beamClass || ''}`} 
        style={{ 
          cursor: 'pointer', 
          background: current.type === 'pending' && !current.isCritical ? undefined : current.bg 
        }}
        onClick={current.action}
      >
        <div className="action-carousel__icon-wrap">{current.icon}</div>
        <div className="action-carousel__content">
          <h4 className={`action-carousel__title ${current.isCritical && current.type === 'pending' ? 'animate-text-zoom' : ''}`}>{current.title}</h4>
          <p className={`action-carousel__desc ${current.isCritical && current.type === 'pending' ? 'animate-text-zoom-subtle' : ''}`}>{current.desc}</p>
          <button className="action-carousel__btn" onClick={(e) => { e.stopPropagation(); current.action(); }}>
            <span>{current.actionLabel}</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      <style jsx>{`
        /* Non-critical pending slide - Theme Aware */
        .action-carousel__slide.is-pending:not(.is-critical) {
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%) !important;
          border: 1.5px solid rgba(245, 158, 11, 0.35);
          box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.1), 0 4px 20px rgba(245, 158, 11, 0.15);
          animation: pendingBeam 2.5s ease-in-out infinite;
          position: relative;
          overflow: hidden;
        }

        :global(.theme--dark) .action-carousel__slide.is-pending:not(.is-critical),
        @media (prefers-color-scheme: dark) {
          :global(:not(.theme--light)) .action-carousel__slide.is-pending:not(.is-critical) {
            background: linear-gradient(135deg, #1c1400 0%, #241a00 100%) !important;
            border-color: rgba(245, 158, 11, 0.4);
            box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.05), 0 4px 20px rgba(0, 0, 0, 0.3);
          }
        }

        .action-carousel__slide.is-pending:not(.is-critical)::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 60%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.08), transparent);
          animation: pendingShimmer 2.5s ease-in-out infinite;
          pointer-events: none;
        }

        .action-carousel__slide.is-pending:not(.is-critical) .action-carousel__title {
          color: #92400e;
        }
        
        .action-carousel__slide.is-pending:not(.is-critical) .action-carousel__desc {
          color: #b45309;
        }

        .action-carousel__slide.is-pending:not(.is-critical) .action-carousel__btn {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
        }

        :global(.theme--dark) .action-carousel__slide.is-pending:not(.is-critical) .action-carousel__title,
        @media (prefers-color-scheme: dark) {
          :global(:not(.theme--light)) .action-carousel__slide.is-pending:not(.is-critical) .action-carousel__title {
            color: #fcd34d;
          }
          :global(:not(.theme--light)) .action-carousel__slide.is-pending:not(.is-critical) .action-carousel__desc {
            color: #d97706;
          }
        }

        .action-carousel__slide.is-critical .action-carousel__title,
        .action-carousel__slide.is-critical .action-carousel__desc {
          color: white;
        }
        .action-carousel__slide.is-critical .action-carousel__icon-wrap {
          background: rgba(255, 255, 255, 0.2);
          box-shadow: none;
        }
        .action-carousel__slide.is-critical .action-carousel__btn {
          background: white;
          color: var(--error);
        }

        @keyframes pendingBeam {
          0%, 100% {
            box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.1), 0 4px 16px rgba(245, 158, 11, 0.12);
            border-color: rgba(245, 158, 11, 0.3);
          }
          50% {
            box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.25), 0 6px 24px rgba(245, 158, 11, 0.2);
            border-color: rgba(245, 158, 11, 0.5);
          }
        }

        @keyframes pendingShimmer {
          0% { left: -60%; }
          100% { left: 160%; }
        }
      `}</style>

      {slides.length > 1 && (
        <div className="action-carousel__nav">
          <button className="action-carousel__nav-btn" onClick={prevSlide}>
            <ChevronLeft size={16} />
          </button>
          <div className="action-carousel__dots">
            {slides.map((_, i) => (
              <div
                key={i}
                className={`action-carousel__dot ${i === index ? 'action-carousel__dot--active' : ''}`}
              />
            ))}
          </div>
          <button className="action-carousel__nav-btn" onClick={nextSlide}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
