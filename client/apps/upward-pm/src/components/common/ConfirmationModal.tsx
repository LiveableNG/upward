import React from 'react'
import { AlertCircle, X } from 'lucide-react'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'primary'
  isPending?: boolean
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'primary',
  isPending = false
}) => {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--confirm" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="modal__icon-title">
            <div className={`modal__icon modal__icon--${type}`}>
              <AlertCircle size={24} />
            </div>
            <h2 className="modal__title">{title}</h2>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={20} /></button>
        </div>

        <p className="modal__desc" style={{ marginTop: 16 }}>{message}</p>

        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          <button 
            type="button" 
            className="btn btn--secondary" 
            style={{ flex: 1 }} 
            onClick={onClose}
            disabled={isPending}
          >
            {cancelText}
          </button>
          <button 
            type="button" 
            className={`btn ${type === 'danger' ? 'btn--danger' : 'btn--primary'}`} 
            style={{ flex: 1 }} 
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal--confirm {
          max-width: 400px;
        }
        .modal__icon-title {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .modal__icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal__icon--danger {
          background: #fef2f2;
          color: #ef4444;
        }
        .modal__icon--primary {
          background: var(--forest-faint);
          color: var(--forest);
        }
      `}</style>
    </div>
  )
}
