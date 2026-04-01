'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Calendar, ChevronRight, AlertCircle, Clock, ClipboardCheck } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface ActionCarouselProps {
  pendingPayments: any[]
  showKYC: boolean
  rentReminders?: any[]
}

interface ActionItem {
  id: string
  type: 'kyc' | 'payment' | 'reminder'
  title: string
  desc: string
  btnText: string
  onClick: () => void
  data?: any
}

export default function ActionCarousel({ pendingPayments, showKYC, rentReminders = [] }: ActionCarouselProps) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const actions: ActionItem[] = []

  if (showKYC) {
    actions.push({
      id: 'kyc',
      type: 'kyc',
      title: 'Housing History Request',
      desc: 'A landlord or property manager has requested your verified rent history and credibility score. Share your profile to proceed.',
      btnText: 'Share Profile',
      onClick: () => router.push('/dashboard/kyc'),
    })
  }

  if (pendingPayments && pendingPayments.length > 0) {
    pendingPayments.forEach((p, idx) => {
      actions.push({
        id: `payment-${idx}`,
        type: 'payment',
        title: 'Rent Request',
        desc: `A payment request from ${p.company_name} is waiting for your approval.`,
        btnText: `Pay ${formatCurrency(p.total_amount, p.currency)}`,
        onClick: () => router.push(`/pay?token=${p.payment_link_token}`),
        data: p
      })
    })
  } else {
    // If no pending payment requests, show manual Pay Rent as a task/action
    actions.push({
      id: 'manual-pay',
      type: 'payment',
      title: 'Pay Your Rent',
      desc: 'Send rent directly to any landlord bank account and record your credit history.',
      btnText: 'Send Payment',
      onClick: () => router.push('/dashboard/pay-rent'),
      data: { company_name: 'Quick Transfer', currency: 'NGN', total_amount: 0 }
    })
  }

  rentReminders.forEach((r, idx) => {
    actions.push({
      id: `reminder-${idx}`,
      type: 'reminder',
      title: `Rent Reminder: ${r.landlordName}`,
      desc: `Your next rent payment of ${formatCurrency(r.amount * 100)} is due on ${r.dueDate}.`,
      btnText: 'Pay Rent Now',
      onClick: () => router.push('/dashboard/pay-rent'),
      data: r
    })
  })

  // Auto-slide effect
  useEffect(() => {
    if (actions.length <= 1) return

    const startTimer = () => {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % actions.length)
      }, 5000)
    }

    startTimer()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [actions.length])

  if (actions.length === 0) return null

  return (
    <div className="action-carousel">
      <div 
        className="action-carousel__track" 
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {actions.map((action, idx) => (
          <div key={action.id} className="action-carousel__item">
            {action.type === 'kyc' ? (
              <div className="kyc-card shimmer-container">
                <div className="shimmer-bar" />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="kyc-card__icon-wrap animate-pulse-subtle">
                    <ClipboardCheck size={20} />
                  </div>
                  <span className="kyc-card__badge">Required</span>
                </div>
                <div>
                  <h3 className="kyc-card__title">{action.title}</h3>
                  <p className="kyc-card__desc">{action.desc}</p>
                </div>
                <button className="kyc-card__btn animate-breathe" onClick={action.onClick}>
                  {action.btnText}
                </button>
              </div>
            ) : (
              <div 
                className="dashboard__payment-card dashboard__payment-card--pending" 
                style={{ 
                  margin: 0, 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between',
                  background: action.type === 'reminder' ? 'var(--surface)' : undefined,
                  border: action.type === 'reminder' ? '1px solid var(--border-solid)' : undefined
                }}
              >
                <div className="dashboard__payment-card-top">
                  <div className="dashboard__payment-card-company">
                    {action.data?.company_logo || action.data?.landlordAvatar ? (
                       <img
                        src={action.data?.company_logo || action.data?.landlordAvatar}
                        alt=""
                        width={32}
                        height={32}
                        className="dashboard__payment-card-logo"
                      />
                    ) : (
                      <div className="dashboard__payment-card-logo" style={{ background: 'var(--clay-faint)', color: 'var(--clay)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px' }}>
                        {(action.data?.company_name || action.data?.landlordName || 'L')[0]}
                      </div>
                    )}
                    <div>
                      <span className="dashboard__payment-card-name" style={{ fontSize: '14px' }}>{action.data?.company_name || action.data?.landlordName}</span>
                      <span className="dashboard__payment-card-invoice" style={{ fontSize: '11px' }}>
                         {action.type === 'reminder' ? 'Reminder' : 'Pending'} · {action.data?.invoice_number || 'Upcoming'}
                      </span>
                    </div>
                  </div>
                  <span className="dashboard__payment-card-amount" style={{ fontSize: '18px', fontWeight: 800 }}>
                    {formatCurrency(action.type === 'reminder' ? (action.data?.amount || 0) * 100 : (action.data?.total_amount || 0), action.data?.currency)}
                  </span>
                </div>
                
                {action.data?.notes && (
                   <p className="dashboard__payment-card-notes" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '8px 0 0 0', fontStyle: 'italic', background: 'var(--surface2)', padding: '6px 8px', borderRadius: '6px' }}>
                     {action.data.notes}
                   </p>
                )}
                
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button
                    className="btn btn--primary btn--full btn--sm"
                    onClick={action.onClick}
                  >
                    {action.btnText}
                  </button>
                  {action.type === 'reminder' && (
                    <button 
                      className="btn btn--secondary btn--sm"
                      style={{ minWidth: '40px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={() => router.push('/dashboard/me/reminders')}
                      title="Edit Reminder"
                    >
                      <Clock size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {actions.length > 1 && (
        <div className="action-carousel__dots">
          {actions.map((_, idx) => (
            <div 
              key={idx} 
              className={`action-carousel__dot ${currentIndex === idx ? 'action-carousel__dot--active' : ''}`}
              onClick={() => setCurrentIndex(idx)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
