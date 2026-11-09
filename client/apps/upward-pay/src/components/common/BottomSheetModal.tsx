'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import '@/styles/bottom-sheet-modal.css'

export interface BottomSheetModalProps {
  isOpen: boolean
  onClose: () => void
  title?: React.ReactNode
  subtitle?: React.ReactNode
  icon?: React.ReactNode
  headerActions?: React.ReactNode
  showClose?: boolean
  showHandle?: boolean
  maxWidth?: string | number | 'sm' | 'md' | 'lg' | 'xl'
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
  panelClassName?: string
  bodyClassName?: string
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
}

const resolveMaxWidth = (width?: string | number | 'sm' | 'md' | 'lg' | 'xl'): string => {
  if (!width) return '500px'
  if (width === 'sm') return '420px'
  if (width === 'md') return '500px'
  if (width === 'lg') return '600px'
  if (width === 'xl') return '720px'
  if (typeof width === 'number') return `${width}px`
  return width
}

export function BottomSheetModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  headerActions,
  showClose = true,
  showHandle = true,
  maxWidth = 'md',
  children,
  footer,
  className = '',
  panelClassName = '',
  bodyClassName = '',
  closeOnOverlayClick = true,
  closeOnEscape = true,
}: BottomSheetModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0
    const originalHtmlOverflow = document.documentElement.style.overflow
    const originalBodyOverflow = document.body.style.overflow
    const originalBodyPosition = document.body.style.position
    const originalBodyTop = document.body.style.top
    const originalBodyWidth = document.body.style.width

    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.width = '100%'

    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow
      document.body.style.overflow = originalBodyOverflow
      document.body.style.position = originalBodyPosition
      document.body.style.top = originalBodyTop
      document.body.style.left = ''
      document.body.style.right = ''
      document.body.style.width = originalBodyWidth

      window.scrollTo(0, scrollY)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closeOnEscape, onClose])

  if (!mounted || !isOpen || typeof document === 'undefined') {
    return null
  }

  const maxWidthStyle = { maxWidth: resolveMaxWidth(maxWidth) }

  return createPortal(
    <div
      className={`sheet-modal__backdrop ${className}`.trim()}
      onClick={(e) => {
        if (closeOnOverlayClick && e.target === e.currentTarget) {
          onClose()
        }
      }}
      onTouchMove={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault()
        }
      }}
      role="presentation"
    >
      <div
        className={`sheet-modal__panel ${panelClassName}`.trim()}
        style={maxWidthStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
      >
        {showHandle && <div className="sheet-modal__handle" aria-hidden="true" />}

        {(title || subtitle || showClose || headerActions || icon) && (
          <div className="sheet-modal__header">
            <div className="sheet-modal__header-left">
              {icon && <div className="sheet-modal__icon">{icon}</div>}
              <div className="sheet-modal__title-wrap">
                {title &&
                  (typeof title === 'string' ? (
                    <h3 className="sheet-modal__title">{title}</h3>
                  ) : (
                    title
                  ))}
                {subtitle &&
                  (typeof subtitle === 'string' ? (
                    <p className="sheet-modal__subtitle">{subtitle}</p>
                  ) : (
                    subtitle
                  ))}
              </div>
            </div>

            <div className="sheet-modal__header-actions">
              {headerActions}
              {showClose && (
                <button
                  type="button"
                  className="sheet-modal__close"
                  onClick={onClose}
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        )}

        <div className={`sheet-modal__body ${bodyClassName}`.trim()}>{children}</div>

        {footer && <div className="sheet-modal__footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
