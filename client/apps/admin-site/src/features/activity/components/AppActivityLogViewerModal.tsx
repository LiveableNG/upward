import React, { useState } from 'react'
import { X, Copy, Check } from 'lucide-react'

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
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '650px',
          padding: '24px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            border: 'none',
          }}
        >
          <X size={20} />
        </button>

        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px 0' }}>Log Details</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
            UUID: {selectedLog.uuid}
          </p>
        </div>

        <div
          style={{
            background: 'var(--surface)',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '13px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>App:</span>
            <span>{selectedLog.app}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>IP Address:</span>
            <span>{selectedLog.ipAddress || '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>User Agent:</span>
            <span
              style={{
                maxWidth: '300px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={selectedLog.userAgent || ''}
            >
              {selectedLog.userAgent || '—'}
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
            <span className="section-label" style={{ fontSize: '12px' }}>
              Request Payload & Metadata
            </span>
            <button
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
                <Check size={14} style={{ color: 'var(--success)' }} />
              ) : (
                <Copy size={14} />
              )}
              {copied ? 'Copied!' : 'Copy JSON'}
            </button>
          </div>
          <pre
            style={{
              background: '#1e293b',
              color: '#f8fafc',
              padding: '16px',
              borderRadius: '10px',
              fontSize: '12px',
              overflowX: 'auto',
              maxHeight: '300px',
              margin: 0,
              fontFamily: 'monospace',
            }}
          >
            {JSON.stringify(selectedLog.metadata || {}, null, 2)}
          </pre>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button
            onClick={onClose}
            className="btn btn-primary"
            style={{ padding: '8px 16px', borderRadius: '8px' }}
          >
            Close View
          </button>
        </div>
      </div>
    </div>
  )
}
