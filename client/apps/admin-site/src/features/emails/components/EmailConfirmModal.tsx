import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal } from '../../../components/common/modal/Modal'

interface EmailConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  recipientsCount: number
  targetGroup: 'TENANTS' | 'PMS' | 'WAITLIST'
  subject: string
  content: string
  sending: boolean
  buildPreviewHtml: (content: string, subject: string) => string
}

export const EmailConfirmModal: React.FC<EmailConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  recipientsCount,
  targetGroup,
  subject,
  content,
  sending,
  buildPreviewHtml,
}) => {
  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Outgoing Dispatch" maxWidth="700px">
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <p style={{ margin: '-10px 0 16px 0', fontSize: '12px', color: 'var(--text-muted)' }}>
          Review the rendered template below before initiating bulk transmission.
        </p>

        <div
          style={{
            backgroundColor: '#f3f4f6',
            padding: '16px',
            borderRadius: '12px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <AlertTriangle size={24} color="var(--warning)" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '13px', lineHeight: 1.5 }}>
              You are about to send this campaign email to{' '}
              <strong style={{ color: 'var(--accent)' }}>{recipientsCount} recipient(s)</strong> as
              a <strong>{targetGroup}</strong> target campaign. This action cannot be undone.
            </div>
          </div>

          <div style={{ marginBottom: '16px', padding: '0 8px' }}>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Subject Line
            </span>
            <div
              style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px', color: 'var(--text)' }}
            >
              {subject}
            </div>
          </div>

          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: '12px',
              overflow: 'hidden',
              height: '360px',
              backgroundColor: 'var(--white)',
            }}
          >
            <iframe
              srcDoc={buildPreviewHtml(content, subject)}
              title="Final confirmation preview"
              style={{ width: '100%', height: '100%', border: 'none' }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            onClick={onClose}
            className="btn btn-outline"
            style={{
              padding: '12px 20px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            Cancel & Re-edit
          </button>
          <button
            onClick={onConfirm}
            disabled={sending}
            className="btn btn-primary"
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: sending ? 0.6 : 1,
            }}
          >
            {sending ? 'Sending...' : 'Confirm & Dispatch ✓'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
