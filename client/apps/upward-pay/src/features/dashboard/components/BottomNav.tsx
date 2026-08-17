'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, CreditCard, History, Home, User } from 'lucide-react'
import { useHasMyHome } from '@/features/my-home/hooks/useMyHome'

const SIDE_NAV_ITEMS = [
  { label: 'Home', icon: Home, href: '/dashboard', requiresMyHome: false, hideOnDashboard: true },
  { label: 'My Home', icon: Building2, href: '/dashboard/my-home', requiresMyHome: true, hideOnMyHome: true },
  { label: 'Pay Rent', icon: CreditCard, href: '/dashboard/pay-rent', requiresMyHome: false },
  { label: 'Transactions', icon: History, href: '/dashboard/transactions', requiresMyHome: false },
  { label: 'Me', icon: User, href: '/dashboard/me', requiresMyHome: false },
] as const

export function BottomNav() {
  const pathname = usePathname()
  const hasMyHome = useHasMyHome()

  const isActive = (href: string) => {
    if (!pathname) return false
    if (href === '/dashboard/my-home') {
      return pathname === href || pathname.startsWith(`${href}/`)
    }
    const normalizedPath = pathname.endsWith('/') ? pathname : `${pathname}/`
    const normalizedHref = href.endsWith('/') ? href : `${href}/`
    return normalizedPath === normalizedHref
  }

  const isDashboardHome = pathname === '/dashboard' || pathname === '/dashboard/'
  const isMyHomeRoute =
    pathname === '/dashboard/my-home' || !!pathname?.startsWith('/dashboard/my-home/')

  const items = SIDE_NAV_ITEMS.filter((item) => {
    if ('hideOnDashboard' in item && item.hideOnDashboard && isDashboardHome) return false
    if ('hideOnMyHome' in item && item.hideOnMyHome && isMyHomeRoute) return false
    if (item.requiresMyHome && !hasMyHome) return false
    return true
  })

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav__container">
        {items.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`bottom-nav__item ${active ? 'bottom-nav__item--active' : ''}`}
            >
              <span className="bottom-nav__icon-pill">
                <span className="bottom-nav__icon">
                  <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                </span>
              </span>
              <span className="bottom-nav__label">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
