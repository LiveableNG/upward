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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const activeOption = options?.find(o => o.value === value)
  const displayLabel = activeOption ? activeOption.label : label

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

      {isOpen && (
        <div className="upward-filter-menu animate-scale-in">
          {options ? (
            options.map(option => (
              <button
                key={option.value}
                className={`upward-filter-item ${value === option.value ? 'upward-filter-item--active' : ''}`}
                onClick={() => {
                  onChange?.(option.value)
                  setIsOpen(false)
                }}
              >
                {option.label}
              </button>
            ))
          ) : children}
        </div>
      )}
    </div>
  )
}
