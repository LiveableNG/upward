'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CreditCard, History, Sparkles, User } from 'lucide-react'

export function BottomNav() {
  const pathname = usePathname()

  const navItems = [
    { label: 'Home', icon: Home, href: '/dashboard' },
    { label: 'Pay Rent', icon: CreditCard, href: '/dashboard/pay-rent' },
    { label: 'Transactions', icon: History, href: '/dashboard/transactions' },
    { label: 'Upcoming', icon: Sparkles, href: '/dashboard/coming-soon' },
    { label: 'Me', icon: User, href: '/dashboard/me' },
  ]

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav__container">
        {navItems.map((item) => {
          const Icon = item.icon
          const normalizedPath = pathname?.endsWith('/') ? pathname : `${pathname}/`
          const normalizedHref = item.href.endsWith('/') ? item.href : `${item.href}/`
          
          const isActive = normalizedPath === normalizedHref
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}
            >
              <span className="bottom-nav__icon-pill">
                <span className="bottom-nav__icon">
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
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
