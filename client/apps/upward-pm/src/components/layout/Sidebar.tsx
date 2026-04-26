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
  PlusCircle,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { UpwardLogo } from '@/components/common/UpwardLogo'
import { useAuth } from '@/features/auth/AuthContext'
import { cn } from '@/lib/utils'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Building2, label: 'Properties', href: '/properties' },
  { icon: Users, label: 'Tenants', href: '/tenants' },
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

  return (
    <aside className={cn('sidebar', isOpen && 'sidebar--open', isCollapsed && 'sidebar--collapsed')}>
      <button className="sidebar__collapse-toggle" onClick={onToggleCollapse}>
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className="sidebar__header">
        <Link href="/dashboard" className="sidebar__logo">
          <UpwardLogo size={32} color="var(--forest)" />
          {!isCollapsed && <span className="sidebar__brand">{user?.firstName || 'Upward'}</span>}
        </Link>
        <button className="sidebar__close" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <nav className="sidebar__nav">
        {isOpen && (
          <button className="sidebar__close sidebar__close--standalone" onClick={onClose}>
            <X size={20} />
          </button>
        )}
        <div className="sidebar__section">
          {!isCollapsed && <p className="sidebar__section-title">Main Menu</p>}
          <ul className="sidebar__list">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <li key={item.href} className="sidebar__item">
                  <Link 
                    href={item.href} 
                    className={cn(
                      'sidebar__link',
                      isActive && 'sidebar__link--active'
                    )}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon size={20} />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="sidebar__section sidebar__section--bottom">
          <button className="sidebar__add-btn forest-gradient">
            <PlusCircle size={18} />
            {!isCollapsed && <span>Add Property</span>}
          </button>
          
          <button className="sidebar__logout-btn" onClick={logout}>
            <LogOut size={18} />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </nav>
    </aside>
  )
}
