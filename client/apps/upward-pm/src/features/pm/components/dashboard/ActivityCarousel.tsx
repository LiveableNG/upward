'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useCredibilityRequests } from '@/features/pm/hooks/useCredibilityRequests'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth/AuthContext'
import { useProperties } from '@/features/pm/hooks/useProperties'
import { 
  CreditCard, 
  UserCircle, 
  Building2, 
  ChevronRight, 
  ChevronLeft,
  AlertCircle,
  ArrowRight,
  UserPlus
} from 'lucide-react'

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
    description: 'Add your business details to build trust and professionalize your dashboard.',
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
  }
]

export function ActivityCarousel() {
  const { user } = useAuth()
  const { data: properties = [] } = useProperties()
  const { data: credibilityRequests = [] } = useCredibilityRequests()
  
  const [index, setIndex] = useState(0)
  
  // Create dynamic items based on fetched data
  let dynamicItems = [...items]
  
  const { data: joinRequests = [] } = useQuery({
    queryKey: ['tenant-join-requests'],
    queryFn: async () => {
      const res = await api.get('/pm/tenants/join-requests')
      return res.data || []
    }
  })
  
  if (joinRequests.length > 0) {
    dynamicItems.unshift({
      id: 'join-requests',
      title: 'New Tenant Requests',
      description: `You have ${joinRequests.length} pending tenant${joinRequests.length > 1 ? 's' : ''} requesting to join your properties.`,
      icon: UserPlus,
      link: '/dashboard',
      color: 'forest',
      actionLabel: 'Handle Requests'
    })
  }

  if (credibilityRequests.length > 0) {
    dynamicItems.unshift({
      id: 'credibility-requests',
      title: 'Payment History Requests',
      description: `You have ${credibilityRequests.length} request${credibilityRequests.length > 1 ? 's' : ''} for past payment records from tenants.`,
      icon: CreditCard,
      link: '/requests',
      color: 'warning',
      actionLabel: 'Review Records'
    })
  }

  const carouselItems = dynamicItems.filter(item => {
    if (item.id === 'payment-info') return !user?.bankCode
    if (item.id === 'complete-profile') return !user?.businessName
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
