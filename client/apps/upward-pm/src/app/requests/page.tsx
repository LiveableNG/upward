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

  const handleJoinClick = (req: any) => {
    setSelectedJoinReq(req)
    setIsAddModalOpen(true)
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
    <div className="requests-page">
      <header className="requests-header">
        <div className="requests-header__content">
          <button 
            onClick={() => router.push('/dashboard')}
            className="requests-header__back"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-3 mt-4">
             <div>
                <h1 className="requests-header__title">Action Requests</h1>
                <p className="requests-header__subtitle">Manage verifications and record requests from your tenants.</p>
             </div>
          </div>
        </div>
      </header>

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
                      </div>
                    </div>
                    
                    <div className="request-premium-card__footer">
                      <button 
                        className="btn-card-reject"
                        onClick={(e) => openRejectModal(e, 'JOIN', req.uuid, `${req.tenantFirstName} ${req.tenantLastName}`)}
                        title="Decline Connection"
                      >
                        <XCircle size={18} />
                        <span>Decline</span>
                      </button>
                      <button className="btn-card-action btn-card-action--forest">
                        <span>Verify & Assign</span>
                        <ChevronRight size={16} />
                      </button>
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
                    onClick={() => router.push(`/requests/${req.uuid}`)}
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

      <style jsx>{`
        .requests-page {
          padding: 2rem;
          max-width: var(--max-width);
          margin: 0 auto;
          background-color: var(--bg);
          min-height: 100vh;
        }

        .requests-header {
          margin-bottom: 3.5rem;
        }

        .requests-header__back {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          padding: 8px 16px;
          border-radius: 12px;
          transition: all 0.2s;
          width: fit-content;
        }
        .requests-header__back:hover { 
          background: var(--ivory-dim);
          border-color: var(--border-strong);
          color: var(--text);
        }

        .requests-header__icon {
          width: 52px;
          height: 52px;
          background: var(--forest);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 8px 16px var(--forest-glow);
        }

        .requests-header__title {
          font-size: 32px;
          font-weight: 850;
          color: var(--text);
          margin: 0;
          letter-spacing: -0.03em;
          line-height: 1;
        }

        .requests-header__subtitle {
          font-size: 16px;
          color: var(--text-muted);
          margin-top: 6px;
          font-weight: 500;
        }

        .requests-sections {
          display: flex;
          flex-direction: column;
          gap: 4.5rem;
        }

        .requests-section__header {
          display: flex;
          align-items: center;
          gap: 18px;
          margin-bottom: 28px;
        }

        .requests-section__icon-wrap {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .requests-section__icon-wrap--forest { background: #f0fdf4; color: #166534; border: 1px solid #dcfce7; }
        .requests-section__icon-wrap--orange { background: #fff7ed; color: #ea580c; border: 1px solid #ffedd5; }

        .requests-section__title {
          font-size: 22px;
          font-weight: 800;
          color: var(--text);
          margin: 0;
          line-height: 1.2;
          letter-spacing: -0.01em;
        }

        .requests-section__subtitle {
          font-size: 14px;
          color: var(--text-muted);
          margin-top: 2px;
          font-weight: 500;
        }

        .requests-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 24px;
        }

        .request-premium-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
          overflow: hidden;
          box-shadow: var(--shadow-sm);
        }

        .request-premium-card:hover {
          transform: translateY(-6px);
          border-color: var(--border-strong);
          box-shadow: var(--shadow-lg);
        }

        .request-premium-card--forest:hover { border-color: rgba(22, 101, 52, 0.3); }
        .request-premium-card--orange:hover { border-color: rgba(234, 88, 12, 0.3); }

        .request-premium-card__body {
          padding: 28px;
          display: flex;
          gap: 20px;
        }

        .request-premium-card__avatar-wrap {
          flex-shrink: 0;
        }

        .request-premium-card__avatar {
          width: 64px;
          height: 64px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .request-premium-card__avatar--forest { background: var(--forest); color: white; }
        .request-premium-card__avatar--orange { background: #fff7ed; color: #ea580c; border: 1px solid #ffedd5; }

        .request-premium-card__info { flex: 1; min-width: 0; }

        .request-premium-card__top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .request-premium-card__name {
          font-size: 18px;
          font-weight: 800;
          color: var(--text);
          margin: 0;
          letter-spacing: -0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .request-premium-card__badge {
          font-size: 10px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 8px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: #f0fdf4;
          color: #166534;
          white-space: nowrap;
        }
        .request-premium-card__badge--orange { background: #fff7ed; color: #ea580c; }

        .request-premium-card__email {
          font-size: 14px;
          color: var(--text-muted);
          margin-top: 2px;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .request-premium-card__meta-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 18px;
        }

        .request-meta-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .request-meta-item__icon {
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .request-meta-item__text {
          font-size: 13px;
          color: var(--text-secondary);
          font-weight: 600;
        }

        .request-premium-card__footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 28px;
          background: var(--ivory-dim);
          border-top: 1px solid var(--border);
        }

        .btn-card-reject {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 700;
          color: #ef4444;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          padding: 6px;
          border-radius: 8px;
        }
        .btn-card-reject:hover { background: #fee2e2; }

        .btn-card-action {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 14px;
          font-size: 14px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .btn-card-action--forest { background: var(--forest); color: white; box-shadow: 0 4px 12px var(--forest-glow); }
        .btn-card-action--forest:hover { background: var(--forest-hover); transform: translateX(2px); }

        .btn-card-action--orange { background: white; color: #ea580c; border: 1px solid #ffedd5; }
        .btn-card-action--orange:hover { background: #fff7ed; transform: translateX(2px); }

        .requests-empty {
          text-align: center;
          padding: 6rem 2rem;
          background: var(--surface);
          border-radius: 32px;
          border: 2px dashed var(--border-strong);
        }

        .requests-empty__icon {
          width: 80px;
          height: 80px;
          background: var(--ivory-dim);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          color: var(--text-muted);
        }

        .requests-empty__title {
          font-size: 24px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .requests-empty__text {
          color: var(--text-muted);
          font-size: 16px;
          max-width: 400px;
          margin: 0 auto;
        }

        .requests-footer-info {
          margin-top: 6rem;
          background: white;
          border: 1px solid var(--border);
          border-radius: 28px;
          padding: 36px;
          box-shadow: var(--shadow-sm);
        }

        .requests-footer-info__header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 28px;
        }
        .requests-footer-info__header h4 {
          font-size: 18px;
          font-weight: 800;
          color: var(--text);
          margin: 0;
        }

        .requests-footer-info__grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .info-item__tag {
          font-size: 11px;
          font-weight: 800;
          padding: 4px 12px;
          border-radius: 20px;
          width: fit-content;
          text-transform: uppercase;
        }
        .info-item__tag--forest { background: #f0fdf4; color: #166534; }
        .info-item__tag--orange { background: #fff7ed; color: #ea580c; }

        .info-item p {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.7;
          margin: 0;
          font-weight: 500;
        }

        .animate-slide-up {
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @media (max-width: 900px) {
          .requests-grid { grid-template-columns: 1fr; }
          .requests-footer-info__grid { grid-template-columns: 1fr; gap: 24px; }
          .requests-page { padding: 1rem; }
        }
      `}</style>
    </div>
  )
}
