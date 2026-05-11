'use client'

import React, { useEffect } from 'react'
import { X, LucideIcon } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  icon?: LucideIcon
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: number | string
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  subtitle, 
  icon: Icon, 
  children, 
  footer,
  maxWidth = 540
}: ModalProps) {
  
  // Handle escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="upward-modal-overlay" onClick={onClose}>
      <div 
        className="upward-modal" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth }}
      >
        <header className="upward-modal__header">
          <div className="upward-modal__title-group">
            {Icon && (
              <div className="upward-modal__icon">
                <Icon size={22} />
              </div>
            )}
            <div>
              <h2 className="upward-modal__title">{title}</h2>
              {subtitle && <p className="upward-modal__subtitle">{subtitle}</p>}
            </div>
          </div>
          <button className="upward-modal__close" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </header>

        <div className="upward-modal__body">
          {children}
        </div>

        {footer && (
          <footer className="upward-modal__footer">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}
