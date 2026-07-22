import React from 'react'
import { Modal } from '../../../components/common/modal/Modal'

export interface FeedbackLog {
  id: number
  uuid: string
  userId: number | null
  email: string | null
  name: string | null
  type: string // BUG, SUGGESTION, DIFFICULTY, OTHER
  message: string
  createdAt: string
}

interface FeedbackDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  selectedLog: FeedbackLog | null
  getTypeColor: (type: string) => string
}

export const FeedbackDetailsModal: React.FC<FeedbackDetailsModalProps> = ({
  isOpen,
  onClose,
  selectedLog,
  getTypeColor,
}) => {
  if (!selectedLog) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Feedback Details" maxWidth="600px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                padding: '4px 12px',
                borderRadius: '20px',
                background: `${getTypeColor(selectedLog.type)}15`,
                color: getTypeColor(selectedLog.type),
              }}
            >
              {selectedLog.type}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {new Date(selectedLog.createdAt).toLocaleString()}
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: 'var(--surface)',
            padding: '16px',
            borderRadius: '12px',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              Sender Name
            </span>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              {selectedLog.name || 'Anonymous'}
            </div>
          </div>
          <div>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              Sender Email
            </span>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              {selectedLog.email || 'No email provided'}
            </div>
          </div>
          {selectedLog.userId && (
            <div>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                User ID
              </span>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>{selectedLog.userId}</div>
            </div>
          )}
        </div>

        <div>
          <span
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              fontWeight: 600,
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: '6px',
            }}
          >
            Feedback Message
          </span>
          <div
            style={{
              fontSize: '14px',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              background: 'var(--surface)',
              padding: '16px',
              borderRadius: '12px',
              maxHeight: '200px',
              overflowY: 'auto',
            }}
          >
            {selectedLog.message}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button onClick={onClose} className="btn btn-primary">
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
