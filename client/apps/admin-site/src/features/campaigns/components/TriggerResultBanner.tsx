import React from 'react'
import { AlertTriangle, CheckCircle2, X } from 'lucide-react'

export interface TriggerResult {
  processed: number
  sent: number
  failed: number
  skipped: number
  details: { weekNumber: number; userCount: number; sent: number; failed: number; status: string }[]
}

interface TriggerResultBannerProps {
  triggerResult: TriggerResult
  onClose: () => void
}

export const TriggerResultBanner: React.FC<TriggerResultBannerProps> = ({
  triggerResult,
  onClose,
}) => {
  return (
    <div
      style={{
        marginBottom: '24px',
        padding: '20px 24px',
        borderRadius: '16px',
        background: triggerResult.failed > 0 ? '#fff7ed' : '#f0fdf4',
        border: `1px solid ${triggerResult.failed > 0 ? '#fed7aa' : '#bbf7d0'}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 700,
            fontSize: '15px',
          }}
        >
          {triggerResult.failed > 0 ? (
            <AlertTriangle size={18} color="#d97757" />
          ) : (
            <CheckCircle2 size={18} color="#16a34a" />
          )}
          Campaign Run Complete
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
          }}
        >
          <X size={16} />
        </button>
      </div>
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '14px' }}>
        {[
          { label: 'Processed', value: triggerResult.processed, color: '#111827' },
          { label: 'Sent', value: triggerResult.sent, color: '#16a34a' },
          { label: 'Failed', value: triggerResult.failed, color: '#dc2626' },
          { label: 'Skipped', value: triggerResult.skipped, color: '#9a3412' },
        ].map((s) => (
          <div key={s.label}>
            <span style={{ color: 'var(--text-muted)', marginRight: '6px' }}>{s.label}:</span>
            <strong style={{ color: s.color }}>{s.value}</strong>
          </div>
        ))}
      </div>
      {triggerResult.details.length > 0 && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {triggerResult.details.map((d) => (
            <div key={d.weekNumber} style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Week {d.weekNumber}: {d.userCount} user{d.userCount !== 1 ? 's' : ''} — {d.status}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
