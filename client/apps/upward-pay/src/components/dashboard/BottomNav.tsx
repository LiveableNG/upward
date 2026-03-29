'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Gift, User } from 'lucide-react'
import { UpwardLogo } from '@/components/payment/PoweredByUpward'
import { api } from '@/lib/api'

export default function BottomNav() {
  const pathname = usePathname()
  const [tenant, setTenant] = useState<{ fullName: string } | null>(null)

  useEffect(() => {
    api.getMe().then(res => setTenant(res.tenant)).catch(() => {})
  }, [])

  const fullName = tenant?.fullName || 'John Doe'
  const initials = fullName.split(' ')[0]?.[0]?.toUpperCase() || 'J'

  const navItems = [
    { label: 'Home', icon: Home, href: '/dashboard' },
    { label: 'Properties', icon: Search, href: '/dashboard/properties' },
    { label: 'Rewards', icon: Gift, href: '/dashboard/rewards' },
    { label: 'Me', icon: User, href: '/dashboard/me' },
  ]

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav__desktop-header desktop-only">
        <div className="bottom-nav__brand">
          <UpwardLogo size={24} color="var(--clay)" />
          <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>Upward</span>
        </div>
        <div className="bottom-nav__profile">
          <div className="bottom-nav__avatar">{initials}</div>
          <div className="bottom-nav__user-info">
            <span className="bottom-nav__user-name">{fullName}</span>
            <span className="bottom-nav__user-role">Verified Tenant</span>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <div className="bottom-nav__links">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="bottom-nav__label">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
