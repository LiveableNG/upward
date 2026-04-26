'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  CreditCard, 
  UserCircle, 
  Building2, 
  ChevronRight, 
  ChevronLeft,
  AlertCircle,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth/AuthContext'
import { useProperties } from '@/features/pm/hooks/useProperties'

interface CarouselItem {
  id: string
  title: string
  description: string
  icon: React.ElementType
  link: string
  color: string
  actionLabel: string
}

const items: CarouselItem[] = [
  {
    id: 'payment-info',
    title: 'Add Payment Info',
    description: 'Connect your bank account to start receiving rent payments.',
    icon: CreditCard,
    link: '/settings?tab=payment',
    color: 'forest',
    actionLabel: 'Setup Payouts'
  },
  {
    id: 'complete-profile',
    title: 'Complete Profile',
    description: 'Add your business details and profile picture to build trust.',
    icon: UserCircle,
    link: '/settings?tab=profile',
    color: 'clay',
    actionLabel: 'Update Profile'
  },
  {
    id: 'add-property',
    title: 'Add First Property',
    description: 'List your first property and start managing your tenants.',
    icon: Building2,
    link: '/properties',
    color: 'info',
    actionLabel: 'Add Property'
  },
  {
    id: 'rent-request',
    title: 'Rent Payment Request',
    description: 'A tenant from Lekki Heights has requested a payment record for 2023.',
    icon: CreditCard,
    link: '/payments',
    color: 'warning',
    actionLabel: 'Review Request'
  }
]

export function ActivityCarousel() {
  const { user } = useAuth()
  const { data: properties = [] } = useProperties()
  const [index, setIndex] = useState(0)
  
  const carouselItems = items.filter(item => {
    if (item.id === 'payment-info') return !user?.bankCode
    if (item.id === 'complete-profile') return !user?.profilePic
    if (item.id === 'add-property') return properties.length === 0
    return true
  })

  if (carouselItems.length === 0) return null

  const nextSlide = () => setIndex((prev) => (prev + 1) % carouselItems.length)
  const prevSlide = () => setIndex((prev) => (prev - 1 + carouselItems.length) % carouselItems.length)

  const current = carouselItems[index]
  const Icon = current.icon

  return (
    <div className="activity-center">
      <div className="activity-center__header">
        <div className="activity-center__title-group">
          <AlertCircle size={16} className="text-forest animate-pulse" />
          <h2 className="activity-center__title">Action Center</h2>
        </div>
        <p className="activity-center__subtitle">Required steps to manage your properties efficiently.</p>
      </div>

      <div className="activity-carousel-wrapper">
        <div className={cn(
          'action-card animate-beam-forest',
          `action-card--${current.color}`
        )}>
          <div className="action-card__icon">
            <Icon size={24} />
          </div>
          <div className="action-card__content">
            <h3 className="action-card__item-title">{current.title}</h3>
            <p className="action-card__description">{current.description}</p>
            <Link href={current.link} className="action-card__btn">
              <span>{current.actionLabel}</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {carouselItems.length > 1 && (
            <div className="action-carousel__nav">
              <button className="action-carousel__nav-btn" onClick={prevSlide}>
                <ChevronLeft size={20} />
              </button>
              <div className="action-carousel__dots">
                {carouselItems.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'action-carousel__dot',
                      i === index && 'action-carousel__dot--active'
                    )}
                  />
                ))}
              </div>
              <button className="action-carousel__nav-btn" onClick={nextSlide}>
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
