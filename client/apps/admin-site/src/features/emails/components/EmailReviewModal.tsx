import React from 'react'
import { Trash2 } from 'lucide-react'
import { Modal } from '../../../components/common/modal/Modal'

export interface EmailRecipient {
  id: string
  email: string
  name: string
  type: 'TENANT' | 'PM' | 'WAITLIST'
}

interface EmailReviewModalProps {
  isOpen: boolean
  onClose: () => void
  recipients: EmailRecipient[]
  onRemoveRecipient: (id: string) => void
  onClearAll: () => void
}

export const EmailReviewModal: React.FC<EmailReviewModalProps> = ({
  isOpen,
  onClose,
  recipients,
  onRemoveRecipient,
  onClearAll,
}) => {
  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Review Mailing List (${recipients.length})`}
      maxWidth="500px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {recipients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              No recipients added yet.
            </div>
          ) : (
            recipients.map((rec) => (
              <div
                key={rec.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, fontSize: '13px', display: 'block' }}>
                    {rec.name}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{rec.email}</span>
                </div>
                <button
                  onClick={() => onRemoveRecipient(rec.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--danger)',
                    padding: '4px',
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            paddingTop: '8px',
          }}
        >
          <button
            onClick={() => {
              onClearAll()
              onClose()
            }}
            style={{
              padding: '8px 14px',
              background: 'none',
              border: '1px solid var(--border)',
              color: 'var(--danger)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            className="btn btn-primary"
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  )
}
