'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { createPortal } from 'react-dom'

export interface SelectOption {
  label: string
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
}

export function FormSelect({
  label,
  value,
  options,
  onChange,
  disabled,
  className = '',
  triggerClassName = '',
  placeholder = 'Select an option'
}: FormSelectProps) {
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
  const displayLabel = activeOption ? activeOption.label : placeholder

  const handleSelect = (val: string) => {
    onChange(val)
    setIsOpen(false)
  }

  const menuContent = (
    <div className="upward-form-select-menu animate-scale-in" onClick={e => e.stopPropagation()}>
      <div className="upward-filter-menu__header mobile-only" style={{ display: isMobile ? 'flex' : 'none', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{label || placeholder}</h3>
        <button type="button" className="btn-icon" onClick={() => setIsOpen(false)} style={{ width: 28, height: 28 }}>✕</button>
      </div>
      <div className="upward-filter-menu__content" style={{ maxHeight: isMobile ? '60vh' : '300px', overflowY: 'auto' }}>
        {options.length === 0 && (
          <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 14 }}>No options available</div>
        )}
        {options.map(option => (
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

  return (
    <div className={`upward-form-select-container ${className}`} ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        disabled={disabled}
        className={`form-input upward-form-select-trigger ${triggerClassName} ${isOpen ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: disabled ? 'var(--bg-soft)' : 'white'
        }}
      >
        <span style={{ color: activeOption ? 'var(--text)' : 'var(--text-muted)' }}>{displayLabel}</span>
        <ChevronDown size={16} style={{ color: 'var(--text-muted)', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </button>

      {/* Render mobile portal or inline desktop menu */}
      {isMobile ? mobilePortal : (isOpen && menuContent)}
    </div>
  )
}
