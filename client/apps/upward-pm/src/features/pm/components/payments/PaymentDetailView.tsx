'use client'

import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ChevronLeft, 
  CreditCard, 
  Calendar, 
  User, 
  Building2, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Copy,
  ExternalLink,
  Receipt,
  FileText,
  Send,
  MoreVertical
} from 'lucide-react'
import { usePaymentRequest, useResendPaymentRequest } from '../../hooks/usePayments'
import { useToast } from '@/components/common/Toast'
import Link from 'next/link'

export const PaymentDetailView: React.FC = () => {
  const { uuid } = useParams()
  const router = useRouter()
  const { success, error } = useToast()
  const { data: request, isLoading } = usePaymentRequest(uuid as string)
  const { mutate: resendInvoice, isPending: isResending } = useResendPaymentRequest()
  
  const [activeTab, setActiveTab] = useState<'overview' | 'breakdown' | 'history'>('overview')

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="animate-pulse" style={{ color: 'var(--text-muted)' }}>Loading payment details...</div>
      </div>
    )
  }

  if (!request) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <AlertCircle size={48} color="var(--error)" style={{ marginBottom: 16 }} />
        <h3>Payment Request Not Found</h3>
        <button onClick={() => router.back()} className="btn btn--text">Go Back</button>
      </div>
    )
  }

  const handleCopyLink = () => {
    if (!request.coreRequestUuid) {
      return error('Payment link not available')
    }
    const link = `https://upward.goodtenants.io/pay/${request.coreRequestUuid}`
    navigator.clipboard.writeText(link)
    success('Payment link copied!')
  }

  const handleResendInvoice = () => {
    if (!uuid) return
    if (request.status === 'PAID') {
      return error('Cannot resend an invoice that has already been settled.')
    }
    resendInvoice(uuid as string, {
      onSuccess: (res) => {
        success(res.message || 'Invoice resent successfully')
      },
      onError: (err: any) => {
        error(err.message || 'Failed to resend invoice')
      }
    })
  }

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(dateStr))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'var(--forest)';
      case 'PARTIAL': return 'var(--clay)';
      case 'PENDING': return 'var(--text-muted)';
      default: return 'var(--text-muted)';
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID': return <CheckCircle2 size={16} />;
      case 'PARTIAL': return <Clock size={16} />;
      case 'PENDING': return <Clock size={16} />;
      default: return <AlertCircle size={16} />;
    }
  }

  return (
    <div className="payment-detail-view animate-fade-in" style={{ paddingBottom: 60 }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <button 
          onClick={() => router.back()} 
          style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 14, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <ChevronLeft size={18} /> Back to Payments
        </button>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            className="btn btn--secondary" 
            style={{ borderRadius: 12, padding: '10px 20px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}
            onClick={handleCopyLink}
          >
            <Copy size={16} /> Copy Link
          </button>
          <button 
            className="btn btn--primary" 
            style={{ borderRadius: 12, padding: '10px 24px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}
            onClick={handleResendInvoice}
            disabled={isResending}
          >
            <Send size={16} /> {isResending ? 'Sending...' : 'Resend Invoice'}
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32, alignItems: 'start' }}>
        {/* Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* Summary Card */}
          <div className="glass" style={{ padding: 32, borderRadius: 24, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                   <div style={{ padding: 10, background: 'var(--ivory-dim)', borderRadius: 12, color: 'var(--clay)' }}>
                    <Receipt size={24} />
                  </div>
                  <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--dark)' }}>Invoice #{request.uuid.slice(-8).toUpperCase()}</h1>
                    <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Created on {formatDate(request.createdAt)}</p>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={`status-chip status-chip--${request.status.toLowerCase()}`} style={{ fontSize: 12, padding: '6px 16px', borderRadius: 100 }}>
                  {getStatusIcon(request.status)}
                  <span style={{ marginLeft: 6 }}>{request.status}</span>
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
              <div style={{ padding: '20px', background: 'var(--bg)', borderRadius: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>Total Amount</label>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--dark)' }}>{request.currency} {request.amount.toLocaleString()}</div>
              </div>
              <div style={{ padding: '20px', background: 'var(--bg)', borderRadius: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>Amount Paid</label>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--forest)' }}>{request.currency} {request.amountPaid.toLocaleString()}</div>
              </div>
              <div style={{ padding: '20px', background: 'var(--bg)', borderRadius: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>Due Date</label>
                <div style={{ fontSize: 24, fontWeight: 800, color: request.status !== 'PAID' && new Date(request.dueDate) < new Date() ? 'var(--error)' : 'var(--dark)' }}>
                  {formatDate(request.dueDate)}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs Section */}
          <div>
            <div style={{ display: 'flex', gap: 32, borderBottom: '1px solid var(--border)', marginBottom: 32 }}>
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'breakdown', label: 'Payment Breakdown' },
                { id: 'history', label: 'Transaction History' },
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{ 
                    padding: '12px 4px', 
                    fontSize: 14, 
                    fontWeight: 700, 
                    color: activeTab === tab.id ? 'var(--dark)' : 'var(--text-muted)',
                    borderBottom: activeTab === tab.id ? '2px solid var(--clay)' : '2px solid transparent',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                <div className="glass" style={{ padding: 24, borderRadius: 20 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--dark)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <User size={18} color="var(--clay)" /> Tenant Details
                  </h3>
                  {request.tenant ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>NAME</label>
                        <div style={{ fontWeight: 600 }}>{request.tenant.firstName} {request.tenant.lastName}</div>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>EMAIL</label>
                        <div style={{ fontWeight: 600 }}>{request.tenant.email}</div>
                      </div>
                      <Link 
                        href={`/tenants/${request.tenant.uuid}`}
                        style={{ fontSize: 12, fontWeight: 700, color: 'var(--clay)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', marginTop: 8 }}
                      >
                        View Profile <ExternalLink size={14} />
                      </Link>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No tenant information associated.</p>
                  )}
                </div>

                <div className="glass" style={{ padding: 24, borderRadius: 20 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--dark)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Building2 size={18} color="var(--clay)" /> Property & Unit
                  </h3>
                  {request.unit ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>UNIT</label>
                        <div style={{ fontWeight: 600 }}>{request.unit.unitName}</div>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>PROPERTY</label>
                        <div style={{ fontWeight: 600 }}>{request.unit.property?.name || 'N/A'}</div>
                      </div>
                      <Link 
                        href={`/properties/units/${request.unit.uuid}`}
                        style={{ fontSize: 12, fontWeight: 700, color: 'var(--clay)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', marginTop: 8 }}
                      >
                        View Unit <ExternalLink size={14} />
                      </Link>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No unit information associated.</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'breakdown' && (
              <div className="animate-fade-in glass" style={{ padding: 24, borderRadius: 20 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '12px 0', fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>ITEM DESCRIPTION</th>
                      <th style={{ padding: '12px 0', fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, textAlign: 'right' }}>AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {request.lineItems && request.lineItems.length > 0 ? (
                      request.lineItems.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--bg)' }}>
                          <td style={{ padding: '16px 0', fontSize: 14, fontWeight: 600 }}>{item.name}</td>
                          <td style={{ padding: '16px 0', fontSize: 14, fontWeight: 600, textAlign: 'right' }}>{request.currency} {item.amount.toLocaleString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr style={{ borderBottom: '1px solid var(--bg)' }}>
                        <td style={{ padding: '16px 0', fontSize: 14, fontWeight: 600 }}>{request.description || 'General Rent Payment'}</td>
                        <td style={{ padding: '16px 0', fontSize: 14, fontWeight: 600, textAlign: 'right' }}>{request.currency} {request.amount.toLocaleString()}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td style={{ padding: '24px 0 0 0', fontSize: 16, fontWeight: 800 }}>Total</td>
                      <td style={{ padding: '24px 0 0 0', fontSize: 18, fontWeight: 800, textAlign: 'right', color: 'var(--clay)' }}>{request.currency} {request.amount.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="animate-fade-in glass" style={{ padding: 32, borderRadius: 20 }}>
                {(!request.transactions || request.transactions.length === 0) ? (
                  <div style={{ textAlign: 'center' }}>
                    <Clock size={40} color="var(--text-muted)" style={{ marginBottom: 16, opacity: 0.5 }} />
                    <h4 style={{ color: 'var(--dark)', marginBottom: 8 }}>Transaction Logs</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>All payment attempts and settlements will appear here.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <h4 style={{ color: 'var(--dark)', marginBottom: 8 }}>Recent Payments</h4>
                    {request.transactions.map((tx: any) => (
                      <div key={tx.uuid} style={{ background: 'var(--bg)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div style={{ width: 32, height: 32, background: 'var(--forest-faint)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--forest)' }}>
                              <CheckCircle2 size={16} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>Payment Settle Success</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>via {tx.method} • Ref: {tx.reference}</div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>₦{tx.amount.toLocaleString()}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(tx.createdAt)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="glass" style={{ padding: 24, borderRadius: 20, border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--dark)', marginBottom: 16 }}>Payment Settings</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>Allow Partial Payment</span>
                <span style={{ fontWeight: 700, color: request.allowPartial ? 'var(--forest)' : 'var(--error)' }}>{request.allowPartial ? 'YES' : 'NO'}</span>
              </div>
              {request.allowPartial && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Minimum Payment</span>
                  <span style={{ fontWeight: 700 }}>{request.currency} {request.minAmount?.toLocaleString() || '0'}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>Currency</span>
                <span style={{ fontWeight: 700 }}>{request.currency}</span>
              </div>
            </div>
          </div>

          <div className="glass" style={{ padding: 24, borderRadius: 20, border: '1px solid var(--border)', background: 'var(--dark)', color: 'white' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={16} /> Internal Memo
            </h3>
            <p style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.6 }}>
              {request.description || 'No internal notes provided for this payment request.'}
            </p>
          </div>


        </div>
      </div>
    </div>
  )
}
