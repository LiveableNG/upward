'use client'

import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ChevronLeft, 
  Mail, 
  Phone, 
  Calendar, 
  Building2, 
  Send, 
  CheckCircle2, 
  Loader2,
  ExternalLink,
  Edit
} from 'lucide-react'
import { useTenant, useTenantActions } from '../../hooks/useTenants'
import Link from 'next/link'
import { EditTenantModal } from './modals/EditTenantModal'
import { AssignUnitModal } from './modals/AssignUnitModal'
import { Plus, CreditCard } from 'lucide-react'
import { CreatePaymentRequestModal } from '../payments/modals/CreatePaymentRequestModal'
import { usePaymentRequests } from '@/features/pm/hooks/usePayments'

export const TenantDetailView: React.FC = () => {
  const { uuid } = useParams()
  const router = useRouter()
  const { data: tenant } = useTenant(uuid as string)
  const { data: paymentRequests } = usePaymentRequests()
  const { inviteTenant } = useTenantActions()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [showPaymentRequestModal, setShowPaymentRequestModal] = useState(false)
  const [selectedUnitForPayment, setSelectedUnitForPayment] = useState<any>(null)

  const handleOpenPaymentRequest = (unit: any) => {
    setSelectedUnitForPayment({
      ...unit,
      tenant: tenant // Pass the current tenant object
    })
    setShowPaymentRequestModal(true)
  }

  const handleInvite = () => {
    inviteTenant.mutate(tenant.uuid)
  }

  const isOnUpward = tenant.inviteStatus === 'ON_UPWARD' || tenant.inviteStatus === 'ACCEPTED'
  const isProcessing = !isOnUpward && !tenant.inviteSentAt

  return (
    <div className="unit-detail animate-fade-in">
      <header className="unit-detail__header">
        <div className="unit-detail__nav">
          <button className="btn-icon" onClick={() => router.back()}>
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="dashboard__title">{tenant.firstName} {tenant.lastName}</h1>
            <p className="dashboard__subtitle">Tenant Profile</p>
          </div>
        </div>
        <div className="unit-detail__actions">
          <button 
            className="btn btn--secondary" 
            onClick={() => setIsEditModalOpen(true)}
          >
            <Edit size={18} style={{ marginRight: 8 }} />
            Edit Profile
          </button>
          {isOnUpward ? (
            <span className="badge badge--on-upward">
              <CheckCircle2 size={14} style={{ marginRight: 6 }} />
              Active on Upward
            </span>
          ) : isProcessing ? (
            <span className="badge badge--pending" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Loader2 size={14} className="animate-spin" />
              Processing...
            </span>
          ) : (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="badge badge--sent">Pending Acceptance</span>
              <button 
                className="btn btn--secondary"
                onClick={handleInvite}
                disabled={inviteTenant.isPending}
                title="Remind tenant to accept invitation"
              >
                {inviteTenant.isPending ? <Loader2 size={18} className="animate-spin" /> : 'Remind'}
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="tenant-detail__content animate-fade-in">
        <section className="detail-section glass">
          <h2 className="section-title">Contact Information</h2>
          <div className="info-cards">
            <div className="info-card">
              <Mail size={18} className="info-card__icon" />
              <div className="info-card__content">
                <span className="info-card__label">Email Address</span>
                <span className="info-card__value">{tenant.email || 'Not provided'}</span>
              </div>
            </div>
            <div className="info-card">
              <Phone size={18} className="info-card__icon" />
              <div className="info-card__content">
                <span className="info-card__label">Phone Number</span>
                <span className="info-card__value">{tenant.phone || 'Not provided'}</span>
              </div>
            </div>
            <div className="info-card">
              <Calendar size={18} className="info-card__icon" />
              <div className="info-card__content">
                <span className="info-card__label">Member Since</span>
                <span className="info-card__value">
                  {new Date(tenant.inviteSentAt || tenant.inviteSentAt || Date.now()).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="detail-section glass" style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 className="section-title" style={{ margin: 0 }}>Assigned Units</h2>
            <button 
              className="btn btn--secondary btn--sm" 
              onClick={() => setIsAssignModalOpen(true)}
            >
              <Plus size={16} style={{ marginRight: 6 }} />
              Assign Unit
            </button>
          </div>
          <div className="tenants-list">
            {tenant.units?.map((unit) => {
              const pendingRequest = paymentRequests?.filter(r => r.unitId === unit.id && r.status !== 'PAID')
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
                
              return (
                <div key={unit.uuid} className="tenant-group-card">
                  <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                      <div className="tenant-avatar-large" style={{ width: 48, height: 48, borderRadius: 14 }}>
                        <Building2 size={24} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: 17, fontWeight: 700 }}>Unit {unit.unitName}</h4>
                          {pendingRequest && (
                            <div style={{ 
                              fontSize: 9, 
                              fontWeight: 800, 
                              color: 'var(--clay)', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 4,
                              background: 'rgba(239, 68, 68, 0.05)',
                              padding: '2px 6px',
                              borderRadius: 4,
                              border: '1px solid rgba(239, 68, 68, 0.1)'
                            }}>
                               <div className="pulse-dot"></div>
                               PAYMENT {pendingRequest.status}
                            </div>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>{unit.property.name}</p>
                      </div>
                    </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <span className={`badge badge--${unit.status.toLowerCase()}`}>
                      {unit.status.replace('-', ' ')}
                    </span>
                    {unit.status === 'OCCUPIED' && tenant.email && (
                      <button 
                        className="btn btn--secondary btn--sm"
                        onClick={() => unit.isSynced && handleOpenPaymentRequest(unit)}
                        disabled={!unit.isSynced}
                        title={!unit.isSynced ? "Sync required to request payment" : ""}
                        style={{ 
                          opacity: unit.isSynced ? 1 : 0.6,
                          cursor: unit.isSynced ? 'pointer' : 'not-allowed'
                        }}
                      >
                        <CreditCard size={14} style={{ marginRight: 6 }} />
                        {unit.isSynced ? 'Request Payment' : 'Not Synced'}
                      </button>
                    )}
                    <Link href={`/properties/units/${unit.uuid}`} className="btn btn--icon btn--secondary">
                      <ExternalLink size={18} />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
            {(!tenant.units || tenant.units.length === 0) && (
              <div className="empty-state" style={{ textAlign: 'center', padding: '48px', background: 'var(--ivory-dim)', borderRadius: '16px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>No units currently assigned to this tenant.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <EditTenantModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        tenant={tenant}
      />

      <AssignUnitModal 
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        tenantUuid={tenant.uuid}
        tenantName={`${tenant.firstName} ${tenant.lastName}`}
      />

      <CreatePaymentRequestModal 
        isOpen={showPaymentRequestModal}
        onClose={() => setShowPaymentRequestModal(false)}
        unit={selectedUnitForPayment}
      />

      <style jsx>{`
        .tenant-detail__content {
          max-width: 1000px;
        }
      `}</style>
    </div>
  )
}
