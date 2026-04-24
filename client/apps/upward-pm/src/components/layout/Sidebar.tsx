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
  X
} from 'lucide-react'
import { UpwardLogo } from '@/components/common/UpwardLogo'
import { cn } from '@/lib/utils'
import '@/styles/sidebar.css'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Building2, label: 'Properties', href: '/properties' },
  { icon: Users, label: 'Tenants', href: '/tenants' },
  { icon: CreditCard, label: 'Payments', href: '/payments' },
  { icon: Settings, label: 'Settings', href: '/settings' },
]

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean, onClose?: () => void }) {
  const pathname = usePathname()

  return (
    <aside className={cn('sidebar', isOpen && 'sidebar--open')}>
      <div className="sidebar__header">
        <Link href="/" className="sidebar__logo">
          <UpwardLogo size={32} />
          <span className="sidebar__brand">Upward PM</span>
        </Link>
        <button className="sidebar__close" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <nav className="sidebar__nav">
        <div className="sidebar__section">
          <p className="sidebar__section-title">Menu</p>
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
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="sidebar__section sidebar__section--bottom">
          <button className="sidebar__add-btn clay-gradient">
            <PlusCircle size={18} />
            <span>Add Property</span>
          </button>
          
          <div className="sidebar__footer">
            <div className="sidebar__user">
              <div className="sidebar__user-avatar">PM</div>
              <div className="sidebar__user-info">
                <p className="sidebar__user-name">Lagos Property Mgmt</p>
                <p className="sidebar__user-role">Premium Manager</p>
              </div>
            </div>
            <button className="sidebar__logout">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>
    </aside>
  )
}
