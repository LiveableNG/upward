import React, { useState } from 'react'
import { Copy, Check, FileText } from 'lucide-react'
import { Modal } from '../../../components/common/modal/Modal'

interface AppActivityLogViewerModalProps {
  selectedLog: any | null
  onClose: () => void
}

export const AppActivityLogViewerModal: React.FC<AppActivityLogViewerModalProps> = ({
  selectedLog,
  onClose,
}) => {
  const [copied, setCopied] = useState(false)

  if (!selectedLog) return null

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal
      isOpen={!!selectedLog}
      onClose={onClose}
      title="Activity Log Details"
      description={`UUID: ${selectedLog.uuid || 'N/A'}`}
      icon={<FileText size={20} />}
      maxWidth="680px"
      footerActions={
        <button
          type="button"
          onClick={onClose}
          className="btn btn-primary"
          style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '13px' }}
        >
          Close View
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div
          style={{
            background: 'var(--surface)',
            padding: '14px',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            fontSize: '13px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Action:</span>
            <span style={{ fontWeight: 700 }}>{selectedLog.action}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>App:</span>
            <span>{selectedLog.app}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>User:</span>
            <span>{selectedLog.userEmail || (selectedLog.userId ? `User #${selectedLog.userId}` : 'Guest')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>IP Address:</span>
            <span style={{ fontFamily: 'monospace' }}>{selectedLog.ipAddress || '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Device:</span>
            <span
              style={{
                maxWidth: '350px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={selectedLog.userAgent || ''}
            >
              {selectedLog.deviceSummary || selectedLog.userAgent || '—'}
            </span>
          </div>
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Request Payload & Metadata
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(JSON.stringify(selectedLog.metadata || {}, null, 2))}
              style={{
                background: 'transparent',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {copied ? (
                <Check size={14} style={{ color: '#059669' }} />
              ) : (
                <Copy size={14} />
              )}
              {copied ? 'Copied!' : 'Copy JSON'}
            </button>
          </div>
          <pre
            style={{
              background: 'var(--bg)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              padding: '14px',
              borderRadius: '10px',
              fontSize: '12px',
              overflowX: 'auto',
              maxHeight: '260px',
              margin: 0,
              fontFamily: 'monospace',
            }}
          >
            {JSON.stringify(selectedLog.metadata || {}, null, 2)}
          </pre>
        </div>
      </div>
    </Modal>
  )
}
