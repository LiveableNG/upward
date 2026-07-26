"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ChevronRight, 
  Clock, 
  User, 
  MapPin, 
  FileText,
  AlertCircle,
  ArrowLeft,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  MoreVertical
} from 'lucide-react'
import { useCredibilityRequests } from '@/features/pm/hooks/useCredibilityRequests'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { AddTenantModal } from '@/features/pm/components/tenants/modals/AddTenantModal'
import { useMutation } from '@tanstack/react-query'
import { useToast } from '@/components/common/Toast'
import { ConfirmationModal } from '@/components/common/ConfirmationModal'
import { PageHeader } from '@/components/ui/PageHeader/PageHeader'
import { DataTable, Column } from '@/components/common/DataTable'
import '@/styles/requests.css'

const ReferenceTooltip = () => {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} onMouseLeave={() => setShowTooltip(false)}>
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onClick={() => setShowTooltip(!showTooltip)}
        style={{
          background: 'var(--ivory-dim)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--text-secondary)'
        }}
      >
        <HelpCircle size={16} className="text-muted" />
        <span>Reference Guide</span>
      </button>

      {showTooltip && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '8px',
          background: 'white',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-xl)',
          padding: '20px',
          zIndex: 99,
          width: '320px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div>
            <div style={{
              fontSize: '11px',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: 'var(--forest-bg, #f0fdf4)',
              color: 'var(--forest, #166534)',
              width: 'fit-content',
              marginBottom: '6px'
            }}>
              Verifications
            </div>
            <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.4, color: 'var(--text-secondary)' }}>
              Sent when a tenant adds your property to their profile. Approving links them to your dashboard and enables digital rent collection.
            </p>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: '#fff7ed',
              color: '#ea580c',
              width: 'fit-content',
              marginBottom: '6px'
            }}>
              Payment Records
            </div>
            <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.4, color: 'var(--text-secondary)' }}>
              Tenants requesting verification of past off-platform rent history. Fulfilling adds weighted data to boost their Upward Score.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

const RequestActionsDropdown = ({ 
  onDecline, 
  onAccept, 
  acceptLabel, 
  acceptIcon 
}: { 
  onDecline: (e: React.MouseEvent) => void, 
  onAccept: () => void, 
  acceptLabel: string,
  acceptIcon?: React.ReactNode
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }} onClick={(e) => e.stopPropagation()}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          transition: 'background 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <MoreVertical size={18} />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '50%',
          right: '100%',
          transform: 'translateY(-50%)',
          marginRight: '8px',
          background: 'white',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 50,
          minWidth: '170px',
          overflow: 'hidden',
          padding: '4px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px'
        }}>
          <button
            onClick={() => {
              setIsOpen(false)
              onAccept()
            }}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '10px 12px',
              fontSize: '13px',
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--ivory-faint)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            {acceptIcon}
            <span>{acceptLabel}</span>
          </button>
          <button
            onClick={(e) => {
              setIsOpen(false)
              onDecline(e)
            }}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '10px 12px',
              fontSize: '13px',
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'var(--error)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--error-bg)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <XCircle size={16} />
            <span>Decline</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default function RequestsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { success: toastSuccess, error: toastError } = useToast()
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedJoinReq, setSelectedJoinReq] = useState<any>(null)
  
  const [rejectModal, setRejectModal] = useState<{
    isOpen: boolean,
    type: 'JOIN' | 'CREDIBILITY',
    uuid: string,
    name: string
  }>({
    isOpen: false,
    type: 'JOIN',
    uuid: '',
    name: ''
  })

  const [resolveDuplicateModal, setResolveDuplicateModal] = useState<{
    isOpen: boolean,
    uuid: string,
    name: string,
    unitName: string,
    propertyName: string
  }>({
    isOpen: false,
    uuid: '',
    name: '',
    unitName: '',
    propertyName: ''
  })

  const { data: credibilityRequests = [], isLoading: loadingCred } = useCredibilityRequests()
  const { data: joinRequests = [], isLoading: loadingJoin } = useQuery({
    queryKey: ['tenant-join-requests'],
    queryFn: async () => {
      const res = await api.get('/pm/tenants/join-requests')
      return res || []
    }
  })

  const dismissMutation = useMutation({
    mutationFn: (uuid: string) => api.post(`/pm/tenants/join-requests/${uuid}/dismiss`, {}),
    onSuccess: () => {
      toastSuccess('Request dismissed')
      queryClient.invalidateQueries({ queryKey: ['tenant-join-requests'] })
      closeRejectModal()
    },
    onError: () => {
      toastError('Failed to dismiss request')
    }
  })

  const rejectCredMutation = useMutation({
    mutationFn: (uuid: string) => api.post(`/pm/credibility-requests/${uuid}/reject`, {}),
    onSuccess: () => {
      toastSuccess('Record request rejected')
      queryClient.invalidateQueries({ queryKey: ['credibility-requests'] })
      closeRejectModal()
    },
    onError: () => {
      toastError('Failed to reject request')
    }
  })

  const resolveDuplicateMutation = useMutation({
    mutationFn: (uuid: string) => api.post(`/pm/tenants/join-requests/${uuid}/resolve-duplicate`, {}),
    onSuccess: () => {
      toastSuccess('Duplicate request resolved')
      queryClient.invalidateQueries({ queryKey: ['tenant-join-requests'] })
      setResolveDuplicateModal(prev => ({ ...prev, isOpen: false }))
    },
    onError: () => {
      toastError('Failed to resolve request')
    }
  })

  const handleJoinClick = (req: any) => {
    setSelectedJoinReq(req)
    setIsAddModalOpen(true)
  }

  const openResolveDuplicateModal = (req: any) => {
    setResolveDuplicateModal({
      isOpen: true,
      uuid: req.uuid,
      name: `${req.tenantFirstName} ${req.tenantLastName}`,
      unitName: req.existingConnection.unitName,
      propertyName: req.existingConnection.propertyName
    })
  }

  const handleConfirmResolveDuplicate = () => {
    resolveDuplicateMutation.mutate(resolveDuplicateModal.uuid)
  }

  const openRejectModal = (e: React.MouseEvent, type: 'JOIN' | 'CREDIBILITY', uuid: string, name: string) => {
    e.stopPropagation()
    setRejectModal({ isOpen: true, type, uuid, name })
  }

  const closeRejectModal = () => {
    setRejectModal(prev => ({ ...prev, isOpen: false }))
  }

  const handleConfirmReject = () => {
    if (rejectModal.type === 'JOIN') {
      dismissMutation.mutate(rejectModal.uuid)
    } else {
      rejectCredMutation.mutate(rejectModal.uuid)
    }
  }

  const isLoading = loadingCred || loadingJoin
  const totalCount = credibilityRequests.length + joinRequests.length

  const joinColumns: Column<any>[] = [
    {
      header: 'TENANT',
      render: (req) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'var(--dark)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 700,
            flexShrink: 0
          }}>
            {((req.tenantFirstName || 'T')[0] || '').toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--dark)', fontSize: 14, marginBottom: 2 }}>
              {req.tenantFirstName} {req.tenantLastName}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {req.tenantEmail?.endsWith('@upward.com') && req.tenantPhone 
                ? req.tenantPhone 
                : req.tenantEmail}
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'REQUESTED RESIDENCE',
      render: (req) => (
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
          {req.unitDetails?.address || 'New Unit Request'}
        </span>
      )
    },
    {
      header: 'DATE REQUESTED',
      render: (req) => (
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
          {format(new Date(req.createdAt), 'MMM d, yyyy')}
        </span>
      )
    },
    {
      header: 'STATUS & DETAIL',
      render: (req) => {
        if (req.existingConnection) {
          return (
            <div style={{
              padding: '6px 10px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 8,
              fontSize: 11,
              color: '#1e3a8a',
              lineHeight: 1.4,
              maxWidth: 240
            }}>
              <strong>Duplicate Detected:</strong> Synced to <strong>{req.existingConnection.propertyName} - Unit {req.existingConnection.unitName}</strong>.
            </div>
          )
        }
        return (
          <span style={{
            fontSize: 10,
            fontWeight: 800,
            padding: '4px 8px',
            borderRadius: 6,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            background: 'var(--forest-bg, #f0fdf4)',
            color: 'var(--forest, #166534)'
          }}>
            New Connect
          </span>
        )
      }
    },
    {
      header: 'ACTIONS',
      align: 'right',
      render: (req) => {
        const isDuplicate = !!req.existingConnection;
        return (
          <RequestActionsDropdown
            onDecline={(e) => openRejectModal(e, 'JOIN', req.uuid, `${req.tenantFirstName} ${req.tenantLastName}`)}
            onAccept={() => isDuplicate ? openResolveDuplicateModal(req) : handleJoinClick(req)}
            acceptLabel={isDuplicate ? 'Resolve Duplicate' : 'Verify & Assign'}
            acceptIcon={isDuplicate ? <CheckCircle2 size={16} /> : <ChevronRight size={16} />}
          />
        )
      }
    }
  ]

  const credibilityColumns: Column<any>[] = [
    {
      header: 'TENANT',
      render: (req) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'var(--dark)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 700,
            flexShrink: 0
          }}>
            {((req.tenantName || 'T')[0] || '').toUpperCase()}
          </div>
          <div style={{ fontWeight: 700, color: 'var(--dark)', fontSize: 14 }}>
            {req.tenantName}
          </div>
        </div>
      )
    },
    {
      header: 'PROPERTY ADDRESS',
      render: (req) => (
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
          {req.propertyAddress}
        </span>
      )
    },
    {
      header: 'DATE REQUESTED',
      render: (req) => (
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
          {format(new Date(req.createdAt), 'MMM d, yyyy')}
        </span>
      )
    },
    {
      header: 'ACTIONS',
      align: 'right',
      render: (req) => (
        <RequestActionsDropdown
          onDecline={(e) => openRejectModal(e, 'CREDIBILITY', req.uuid, req.tenantName)}
          onAccept={() => router.push(`/requests/view?uuid=${req.uuid}`)}
          acceptLabel="Fulfill Records"
          acceptIcon={<ChevronRight size={16} />}
        />
      )
    }
  ]

  const renderMobileJoinCard = (req: any) => (
    <div className="request-mobile-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h4 style={{ fontWeight: 700, color: 'var(--dark)', fontSize: 15, margin: 0 }}>
            {req.tenantFirstName} {req.tenantLastName}
          </h4>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {req.tenantEmail?.endsWith('@upward.com') && req.tenantPhone 
              ? req.tenantPhone 
              : req.tenantEmail}
          </span>
        </div>
        <span style={{
          fontSize: 9,
          fontWeight: 800,
          padding: '2px 8px',
          borderRadius: 6,
          textTransform: 'uppercase',
          background: 'var(--forest-bg, #f0fdf4)',
          color: 'var(--forest, #166534)'
        }}>
          New Connect
        </span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
        <strong>Residence:</strong> {req.unitDetails?.address || 'New Unit Request'}
      </div>
      {req.existingConnection && (
        <div style={{
          padding: '8px 12px',
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 8,
          fontSize: 11,
          color: '#1e3a8a'
        }}>
          Duplicate Detected: Synced to {req.existingConnection.propertyName} - Unit {req.existingConnection.unitName}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button 
          className="btn-card-reject" 
          style={{ flex: 1, justifyContent: 'center', border: '1px solid var(--border)' }}
          onClick={(e) => openRejectModal(e, 'JOIN', req.uuid, `${req.tenantFirstName} ${req.tenantLastName}`)}
        >
          <XCircle size={16} /> Decline
        </button>
        {req.existingConnection ? (
          <button 
            className="btn-card-action" 
            style={{ flex: 1, justifyContent: 'center', background: '#2563eb', color: 'white' }}
            onClick={() => openResolveDuplicateModal(req)}
          >
            Resolve Duplicate
          </button>
        ) : (
          <button 
            className="btn-card-action btn-card-action--forest" 
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => handleJoinClick(req)}
          >
            Verify & Assign
          </button>
        )}
      </div>
    </div>
  )

  const renderMobileCredibilityCard = (req: any) => (
    <div className="request-mobile-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h4 style={{ fontWeight: 700, color: 'var(--dark)', fontSize: 15, margin: 0 }}>
          {req.tenantName}
        </h4>
        <span style={{
          fontSize: 9,
          fontWeight: 800,
          padding: '2px 8px',
          borderRadius: 6,
          textTransform: 'uppercase',
          background: '#fff7ed',
          color: '#ea580c'
        }}>
          History Req
        </span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
        <strong>Address:</strong> {req.propertyAddress}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button 
          className="btn-card-reject" 
          style={{ flex: 1, justifyContent: 'center', border: '1px solid var(--border)' }}
          onClick={(e) => openRejectModal(e, 'CREDIBILITY', req.uuid, req.tenantName)}
        >
          <XCircle size={16} /> Decline
        </button>
        <button 
          className="btn-card-action btn-card-action--orange" 
          style={{ flex: 1, justifyContent: 'center' }}
          onClick={() => router.push(`/requests/view?uuid=${req.uuid}`)}
        >
          Fulfill Records
        </button>
      </div>
    </div>
  )

  return (
    <div className="requests-view animate-fade-in">
      <PageHeader 
        title="Action Requests" 
        subtitle="Manage verifications and record requests from your tenants."
        actions={<ReferenceTooltip />}
      />

      {isLoading ? (
        <div className="requests-sections">
           <div className="skeleton-section"></div>
           <div className="skeleton-section"></div>
        </div>
      ) : totalCount === 0 ? (
        <div className="requests-empty">
          <div className="requests-empty__icon">
            <ShieldCheck size={32} />
          </div>
          <h2 className="requests-empty__title">All Caught Up!</h2>
          <p className="requests-empty__text">
            No pending tenant verifications or payment history requests at the moment.
          </p>
        </div>
      ) : (
        <div className="requests-sections" style={{ marginTop: 24 }}>
          
          {/* Section 1: Join Requests (Verifications) */}
          {joinRequests.length > 0 && (
            <section className="requests-section animate-slide-up">
              <div style={{ marginBottom: 12 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Tenant Verifications</h3>
              </div>
              
              <DataTable
                columns={joinColumns}
                data={joinRequests}
                keyExtractor={(req) => req.uuid}
                isLoading={false}
                renderMobileCard={renderMobileJoinCard}
              />
            </section>
          )}

          {/* Section 2: Credibility Requests (Records) */}
          {credibilityRequests.length > 0 && (
            <section className="requests-section animate-slide-up" style={{ animationDelay: '0.1s', marginTop: 32 }}>
              <div style={{ marginBottom: 12 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Payment History Requests</h3>
              </div>
              
              <DataTable
                columns={credibilityColumns}
                data={credibilityRequests}
                keyExtractor={(req) => req.uuid}
                isLoading={false}
                renderMobileCard={renderMobileCredibilityCard}
              />
            </section>
          )}
        </div>
      )}

      <ConfirmationModal
        isOpen={rejectModal.isOpen}
        onClose={closeRejectModal}
        onConfirm={handleConfirmReject}
        title="Reject Request?"
        message={`Are you sure you want to reject the request from ${rejectModal.name}? This action will notify the tenant and cannot be undone.`}
        confirmText="Yes, Reject"
        type="danger"
        isPending={dismissMutation.isPending || rejectCredMutation.isPending}
      />

      <ConfirmationModal
        isOpen={resolveDuplicateModal.isOpen}
        onClose={() => setResolveDuplicateModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmResolveDuplicate}
        title="Resolve Duplicate Request?"
        message={`Are you sure you want to resolve the request from ${resolveDuplicateModal.name}? Since they are already active and synced to ${resolveDuplicateModal.propertyName} - Unit ${resolveDuplicateModal.unitName}, this will approve this request and clean up any duplicate pending property connections on their profile.`}
        confirmText="Yes, Resolve"
        type="primary"
        isPending={resolveDuplicateMutation.isPending}
      />

      {isAddModalOpen && selectedJoinReq && (
        <AddTenantModal
          isOpen={isAddModalOpen}
          mode="join-request"
          onClose={() => {
            setIsAddModalOpen(false)
            setSelectedJoinReq(null)
            queryClient.invalidateQueries({ queryKey: ['tenant-join-requests'] })
          }}
          initialData={{
            firstName: selectedJoinReq.tenantFirstName,
            lastName: selectedJoinReq.tenantLastName,
            email: selectedJoinReq.tenantEmail,
            phone: selectedJoinReq.tenantPhone || '',
            unitDetails: selectedJoinReq.unitDetails,
          }}
        />
      )}

    </div>
  )
}
