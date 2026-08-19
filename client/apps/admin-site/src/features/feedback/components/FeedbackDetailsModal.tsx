import React from 'react'
import { Modal } from '../../../components/common/modal/Modal'

export interface FeedbackLog {
  id: number
  uuid: string
  userId: number | null
  pmId?: number | null
  source?: 'UPWARD_PM' | 'UPWARD_PAY' | 'GUEST'
  email: string | null
  name: string | null
  type: string // BUG, SUGGESTION, DIFFICULTY, OTHER
  message: string
  createdAt: string
  user?: { id: number; firstName: string; lastName: string; email: string } | null
  pm?: { id: number; uuid: string; firstName: string; lastName: string; email: string; businessName?: string } | null
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

  const getSourceBadge = (source?: string) => {
    switch (source) {
      case 'UPWARD_PM':
        return { label: 'Upward PM (Property Manager)', bg: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }
      case 'UPWARD_PAY':
        return { label: 'Upward Pay (Tenant)', bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }
      default:
        return { label: 'Website Guest / Public', bg: 'rgba(156, 163, 175, 0.1)', color: '#6b7280' }
    }
  }

  const sourceBadge = getSourceBadge(selectedLog.source)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Feedback Details" maxWidth="600px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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

              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: sourceBadge.bg,
                  color: sourceBadge.color,
                }}
              >
                {sourceBadge.label}
              </span>
            </div>

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
          {selectedLog.pm && (
            <div>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                PM Business / Account
              </span>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>
                {selectedLog.pm.businessName || `${selectedLog.pm.firstName} ${selectedLog.pm.lastName}`} (PM ID: {selectedLog.pm.id})
              </div>
            </div>
          )}
          {selectedLog.user && (
            <div>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                Tenant User Account
              </span>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>
                {selectedLog.user.firstName} {selectedLog.user.lastName} (User ID: {selectedLog.user.id})
              </div>
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
