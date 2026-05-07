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
  const [activeDetailTab, setActiveDetailTab] = useState<'profile' | 'rent' | 'actions' | 'documents'>('profile')

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
    <div className="tenant-detail-view animate-fade-in" style={{ paddingBottom: 60 }}>
      {/* Top Navigation */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <button 
          onClick={() => router.back()} 
          style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 14, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <ChevronLeft size={18} /> Back
        </button>
        
        <button 
          className="btn btn--primary" 
          style={{ borderRadius: 100, padding: '10px 24px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}
          onClick={() => setIsEditModalOpen(true)}
        >
          <Edit size={16} /> Edit Tenant
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 40, alignItems: 'start' }}>
        {/* Left Profile Card */}
        <div style={{ background: 'white', borderRadius: 24, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ height: 100, background: '#f59e0b' }} />
          <div style={{ padding: '0 24px 32px 24px', marginTop: -50, textAlign: 'center' }}>
            <div style={{ 
              width: 100, 
              height: 100, 
              borderRadius: '50%', 
              background: 'var(--dark)', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: 36, 
              fontWeight: 800, 
              margin: '0 auto 20px auto',
              border: '6px solid white',
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
            }}>
              {(tenant.firstName || 'T')[0].toUpperCase()}
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--dark)', marginBottom: 12 }}>{tenant.firstName} {tenant.lastName}</h1>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', color: 'var(--text-secondary)', fontSize: 13, marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Phone size={14} color="var(--forest)" /> {tenant.phone || 'N/A'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mail size={14} color="var(--forest)" /> {tenant.email || 'N/A'}
              </div>
            </div>

            <div style={{ padding: '16px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 32 }}>
              <span>Tenant ID</span>
              <span style={{ fontWeight: 600, color: 'var(--dark)' }}>{tenant.uuid.split('-')[0].toUpperCase()}</span>
            </div>

            {/* Units List */}
            <div style={{ textAlign: 'left' }}>
              {tenant.units?.map((unit: any) => (
                <div key={unit.uuid} style={{ marginBottom: 24 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--dark)', marginBottom: 12 }}>{unit.unitName}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Rent</span>
                      <span style={{ fontWeight: 700, color: 'var(--dark)' }}>₦{unit.rentAmount.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Rent Start Date</span>
                      <span style={{ fontWeight: 600 }}>{unit.tenancyStartDate ? new Date(unit.tenancyStartDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Rent Expires</span>
                      <span style={{ fontWeight: 600 }}>{unit.rentEndDate ? new Date(unit.rentEndDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <Link 
                      href={`/properties/units/${unit.uuid}`}
                      style={{ fontSize: 12, fontWeight: 700, color: 'var(--forest)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, textDecoration: 'none' }}
                    >
                      Go to unit <ChevronLeft size={14} style={{ transform: 'rotate(180deg)' }} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Details Panel */}
        <div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 32, borderBottom: '1px solid var(--border)', marginBottom: 40 }}>
            {[
              { id: 'profile', label: 'Profile' },
              { id: 'rent', label: 'Rent Details' },
              { id: 'actions', label: 'Actions' },
              { id: 'documents', label: 'Sent Documents' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveDetailTab(tab.id as any)}
                style={{ 
                  padding: '12px 4px', 
                  fontSize: 14, 
                  fontWeight: 700, 
                  color: activeDetailTab === tab.id ? 'var(--dark)' : 'var(--text-muted)',
                  borderBottom: activeDetailTab === tab.id ? '2px solid var(--forest)' : '2px solid transparent',
                  background: 'none',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeDetailTab === 'profile' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
              {/* Address Section */}
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--dark)', marginBottom: 24 }}>Address</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Former Address</label>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--dark)' }}>{tenant.formerAddress || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Next of Kin */}
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--dark)', marginBottom: 24 }}>Next of Kin Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
                  {[
                    { label: 'Next of Kin Name', value: tenant.nextOfKinName },
                    { label: 'Next of Kin Email', value: tenant.nextOfKinEmail },
                    { label: 'Next of Kin Phone Number', value: tenant.nextOfKinPhone }
                  ].map((field, i) => (
                    <div key={i}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{field.label}</label>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--dark)' }}>{field.value || 'N/A'}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Guarantor */}
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--dark)', marginBottom: 24 }}>Guarantor Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
                  {[
                    { label: 'Guarantor Name', value: tenant.guarantorName },
                    { label: 'Guarantor Contact', value: tenant.guarantorPhone },
                    { label: 'Guarantor Email', value: tenant.guarantorEmail }
                  ].map((field, i) => (
                    <div key={i}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{field.label}</label>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--dark)' }}>{field.value || 'N/A'}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Persons */}
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--dark)', marginBottom: 24 }}>Contact Persons Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
                  {[
                    { label: 'Contact Person Name', value: tenant.emergencyContactName },
                    { label: 'Contact Person Contact', value: tenant.emergencyContactPhone },
                    { label: 'Contact Person Email', value: tenant.emergencyContactEmail }
                  ].map((field, i) => (
                    <div key={i}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{field.label}</label>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--dark)' }}>{field.value || 'N/A'}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documents */}
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--dark)', marginBottom: 24 }}>Documents</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
                  <div style={{ padding: '32px', background: 'var(--ivory-dim)', borderRadius: 16, textAlign: 'center', border: '1px dashed var(--border)' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No documents uploaded for this tenant.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeDetailTab === 'rent' && (
             <div className="animate-fade-in" style={{ padding: '32px', background: 'white', borderRadius: 24, border: '1px solid var(--border)' }}>
               <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--dark)', marginBottom: 24 }}>Tenancy History</h3>
               {/* Rent Tracker Component could go here */}
               <p style={{ color: 'var(--text-muted)' }}>Detailed rent payment history and upcoming schedules will appear here.</p>
             </div>
          )}
        </div>
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
