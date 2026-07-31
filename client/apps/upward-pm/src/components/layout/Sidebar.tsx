'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Settings,
  Users,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
  Contact,
  FileText,
  Inbox,
  Search,
  Sparkles,
  MoreVertical
} from 'lucide-react'
import { UpwardLogo } from '@/components/common/UpwardLogo'
import { useAuth } from '@/features/auth/AuthContext'
import { cn } from '@/lib/utils'
import { useCredibilityRequests } from '@/features/pm/hooks/useCredibilityRequests'
import { listHomeRequests } from '@/features/pm/services/homeRequestService'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useSubscription } from '@/features/pm/hooks/useSubscription'
import { usePricingModal } from '@/features/pm/hooks/usePricingModal'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Building2, label: 'Properties', href: '/properties' },
  { icon: Contact, label: 'Landlords', href: '/landlords' },
  { icon: Users, label: 'Tenants', href: '/tenants' },
  { icon: Search, label: 'Home Requests', href: '/home-requests' },
  { icon: Inbox, label: 'Requests', href: '/requests' },
  { icon: FileText, label: 'Documents', href: '/documents' },
  { icon: CreditCard, label: 'Payments', href: '/payments' },
  { icon: Settings, label: 'Settings', href: '/settings' },
]

export function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: {
  isOpen?: boolean,
  onClose?: () => void,
  isCollapsed?: boolean,
  onToggleCollapse?: () => void
}) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { subscription } = useSubscription()
  const { openPricing } = usePricingModal()

  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsSettingsMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const { data: credibilityRequests = [] } = useCredibilityRequests()
  const { data: joinRequests = [] } = useQuery({
    queryKey: ['tenant-join-requests'],
    queryFn: async () => {
      const res = await api.get('/pm/tenants/join-requests')
      return res || []
    }
  })
  const { data: homeRequests = [] } = useQuery({
    queryKey: ['pm-home-requests'],
    queryFn: listHomeRequests,
  })

  const totalRequests = (credibilityRequests?.length || 0) + (joinRequests?.length || 0)
  const newHomeRequests = homeRequests.filter((request) => request.status === 'submitted').length

  return (
    <>
      <div
        className={cn('sidebar-backdrop', isOpen && 'sidebar-backdrop--open')}
        onClick={onClose}
      />
      <aside className={cn('sidebar', isOpen && 'sidebar--open', isCollapsed && 'sidebar--collapsed')}>
        <button className="sidebar__collapse-toggle" onClick={onToggleCollapse}>
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="sidebar__header">
          <Link href="/dashboard" className="sidebar__logo" onClick={onClose}>
            <UpwardLogo size={32} color="var(--forest)" />
            {(!isCollapsed || isOpen) && <span className="sidebar__brand">{user?.pmType || 'Property Manager'}</span>}
          </Link>
          {isOpen && (
            <button className="sidebar__close" onClick={onClose}>
              <X size={20} />
            </button>
          )}
        </div>

        {process.env.NEXT_PUBLIC_DISABLE_SUBSCRIPTIONS !== 'true' && (
          isCollapsed && !isOpen ? (
            <div className="sidebar__plan-collapsed-wrap">
              <button
                onClick={() => {
                  openPricing();
                  onClose?.();
                }}
                className={cn(
                  'sidebar__plan-dot-btn',
                  `sidebar__plan-dot-btn--${(subscription?.tier || 'FREE').toLowerCase()}`
                )}
                title={
                  subscription?.tier === 'TIER_3'
                    ? 'Enterprise Plan (Active)'
                    : subscription?.tier === 'TIER_2'
                      ? 'Professional Plan (Active)'
                      : 'Free Plan (Click to Upgrade)'
                }
              >
                <div className="sidebar__plan-dot" />
                <div className="sidebar__plan-tooltip">
                  <div style={{ fontWeight: 700 }}>
                    {subscription?.tier === 'TIER_3'
                      ? 'Enterprise Plan'
                      : subscription?.tier === 'TIER_2'
                        ? 'Professional Plan'
                        : 'Free Plan'}
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>
                    {subscription?.tier === 'FREE' ? 'Upgrade →' : 'Active subscription'}
                  </div>
                </div>
              </button>
            </div>
          ) : (
            <div className="sidebar__plan-card-wrap">
              <button
                onClick={() => {
                  openPricing();
                  onClose?.();
                }}
                className={cn(
                  'sidebar__plan-card',
                  `sidebar__plan-card--${(subscription?.tier || 'FREE').toLowerCase()}`
                )}
                title="Manage Subscription"
              >
                <div className="sidebar__plan-dot" />
                <div className="sidebar__plan-info">
                  <span className="sidebar__plan-name">
                    {subscription?.tier === 'TIER_3'
                      ? 'Enterprise'
                      : subscription?.tier === 'TIER_2'
                        ? 'Professional'
                        : 'Free Plan'}
                  </span>
                  <span className="sidebar__plan-action">
                    {subscription?.tier === 'FREE' ? 'Upgrade →' : 'Active'}
                  </span>
                </div>
              </button>
            </div>
          )
        )}

        <nav className="sidebar__nav" style={{ padding: 0 }}>
          <div className="sidebar__section" style={{ marginTop: 8 }}>
            <ul className="sidebar__list">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
                const hasBadge =
                  (item.label === 'Requests' && totalRequests > 0) ||
                  (item.label === 'Home Requests' && newHomeRequests > 0)
                const badgeCount =
                  item.label === 'Home Requests' ? newHomeRequests : totalRequests

                return (
                  <li key={item.href} className="sidebar__item" style={item.label === 'Settings' ? { position: 'relative' } : undefined}>
                    <Link
                      href={item.href}
                      prefetch={item.href === '/dashboard' ? undefined : false}
                      className={cn(
                        'sidebar__link',
                        isActive && 'sidebar__link--active'
                      )}
                      onClick={onClose}
                    >
                      <div className="sidebar__link-icon-wrap">
                        <Icon size={20} strokeWidth={1.5} />
                        {hasBadge && isCollapsed && (
                          <span className="sidebar__badge sidebar__badge--dot" />
                        )}
                      </div>
                      {(!isCollapsed || isOpen) && (
                        <>
                          <span style={{ flex: 1 }}>{item.label}</span>
                          {hasBadge && (
                            <span className="sidebar__badge">{badgeCount}</span>
                          )}
                        </>
                      )}
                      <div className="sidebar__tooltip">{item.label}</div>
                    </Link>
                    {item.label === 'Settings' && (!isCollapsed || isOpen) && (
                      <div ref={menuRef}>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setIsSettingsMenuOpen(!isSettingsMenuOpen)
                          }}
                          style={{
                            position: 'absolute',
                            right: 8,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 4,
                            color: 'inherit',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 4
                          }}
                        >
                          <MoreVertical size={16} />
                        </button>
                        {isSettingsMenuOpen && (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '100%',
                              left: 0,
                              background: 'var(--surface, #fff)',
                              border: '1px solid var(--border)',
                              borderRadius: 8,
                              padding: 12,
                              width: 220,
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                              marginBottom: 8,
                              zIndex: 50,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 12
                            }}
                          >
                            {process.env.NEXT_PUBLIC_DISABLE_SUBSCRIPTIONS !== 'true' && (
                              <div className={cn('sidebar__dropdown-plan', `sidebar__dropdown-plan--${(subscription?.tier || 'FREE').toLowerCase()}`)}>
                                <div className="sidebar__dropdown-plan-header">
                                  <div className="sidebar__dropdown-plan-dot" />
                                  <span className="sidebar__dropdown-plan-name">
                                    {subscription?.tier === 'TIER_3'
                                      ? 'Enterprise Plan'
                                      : subscription?.tier === 'TIER_2'
                                        ? 'Professional Plan'
                                        : 'Free Plan'}
                                  </span>
                                </div>
                                {subscription?.tier === 'FREE' && (
                                  <button
                                    onClick={() => { openPricing(); onClose?.(); setIsSettingsMenuOpen(false); }}
                                    className="sidebar__dropdown-upgrade-btn"
                                  >
                                    Upgrade Plan &rarr;
                                  </button>
                                )}
                              </div>
                            )}
                            <button
                              className="sidebar__logout-btn"
                              onClick={() => { logout(); onClose?.(); setIsSettingsMenuOpen(false); }}
                              style={{ width: '100%', justifyContent: 'flex-start' }}
                            >
                              <LogOut size={18} />
                              <span>Logout</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>


        </nav>
      </aside>
    </>
  )
}
