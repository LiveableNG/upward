'use client'

import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  showClose?: boolean
  className?: string
}

export function Modal({
  isOpen,
  onClose,
  children,
  size = 'md',
  showClose = true,
  className = '',
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEscape)
    }
    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="upward-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={`upward-modal-card upward-modal-card--${size} ${className}`}>
        {showClose && (
          <button className="upward-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={16} />
          </button>
        )}
        {children}
      </div>

      <style jsx global>{`
        .upward-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 4000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .upward-modal-card {
          background: var(--surface, #ffffff);
          border: 1px solid var(--border-solid);
          border-radius: 28px;
          padding: 36px 24px 24px;
          width: 100%;
          max-height: calc(100dvh - 40px);
          position: relative;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.15);
          display: flex;
          flex-direction: column;
          overflow: auto;
        }

        .upward-modal-card--sm {
          max-width: 380px;
        }

        .upward-modal-card--md {
          max-width: 460px;
        }

        .upward-modal-card--lg {
          max-width: 600px;
        }

        .upward-modal-close {
          position: absolute;
          top: 18px;
          right: 18px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--surface2, #f5f5f7);
          border: none;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
        }
      `}</style>
    </div>,
    document.body,
  )
}
