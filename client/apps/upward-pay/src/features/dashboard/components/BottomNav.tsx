'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Building2, Compass, History, Home, User } from 'lucide-react'
import { useHasMyHome } from '@/features/my-home/hooks/useMyHome'
import { haptics } from '@/lib/haptics'
import { useFluidNav } from '../hooks/useFluidNav'

interface NavItem {
  label: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  href: string
  requiresMyHome: boolean
  hideOnDashboard?: boolean
  hideOnMyHome?: boolean
  hideOnPayRent?: boolean
  hideOnLifestyle?: boolean
  hideOnTransactions?: boolean
  hideOnProfile?: boolean
  badge?: string
}

const SIDE_NAV_ITEMS: readonly NavItem[] = [
  { label: 'Home', icon: Home, href: '/dashboard', requiresMyHome: false },
  {
    label: 'My Home',
    icon: Building2,
    href: '/dashboard/my-home',
    requiresMyHome: true,
    hideOnDashboard: true,
    hideOnMyHome: true,
    hideOnPayRent: true,
    hideOnLifestyle: true,
    hideOnTransactions: true,
    hideOnProfile: true,
  },
  {
    label: 'Lifestyle',
    icon: Compass,
    href: '/dashboard/lifestyle',
    requiresMyHome: false,
    badge: 'NEW',
  },
  { label: 'Transactions', icon: History, href: '/dashboard/transactions', requiresMyHome: false },
  { label: 'Me', icon: User, href: '/dashboard/me', requiresMyHome: false },
]

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const hasMyHome = useHasMyHome()
  const { isFluidNav } = useFluidNav()

  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<string, HTMLAnchorElement>>(new Map())

  const [isDragging, setIsDragging] = useState(false)
  const [lensLeft, setLensLeft] = useState(0)
  const [lensWidth, setLensWidth] = useState(0)
  const [hoverHref, setHoverHref] = useState<string | null>(null)
  const isDraggingRef = useRef(false)
  const dragTargetHrefRef = useRef<string | null>(null)

  const isActive = useCallback(
    (href: string) => {
      if (!pathname) return false
      if (href === '/dashboard/my-home' || href === '/dashboard/lifestyle') {
        return pathname === href || pathname.startsWith(`${href}/`)
      }
      const normalizedPath = pathname.endsWith('/') ? pathname : `${pathname}/`
      const normalizedHref = href.endsWith('/') ? href : `${href}/`
      return normalizedPath === normalizedHref
    },
    [pathname],
  )

  const isDashboardHome = pathname === '/dashboard' || pathname === '/dashboard/'
  const isMyHomeRoute =
    pathname === '/dashboard/my-home' || !!pathname?.startsWith('/dashboard/my-home/')
  const isPayRentRoute =
    pathname === '/dashboard/pay-rent' || !!pathname?.startsWith('/dashboard/pay-rent/')
  const isLifestyleRoute =
    pathname === '/dashboard/lifestyle' || !!pathname?.startsWith('/dashboard/lifestyle/')
  const isTransactionsRoute =
    pathname === '/dashboard/transactions' || !!pathname?.startsWith('/dashboard/transactions/')
  const isProfileRoute =
    pathname === '/dashboard/me' || !!pathname?.startsWith('/dashboard/me/')

  const items = SIDE_NAV_ITEMS.filter((item) => {
    if (item.hideOnDashboard && isDashboardHome) return false
    if ('hideOnMyHome' in item && item.hideOnMyHome && isMyHomeRoute) return false
    if ('hideOnPayRent' in item && item.hideOnPayRent && isPayRentRoute) return false
    if ('hideOnLifestyle' in item && item.hideOnLifestyle && isLifestyleRoute) return false
    if ('hideOnTransactions' in item && item.hideOnTransactions && isTransactionsRoute) return false
    if ('hideOnProfile' in item && item.hideOnProfile && isProfileRoute) return false
    if (item.requiresMyHome && !hasMyHome) return false
    return true
  })

  // Measure and align lens to active item
  const updateLensToActiveItem = useCallback(() => {
    if (!isFluidNav) return
    const activeItem = items.find((it) => isActive(it.href)) || items[0]
    if (!activeItem) return

    const el = itemRefs.current.get(activeItem.href)
    const container = containerRef.current
    if (el && container) {
      const containerRect = container.getBoundingClientRect()
      const itemRect = el.getBoundingClientRect()
      const left = itemRect.left - containerRect.left
      setLensLeft(left)
      setLensWidth(itemRect.width)
    }
  }, [items, isActive, isFluidNav])

  useEffect(() => {
    updateLensToActiveItem()
  }, [updateLensToActiveItem, pathname])

  // Recalculate on window resize
  useEffect(() => {
    window.addEventListener('resize', updateLensToActiveItem)
    return () => window.removeEventListener('resize', updateLensToActiveItem)
  }, [updateLensToActiveItem])

  // Find which tab is under a given clientX coordinate
  const getItemAtX = useCallback(
    (clientX: number): { href: string; el: HTMLAnchorElement } | null => {
      for (const item of items) {
        const el = itemRefs.current.get(item.href)
        if (el) {
          const rect = el.getBoundingClientRect()
          if (clientX >= rect.left && clientX <= rect.right) {
            return { href: item.href, el }
          }
        }
      }
      return null
    },
    [items],
  )

  // 1:1 Direct Manipulation: Pointer Down
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isFluidNav) return
    const container = containerRef.current
    if (!container) return

    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}

    isDraggingRef.current = true
    setIsDragging(true)

    const found = getItemAtX(e.clientX)
    if (found) {
      dragTargetHrefRef.current = found.href
      setHoverHref(found.href)
      haptics.selection()

      // Position lens immediately to the tapped item
      const containerRect = container.getBoundingClientRect()
      const itemRect = found.el.getBoundingClientRect()
      setLensLeft(itemRect.left - containerRect.left)
      setLensWidth(itemRect.width)
    }
  }

  // 1:1 Direct Manipulation: Pointer Move (Continuous Touch-Scrubbing)
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !isFluidNav) return
    const container = containerRef.current
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    // Center the lens under the finger
    const currentX = e.clientX - containerRect.left
    const width = lensWidth || 54
    const minLeft = 4
    const maxLeft = containerRect.width - width - 4
    const targetLeft = Math.max(minLeft, Math.min(maxLeft, currentX - width / 2))

    setLensLeft(targetLeft)

    // Check which item we are currently scrubbing over
    const found = getItemAtX(e.clientX)
    if (found && found.href !== dragTargetHrefRef.current) {
      dragTargetHrefRef.current = found.href
      setHoverHref(found.href)
      haptics.selection() // Tactile tick as finger crosses tab boundaries!
    }
  }

  // Magnetic Spring Settle: Pointer Up
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !isFluidNav) return
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}

    isDraggingRef.current = false
    setIsDragging(false)

    const finalTarget = dragTargetHrefRef.current
    setHoverHref(null)

    if (finalTarget) {
      const el = itemRefs.current.get(finalTarget)
      const container = containerRef.current
      if (el && container) {
        const containerRect = container.getBoundingClientRect()
        const itemRect = el.getBoundingClientRect()
        setLensLeft(itemRect.left - containerRect.left)
        setLensWidth(itemRect.width)
      }

      if (!isActive(finalTarget)) {
        haptics.selection()
        router.push(finalTarget)
      }
    } else {
      updateLensToActiveItem()
    }
  }

  const handlePointerCancel = () => {
    isDraggingRef.current = false
    setIsDragging(false)
    setHoverHref(null)
    updateLensToActiveItem()
  }

  return (
    <nav
      className={`bottom-nav ${isFluidNav ? 'bottom-nav--fluid-dock' : ''}`}
      role="navigation"
      aria-label="Main Navigation"
    >
      <div
        ref={containerRef}
        className={`bottom-nav__container ${
          isFluidNav ? 'bottom-nav__container--scrubbable' : ''
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {/* Dynamic Sliding Pill Lens */}
        {isFluidNav && lensWidth > 0 && (
          <div
            className={`bottom-nav__liquid-lens ${
              isDragging ? 'bottom-nav__liquid-lens--dragging' : ''
            }`}
            style={{
              transform: `translate3d(${lensLeft}px, 0, 0)`,
              width: `${lensWidth}px`,
            }}
          />
        )}

        {items.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          const isHovered = hoverHref === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              ref={(node) => {
                if (node) {
                  itemRefs.current.set(item.href, node)
                } else {
                  itemRefs.current.delete(item.href)
                }
              }}
              className={`bottom-nav__item ${
                active ? 'bottom-nav__item--active' : ''
              } ${isHovered ? 'bottom-nav__item--hovered' : ''}`}
              onClick={(e) => {
                if (isFluidNav) {
                  // Handled seamlessly by pointer gesture
                  e.preventDefault()
                  if (!active) {
                    haptics.selection()
                    router.push(item.href)
                  }
                } else {
                  if (!active) {
                    haptics.selection()
                  }
                }
              }}
            >
              <span className="bottom-nav__icon-pill">
                <span className="bottom-nav__icon">
                  <Icon size={20} strokeWidth={active || isHovered ? 2.5 : 2} />
                </span>
                {item.badge ? (
                  <span className="bottom-nav__badge">{item.badge}</span>
                ) : null}
              </span>
              <span className="bottom-nav__label">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
