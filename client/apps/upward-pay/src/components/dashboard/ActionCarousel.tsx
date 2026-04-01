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
  const isPausedRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  // Track touch start position for swipe detection
  const touchStartX = useRef(0)

  const actions: ActionItem[] = []

  if (showKYC) {
    actions.push({
      id: 'kyc',
      type: 'kyc',
      title: 'Housing History Request',
      desc: 'Landlord requested your verified rent history. Share your profile to proceed.',
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
        desc: `Rent request from ${p.company_name} is pending.`,
        btnText: `Pay ${formatCurrency(p.total_amount, p.currency)}`,
        onClick: () => router.push(`/pay?token=${p.payment_link_token}`),
        data: p
      })
    })
  } else {
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
      desc: `Rent of ${formatCurrency(r.amount * 100)} is due on ${r.dueDate}.`,
      btnText: 'Pay Rent Now',
      onClick: () => router.push('/dashboard/pay-rent'),
      data: r
    })
  })

  const total = actions.length

  function startTimer() {
    if (total <= 1) return
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      if (!isPausedRef.current) {
        setCurrentIndex(prev => (prev + 1) % total)
      }
    }, 5000)
  }

  function pause() {
    isPausedRef.current = true
  }

  function resume() {
    isPausedRef.current = false
  }

  useEffect(() => {
    startTimer()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [total])

  // Touch swipe: pause on touch, navigate on swipe, resume on lift
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    pause()
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(delta) > 40) {
      // Swipe gesture — move to the next/prev card
      if (delta < 0) {
        setCurrentIndex(prev => (prev + 1) % total)
      } else {
        setCurrentIndex(prev => (prev - 1 + total) % total)
      }
    }
    // Short delay before resuming so user can finish interacting
    setTimeout(resume, 3000)
  }

  if (actions.length === 0) return null

  return (
    <div
      ref={containerRef}
      className="action-carousel"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="action-carousel__track"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {actions.map((action) => (
          <div key={action.id} className="action-carousel__item">
            {action.type === 'kyc' ? (
              <div className="kyc-card shimmer-container" style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                gap: '10px',
                padding: '12px 14px'
              }}>
                <div className="shimmer-bar" />
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div className="kyc-card__icon-wrap animate-pulse-subtle" style={{ marginBottom: 0, flexShrink: 0 }}>
                    <ClipboardCheck size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <h3 className="kyc-card__title" style={{ fontSize: '13px', margin: 0 }}>{action.title}</h3>
                      <span className="kyc-card__badge" style={{ padding: '2px 6px', fontSize: '9px', flexShrink: 0 }}>Required</span>
                    </div>
                    <p className="kyc-card__desc" style={{ fontSize: '12px', margin: 0, lineHeight: 1.4 }}>{action.desc}</p>
                  </div>
                </div>
                <button
                  className="kyc-card__btn"
                  style={{ width: '100%', padding: '9px 12px', fontSize: '13px' }}
                  onClick={action.onClick}
                >
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
                  gap: '10px',
                  width: '100%',
                  background: action.type === 'reminder' ? 'var(--surface)' : undefined,
                  border: action.type === 'reminder' ? '1px solid var(--border-solid)' : undefined
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flexShrink: 0 }}>
                    {action.data?.company_logo || action.data?.landlordAvatar ? (
                      <img
                        src={action.data?.company_logo || action.data?.landlordAvatar}
                        alt=""
                        width={28}
                        height={28}
                        className="dashboard__payment-card-logo"
                      />
                    ) : (
                      <div className="dashboard__payment-card-logo" style={{ background: 'var(--clay-faint)', color: 'var(--clay)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '11px', width: '28px', height: '28px' }}>
                        {(action.data?.company_name || action.data?.landlordName || 'L')[0]}
                      </div>
                    )}
                  </div>
                  <span className="dashboard__payment-card-name" style={{ fontSize: '13px', fontWeight: 600, flex: 1 }}>
                    {action.data?.company_name || action.data?.landlordName}
                  </span>
                  <span className="dashboard__payment-card-amount" style={{ fontSize: '14px', fontWeight: 700, flexShrink: 0 }}>
                    {formatCurrency(action.type === 'reminder' ? (action.data?.amount || 0) * 100 : (action.data?.total_amount || 0), action.data?.currency)}
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  {action.desc}
                </span>
                <button
                  className="btn btn--primary btn--tight"
                  style={{ width: '100%', padding: '9px 12px', fontSize: '13px' }}
                  onClick={action.onClick}
                >
                  {action.type === 'payment' ? action.btnText : 'Pay Rent Now'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Progress bar instead of dots — shows time until next slide, no tap required */}
      {total > 1 && (
        <div style={{
          display: 'flex',
          gap: '4px',
          marginTop: '10px',
          padding: '0 2px',
        }}>
          {actions.map((_, idx) => (
            <div
              key={idx}
              onClick={() => { setCurrentIndex(idx); pause(); setTimeout(resume, 4000) }}
              style={{
                flex: 1,
                height: '2px',
                borderRadius: '2px',
                background: currentIndex === idx ? 'var(--clay)' : 'var(--border-solid)',
                cursor: 'pointer',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
