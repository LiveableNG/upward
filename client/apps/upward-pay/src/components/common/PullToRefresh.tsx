'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Loader2, ArrowDown } from 'lucide-react'

interface PullToRefreshProps {
  onRefresh: () => Promise<unknown>
  children: React.ReactNode
  disabled?: boolean
  className?: string
}

const THRESHOLD = 65
const MAX_PULL = 95
const RESISTANCE = 0.45

export function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
  className = '',
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef(0)
  const isPulling = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing) return

      // Only allow pull if we are at the very top of scroll
      const scrollTop =
        containerRef.current?.scrollTop ||
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        0

      if (scrollTop <= 2) {
        startY.current = e.touches[0].clientY
        isPulling.current = true
      }
    },
    [disabled, isRefreshing]
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isPulling.current || disabled || isRefreshing) return

      const currentY = e.touches[0].clientY
      const diff = currentY - startY.current

      if (diff > 0) {
        // Logarithmic / diminishing returns pull distance
        const distance = Math.min(diff * RESISTANCE, MAX_PULL)
        setPullDistance(distance)

        // Prevent native overscroll when dragging down at top
        if (e.cancelable && distance > 5) {
          e.preventDefault()
        }
      } else {
        isPulling.current = false
        setPullDistance(0)
      }
    },
    [disabled, isRefreshing]
  )

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return
    isPulling.current = false

    if (pullDistance >= THRESHOLD && !isRefreshing) {
      setIsRefreshing(true)
      setPullDistance(52) // Hold at spinner height
      try {
        await onRefresh()
      } catch (err) {
        console.error('Pull-to-refresh failed', err)
      } finally {
        setTimeout(() => {
          setIsRefreshing(false)
          setPullDistance(0)
        }, 300)
      }
    } else {
      setPullDistance(0)
    }
  }, [pullDistance, isRefreshing, onRefresh])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd)
    el.addEventListener('touchcancel', handleTouchEnd)

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
      el.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  const progress = Math.min(pullDistance / THRESHOLD, 1)

  return (
    <div
      ref={containerRef}
      className={`ptr-container ${className}`}
      style={{
        transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : 'none',
        transition: isPulling.current ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Floating Indicator */}
      <div
        className={`ptr-indicator ${pullDistance > 0 || isRefreshing ? 'is-visible' : ''}`}
        style={{
          opacity: isRefreshing ? 1 : progress,
          transform: `scale(${0.6 + progress * 0.4})`,
        }}
      >
        {isRefreshing ? (
          <Loader2 className="ptr-spinner animate-spin" size={20} />
        ) : (
          <ArrowDown
            className="ptr-arrow"
            size={18}
            style={{
              transform: `rotate(${progress * 180}deg)`,
              transition: 'transform 0.15s ease',
            }}
          />
        )}
      </div>

      {children}
    </div>
  )
}
