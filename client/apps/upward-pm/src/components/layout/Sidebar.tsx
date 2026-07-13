'use client'

import React from 'react'
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
  Inbox
} from 'lucide-react'
import { UpwardLogo } from '@/components/common/UpwardLogo'
import { useAuth } from '@/features/auth/AuthContext'
import { cn } from '@/lib/utils'
import { useCredibilityRequests } from '@/features/pm/hooks/useCredibilityRequests'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Building2, label: 'Properties', href: '/properties' },
  { icon: Contact, label: 'Landlords', href: '/landlords' },
  { icon: Users, label: 'Tenants', href: '/tenants' },
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
  
  const { data: credibilityRequests = [] } = useCredibilityRequests()
  const { data: joinRequests = [] } = useQuery({
    queryKey: ['tenant-join-requests'],
    queryFn: async () => {
      const res = await api.get('/pm/tenants/join-requests')
      return res || []
    }
  })

  const totalRequests = (credibilityRequests?.length || 0) + (joinRequests?.length || 0)

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

        <nav className="sidebar__nav" style={{ padding: 0 }}>
          <div className="sidebar__section" style={{ marginTop: 24 }}>
            {(!isCollapsed || isOpen) && <p className="sidebar__section-title">Main Menu</p>}
            <ul className="sidebar__list">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                const hasBadge = item.label === 'Requests' && totalRequests > 0

                return (
                  <li key={item.href} className="sidebar__item">
                    <Link 
                      href={item.href} 
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
                            <span className="sidebar__badge">{totalRequests}</span>
                          )}
                        </>
                      )}
                      <div className="sidebar__tooltip">{item.label}</div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="sidebar__section sidebar__section--bottom">
            <button className="sidebar__logout-btn" onClick={() => { logout(); onClose?.(); }}>
              <LogOut size={18} />
              {(!isCollapsed || isOpen) && <span>Logout</span>}
            </button>
          </div>
        </nav>
      </aside>
    </>
  )
}
