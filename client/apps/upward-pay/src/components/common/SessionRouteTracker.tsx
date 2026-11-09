'use client'

import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { sessionTracker } from '@/lib/sessionTracker'

function InnerTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pathname) return
    const screenName = pathname === '/' ? 'HOME' : pathname.replace(/^\//, '').replace(/\//g, '_').toUpperCase()
    sessionTracker.trackScreen(screenName, {
      path: pathname,
      search: searchParams?.toString() || undefined,
    })
  }, [pathname, searchParams])

  return null
}

export function SessionRouteTracker() {
  return (
    <Suspense fallback={null}>
      <InnerTracker />
    </Suspense>
  )
}
