'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, LucideIcon } from 'lucide-react'

interface FilterOption {
  label: string
  value: string
}

interface FilterDropdownProps {
  label: string
  value: string
  options?: FilterOption[]
  onChange?: (value: string) => void
  icon?: LucideIcon
  children?: React.ReactNode // For custom menu content
  className?: string
}

import { createPortal } from 'react-dom'

export function FilterDropdown({ 
  label, 
  value, 
  options, 
  onChange, 
  icon: Icon,
  children,
  className
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    // Only apply outside click listener for desktop (inline menu)
    if (!isMobile && isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, isMobile])

  const activeOption = options?.find(o => o.value === value)
  const displayLabel = activeOption ? activeOption.label : label

  const handleSelect = (val: string) => {
    onChange?.(val)
    setIsOpen(false)
  }

  const menuContent = (
    <div className="upward-filter-menu animate-scale-in" onClick={e => e.stopPropagation()}>
      <div className="upward-filter-menu__header mobile-only" style={{ display: isMobile ? 'flex' : 'none', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{label}</h3>
        <button className="btn-icon" onClick={() => setIsOpen(false)} style={{ width: 28, height: 28 }}>✕</button>
      </div>
      <div className="upward-filter-menu__content">
        {options ? (
          options.map(option => (
            <button
              key={option.value}
              className={`upward-filter-item ${value === option.value ? 'upward-filter-item--active' : ''}`}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </button>
          ))
        ) : children}
      </div>
    </div>
  )

  const mobilePortal = mounted && isOpen && isMobile ? (
    createPortal(
      <div className="upward-modal-overlay" style={{ zIndex: 9999, alignItems: 'flex-end', padding: 0 }} onClick={() => setIsOpen(false)}>
        {menuContent}
      </div>,
      document.body
    )
  ) : null;

  return (
    <div className={`upward-filter-dropdown ${className || ''}`} ref={containerRef}>
      <button 
        className={`upward-filter-trigger ${isOpen ? 'upward-filter-trigger--active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {Icon && <Icon size={16} />}
        <span>{displayLabel}</span>
        <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </button>

      {/* Render mobile portal or inline desktop menu */}
      {isMobile ? mobilePortal : (isOpen && menuContent)}
    </div>
  )
}
