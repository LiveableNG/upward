'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CreditCard, History, Home, LayoutGrid, User } from 'lucide-react'
import { useFeaturesMenu } from './FeaturesMenuContext'

const SIDE_NAV_ITEMS = [
  { label: 'Home', icon: Home, href: '/dashboard' },
  { label: 'Pay Rent', icon: CreditCard, href: '/dashboard/pay-rent' },
  { label: 'Transactions', icon: History, href: '/dashboard/transactions' },
  { label: 'Me', icon: User, href: '/dashboard/me' },
] as const

export function BottomNav() {
  const pathname = usePathname()
  const { openFeaturesMenu } = useFeaturesMenu()

  const isActive = (href: string) => {
    const normalizedPath = pathname?.endsWith('/') ? pathname : `${pathname}/`
    const normalizedHref = href.endsWith('/') ? href : `${href}/`
    return normalizedPath === normalizedHref
  }

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav__container">
        {SIDE_NAV_ITEMS.slice(0, 2).map((item) => {
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

        <button
          type="button"
          className="bottom-nav__menu"
          onClick={openFeaturesMenu}
          aria-label="Open features menu"
        >
          <span className="bottom-nav__menu-button">
            <LayoutGrid size={24} strokeWidth={2.2} />
          </span>
          <span className="bottom-nav__label">Features</span>
        </button>

        {SIDE_NAV_ITEMS.slice(2).map((item) => {
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
