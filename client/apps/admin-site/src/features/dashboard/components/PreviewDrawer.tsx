import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Mail, Phone, Calendar, ExternalLink, CreditCard, Building2, UserCheck, Clock, Compass } from 'lucide-react'
import { Link } from 'react-router-dom'

export type DrawerEntity = {
  kind: 'user' | 'pm'
  uuid: string
  name: string
  email: string
  phone?: string
  status: string
  type: string
  upwardScore?: {
    score: number
    maxScore: number
    band: string
    color: string
  }
  invitedAt?: string | null
  joinedAt?: string | null
  createdAt?: string
  hearAboutUs?: string | null
  transactionCount?: number
  totalPaid?: number
  propertyCount?: number
  transactions?: any[]
  paymentRequests?: any[]
}

interface PreviewDrawerProps {
  entity: DrawerEntity | null
  onClose: () => void
}

const statusColors: Record<string, { bg: string; color: string }> = {
  TENANT: { bg: 'var(--success-faint)', color: 'var(--success)' },
  PENDING_TENANT: { bg: 'var(--warning-faint)', color: 'var(--warning)' },
  VERIFIED: { bg: 'var(--success-faint)', color: 'var(--success)' },
  UNVERIFIED: { bg: 'var(--warning-faint)', color: 'var(--warning)' },
  SUSPENDED: { bg: 'var(--danger-faint)', color: 'var(--danger)' },
  DEFAULT: { bg: 'rgba(99,102,241,0.08)', color: '#6366f1' },
}

const getStatusStyle = (status: string) => statusColors[status] || statusColors.DEFAULT

const PreviewDrawer: React.FC<PreviewDrawerProps> = ({ entity, onClose }) => {
  const isOpen = !!entity

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Prevent background scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const initials = entity?.name
    ? entity.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  const detailLink = entity
    ? entity.kind === 'user'
      ? `/users/${entity.uuid}`
      : `/pms/${entity.uuid}`
    : '/'

  const statusStyle = entity ? getStatusStyle(entity.type) : getStatusStyle('DEFAULT')

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.35)',
          backdropFilter: 'blur(2px)',
          zIndex: 1500,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* Drawer Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '380px',
          maxWidth: '95vw',
          height: '100vh',
          background: 'var(--white)',
          boxShadow: '-8px 0 40px rgba(15, 23, 42, 0.12)',
          zIndex: 1501,
          transform: isOpen ? 'translateX(0)' : 'translateX(110%)',
          visibility: isOpen ? 'visible' : 'hidden',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.3s step-end',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        {entity && (
          <>
            {/* Header */}
            <div style={{
              padding: '24px 24px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {/* Avatar */}
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'var(--accent-faint)',
                  color: 'var(--accent)',
                  fontWeight: 800,
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(217,119,87,0.15)',
                }}>
                  {initials}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text)' }}>{entity.name}</div>
                  <span style={{
                    display: 'inline-block',
                    marginTop: '4px',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    background: statusStyle.bg,
                    color: statusStyle.color,
                  }}>
                    {entity.type.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Contact Info */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <Mail size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ wordBreak: 'break-all' }}>{entity.email}</span>
              </div>
              {entity.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <Phone size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span>{entity.phone}</span>
                </div>
              )}
              {entity.kind === 'pm' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <Calendar size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span>
                    Joined at:{' '}
                    <strong style={{ fontWeight: 600, color: 'var(--text)' }}>
                      {entity.joinedAt || entity.createdAt
                        ? new Date(entity.joinedAt || entity.createdAt!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'N/A'}
                    </strong>
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <Calendar size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span>
                      Invited at:{' '}
                      <strong style={{ fontWeight: 600, color: entity.invitedAt ? 'var(--text)' : 'var(--text-muted)' }}>
                        {entity.invitedAt
                          ? new Date(entity.invitedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                          : 'N/A'}
                      </strong>
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <Calendar size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span>
                      Joined at:{' '}
                      <strong style={{ fontWeight: 600, color: entity.joinedAt ? 'var(--text)' : 'var(--text-muted)' }}>
                        {entity.joinedAt
                          ? new Date(entity.joinedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                          : 'N/A'}
                      </strong>
                    </span>
                  </div>
                  {entity.hearAboutUs && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <Compass size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span>
                        Source:{' '}
                        <strong style={{ fontWeight: 600, color: 'var(--text)' }}>
                          {entity.hearAboutUs}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <span className="section-label" style={{ display: 'block', marginBottom: '14px' }}>Quick Stats</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {entity.upwardScore && (
                  <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', textAlign: 'center', gridColumn: 'span 2' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Upward Credibility Score
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)' }}>{entity.upwardScore.score}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px', backgroundColor: `${entity.upwardScore.color}15`, color: entity.upwardScore.color, border: `1px solid ${entity.upwardScore.color}30` }}>
                        {entity.upwardScore.band}
                      </span>
                    </div>
                  </div>
                )}
                {entity.transactionCount !== undefined && (
                  <div style={{ background: 'var(--surface-hover)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px', color: 'var(--accent)' }}>
                      <CreditCard size={16} />
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '18px' }}>{entity.transactionCount}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Transactions</div>
                  </div>
                )}
                {entity.totalPaid !== undefined && (
                  <div style={{ background: 'var(--surface-hover)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px', color: 'var(--success)' }}>
                      <UserCheck size={16} />
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '18px' }}>₦{(entity.totalPaid / 1000).toFixed(0)}k</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Paid</div>
                  </div>
                )}
                {entity.propertyCount !== undefined && (
                  <div style={{ background: 'var(--surface-hover)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px', color: '#8b5cf6' }}>
                      <Building2 size={16} />
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '18px' }}>{entity.propertyCount}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Properties</div>
                  </div>
                )}
                <div style={{ background: 'var(--surface-hover)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px', color: 'var(--warning)' }}>
                    <Clock size={16} />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '-0.01em' }}>
                    {entity.status}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Status</div>
                </div>
              </div>
            </div>

            {/* Payments & Transactions Breakdown */}
            {entity.kind === 'user' && entity.transactions && entity.transactions.length > 0 && (
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                <span className="section-label" style={{ display: 'block', marginBottom: '14px', fontWeight: 600, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Payments & Line Items Breakdown
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {entity.transactions.map((tx: any) => {
                    const parsedLineItems = Array.isArray(tx.lineItems)
                      ? tx.lineItems
                      : typeof tx.lineItems === 'string'
                      ? JSON.parse(tx.lineItems)
                      : []
                    return (
                      <div key={tx.id} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', background: 'var(--surface-hover)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {new Date(tx.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: tx.status === 'SUCCESS' ? 'var(--success-faint)' : tx.status === 'PENDING' ? 'var(--warning-faint)' : 'var(--danger-faint)',
                            color: tx.status === 'SUCCESS' ? 'var(--success)' : tx.status === 'PENDING' ? 'var(--warning)' : 'var(--danger)'
                          }}>
                            {tx.status}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px dashed var(--border)', paddingBottom: '6px', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 600, fontSize: '13px' }}>₦{tx.amount.toLocaleString()}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>Ref: {tx.reference}</span>
                        </div>
                        {parsedLineItems.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {parsedLineItems.map((item: any, idx: number) => {
                              const name = item.name || item.label || 'Line Item'
                              const amount = Number(item.amountPaid || item.amount || item.totalAmount || 0)
                              return (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>• {name}</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontWeight: 500 }}>₦{amount.toLocaleString()}</span>
                                    <span style={{
                                      fontSize: '9px',
                                      fontWeight: 700,
                                      padding: '1px 4px',
                                      borderRadius: '3px',
                                      background: tx.status === 'SUCCESS' ? 'var(--success-faint)' : 'var(--warning-faint)',
                                      color: tx.status === 'SUCCESS' ? 'var(--success)' : 'var(--warning)'
                                    }}>
                                      {tx.status === 'SUCCESS' ? 'Paid in Full' : 'Pending'}
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            No line item details
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Footer CTA */}
            <div style={{ padding: '20px 24px', marginTop: 'auto' }}>
              <Link
                to={detailLink}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', gap: '8px' }}
              >
                <ExternalLink size={15} />
                Open Full Profile
              </Link>
            </div>
          </>
        )}
      </div>

      <style>{`
        .drawer-stat { transition: box-shadow 0.2s; }
        .drawer-stat:hover { box-shadow: var(--shadow-md); }
      `}</style>
    </>,
    document.body
  )
}

export default PreviewDrawer
