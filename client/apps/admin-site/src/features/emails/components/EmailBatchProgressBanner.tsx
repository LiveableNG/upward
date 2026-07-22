import React from 'react'
import { AlertCircle, CheckCircle, RefreshCcw } from 'lucide-react'

export interface JobProgress {
  id: string
  total: number
  processed: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  message?: string
}

interface EmailBatchProgressBannerProps {
  batchProgress: JobProgress
  onDismiss: () => void
}

export const EmailBatchProgressBanner: React.FC<EmailBatchProgressBannerProps> = ({
  batchProgress,
  onDismiss,
}) => {
  return (
    <div
      className="card fade-in"
      style={{
        marginBottom: '24px',
        padding: '20px',
        borderLeft: `4px solid ${
          batchProgress.status === 'completed'
            ? 'var(--success)'
            : batchProgress.status === 'failed'
              ? 'var(--danger)'
              : 'var(--accent)'
        }`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '24px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        borderRadius: '16px',
        background: 'var(--white)',
      }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {batchProgress.status === 'completed' ? (
              <CheckCircle size={16} style={{ color: 'var(--success)' }} />
            ) : batchProgress.status === 'failed' ? (
              <AlertCircle size={16} style={{ color: 'var(--danger)' }} />
            ) : (
              <RefreshCcw size={16} className="spin" style={{ color: 'var(--accent)' }} />
            )}
            {batchProgress.status === 'completed'
              ? 'Batch Retry Completed'
              : batchProgress.status === 'failed'
                ? 'Batch Retry Failed'
                : `Retrying failed emails: ${batchProgress.processed} of ${batchProgress.total} processed`}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Job: {batchProgress.id.substring(0, 8)}
          </span>
        </div>

        {batchProgress.status !== 'completed' && batchProgress.status !== 'failed' && (
          <div
            style={{
              width: '100%',
              height: '8px',
              background: 'var(--surface-hover)',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${batchProgress.total > 0 ? Math.round((batchProgress.processed / batchProgress.total) * 100) : 0}%`,
                height: '100%',
                background: 'var(--accent)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        )}

        {batchProgress.message && (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {batchProgress.message}
          </div>
        )}
      </div>

      {(batchProgress.status === 'completed' || batchProgress.status === 'failed') && (
        <button
          onClick={onDismiss}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          Dismiss
        </button>
      )}
    </div>
  )
}
