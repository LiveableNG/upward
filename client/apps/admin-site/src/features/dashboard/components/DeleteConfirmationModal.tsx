import React from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle } from 'lucide-react'

interface DeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  ids: string[]
  onConfirm: (ids: string[]) => void
  deleting: boolean
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  ids,
  onConfirm,
  deleting,
}) => {
  if (!isOpen) return null

  return createPortal(
    <div className="modal-overlay" style={{ alignItems: 'center' }} onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '32px', textAlign: 'center' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <AlertTriangle size={32} />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>
            Delete {ids.length > 1 ? `${ids.length} waitlist items` : 'waitlist user'}?
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '32px', lineHeight: 1.6 }}>
            This will permanently delete the selected waitlist entries. This action is irreversible.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onClose}
              className="btn btn-secondary"
              style={{ flex: 1, height: '44px' }}
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(ids)}
              className="btn btn-primary"
              style={{ flex: 1, backgroundColor: '#dc2626', height: '44px' }}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
