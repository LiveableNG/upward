import React from 'react'
import { createPortal } from 'react-dom'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  maxWidth?: string
  children: React.ReactNode
  footerActions?: React.ReactNode
  hideHeader?: boolean
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  icon,
  maxWidth = '480px',
  children,
  footerActions,
  hideHeader = false,
}) => {
  if (!isOpen) return null

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '32px' }}>
          {!hideHeader && (
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}
            >
              {icon && (
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'var(--accent-faint)',
                    border: '1px solid var(--accent-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent)',
                    flexShrink: 0,
                  }}
                >
                  {icon}
                </div>
              )}
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{title}</h3>
                {description && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
                    {description}
                  </p>
                )}
              </div>
            </div>
          )}

          {children}

          {footerActions && (
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>{footerActions}</div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
