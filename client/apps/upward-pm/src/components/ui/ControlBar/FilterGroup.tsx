'use client'

import React, { useRef, useState, useEffect } from 'react'
import { ChevronRight, ChevronLeft } from 'lucide-react'

interface FilterGroupProps {
  children: React.ReactNode
  className?: string
}

export function FilterGroup({ children, className = '' }: FilterGroupProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [scrollState, setScrollState] = useState<'start' | 'middle' | 'end'>('start')
  const [isMobile, setIsMobile] = useState(false)
  const [canScroll, setCanScroll] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleScroll = () => {
    if (!scrollContainerRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
    
    setCanScroll(scrollWidth > clientWidth)

    if (scrollLeft <= 5) {
      setScrollState('start')
    } else if (Math.ceil(scrollLeft + clientWidth) >= scrollWidth - 5) {
      setScrollState('end')
    } else {
      setScrollState('middle')
    }
  }

  // Check scroll on mount and when children change
  useEffect(() => {
    handleScroll()
    // Small delay to ensure DOM is fully rendered
    const timeout = setTimeout(handleScroll, 100)
    return () => clearTimeout(timeout)
  }, [children, isMobile])

  return (
    <div className={`upward-filter-group-wrapper ${className}`} style={{ position: 'relative', width: '100%' }}>
      <div 
        className="upward-filter-group" 
        ref={scrollContainerRef}
        onScroll={handleScroll}
      >
        {children}
      </div>
      
      {isMobile && canScroll && scrollState !== 'end' && (
        <div className="scroll-hint-icon scroll-hint-right" onClick={() => scrollContainerRef.current?.scrollBy({ left: 150, behavior: 'smooth' })}>
          <ChevronRight size={18} />
        </div>
      )}
      
      {isMobile && canScroll && scrollState === 'end' && (
        <div className="scroll-hint-icon scroll-hint-left" onClick={() => scrollContainerRef.current?.scrollBy({ left: -150, behavior: 'smooth' })}>
          <ChevronLeft size={18} />
        </div>
      )}
    </div>
  )
}
