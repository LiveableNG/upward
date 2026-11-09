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
  const [keyboardOffset, setKeyboardOffset] = useState(0)
  const [availableHeight, setAvailableHeight] = useState<number | null>(null)

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

  // Virtual keyboard avoidance for mobile / Capacitor WebViews
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return

    const updateKeyboardPosition = () => {
      // Only apply on mobile viewport where bottom sheet mode is used
      if (window.innerWidth >= 640) {
        setKeyboardOffset(0)
        setAvailableHeight(null)
        return
      }

      const vv = window.visualViewport
      if (!vv) return

      const layoutHeight = window.innerHeight
      const visibleHeight = vv.height
      const offsetTop = vv.offsetTop || 0

      // Compute how much the bottom of the layout viewport is occluded by the soft keyboard
      const rawOffset = layoutHeight - (visibleHeight + offsetTop)

      // Use a threshold (e.g. 60px) to distinguish a soft keyboard from mobile browser address bar animations
      if (rawOffset > 60) {
        const offset = Math.round(rawOffset)
        setKeyboardOffset(offset)
        // Constrain max height so the panel never exceeds the visible viewport above the keyboard
        setAvailableHeight(Math.max(160, Math.round(visibleHeight - 16)))
      } else {
        setKeyboardOffset(0)
        setAvailableHeight(null)
      }
    }

    updateKeyboardPosition()

    const vv = window.visualViewport
    if (vv) {
      vv.addEventListener('resize', updateKeyboardPosition)
      vv.addEventListener('scroll', updateKeyboardPosition)
    }
    window.addEventListener('resize', updateKeyboardPosition)

    // Capacitor Native Keyboard plugin integration (if present)
    let cleanupCapacitor: (() => void) | undefined
    try {
      const cap = (window as unknown as {
        Capacitor?: {
          Plugins?: {
            Keyboard?: {
              addListener: (
                evt: string,
                cb: (info: { keyboardHeight?: number }) => void
              ) => Promise<{ remove: () => void }>
            }
          }
        }
      }).Capacitor
      const CapKeyboard = cap?.Plugins?.Keyboard
      if (CapKeyboard && typeof CapKeyboard.addListener === 'function') {
        const showPromise = CapKeyboard.addListener(
          'keyboardWillShow',
          (info: { keyboardHeight?: number }) => {
            if (info?.keyboardHeight && info.keyboardHeight > 60) {
              setKeyboardOffset(Math.round(info.keyboardHeight))
              const vvCurrent = window.visualViewport
              const vh = vvCurrent ? vvCurrent.height : window.innerHeight - info.keyboardHeight
              setAvailableHeight(Math.max(160, Math.round(vh - 16)))
            }
          }
        )
        const hidePromise = CapKeyboard.addListener('keyboardWillHide', () => {
          setKeyboardOffset(0)
          setAvailableHeight(null)
        })

        cleanupCapacitor = () => {
          showPromise?.then?.((h) => h?.remove?.())
          hidePromise?.then?.((h) => h?.remove?.())
        }
      }
    } catch {
      // Ignore if Capacitor is not present
    }

    return () => {
      if (vv) {
        vv.removeEventListener('resize', updateKeyboardPosition)
        vv.removeEventListener('scroll', updateKeyboardPosition)
      }
      window.removeEventListener('resize', updateKeyboardPosition)
      cleanupCapacitor?.()
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
  const isKeyboardOpen = keyboardOffset > 0

  const panelDynamicStyle: React.CSSProperties = {
    ...maxWidthStyle,
    ...(isKeyboardOpen
      ? {
          transform: `translateY(-${keyboardOffset}px)`,
          maxHeight: availableHeight ? `${availableHeight}px` : undefined,
          paddingBottom: 0,
          animation: 'none',
        }
      : undefined),
  }

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
        style={panelDynamicStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
      >
        {showHandle && (
          <div
            className="sheet-modal__handle"
            aria-hidden="true"
            onClick={() => {
              if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
                document.activeElement.blur()
              }
            }}
          />
        )}

        {(title || subtitle || showClose || headerActions || icon) && (
          <div className="sheet-modal__header">
            <div className="sheet-modal__header-left">
              {icon && <div className="sheet-modal__icon">{icon}</div>}
              <div className="sheet-modal__title-wrap">
                {title && (
                  typeof title === 'string' ? (
                    <h3 className="sheet-modal__title">{title}</h3>
                  ) : (
                    title
                  )
                )}
                {subtitle && (
                  typeof subtitle === 'string' ? (
                    <p className="sheet-modal__subtitle">{subtitle}</p>
                  ) : (
                    subtitle
                  )
                )}
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

        <div className={`sheet-modal__body ${bodyClassName}`.trim()}>
          {children}
        </div>

        {footer && (
          <div className="sheet-modal__footer">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
