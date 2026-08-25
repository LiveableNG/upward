'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CreditCard, History, Home, User } from 'lucide-react'

const SIDE_NAV_ITEMS = [
  { label: 'Home', icon: Home, href: '/dashboard' },
  { label: 'Pay Rent', icon: CreditCard, href: '/dashboard/pay-rent' },
  { label: 'Transactions', icon: History, href: '/dashboard/transactions' },
  { label: 'Me', icon: User, href: '/dashboard/me' },
] as const

export function BottomNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    const normalizedPath = pathname?.endsWith('/') ? pathname : `${pathname}/`
    const normalizedHref = href.endsWith('/') ? href : `${href}/`
    return normalizedPath === normalizedHref
  }

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav__container">
        {SIDE_NAV_ITEMS.map((item) => {
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
