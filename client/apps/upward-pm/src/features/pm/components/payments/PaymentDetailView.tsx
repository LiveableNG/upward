'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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
  MoreVertical,
  Trash2,
  X,
  Phone,
  Mail,
  MessageSquare,
  Edit
} from 'lucide-react'
import { usePaymentRequest, useResendPaymentRequest, useCancelPaymentRequest } from '../../hooks/usePayments'
import { DetailSkeleton } from '@/components/skeletons'
import { useToast } from '@/components/common/Toast'
import { ConfirmationModal } from '@/components/common/ConfirmationModal'
import { Modal } from '@/components/ui/Modal/Modal'
import { CreatePaymentRequestModal } from '@/features/pm/components/payments/modals/CreatePaymentRequestModal'
import Link from 'next/link'

export const PaymentDetailView: React.FC = () => {
  const searchParams = useSearchParams()
  const uuid = searchParams.get('uuid')
  const router = useRouter()
  const isPortal = typeof window !== 'undefined' && window.location.pathname.startsWith('/portal')
  const { success, error } = useToast()
  const { data: request, isLoading } = usePaymentRequest(uuid as string)
  const { mutate: resendInvoice, isPending: isResending } = useResendPaymentRequest()
  const cancelMutation = useCancelPaymentRequest()

  const [activeTab, setActiveTab] = useState<'overview' | 'breakdown' | 'history'>('overview')
  const [showResendModal, setShowResendModal] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [resendEmail, setResendEmail] = useState('')
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['EMAIL'])
  
  // Header menu state
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Handle clicking outside of dropdown menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (isLoading) {
    return <DetailSkeleton />
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
    const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'
    const link = `${baseUrl}/pay/${request.coreRequestUuid}`
    navigator.clipboard.writeText(link)
    success('Payment link copied!')
  }

  const handleResendInvoice = () => {
    if (!uuid) return
    if (request.status === 'PAID') {
      return error('Cannot resend an invoice that has already been settled.')
    }
    setResendEmail(request.tenant?.email || '')
    setShowResendModal(true)
  }

  const handleConfirmResend = () => {
    if (!uuid) return
    if (selectedChannels.length === 0) return error('Please select at least one delivery channel')
    resendInvoice({ uuid: uuid as string, email: resendEmail, channels: selectedChannels }, {
      onSuccess: (res) => {
        success(res.message || 'Invoice resent successfully')
        setShowResendModal(false)
      },
      onError: (err: any) => {
        error(err.message || 'Failed to resend invoice')
      }
    })
  }

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(dateStr))
  }

  const handleCancel = () => {
    if (!uuid) return
    cancelMutation.mutate(uuid as string, {
      onSuccess: () => {
        success('Payment request cancelled')
        setShowCancelConfirm(false)
        router.back()
      },
      onError: (err: any) => {
        error(err.message || 'Failed to cancel payment request')
      }
    })
  }

  const progressPercentage = Math.round((request.amountPaid / request.amount) * 100)
  const outstandingAmount = Math.max(0, request.amount - request.amountPaid)

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'PAID': return 'status-pill-custom--paid';
      case 'PARTIAL': return 'status-pill-custom--partial';
      case 'PENDING': return 'status-pill-custom--pending';
      case 'CANCELLED': return 'status-pill-custom--cancelled';
      default: return 'status-pill-custom--pending';
    }
  }

  return (
    <div className="checkout-page-wrapper animate-fade-in" style={{ padding: '32px 0' }}>
      <div className="checkout-container">
        
        {/* Header Section */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <button
              onClick={() => router.back()}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                color: '#5D5954', 
                fontSize: 14, 
                fontWeight: 600, 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer',
                marginBottom: 8,
                padding: '4px 0'
              }}
            >
              <ChevronLeft size={16} /> Back to Payments
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1A1A17', margin: 0 }}>
                Invoice #{request.uuid.slice(-8).toUpperCase()}
              </h1>
              <span className={`status-pill-custom ${getStatusClass(request.status)}`}>
                <span className="status-indicator-dot" />
                {request.status}
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#8A857F', margin: '4px 0 0', fontWeight: 500 }}>
              Created on {formatDate(request.createdAt)}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {request.status !== 'PAID' && request.status !== 'CANCELLED' && (
              <button
                className="btn-checkout-primary"
                style={{ width: 'auto', padding: '0 20px', fontSize: 13, height: 42 }}
                onClick={handleResendInvoice}
                disabled={isResending}
              >
                <Send size={15} /> {isResending ? 'Sending...' : 'Resend Invoice'}
              </button>
            )}
            
            <button
              className="btn-checkout-secondary"
              style={{ width: 'auto', padding: '0 20px', fontSize: 13, height: 42, background: '#ffffff', border: '1px solid #E7E3DB', color: '#1A1A17' }}
              onClick={handleCopyLink}
            >
              <Copy size={15} /> Copy Link
            </button>

            {/* Overflow dropdown Actions menu */}
            <div className="overflow-menu-wrapper" ref={menuRef}>
              <button
                className="btn-checkout-secondary"
                style={{ width: 42, padding: 0, height: 42, background: '#ffffff', border: '1px solid #E7E3DB', color: '#1A1A17' }}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <MoreVertical size={18} />
              </button>
              
              {isMenuOpen && (
                <div className="overflow-menu-dropdown animate-scale-in">
                  <button 
                    className="overflow-menu-item" 
                    onClick={() => { setIsMenuOpen(false); handleCopyLink(); }}
                  >
                    <Copy size={14} /> Copy Payment Link
                  </button>
                  {request.amountPaid === 0 && (
                    <button 
                      className="overflow-menu-item" 
                      onClick={() => { setIsMenuOpen(false); setIsEditModalOpen(true); }}
                    >
                      <Edit size={14} /> Edit Payment Request
                    </button>
                  )}
                  {request.status === 'PENDING' && request.amountPaid === 0 && (
                    <button 
                      className="overflow-menu-item overflow-menu-item--danger" 
                      onClick={() => { setIsMenuOpen(false); setShowCancelConfirm(true); }}
                    >
                      <Trash2 size={14} /> Cancel Request
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* 65/35 Column Grid */}
        <div className="checkout-grid">
          
          {/* LEFT COLUMN (65%) */}
          <div className="checkout-main">
            
            {/* Hero Invoice Balance Card */}
            <div className="checkout-card">
              <div className="sub-summary-container">
                <div className="sub-summary-info">
                  <span style={{ fontSize: 12, color: '#8A857F', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Amount Outstanding
                  </span>
                  <h2 style={{ fontSize: 36, fontWeight: 800, margin: '6px 0 0', color: '#1A1A17' }}>
                    ₦{outstandingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </h2>
                  <p style={{ fontSize: 13, color: '#5D5954', marginTop: 6, fontWeight: 500 }}>
                    Due by {formatDate(request.dueDate)}
                  </p>
                </div>
                <div className="sub-summary-price">
                  <span style={{ fontSize: 12, color: '#8A857F', fontWeight: 600, textTransform: 'uppercase' }}>Total Requested</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: '#1A1A17', marginTop: 4 }}>
                    ₦{request.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Progress Bar Widget */}
              <div className="invoice-progress-container">
                <div className="invoice-progress-text-row">
                  <span>Payment Progress</span>
                  <span>{progressPercentage}% Paid</span>
                </div>
                <div className="invoice-progress-bar-bg">
                  <div className="invoice-progress-bar-fill" style={{ width: `${progressPercentage}%` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8A857F', marginTop: 2, fontWeight: 500 }}>
                  <span>Paid: ₦{request.amountPaid.toLocaleString()}</span>
                  <span>Remaining: ₦{outstandingAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Tabbed Navigation */}
            <div>
              <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid #E7E3DB', marginBottom: 24 }}>
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'breakdown', label: 'Payment Breakdown' },
                  { id: 'history', label: 'Activity Logs' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    style={{
                      padding: '12px 4px',
                      fontSize: 14,
                      fontWeight: 700,
                      color: activeTab === tab.id ? 'var(--forest, #166534)' : '#8A857F',
                      borderBottom: activeTab === tab.id ? '2.5px solid var(--forest, #166534)' : '2.5px solid transparent',
                      background: 'none',
                      borderTop: 'none',
                      borderLeft: 'none',
                      borderRight: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab 1: Overview - Invoice Parties */}
              {activeTab === 'overview' && (
                <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  
                  {/* Tenant Card */}
                  <div className="checkout-card" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1A1A17', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <User size={16} color="var(--forest)" /> Tenant Information
                    </h3>
                    {request.tenant ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div>
                          <span style={{ fontSize: 10, color: '#8A857F', display: 'block', marginBottom: 2, fontWeight: 600 }}>NAME</span>
                          <span style={{ fontWeight: 700, fontSize: 14, color: '#1A1A17' }}>
                            {request.tenant.firstName} {request.tenant.lastName}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize: 10, color: '#8A857F', display: 'block', marginBottom: 2, fontWeight: 600 }}>EMAIL</span>
                          <span style={{ fontWeight: 500, fontSize: 13, color: '#5D5954' }}>
                            {request.tenant.email}
                          </span>
                        </div>
                        
                        {/* Instant messaging / quick action shortcuts */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <a href={`mailto:${request.tenant.email}`} className="copy-pill-button" style={{ border: '1px solid #E7E3DB', color: '#5D5954' }}>
                            <Mail size={12} /> Email
                          </a>
                          {request.tenant.phone && (
                            <a href={`tel:${request.tenant.phone}`} className="copy-pill-button" style={{ border: '1px solid #E7E3DB', color: '#5D5954' }}>
                              <Phone size={12} /> Call
                            </a>
                          )}
                        </div>

                        {!isPortal && (
                          <Link
                            href={`/tenants/view?uuid=${request.tenant.uuid}`}
                            style={{ fontSize: 12, fontWeight: 700, color: 'var(--forest)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', marginTop: 12 }}
                          >
                            View Profile <ExternalLink size={12} />
                          </Link>
                        )}
                      </div>
                    ) : (
                      <p style={{ color: '#8A857F', fontSize: 13 }}>No tenant information associated.</p>
                    )}
                  </div>

                  {/* Property Card */}
                  <div className="checkout-card" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1A1A17', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Building2 size={16} color="var(--forest)" /> Property & Unit
                    </h3>
                    {request.unit ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div>
                          <span style={{ fontSize: 10, color: '#8A857F', display: 'block', marginBottom: 2, fontWeight: 600 }}>PROPERTY</span>
                          <span style={{ fontWeight: 700, fontSize: 14, color: '#1A1A17' }}>
                            {request.unit.property?.name || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize: 10, color: '#8A857F', display: 'block', marginBottom: 2, fontWeight: 600 }}>UNIT REFERENCE</span>
                          <span style={{ fontWeight: 600, fontSize: 13, color: '#5D5954' }}>
                            {request.unit.unitName}
                          </span>
                        </div>
                        
                        {!isPortal && (
                          <Link
                            href={`/properties/units/view?uuid=${request.unit.uuid}`}
                            style={{ fontSize: 12, fontWeight: 700, color: 'var(--forest)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', marginTop: 24 }}
                          >
                            View Unit Details <ExternalLink size={12} />
                          </Link>
                        )}
                      </div>
                    ) : (
                      <p style={{ color: '#8A857F', fontSize: 13 }}>No unit information associated.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Breakdown */}
              {activeTab === 'breakdown' && (
                <div className="animate-fade-in checkout-card" style={{ padding: '24px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid #E7E3DB' }}>
                        <th style={{ padding: '12px 0', fontSize: 11, color: '#8A857F', fontWeight: 700 }}>ITEM DESCRIPTION</th>
                        <th style={{ padding: '12px 0', fontSize: 11, color: '#8A857F', fontWeight: 700, textAlign: 'right' }}>TOTAL</th>
                        <th style={{ padding: '12px 0', fontSize: 11, color: '#8A857F', fontWeight: 700, textAlign: 'right' }}>PAID</th>
                        <th style={{ padding: '12px 0', fontSize: 11, color: '#8A857F', fontWeight: 700, textAlign: 'right' }}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {request.lineItems && request.lineItems.length > 0 ? (
                        request.lineItems.map((item: any, idx: number) => {
                          const paid = item.amountPaid || 0
                          const status = item.status || (paid >= item.amount ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING')
                          const statusColor = status === 'PAID' ? 'var(--forest)' : status === 'PARTIAL' ? 'var(--clay)' : '#8A857F'
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid #E7E3DB' }}>
                              <td style={{ padding: '16px 0', fontSize: 14, fontWeight: 600, color: '#1A1A17' }}>{item.name}</td>
                              <td style={{ padding: '16px 0', fontSize: 14, fontWeight: 600, textAlign: 'right', color: '#1A1A17' }}>
                                ₦{item.amount.toLocaleString()}
                              </td>
                              <td style={{ padding: '16px 0', fontSize: 14, fontWeight: 600, textAlign: 'right', color: statusColor }}>
                                ₦{paid.toLocaleString()}
                              </td>
                              <td style={{ padding: '16px 0', textAlign: 'right' }}>
                                <span className={`status-pill-custom ${getStatusClass(status)}`} style={{ fontSize: 10, padding: '4px 10px' }}>
                                  {status}
                                </span>
                              </td>
                            </tr>
                          )
                        })
                      ) : (
                        <tr style={{ borderBottom: '1px solid #E7E3DB' }}>
                          <td style={{ padding: '16px 0', fontSize: 14, fontWeight: 600, color: '#1A1A17' }}>
                            {request.description || 'General Rent Payment'}
                          </td>
                          <td style={{ padding: '16px 0', fontSize: 14, fontWeight: 600, textAlign: 'right', color: '#1A1A17' }}>
                            ₦{request.amount.toLocaleString()}
                          </td>
                          <td style={{ padding: '16px 0', fontSize: 14, fontWeight: 600, textAlign: 'right', color: 'var(--forest)' }}>
                            ₦{request.amountPaid.toLocaleString()}
                          </td>
                          <td style={{ padding: '16px 0', textAlign: 'right' }}>
                            <span className={`status-pill-custom ${getStatusClass(request.status)}`} style={{ fontSize: 10, padding: '4px 10px' }}>
                              {request.status}
                            </span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  
                  <div className="checkout-breakdown" style={{ marginTop: 24 }}>
                    <div className="checkout-breakdown__row" style={{ borderBottom: 'none', padding: 0 }}>
                      <span className="checkout-breakdown__label" style={{ fontSize: 15, fontWeight: 700, color: '#1A1A17' }}>Total Requested Value</span>
                      <span className="checkout-breakdown__value" style={{ fontSize: 18, fontWeight: 800, color: 'var(--forest)' }}>
                        ₦{request.amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: History - Activity Timeline */}
              {activeTab === 'history' && (
                <div className="animate-fade-in checkout-card" style={{ padding: '24px' }}>
                  <div className="timeline-container">
                    <div className="timeline-line" />
                    
                    {/* Dynamic timelines based on actual transactions */}
                    {request.transactions && request.transactions.length > 0 && (
                      request.transactions.map((tx: any) => (
                        <div className="timeline-item timeline-item--completed" key={tx.uuid}>
                          <div className="timeline-dot">✓</div>
                          <div className="timeline-item-header">
                            <span className="timeline-title">Payment Settlement Received</span>
                            <span className="timeline-date">{formatDate(tx.createdAt)}</span>
                          </div>
                          <p className="timeline-desc">
                            Successfully received payment of ₦{tx.amount.toLocaleString()} via {tx.method}. 
                            <br />
                            <span style={{ fontSize: 11, color: '#8A857F', fontFamily: 'monospace' }}>Ref: {tx.reference}</span>
                          </p>
                        </div>
                      ))
                    )}

                    {/* Default timeline status items */}
                    <div className="timeline-item timeline-item--completed">
                      <div className="timeline-dot" style={{ borderColor: 'var(--forest)' }}>✓</div>
                      <div className="timeline-item-header">
                        <span className="timeline-title">Invoice Sent</span>
                        <span className="timeline-date">{formatDate(request.createdAt)}</span>
                      </div>
                      <p className="timeline-desc">
                        Invoice dispatched to {request.tenant?.email || 'tenant email'}.
                      </p>
                    </div>

                    <div className="timeline-item timeline-item--completed">
                      <div className="timeline-dot" style={{ borderColor: 'var(--forest)' }}>✓</div>
                      <div className="timeline-item-header">
                        <span className="timeline-title">Invoice Created</span>
                        <span className="timeline-date">{formatDate(request.createdAt)}</span>
                      </div>
                      <p className="timeline-desc">
                        Rent request initialized for {request.unit?.unitName || 'selected unit'} by Property Manager.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN (35% - Consolidated Sidebar) */}
          <div className="checkout-side">
            <div className="checkout-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1A1A17', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #E7E3DB' }}>
                Invoice Details
              </h3>
              
              <div className="checkout-breakdown" style={{ gap: 16 }}>
                <div className="checkout-breakdown__row" style={{ padding: '6px 0', borderBottom: 'none' }}>
                  <span className="checkout-breakdown__label" style={{ fontSize: 12 }}>Currency</span>
                  <span className="checkout-breakdown__value" style={{ fontSize: 12 }}>{request.currency || 'NGN'}</span>
                </div>
                
                <div className="checkout-breakdown__row" style={{ padding: '6px 0', borderBottom: 'none' }}>
                  <span className="checkout-breakdown__label" style={{ fontSize: 12 }}>Partial Payments</span>
                  <span className="checkout-breakdown__value" style={{ 
                    fontSize: 12, 
                    color: request.allowPartial ? 'var(--forest)' : 'var(--error)' 
                  }}>
                    {request.allowPartial ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                {request.allowPartial && (
                  <div className="checkout-breakdown__row" style={{ padding: '6px 0', borderBottom: 'none' }}>
                    <span className="checkout-breakdown__label" style={{ fontSize: 12 }}>Minimum Payment</span>
                    <span className="checkout-breakdown__value" style={{ fontSize: 12 }}>
                      ₦{request.minAmount?.toLocaleString() || '0'}
                    </span>
                  </div>
                )}
              </div>

              {/* Memo Block */}
              <div style={{ marginTop: 24, padding: 16, background: '#F8F7F4', borderRadius: 12, border: '1px solid #E7E3DB' }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, margin: '0 0 8px', color: '#1A1A17', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={14} color="#8A857F" /> Internal Note
                </h4>
                <p style={{ fontSize: 12, color: '#5D5954', margin: 0, lineHeight: 1.5 }}>
                  {request.description || 'No internal notes provided for this payment request.'}
                </p>
              </div>

              {/* Action Links */}
              <div style={{ marginTop: 24 }}>
                <button
                  className="btn-checkout-secondary"
                  style={{ width: '100%', fontSize: 13, height: 42, background: '#F2F8F3', border: '1px dashed rgba(22, 101, 52, 0.25)', color: 'var(--forest)' }}
                  onClick={handleCopyLink}
                >
                  <Copy size={14} /> Copy Payment Link
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resend Modal */}
      <Modal
        isOpen={showResendModal}
        onClose={() => setShowResendModal(false)}
        title="Resend Invoice"
        subtitle="Send a payment reminder to the tenant."
        maxWidth={450}
        footer={
          <div style={{ display: 'flex', gap: 12, width: '100%' }}>
            <button
              className="btn btn--secondary"
              style={{ flex: 1, height: 42, borderRadius: 12 }}
              onClick={() => setShowResendModal(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn--primary"
              style={{ flex: 1, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={handleConfirmResend}
              disabled={isResending || !resendEmail}
            >
              {isResending ? 'Sending...' : 'Send Invoice'}
            </button>
          </div>
        }
      >
        <div className="form-group">
          <label className="form-label" style={{ fontSize: 12, fontWeight: 700, color: '#5D5954' }}>Recipient Email</label>
          <input
            type="email"
            className="form-input"
            value={resendEmail}
            onChange={e => setResendEmail(e.target.value)}
            placeholder="tenant@example.com"
            style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid #E7E3DB', borderRadius: 8, marginTop: 6 }}
          />
          <p style={{ fontSize: 11, color: '#8A857F', marginTop: 8 }}>
            You can keep the current email or enter a different one to redirect the invoice.
          </p>
        </div>

        <div className="form-group" style={{ marginTop: 20 }}>
          <label className="form-label" style={{ fontSize: 12, fontWeight: 700, color: '#5D5954' }}>Delivery Channels</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            {['EMAIL', 'SMS', 'WHATSAPP'].map(channel => (
              <label key={channel} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
                <input
                  type="checkbox"
                  checked={selectedChannels.includes(channel)}
                  onChange={e => {
                    if (e.target.checked) setSelectedChannels(prev => [...prev, channel])
                    else setSelectedChannels(prev => prev.filter(c => c !== channel))
                  }}
                  style={{ accentColor: 'var(--forest)' }}
                />
                {channel === 'EMAIL' ? 'Email' : channel === 'SMS' ? 'SMS Text Message' : 'WhatsApp'}
              </label>
            ))}
          </div>
          {request.tenant && !request.tenant.phone && (selectedChannels.includes('SMS') || selectedChannels.includes('WHATSAPP')) && (
            <p style={{ fontSize: 11, color: 'var(--error)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertCircle size={12} /> Tenant does not have a phone number on file. Delivery will fail.
            </p>
          )}
        </div>
      </Modal>

      <ConfirmationModal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleCancel}
        title="Cancel Payment Request"
        message="Are you sure you want to cancel this payment request? This action cannot be undone and the payment link will no longer be valid for the tenant."
        confirmText="Yes, Cancel Request"
        type="danger"
        isPending={cancelMutation.isPending}
      />

      {request.unit && (
        <CreatePaymentRequestModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          unit={request.unit}
          existingRequest={request}
        />
      )}
    </div>
  )
}