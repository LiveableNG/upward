'use client'

import React, { useRef, useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { haptics } from '@/lib/haptics'

const ROOT_NAV_PATHS = new Set([
  '/dashboard',
  '/dashboard/pay-rent',
  '/dashboard/transactions',
  '/dashboard/me',
  '/dashboard/my-home',
])

interface PageTransitionProps {
  children: React.ReactNode
  className?: string
}

export function PageTransition({ children, className = '' }: PageTransitionProps) {
  const pathname = usePathname()
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)

  const normalizedPath = (pathname || '').replace(/\/$/, '')
  const isRootTab = ROOT_NAV_PATHS.has(normalizedPath)

  const touchState = useRef({
    startX: 0,
    startY: 0,
    startTime: 0,
    isEdgeSwipe: false,
    isConfirmed: false,
    hasTriggeredHaptic: false,
    history: [] as { x: number; time: number }[],
  })

  const [dragOffset, setDragOffset] = useState<number | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const isNavigatingRef = useRef(false)

  // Reset navigating state when pathname changes
  useEffect(() => {
    isNavigatingRef.current = false
    setDragOffset(null)
    setIsAnimating(false)
  }, [pathname])

  // Native interactive edge-swipe-to-go-back gesture (active on child/inner pages)
  useEffect(() => {
    if (isRootTab) return

    const container = containerRef.current
    if (!container) return

    const onTouchStart = (e: TouchEvent) => {
      if (isNavigatingRef.current) return
      if (e.touches.length !== 1) return
      const touch = e.touches[0]

      // Only engage if touch started within 28px of the left screen edge
      if (touch.clientX > 28) {
        touchState.current.isEdgeSwipe = false
        return
      }

      // Respect input controls or explicit swipe-opt-outs
      const target = e.target as HTMLElement | null
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.closest('input[type="range"]') ||
        target?.closest('[data-prevent-swipe-back]')
      ) {
        touchState.current.isEdgeSwipe = false
        return
      }

      touchState.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        isEdgeSwipe: true,
        isConfirmed: false,
        hasTriggeredHaptic: false,
        history: [{ x: touch.clientX, time: Date.now() }],
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!touchState.current.isEdgeSwipe || isNavigatingRef.current) return
      const touch = e.touches[0]
      const deltaX = touch.clientX - touchState.current.startX
      const deltaY = touch.clientY - touchState.current.startY

      // Disambiguate intent during the initial 10px
      if (!touchState.current.isConfirmed) {
        if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
          // Vertical scrolling takes precedence
          touchState.current.isEdgeSwipe = false
          setDragOffset(null)
          return
        }
        if (deltaX > 10 && deltaX > Math.abs(deltaY)) {
          touchState.current.isConfirmed = true
        } else {
          return
        }
      }

      // Direct 1:1 rightward tracking
      if (deltaX > 0) {
        if (e.cancelable) e.preventDefault()

        touchState.current.history.push({ x: touch.clientX, time: Date.now() })
        if (touchState.current.history.length > 5) touchState.current.history.shift()

        // Crisp light haptic upon reaching commit threshold
        if (deltaX > 80 && !touchState.current.hasTriggeredHaptic) {
          touchState.current.hasTriggeredHaptic = true
          haptics.light()
        }

        setDragOffset(deltaX)
      }
    }

    const onTouchEnd = () => {
      if (!touchState.current.isEdgeSwipe || !touchState.current.isConfirmed || isNavigatingRef.current) {
        touchState.current.isEdgeSwipe = false
        setDragOffset(null)
        return
      }

      const history = touchState.current.history
      let velocity = 0
      if (history.length >= 2) {
        const first = history[0]
        const last = history[history.length - 1]
        const dt = last.time - first.time
        const dx = last.x - first.x
        if (dt > 0) velocity = dx / dt
      }

      const currentOffset = dragOffset ?? 0
      const isCommitted = currentOffset > 85 || velocity > 0.45

      setIsAnimating(true)

      if (isCommitted) {
        isNavigatingRef.current = true
        const exitWidth = typeof window !== 'undefined' ? window.innerWidth : 400
        setDragOffset(exitWidth)
        setTimeout(() => {
          setDragOffset(null)
          setIsAnimating(false)
          router.back()
        }, 220)
      } else {
        setDragOffset(0)
        setTimeout(() => {
          setDragOffset(null)
          setIsAnimating(false)
        }, 200)
      }

      touchState.current.isEdgeSwipe = false
    }

    container.addEventListener('touchstart', onTouchStart, { passive: true })
    container.addEventListener('touchmove', onTouchMove, { passive: false })
    container.addEventListener('touchend', onTouchEnd, { passive: true })
    container.addEventListener('touchcancel', onTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchmove', onTouchMove)
      container.removeEventListener('touchend', onTouchEnd)
      container.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [isRootTab, dragOffset, router])

  const dragStyle: React.CSSProperties =
    dragOffset !== null
      ? {
          transform: `translate3d(${dragOffset}px, 0, 0)`,
          transition: isAnimating ? 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
          boxShadow: dragOffset > 0 ? '-12px 0 28px rgba(0, 0, 0, 0.14)' : 'none',
          willChange: 'transform',
        }
      : {}

  return (
    <div
      ref={containerRef}
      key={pathname}
      className={`app-page-transition ${className}`}
      style={dragStyle}
    >
      {children}
    </div>
  )
}

