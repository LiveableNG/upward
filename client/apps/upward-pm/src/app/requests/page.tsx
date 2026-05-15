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
  CheckCircle2
} from 'lucide-react'
import { useCredibilityRequests } from '@/features/pm/hooks/useCredibilityRequests'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { AddTenantModal } from '@/features/pm/components/tenants/modals/AddTenantModal'

export default function RequestsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [selectedJoinReq, setSelectedJoinReq] = useState<any>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const { data: credibilityRequests = [], isLoading: loadingCred } = useCredibilityRequests()
  const { data: joinRequests = [], isLoading: loadingJoin } = useQuery({
    queryKey: ['tenant-join-requests'],
    queryFn: async () => {
      const res = await api.get('/pm/tenants/join-requests')
      return res || []
    }
  })

  const handleJoinClick = (req: any) => {
    setSelectedJoinReq(req)
    setIsAddModalOpen(true)
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
          <h1 className="requests-header__title">Action Requests</h1>
          <p className="requests-header__subtitle">Manage verifications and record requests from your tenants.</p>
        </div>
      </header>

      {isLoading ? (
        <div className="requests-list">
          {[1, 2, 3].map(i => (
            <div key={i} className="request-card" style={{ height: '100px', opacity: 0.5 }}>
              <div className="animate-pulse" style={{ width: '100%', height: '100%', background: 'var(--ivory-dim)', borderRadius: '12px' }}></div>
            </div>
          ))}
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
        <div className="requests-sections" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          
          {/* Section 1: Join Requests (Verifications) */}
          {joinRequests.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[#F0F4F1] rounded-lg text-[#1B4332]">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h2 className="text-[18px] font-bold text-[#1B4332]">Tenant Verifications</h2>
                  <p className="text-[13px] text-[#4A6052]">New tenants wanting to connect their Upward profile to your properties.</p>
                </div>
              </div>
              <div className="requests-list">
                {joinRequests.map((req: any) => (
                  <div 
                    key={req.uuid}
                    onClick={() => handleJoinClick(req)}
                    className="request-card"
                    style={{ borderColor: 'var(--forest-faint)', background: '#F9FBFA' }}
                  >
                    <div className="request-card__main">
                      <div className="request-card__icon" style={{ background: 'var(--forest)', color: 'white' }}>
                        <User size={24} />
                      </div>
                      <div className="request-card__info">
                        <h3 className="request-card__name">{req.tenantFirstName} {req.tenantLastName}</h3>
                        <div className="request-card__meta">
                          <span className="request-card__meta-item">
                            <MapPin size={14} />
                            {req.unitDetails?.address || 'New Unit Request'}
                          </span>
                          <span className="request-card__meta-item">
                            <Clock size={14} />
                            Requested {format(new Date(req.createdAt), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="request-card__status">
                      <span className="badge" style={{ background: 'var(--forest)', color: 'white' }}>
                        Verify Tenant
                      </span>
                      <ChevronRight size={20} className="request-card__chevron" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 2: Credibility Requests (Records) */}
          {credibilityRequests.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="text-[18px] font-bold text-[#1B4332]">Payment History Requests</h2>
                  <p className="text-[13px] text-[#4A6052]">Requests to fulfill past tenancy records for Upward Score verification.</p>
                </div>
              </div>
              <div className="requests-list">
                {credibilityRequests.map((req: any) => (
                  <div 
                    key={req.uuid}
                    onClick={() => router.push(`/requests/${req.uuid}`)}
                    className="request-card"
                  >
                    <div className="request-card__main">
                      <div className="request-card__icon" style={{ background: '#FFF7ED', color: '#EA580C' }}>
                        <FileText size={24} />
                      </div>
                      <div className="request-card__info">
                        <h3 className="request-card__name">{req.tenantName}</h3>
                        <div className="request-card__meta">
                          <span className="request-card__meta-item">
                            <MapPin size={14} />
                            {req.propertyAddress}
                          </span>
                          <span className="request-card__meta-item">
                            <Clock size={14} />
                            Requested {format(new Date(req.createdAt), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="request-card__status">
                      <span className="badge badge--warning">
                        Fulfill Records
                      </span>
                      <ChevronRight size={20} className="request-card__chevron" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {isAddModalOpen && selectedJoinReq && (
        <AddTenantModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false)
            setSelectedJoinReq(null)
            queryClient.invalidateQueries({ queryKey: ['tenant-join-requests'] })
          }}
          initialData={{
            firstName: selectedJoinReq.tenantFirstName,
            lastName: selectedJoinReq.tenantLastName,
            email: selectedJoinReq.tenantEmail,
            unitDetails: selectedJoinReq.unitDetails,
          }}
        />
      )}

      <div className="requests-info">
        <div className="requests-info__icon">
          <AlertCircle size={20} />
        </div>
        <div className="requests-info__content">
          <h4 className="requests-info__title">Understanding Request Types</h4>
          <p className="requests-info__text">
            <strong>Tenant Verifications:</strong> When a tenant adds your property to their Upward profile, they send a verification request. Approving this links them to your management. <br />
            <strong>Payment History:</strong> Tenants may request their past payment records to boost their credibility. Fulfilling these involves uploading or entering their payment history.
          </p>
        </div>
      </div>
    </div>
  )
}
