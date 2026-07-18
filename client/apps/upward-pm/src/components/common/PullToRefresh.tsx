'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

interface PullToRefreshProps {
  children: React.ReactNode
}

export function PullToRefresh({ children }: PullToRefreshProps) {
  const queryClient = useQueryClient()
  const router = useRouter()

  const [startY, setStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [isPulling, setIsPulling] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth > 1024) return

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0) return
      setStartY(e.touches[0].clientY)
      setIsPulling(true)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || refreshing || window.scrollY > 0) return
      
      const y = e.touches[0].clientY
      const pullDistance = y - startY
      
      if (pullDistance > 0) {
        if (e.cancelable) {
          e.preventDefault()
        }
        setCurrentY(Math.min(pullDistance * 0.4, 80))
      }
    }

    const handleTouchEnd = () => {
      if (!isPulling) return
      
      if (currentY >= 60 && !refreshing) {
        setRefreshing(true)
        setCurrentY(60)
        
        setTimeout(async () => {
          try {
            await queryClient.invalidateQueries()
            router.refresh()
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('app:refresh'))
            }
          } finally {
            setRefreshing(false)
            setCurrentY(0)
          }
        }, 500)
      } else {
        setCurrentY(0)
      }
      
      setIsPulling(false)
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [startY, currentY, isPulling, refreshing])

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', minHeight: '100%' }}>
      <div 
        style={{
          position: 'absolute',
          top: -60,
          left: 0,
          right: 0,
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: isPulling ? 'none' : 'transform 0.3s ease',
          transform: `translateY(${currentY}px)`,
          zIndex: 50,
          opacity: Math.min(currentY / 60, 1),
          pointerEvents: 'none'
        }}
      >
        <div style={{
          background: 'var(--surface, #ffffff)',
          borderRadius: '50%',
          padding: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {refreshing ? (
            <Loader2 size={24} color="var(--forest, #2d5a27)" className="animate-spin" />
          ) : (
            <RefreshCw 
              size={24} 
              color="var(--text-muted, #6b7280)" 
              style={{ 
                transform: `rotate(${currentY * 3}deg)`,
                opacity: currentY > 20 ? 1 : 0.5 
              }} 
            />
          )}
        </div>
      </div>
      
      <div 
        style={{ 
          transition: isPulling ? 'none' : 'transform 0.3s ease',
          transform: currentY > 0 ? `translateY(${currentY}px)` : 'none',
          minHeight: '100%',
          width: '100%'
        }}
      >
        {children}
      </div>
    </div>
  )
}
