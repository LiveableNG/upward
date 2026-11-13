import type { ComponentType } from 'react'
import { Compass, Home, Target, User, Wallet } from 'lucide-react'

export type PrimaryNavKey = 'home' | 'goals' | 'explore' | 'finance' | 'profile'

export interface PrimaryNavItem {
  readonly key: PrimaryNavKey
  readonly label: string
  readonly href: string
  readonly icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  readonly badge?: string
  readonly match: (pathname: string | null | undefined) => boolean
}

function normalizePath(path: string | null | undefined): string {
  if (!path) return ''
  const trimmed = path.trim()
  if (trimmed === '/' || trimmed === '') return '/'
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
}

export const PRIMARY_NAV_ITEMS: readonly PrimaryNavItem[] = [
  {
    key: 'home',
    label: 'Home',
    href: '/dashboard',
    icon: Home,
    match: (pathname) => {
      const p = normalizePath(pathname)
      return p === '/dashboard'
    },
  },
  {
    key: 'goals',
    label: 'My Goals',
    href: '/dashboard/goals',
    icon: Target,
    match: (pathname) => {
      const p = normalizePath(pathname)
      return p === '/dashboard/goals' || p.startsWith('/dashboard/goals/')
    },
  },
  {
    key: 'explore',
    label: 'Explore',
    href: '/dashboard/explore',
    icon: Compass,
    match: (pathname) => {
      const p = normalizePath(pathname)
      return (
        p === '/dashboard/explore' ||
        p.startsWith('/dashboard/explore/') ||
        p === '/dashboard/lifestyle' ||
        p.startsWith('/dashboard/lifestyle/') ||
        p === '/dashboard/alliance' ||
        p.startsWith('/dashboard/alliance/')
      )
    },
  },
  {
    key: 'finance',
    label: 'Finance',
    href: '/dashboard/finance',
    icon: Wallet,
    match: (pathname) => {
      const p = normalizePath(pathname)
      return (
        p === '/dashboard/finance' ||
        p.startsWith('/dashboard/finance/') ||
        p === '/dashboard/pay-rent' ||
        p.startsWith('/dashboard/pay-rent/') ||
        p === '/dashboard/savings' ||
        p.startsWith('/dashboard/savings/') ||
        p === '/dashboard/transactions' ||
        p.startsWith('/dashboard/transactions/') ||
        p === '/dashboard/score-breakdown' ||
        p.startsWith('/dashboard/score-breakdown/') ||
        p === '/dashboard/deposit-balance' ||
        p.startsWith('/dashboard/deposit-balance/') ||
        p === '/dashboard/rent-support-insurance' ||
        p.startsWith('/dashboard/rent-support-insurance/') ||
        p === '/dashboard/receipts' ||
        p.startsWith('/dashboard/receipts/')
      )
    },
  },
  {
    key: 'profile',
    label: 'Profile',
    href: '/dashboard/me',
    icon: User,
    match: (pathname) => {
      const p = normalizePath(pathname)
      return (
        p === '/dashboard/me' ||
        p.startsWith('/dashboard/me/') ||
        p === '/dashboard/settings' ||
        p.startsWith('/dashboard/settings/')
      )
    },
  },
] as const

export function isNavActive(item: PrimaryNavItem, pathname: string | null | undefined): boolean {
  return item.match(pathname)
}
