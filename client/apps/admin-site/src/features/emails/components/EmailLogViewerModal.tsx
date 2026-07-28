import { AlertCircle, RotateCcw } from 'lucide-react'
import { Modal } from '../../../components/common/modal/Modal'

export interface EmailLog {
  id: string
  userId: string
  email: string
  subject: string
  type: string
  status: string
  channel?: 'EMAIL' | 'SMS' | 'WHATSAPP'
  recipient?: string
  body: string | null
  sentAt: string | null
  createdAt: string
  isOpened?: boolean
  openedAt?: string | null
  openCount?: number
  user: {
    firstName: string | null
    lastName: string | null
    email: string
  } | null
  registeredUser?: {
    firstName: string | null
    lastName: string | null
    email: string
  } | null
}

interface EmailLogViewerModalProps {
  viewLog: EmailLog | null
  onClose: () => void
  onRetry: (id: string) => void
  retrying: string | null
  getStatusColor: (status: string) => string
}

export const EmailLogViewerModal: React.FC<EmailLogViewerModalProps> = ({
  viewLog,
  onClose,
  onRetry,
  retrying,
  getStatusColor,
}) => {
  if (!viewLog) return null

  return (
    <Modal
      isOpen={!!viewLog}
      onClose={onClose}
      title="Message Live View"
      description={`Sent to ${viewLog.recipient || viewLog.email} on ${new Date(viewLog.createdAt).toLocaleString()}`}
      maxWidth="800px"
    >
      <div
        style={{
          padding: '0 24px 24px',
          display: 'flex',
          justifyContent: 'flex-end',
          borderBottom: '1px solid var(--border)',
          margin: '-24px -24px 24px -24px',
        }}
      >
        <button
          onClick={onClose}
          className="btn btn-primary"
          style={{ padding: '10px 24px', borderRadius: '12px' }}
        >
          Close Viewer
        </button>
      </div>
      {viewLog.status === 'FAILED' && (
        <div
          style={{
            background: '#fef2f2',
            borderBottom: '1px solid #fee2e2',
            padding: '12px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            margin: '-24px -28px 24px -28px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#dc2626',
              fontSize: '13px',
            }}
          >
            <AlertCircle size={16} />
            <span>This email failed to deliver. You can attempt a manual retry.</span>
          </div>
          <button
            onClick={() => onRetry(viewLog.id)}
            disabled={!!retrying}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: '#dc2626',
              color: '#fff',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              cursor: retrying === viewLog.id ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <RotateCcw size={14} className={retrying === viewLog.id ? 'spin' : ''} />
            {retrying === viewLog.id ? 'Processing Retry...' : 'Retry Now'}
          </button>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '80px 1fr',
          gap: '12px',
          marginBottom: '24px',
          fontSize: '14px',
        }}
      >
        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Subject:</span>
        <span style={{ fontWeight: 700 }}>{viewLog.subject}</span>

        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Status:</span>
        <span style={{ color: getStatusColor(viewLog.status), fontWeight: 700 }}>
          {viewLog.status}
        </span>
      </div>

      <div
        style={{
          borderRadius: '16px',
          border: '1px solid var(--border)',
          height: '400px',
          background: '#f3f4f6',
          overflow: 'hidden',
          padding: viewLog.channel !== 'EMAIL' ? '24px' : '0',
        }}
      >
        {viewLog.body ? (
          viewLog.channel === 'SMS' || viewLog.channel === 'WHATSAPP' ? (
            <div
              style={{
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                fontSize: '14px',
                lineHeight: '1.6',
                background: 'var(--white)',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                height: '100%',
                overflowY: 'auto',
              }}
            >
              {viewLog.body}
            </div>
          ) : (
            <iframe
              srcDoc={viewLog.body}
              title="Live Email View"
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          )
        ) : (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              padding: '48px',
              color: 'var(--text-muted)',
              textAlign: 'center',
              justifyContent: 'center',
            }}
          >
            <AlertCircle size={32} />
            <p style={{ width: '100%' }}>
              Live body content for this record was not logged or is empty.
            </p>
          </div>
        )}
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </Modal>
  )
}
