import React from 'react'
import { BarChart2 } from 'lucide-react'
import { Modal } from '../../../components/common/modal/Modal'
import type { TrafficSourceRecord, TrafficVisitRecord } from '../types'

interface TrafficVisitsLogModalProps {
  isOpen: boolean
  source: TrafficSourceRecord | null
  visits: TrafficVisitRecord[]
  loading: boolean
  onClose: () => void
}

export const TrafficVisitsLogModal: React.FC<TrafficVisitsLogModalProps> = ({
  isOpen,
  source,
  visits,
  loading,
  onClose,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={source ? `Traffic Activity: ${source.name}` : 'Recent Visits Log'}
      description={
        source ? (
          <span>
            Identifier: <code style={{ color: '#8A4A2A', fontWeight: 700 }}>{source.identifier}</code> •{' '}
            Total: <b>{source.totalViews}</b> views (<b>{source.uniqueViews}</b> unique) •{' '}
            Conversions: <b>{source.conversions}</b>
          </span>
        ) : undefined
      }
      icon={<BarChart2 size={20} color="#8A4A2A" />}
      maxWidth="740px"
      footerActions={
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      <div>
        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading recent visit activity...
          </div>
        ) : visits.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No recorded visits yet for this link. Share the link to start tracking!
          </div>
        ) : (
          <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 600 }}>Timestamp</th>
                  <th style={{ padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 600 }}>Visitor / Session</th>
                  <th style={{ padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 600 }}>Referrer</th>
                  <th style={{ padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 600 }}>Path</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((v) => (
                  <tr key={v.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 10px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {new Date(v.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span
                        style={{
                          padding: '2px 7px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: v.isUnique ? '#dcfce7' : '#f3f4f6',
                          color: v.isUnique ? '#15803d' : '#4b5563',
                        }}
                      >
                        {v.isUnique ? 'Unique' : 'Repeat'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      <div>{v.visitorId.slice(0, 16)}...</div>
                    </td>
                    <td
                      style={{
                        padding: '8px 10px',
                        color: 'var(--text-secondary)',
                        maxWidth: '160px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {v.referer || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Direct</span>}
                    </td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '11.5px' }}>
                      {v.path}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  )
}
