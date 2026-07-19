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
  Sparkles
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
import '@/styles/requests.css'

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

  return (
    <div className="requests-view animate-fade-in">
      <PageHeader 
        title="Action Requests" 
        subtitle="Manage verifications and record requests from your tenants."
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
        <div className="requests-sections">
          
          {/* Section 1: Join Requests (Verifications) */}
          {joinRequests.length > 0 && (
            <section className="requests-section animate-slide-up">
              <div className="requests-section__header">
                <div className="requests-section__icon-wrap requests-section__icon-wrap--forest">
                  <UserPlus size={22} strokeWidth={2} />
                </div>
                <div className="requests-section__titles">
                  <h2 className="requests-section__title">Tenant Verifications</h2>
                  <p className="requests-section__subtitle">New tenants requesting to link their profile to your properties.</p>
                </div>
              </div>
              
              <div className="requests-grid">
                {joinRequests.map((req: any) => (
                  <div 
                    key={req.uuid}
                    onClick={() => handleJoinClick(req)}
                    className="request-premium-card request-premium-card--forest"
                  >
                    <div className="request-premium-card__body">
                      <div className="request-premium-card__avatar-wrap">
                        <div className="request-premium-card__avatar request-premium-card__avatar--forest">
                          <User size={24} strokeWidth={2} />
                        </div>
                      </div>
                      <div className="request-premium-card__info">
                        <div className="request-premium-card__top">
                          <h3 className="request-premium-card__name">{req.tenantFirstName} {req.tenantLastName}</h3>
                          <span className="request-premium-card__badge">New Connect</span>
                        </div>
                        <p className="request-premium-card__email">{req.tenantEmail}</p>
                        
                        <div className="request-premium-card__meta-grid">
                          <div className="request-meta-item">
                            <MapPin size={14} className="request-meta-item__icon" />
                            <span className="request-meta-item__text">{req.unitDetails?.address || 'New Unit Request'}</span>
                          </div>
                          <div className="request-meta-item">
                            <Clock size={14} className="request-meta-item__icon" />
                            <span className="request-meta-item__text">{format(new Date(req.createdAt), 'MMM d, yyyy')}</span>
                          </div>
                        </div>

                        {req.existingConnection && (
                          <div style={{
                            marginTop: 14,
                            padding: '10px 14px',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: 12,
                            fontSize: 12,
                            color: '#1e3a8a',
                            lineHeight: 1.5,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                          }} onClick={(e) => e.stopPropagation()}>
                            <strong>Duplicate Request Detected</strong>
                            <span>
                              This tenant is already registered and synced to <strong>{req.existingConnection.propertyName} - Unit {req.existingConnection.unitName}</strong>.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="request-premium-card__footer" onClick={(e) => e.stopPropagation()}>
                      <button 
                        className="btn-card-reject"
                        onClick={(e) => openRejectModal(e, 'JOIN', req.uuid, `${req.tenantFirstName} ${req.tenantLastName}`)}
                        title="Decline Connection"
                      >
                        <XCircle size={18} />
                        <span>Decline</span>
                      </button>
                      {req.existingConnection ? (
                        <button 
                          className="btn-card-action"
                          style={{ background: '#2563eb', color: 'white', border: 'none', boxShadow: '0 4px 12px rgba(37,99,235,0.2)' }}
                          onClick={() => openResolveDuplicateModal(req)}
                        >
                          <span>Resolve Duplicate</span>
                          <CheckCircle2 size={16} style={{ marginLeft: 6 }} />
                        </button>
                      ) : (
                        <button 
                          className="btn-card-action btn-card-action--forest"
                          onClick={() => handleJoinClick(req)}
                        >
                          <span>Verify & Assign</span>
                          <ChevronRight size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 2: Credibility Requests (Records) */}
          {credibilityRequests.length > 0 && (
            <section className="requests-section animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="requests-section__header">
                <div className="requests-section__icon-wrap requests-section__icon-wrap--orange">
                  <FileText size={22} strokeWidth={2} />
                </div>
                <div className="requests-section__titles">
                  <h2 className="requests-section__title">Payment History Requests</h2>
                  <p className="requests-section__subtitle">Fulfill historical records to boost your tenant's credibility score.</p>
                </div>
              </div>
              
              <div className="requests-grid">
                {credibilityRequests.map((req: any) => (
                  <div 
                    key={req.uuid}
                    onClick={() => router.push(`/requests/view?uuid=${req.uuid}`)}
                    className="request-premium-card request-premium-card--orange"
                  >
                    <div className="request-premium-card__body">
                      <div className="request-premium-card__avatar-wrap">
                        <div className="request-premium-card__avatar request-premium-card__avatar--orange">
                          <FileText size={24} strokeWidth={2} />
                        </div>
                      </div>
                      <div className="request-premium-card__info">
                        <div className="request-premium-card__top">
                          <h3 className="request-premium-card__name">{req.tenantName}</h3>
                          <span className="request-premium-card__badge request-premium-card__badge--orange">History Req</span>
                        </div>
                        <p className="request-premium-card__email">{req.propertyAddress}</p>
                        
                        <div className="request-premium-card__meta-grid">
                          <div className="request-meta-item">
                            <Clock size={14} className="request-meta-item__icon" />
                            <span className="request-meta-item__text">Requested {format(new Date(req.createdAt), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="request-premium-card__footer">
                      <button 
                        className="btn-card-reject"
                        onClick={(e) => openRejectModal(e, 'CREDIBILITY', req.uuid, req.tenantName)}
                        title="Decline Request"
                      >
                        <XCircle size={18} />
                        <span>Decline</span>
                      </button>
                      <button className="btn-card-action btn-card-action--orange">
                        <span>Fulfill Records</span>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="requests-footer-info animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="requests-footer-info__header">
          <HelpCircle size={20} className="text-[#166534]" />
          <h4>Knowledge Center</h4>
        </div>
        <div className="requests-footer-info__grid">
           <div className="info-item">
              <div className="info-item__tag info-item__tag--forest">Verifications</div>
              <p>When a tenant adds your property to their Upward profile. Approving this links them to your management dashboard and enables digital rent collection.</p>
           </div>
           <div className="info-item">
              <div className="info-item__tag info-item__tag--orange">Payment Records</div>
              <p>Tenants seeking to verify their historical reliability. Fulfilling these requests adds weighted data to their Upward Score, helping them build credibility.</p>
           </div>
        </div>
      </div>

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
