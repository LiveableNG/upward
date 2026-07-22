import React from 'react'
import { Users, X, Loader2, AlertTriangle } from 'lucide-react'

export interface AudiencePreview {
  weekNumber: number
  userCount: number
  hasCampaign: boolean
  campaignLabel: string | null
  campaignSubject: string | null
  isActive: boolean
}

interface AudiencePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  loading: boolean
  audience: AudiencePreview[]
  campaignWeekSet: Set<number>
}

export const AudiencePreviewModal: React.FC<AudiencePreviewModalProps> = ({
  isOpen,
  onClose,
  loading,
  audience,
  campaignWeekSet,
}) => {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        style={{
          background: 'var(--white)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '620px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.15)',
        }}
      >
        <div
          style={{
            padding: '24px 28px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <Users size={20} color="var(--accent)" /> Audience Preview
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              Users grouped by which campaign week they'd currently receive.
            </p>
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
            <X size={22} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : audience.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
              No opted-in users yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {audience.map((row) => (
                <div
                  key={row.weekNumber}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '14px',
                    border: `1px solid ${row.hasCampaign && row.isActive ? 'rgba(217,119,87,0.25)' : 'var(--border)'}`,
                    background:
                      row.hasCampaign && row.isActive ? 'rgba(217,119,87,0.04)' : 'var(--surface)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background:
                          row.hasCampaign && row.isActive
                            ? 'linear-gradient(135deg, #d97757, #c2622e)'
                            : 'var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          color: row.hasCampaign && row.isActive ? 'rgba(255,255,255,0.8)' : '#999',
                          textTransform: 'uppercase',
                        }}
                      >
                        WK
                      </span>
                      <span
                        style={{
                          fontSize: '16px',
                          fontWeight: 800,
                          color: row.hasCampaign && row.isActive ? '#fff' : '#999',
                          lineHeight: 1,
                        }}
                      >
                        {row.weekNumber}
                      </span>
                    </div>
                    <div>
                      {row.campaignLabel && (
                        <div
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'var(--accent)',
                            textTransform: 'uppercase',
                            marginBottom: '2px',
                          }}
                        >
                          {row.campaignLabel}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: row.hasCampaign ? 'var(--text)' : 'var(--text-muted)',
                        }}
                      >
                        {row.hasCampaign ? (
                          row.campaignSubject
                        ) : (
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontWeight: 500,
                            }}
                          >
                            <AlertTriangle size={13} color="#d97757" /> No content (will skip)
                          </span>
                        )}
                      </div>
                      {row.hasCampaign && !row.isActive && (
                        <div style={{ fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' }}>
                          Paused
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div
                      style={{
                        fontSize: '22px',
                        fontWeight: 800,
                        color:
                          row.hasCampaign && row.isActive ? 'var(--accent)' : 'var(--text-muted)',
                      }}
                    >
                      {row.userCount}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      user{row.userCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              ))}

              {audience.filter((r) => !campaignWeekSet.has(r.weekNumber)).length > 0 && (
                <div
                  style={{
                    padding: '14px 18px',
                    borderRadius: '12px',
                    background: '#fff7ed',
                    border: '1px solid #fed7aa',
                    fontSize: '13px',
                    color: '#9a3412',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                  }}
                >
                  <AlertTriangle
                    size={15}
                    color="#d97757"
                    style={{ flexShrink: 0, marginTop: '1px' }}
                  />
                  <span>
                    <strong>Note:</strong> Some weeks have users but no campaign content — those
                    users will be skipped on campaign day.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
