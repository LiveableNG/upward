import React, { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal } from '../../../components/common/modal/Modal'
import type { DeleteTarget } from '../types'

interface DeleteGoalItemModalProps {
  isOpen: boolean
  onClose: () => void
  target: DeleteTarget | null
  onConfirm: () => Promise<void>
}

export const DeleteGoalItemModal: React.FC<DeleteGoalItemModalProps> = ({
  isOpen,
  onClose,
  target,
  onConfirm,
}) => {
  const [deleting, setDeleting] = useState(false)

  if (!target) return null

  const getTargetLabel = () => {
    switch (target.type) {
      case 'CATEGORY':
        return 'Goal Category'
      case 'GOAL':
        return 'Goal'
      case 'COLLECTION':
        return 'Collection'
      case 'OFFERING':
        return 'Offering'
      case 'VENDOR':
        return 'Commerce Vendor'
      default:
        return 'Item'
    }
  }

  const handleConfirm = async () => {
    setDeleting(true)
    try {
      await onConfirm()
      onClose()
    } catch {
      // handled
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Delete ${getTargetLabel()}`}
      description="This action cannot be undone. Please confirm before proceeding."
      icon={<AlertTriangle size={20} color="var(--danger)" />}
      maxWidth="440px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
          Are you sure you want to permanently delete{' '}
          <strong style={{ color: 'var(--text)' }}>"{target.title}"</strong>?
        </p>

        {target.type === 'CATEGORY' && (
          <p
            style={{
              fontSize: '12px',
              color: 'var(--danger)',
              margin: 0,
              background: 'var(--danger-faint)',
              padding: '10px',
              borderRadius: '8px',
            }}
          >
            Note: Any goals currently inside this category must be deleted or moved before this
            category can be removed.
          </p>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            marginTop: '8px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border)',
          }}
        >
          <button type="button" onClick={onClose} className="btn btn-secondary" disabled={deleting}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="btn"
            style={{
              backgroundColor: 'var(--danger)',
              color: 'white',
            }}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : `Delete ${getTargetLabel()}`}
          </button>
        </div>
      </div>
    </Modal>
  )
}
