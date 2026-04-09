'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Clock, AlertTriangle, Bell, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { type PendingPayment } from '../types'

interface ActionCarouselProps {
  pendingPayments: PendingPayment[]
  showKYC: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rentReminders: any[]
}

export function ActionCarousel({ pendingPayments, showKYC, rentReminders }: ActionCarouselProps) {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [renttReminders, setRentReminders] = useState(rentReminders)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slides: any[] = []

  // Pending Payments
  pendingPayments.forEach((p) => {
    slides.push({
      type: 'pending',
      id: p.uuid,
      title: 'Payment Pending',
      desc: `You have an invoice for ${formatCurrency(p.total_amount, p.currency)} from ${p.company_name}.`,
      actionLabel: 'Pay Now',
      action: () => router.push(`/pay/${p.uuid}`),
      icon: <Clock size={20} color="var(--clay)" />,
      bg: 'var(--clay-faint)',
    })
  })

  // KYC Alert
  if (showKYC) {
    slides.push({
      type: 'kyc',
      id: 'kyc-alert',
      title: 'Complete Your Profile',
      desc: 'Verify your ID and income to unlock your Rent Credibility Score.',
      actionLabel: 'Verify Now',
      action: () => router.push('/dashboard/kyc'),
      icon: <AlertTriangle size={20} color="#eab308" />,
      bg: '#fefce8',
    })
  }

  // Fallback if no slides
  if (slides.length === 0) {
    slides.push({
      type: 'welcome',
      id: 'welcome',
      title: 'Dashboard Active',
      desc: 'Your rent tracking and credibility building are now active.',
      actionLabel: 'View Profile',
      action: () => router.push('/dashboard/me'),
      icon: <Bell size={20} color="var(--clay)" />,
      bg: 'var(--surface2)',
    })
  }

  const current = slides[index]

  const nextSlide = () => setIndex((prev) => (prev + 1) % slides.length)
  const prevSlide = () => setIndex((prev) => (prev - 1 + slides.length) % slides.length)

  return (
    <div className="action-carousel">
      <div 
        className="action-carousel__slide" 
        style={{ background: current.bg, cursor: 'pointer' }}
        onClick={current.action}
      >
        <div className="action-carousel__icon-wrap">{current.icon}</div>
        <div className="action-carousel__content">
          <h4 className="action-carousel__title">{current.title}</h4>
          <p className="action-carousel__desc">{current.desc}</p>
          <button className="action-carousel__btn" onClick={(e) => { e.stopPropagation(); current.action(); }}>
            <span>{current.actionLabel}</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

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
