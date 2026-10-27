import { useRouter, type Href } from 'expo-router'

/** Tab routes live under dashboard/(tabs); use navigate to switch tabs without stack flicker. */
const TAB_ROUTE_PREFIXES = [
  '/dashboard/my-home',
  '/dashboard/pay-rent',
  '/dashboard/transactions',
  '/dashboard/me',
] as const

export function isDashboardTabHref(href: string): boolean {
  const path = href.split('?')[0]?.replace(/\/$/, '') ?? href
  if (path === '/dashboard') return true
  return TAB_ROUTE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`) || href.startsWith(`${prefix}?`),
  )
}

/** Stack overlays: score breakdown, setup wizard, savings vault. */
export function isDashboardStackHref(href: string): boolean {
  return !isDashboardTabHref(href) && href.startsWith('/dashboard')
}

export function useDashboardNavigation() {
  const router = useRouter()

  const go = (href: string) => {
    if (isDashboardTabHref(href)) {
      router.navigate(href as Href)
      return
    }
    router.push(href as Href)
  }

  const replace = (href: string) => {
    router.replace(href as Href)
  }

  const goToHome = () => {
    router.navigate(DASHBOARD_HREF.home)
  }

  return {
    go,
    openTab: (href: Href) => router.navigate(href),
    openOverlay: (href: Href) => router.push(href),
    replace,
    goToHome,
    back: () => router.back(),
  }
}

export const DASHBOARD_HREF = {
  home: '/dashboard',
  myHome: '/dashboard/my-home',
  payRent: '/dashboard/pay-rent',
  transactions: '/dashboard/transactions',
  me: '/dashboard/me',
  scoreBreakdown: '/dashboard/score-breakdown',
  savings: '/dashboard/savings',
  savingsCreate: '/dashboard/savings/create',
  savingsFund: '/dashboard/savings?fund=1',
  setupRental: '/dashboard/setup/rental',
  setupProperties: '/dashboard/setup/properties',
  receipt: (id: string) => `/dashboard/receipt?id=${encodeURIComponent(id)}`,
  settings: '/dashboard/settings',
  profile: '/dashboard/profile',
  benefits: '/dashboard/benefits',
  help: '/dashboard/help',
  verifyIdentity: '/dashboard/verify-identity',
  notifications: '/dashboard/notifications',
  depositBalance: '/dashboard/deposit-balance',
  requestRecords: '/dashboard/request-records',
  rentCalculator: '/dashboard/rent-calculator',
  exclusiveHomes: '/dashboard/exclusive-homes',
  exclusiveHomeDetail: (uuid: string) => `/dashboard/exclusive-homes/${encodeURIComponent(uuid)}`,
  rentSupportInsurance: '/dashboard/rent-support-insurance',
} as const
