'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { createPortal } from 'react-dom'

export interface SelectOption {
  label: string
  shortLabel?: string
  value: string
}

interface FormSelectProps {
  label?: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  triggerClassName?: string
  placeholder?: string
  width?: string | number
  style?: React.CSSProperties
  triggerStyle?: React.CSSProperties
  menuStyle?: React.CSSProperties
  icon?: React.ReactNode
  chevronSize?: number
  searchable?: boolean
}

export function FormSelect({
  label,
  value,
  options,
  onChange,
  disabled,
  className = '',
  triggerClassName = '',
  placeholder = 'Select an option',
  width,
  style,
  triggerStyle,
  menuStyle,
  icon,
  chevronSize = 16,
  searchable = false
}: FormSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

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
  const displayLabel = activeOption ? (activeOption.shortLabel || activeOption.label) : placeholder

  const handleSelect = (val: string) => {
    onChange(val)
    setIsOpen(false)
    setSearchQuery('')
  }

  const filteredOptions = searchable && searchQuery
    ? options.filter(o => o.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options

  const menuContent = (
    <div
      className="upward-form-select-menu animate-scale-in"
      onClick={e => e.stopPropagation()}
      style={{ ...menuStyle, display: 'flex', flexDirection: 'column' }}
    >
      <div className="upward-filter-menu__header mobile-only" style={{ display: isMobile ? 'flex' : 'none', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{label || placeholder}</h3>
        <button type="button" className="btn-icon" onClick={() => setIsOpen(false)} style={{ width: 28, height: 28 }}>✕</button>
      </div>
      <div className="upward-filter-menu__content" style={{ flex: 1, maxHeight: isMobile ? '60vh' : '300px', overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
        {searchable && (
          <div style={{ padding: '8px 12px', position: 'sticky', top: 0, background: 'white', zIndex: 2, borderBottom: '1px solid var(--border)' }}>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px', outline: 'none' }}
              onClick={e => e.stopPropagation()}
            />
          </div>
        )}
        {filteredOptions.length === 0 && (
          <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 14 }}>No options found</div>
        )}
        {filteredOptions.map(option => (
          <button
            key={option.value}
            type="button"
            className={`upward-filter-item ${value === option.value ? 'upward-filter-item--active' : ''}`}
            onClick={() => handleSelect(option.value)}
          >
            {option.label}
          </button>
        ))}
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

  const containerStyles: React.CSSProperties = {
    position: 'relative',
    width: width ? width : undefined,
    ...style,
  }

  const buttonStyles: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    textAlign: 'left',
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: disabled ? 'var(--bg-soft)' : 'white',
    ...triggerStyle,
  }

  return (
    <div className={`upward-form-select-container ${className}`} ref={containerRef} style={containerStyles}>
      <button
        type="button"
        disabled={disabled}
        className={`form-input upward-form-select-trigger ${triggerClassName} ${isOpen ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        style={buttonStyles}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: activeOption ? 'var(--text)' : 'var(--text-muted)' }}>
          {icon}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayLabel}</span>
        </span>
        <ChevronDown size={chevronSize} style={{ color: 'var(--text-muted)', flexShrink: 0, transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </button>

      {/* Render mobile portal or inline desktop menu */}
      {isMobile ? mobilePortal : (isOpen && menuContent)}
    </div>
  )
}
