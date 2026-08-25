'use client'

import React, { useEffect } from 'react'
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
  // Disable body scroll when modal is open
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

  // Handle escape key to close
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

  if (!isOpen) return null

  return (
    <div
      className="upward-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={`upward-modal-card upward-modal-card--${size} ${className} animate-in zoom-in-95 duration-200`}>
        {showClose && (
          <button className="upward-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={16} />
          </button>
        )}
        {children}
      </div>

      <style jsx>{`
        .upward-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 2000;
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
          position: relative;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.15);
          display: flex;
          flex-direction: column;
          overflow: hidden;
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
          transition: all 0.2s ease;
          z-index: 10;
        }

        .upward-modal-close:hover {
          background: var(--border-solid);
          color: var(--text);
          transform: scale(1.05);
        }
      `}</style>
    </div>
  )
}
