import React from 'react'
import { AlertCircle, Trash2 } from 'lucide-react'
import { Modal } from '../../../components/common/modal/Modal'
import type { DeleteTarget } from '../types'

interface ConfirmDeleteModalProps {
  isOpen: boolean
  target: DeleteTarget | null
  deleting: boolean
  onClose: () => void
  onConfirm: () => void
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  target,
  deleting,
  onClose,
  onConfirm,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !deleting && onClose()}
      title="Confirm Record Deletion"
    >
      {target && (
        <div style={{ padding: '4px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: '#dc2626' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: '#fef2f2',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <AlertCircle size={24} color="#dc2626" />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Are you sure?</h4>
              <p style={{ margin: '2px 0 0 0', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                This action cannot be undone.
              </p>
            </div>
          </div>

          <p
            style={{
              fontSize: '14px',
              color: 'var(--text-primary)',
              background: '#fafafa',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
            }}
          >
            You are about to permanently delete the{' '}
            {target.type === 'APPLICATION'
              ? 'Academy Application'
              : target.type === 'EARLY_ACCESS'
              ? 'Early Access / Info Request'
              : target.type === 'TRAFFIC_SOURCE'
              ? 'Traffic Source Tracking Link'
              : 'Friend Referral & Reward Record'}{' '}
            for <strong>{target.name}</strong>.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={deleting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 18px',
                borderRadius: '8px',
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: deleting ? 'not-allowed' : 'pointer',
                opacity: deleting ? 0.7 : 1,
              }}
            >
              <Trash2 size={15} />
              {deleting ? 'Deleting...' : 'Yes, Delete Record'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
