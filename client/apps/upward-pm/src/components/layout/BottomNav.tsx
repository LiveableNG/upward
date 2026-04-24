'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Building2, 
  CreditCard, 
  Users,
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'
import '@/styles/bottom-nav.css'

const navItems = [
  { icon: LayoutDashboard, label: 'Home', href: '/' },
  { icon: Building2, label: 'Units', href: '/properties' },
  { icon: CreditCard, label: 'Pay', href: '/payments' },
  { icon: Users, label: 'Tenants', href: '/tenants' },
  { icon: Settings, label: 'Menu', href: '/settings' },
]

export function BottomNav() {
  const pathname = usePathname()

  // Don't show on auth pages
  if (pathname === '/signup' || pathname === '/login') return null

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        return (
          <Link 
            key={item.href} 
            href={item.href} 
            className={cn(
              'bottom-nav__item',
              isActive && 'bottom-nav__item--active'
            )}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
