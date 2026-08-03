'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useActivityTasks, CarouselItem } from '@/features/pm/hooks/useActivityTasks'
import { 
  ChevronRight, 
  AlertCircle,
  ArrowRight,
  Building2
} from 'lucide-react'

export function ActivityCarousel({ onAddProperty }: { onAddProperty?: () => void }) {
  const { tasks: carouselItems, isLoading } = useActivityTasks()
  const router = useRouter()
  const [dropdownOpenId, setDropdownOpenId] = useState<string | null>(null)

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.action-card')) {
        setDropdownOpenId(null)
      }
    }
    document.addEventListener('click', handleOutsideClick)
    return () => document.removeEventListener('click', handleOutsideClick)
  }, [])
  
  if (carouselItems.length === 0 || isLoading) return null

  const handleCardClick = (e: React.MouseEvent, item: CarouselItem) => {
    const target = e.target as HTMLElement
    if (target.closest('a') || target.closest('button') || target.closest('.action-card__dropdown-menu')) {
      return
    }
    if (item.id === 'add-property') {
      setDropdownOpenId(dropdownOpenId === 'add-property' ? null : 'add-property')
    } else {
      router.push(item.link)
    }
  }

  return (
    <div className="activity-center">
      <div className="activity-center__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="activity-center__title-group">
            <h2 className="activity-center__title" style={{ fontSize: 16, textTransform: 'none', color: '#111827' }}>Action Center</h2>
          </div>
          <p className="activity-center__subtitle">Complete these important actions to keep your operations running smoothly.</p>
        </div>
        <Link href="/notifications" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: 'var(--forest)', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
          View all tasks <ArrowRight size={14} />
        </Link>
      </div>

      <div className="activity-carousel-wrapper">
        {carouselItems.map(item => {
          const Icon = item.icon
          return (
            <div 
              key={item.id}
              onClick={(e) => handleCardClick(e, item)}
              className={cn(
                'action-card',
                `animate-beam-${item.color}`,
                `action-card--${item.color}`
              )}
              style={{ position: 'relative' }}
            >
              <div className="action-card__icon">
                <Icon size={24} strokeWidth={2.5} />
              </div>
              <div className="action-card__content">
                {item.priority && (
                  <div className="priority-badge desktop-only">
                    <span className="dot" />
                    {item.priority}
                  </div>
                )}
                <h3 className="action-card__item-title">{item.title}</h3>
                <p className="action-card__description">
                  {item.description}
                  {item.descriptionExtended && <span className="desktop-only">{item.descriptionExtended}</span>}
                </p>
                
                <div className="action-card__mobile-btn mobile-only" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
                  {item.id === 'add-property' ? (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        setDropdownOpenId(dropdownOpenId === 'add-property' ? null : 'add-property')
                      }}
                      className="action-card__btn"
                      style={{ width: '100%', justifyContent: 'space-between', border: '1px solid var(--border)', background: 'var(--surface)', padding: '10px 14px' }}
                    >
                      <span>{item.actionLabel} Options</span>
                      <ChevronRight size={16} style={{ transform: dropdownOpenId === 'add-property' ? 'rotate(90deg)' : 'none', transition: '0.2s' }} />
                    </button>
                  ) : item.secondaryActionLabel ? (
                    <MobileDropdownAction item={item} />
                  ) : (
                    <Link href={item.link} className="action-card__btn">
                      <span>{item.actionLabel}</span>
                      <ArrowRight size={16} />
                    </Link>
                  )}
                </div>
              </div>
              
              <div className="action-card__actions-wrapper desktop-only" style={{ position: 'relative' }}>
                {item.id === 'add-property' ? (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      setDropdownOpenId(dropdownOpenId === 'add-property' ? null : 'add-property')
                    }}
                    className="action-card__circle-btn" 
                    title={item.actionLabel}
                  >
                    <ChevronRight size={18} strokeWidth={2.5} style={{ transform: dropdownOpenId === 'add-property' ? 'rotate(90deg)' : 'none', transition: '0.2s' }} />
                  </button>
                ) : item.secondaryActionLabel ? (
                  <DropdownAction item={item} />
                ) : (
                  <Link href={item.link} className="action-card__circle-btn" title={item.actionLabel}>
                    <ChevronRight size={18} strokeWidth={2.5} />
                  </Link>
                )}
              </div>

              {item.id === 'add-property' && dropdownOpenId === 'add-property' && (
                <div 
                  className="action-card__dropdown-menu"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    right: 0,
                    backgroundColor: '#ffffff',
                    border: '1px solid #E7E3DB',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(26, 26, 23, 0.08)',
                    zIndex: 100,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      onAddProperty?.()
                      setDropdownOpenId(null)
                    }}
                    style={{
                      padding: '14px 20px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#1A1A17',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      borderBottom: '1px solid #F2F1EB',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8F7F4'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Building2 size={16} style={{ color: 'var(--forest)' }} />
                    Add Single Property
                  </button>
                  
                  <button
                    onClick={() => {
                      router.push('/settings?tab=import')
                      setDropdownOpenId(null)
                    }}
                    style={{
                      padding: '14px 20px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#1A1A17',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8F7F4'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <ArrowRight size={16} style={{ color: 'var(--clay)' }} />
                    Bulk Import Properties
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DropdownAction({ item }: { item: CarouselItem }) {
  const [open, setOpen] = useState(false)
  
  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={() => setOpen(!open)} 
        className="action-card__circle-btn" 
        title={item.actionLabel}
      >
        <ChevronRight size={18} strokeWidth={2.5} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: '0.2s' }} />
      </button>
      
      {open && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, background: 'white', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, minWidth: 160, overflow: 'hidden' }}>
          <Link href={item.link} style={{ display: 'block', padding: '10px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text)', textDecoration: 'none', borderBottom: '1px solid var(--border)' }}>
            {item.actionLabel}
          </Link>
          {item.secondaryActionLink && (
            <Link href={item.secondaryActionLink} style={{ display: 'block', padding: '10px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text)', textDecoration: 'none' }}>
              {item.secondaryActionLabel}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

function MobileDropdownAction({ item }: { item: CarouselItem }) {
  const [open, setOpen] = useState(false)
  
  return (
    <div style={{ width: '100%' }}>
      <button 
        onClick={() => setOpen(!open)} 
        className="action-card__btn"
        style={{ width: '100%', justifyContent: 'space-between', border: '1px solid var(--border)', background: 'var(--surface)', padding: '10px 14px' }}
      >
        <span>{item.actionLabel} Options</span>
        <ChevronRight size={16} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: '0.2s' }} />
      </button>
      
      {open && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
          <Link href={item.link} className="action-card__btn" style={{ width: '100%', justifyContent: 'space-between', background: 'rgba(0,0,0,0.03)', padding: '10px 14px', border: '1px solid var(--border)' }}>
            <span>{item.actionLabel}</span>
            <ArrowRight size={16} />
          </Link>
          {item.secondaryActionLink && (
            <Link href={item.secondaryActionLink} className="action-card__btn" style={{ width: '100%', justifyContent: 'space-between', background: 'rgba(0,0,0,0.03)', padding: '10px 14px', border: '1px solid var(--border)' }}>
              <span>{item.secondaryActionLabel}</span>
              <ArrowRight size={16} />
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
