import React, { createContext, useContext, useState, useRef, useCallback } from 'react'
import { AlertCircle } from 'lucide-react'

export interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  danger = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" style={{ alignItems: 'center' }} onClick={onCancel}>
      <div
        className="modal-content"
        style={{ maxWidth: '400px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '32px', textAlign: 'center' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: danger ? '#fee2e2' : 'var(--accent-faint)',
              color: danger ? '#dc2626' : 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <AlertCircle size={32} />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>{title}</h3>
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '14px',
              marginBottom: '28px',
              lineHeight: 1.6,
            }}
          >
            {message}
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onCancel}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'var(--white)',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                background: danger ? '#dc2626' : 'var(--accent)',
                color: 'var(--white)',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Context & Hook implementation ──────────────────────────────────────────

interface ConfirmOptions {
  title: string
  message: string
  danger?: boolean
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined)

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    title: string
    message: string
    danger: boolean
  }>({
    isOpen: false,
    title: '',
    message: '',
    danger: false,
  })

  // We store the resolver function so we can resolve the promise when the user clicks confirm/cancel
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
      setModalState({
        isOpen: true,
        title: options.title,
        message: options.message,
        danger: options.danger || false,
      })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current(true)
      resolveRef.current = null
    }
    setModalState((prev) => ({ ...prev, isOpen: false }))
  }, [])

  const handleCancel = useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current(false)
      resolveRef.current = null
    }
    setModalState((prev) => ({ ...prev, isOpen: false }))
  }, [])

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmModal
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        danger={modalState.danger}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  )
}

export const useConfirm = () => {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context
}
