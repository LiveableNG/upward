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
  Edit,
  AlertCircle
} from 'lucide-react'
import { useTenant, useTenantActions } from '../../hooks/useTenants'
import Link from 'next/link'
import { EditTenantModal } from './modals/EditTenantModal'
import { AssignUnitModal } from './modals/AssignUnitModal'
import { Plus, CreditCard } from 'lucide-react'
import { CreatePaymentRequestModal } from '../payments/modals/CreatePaymentRequestModal'
import { usePaymentRequests } from '@/features/pm/hooks/usePayments'
import { DocumentEditorView } from '../documents/DocumentEditorView'
import { Splash } from '@/components/common/Splash'

export const TenantDetailView: React.FC = () => {
  const { uuid } = useParams()
  const router = useRouter()
  const { data: tenant, isLoading } = useTenant(uuid as string)
  const { data: paymentRequests } = usePaymentRequests()
  const { inviteTenant } = useTenantActions()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [showPaymentRequestModal, setShowPaymentRequestModal] = useState(false)
  const [selectedUnitForPayment, setSelectedUnitForPayment] = useState<any>(null)
  const [selectedRequestForEdit, setSelectedRequestForEdit] = useState<any>(null)
  const [activeDetailTab, setActiveDetailTab] = useState<'profile' | 'rent' | 'actions' | 'documents'>('profile')

  const [showEditor, setShowEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
  const [paymentContext, setPaymentContext] = useState<any>(null)

  if (isLoading || !tenant) {
    return <Splash />
  }

  const handleOpenPaymentRequest = (unit: any) => {
    setSelectedRequestForEdit(null)
    setSelectedUnitForPayment({
      ...unit,
      tenant: tenant // Pass the current tenant object
    })
    setShowPaymentRequestModal(true)
  }

  const handleEditPaymentRequest = (request: any, unit: any) => {
    setSelectedUnitForPayment({
      ...unit,
      tenant: tenant
    })
    setSelectedRequestForEdit(request)
    setShowPaymentRequestModal(true)
  }

  const handleInvite = () => {
    inviteTenant.mutate(tenant.uuid)
  }

  const handleProceedToEditor = (template: any, context: any) => {
    setEditingTemplate(template)
    setPaymentContext(context)
    setShowPaymentRequestModal(false)
    setShowEditor(true)
  }

  const isOnUpward = tenant.inviteStatus === 'ON_UPWARD' || tenant.inviteStatus === 'ACCEPTED'
  const isProcessing = !isOnUpward && !tenant.inviteSentAt

  if (showEditor) {
    return (
      <div className="container" style={{ padding: '20px 0' }}>
        <DocumentEditorView 
          initialTemplate={editingTemplate}
          initialRecipient={{
            type: 'existing',
            uuid: tenant.uuid,
            name: tenant.commercialName || `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim() || 'Tenant',
            email: tenant.email,
            deliveryMode: 'email'
          }}
          paymentContext={paymentContext}
          onBack={() => setShowEditor(false)}
        />
      </div>
    )
  }

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
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {isOnUpward ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6, 
              color: 'var(--forest)', 
              background: 'var(--forest-faint)', 
              padding: '8px 16px', 
              borderRadius: 100,
              fontSize: 12,
              fontWeight: 700
            }}>
              <CheckCircle2 size={16} />
              ON UPWARD
            </div>
          ) : tenant.inviteStatus === 'PENDING' || tenant.inviteStatus === 'PROCESSING' ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6, 
              color: 'var(--clay)', 
              background: 'var(--clay-faint)', 
              padding: '8px 16px', 
              borderRadius: 100,
              fontSize: 12,
              fontWeight: 700
            }}>
              <Loader2 size={16} className="animate-spin" />
              PROCESSING
            </div>
          ) : (
            <button 
              className="btn"
              onClick={handleInvite}
              disabled={inviteTenant.isPending || tenant.email?.endsWith('@upward.com')}
              style={{ 
                fontSize: 13, 
                padding: '10px 24px',
                borderRadius: 100,
                background: tenant.email?.endsWith('@upward.com') ? 'var(--ivory-dark)' : tenant.inviteSentAt ? 'var(--ivory-dark)' : 'var(--forest)',
                color: tenant.email?.endsWith('@upward.com') || tenant.inviteSentAt ? 'var(--text-muted)' : 'white',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: tenant.email?.endsWith('@upward.com') ? 'not-allowed' : 'pointer',
                opacity: tenant.email?.endsWith('@upward.com') ? 0.6 : 1
              }}
              title={tenant.email?.endsWith('@upward.com') ? 'Configure a real email address before inviting' : undefined}
            >
              {inviteTenant.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <Send size={16} />
                  {tenant.inviteSentAt ? 'Remind' : 'Send Invite'}
                </>
              )}
            </button>
          )}

          <button 
            className="btn btn--secondary" 
            style={{ borderRadius: 100, padding: '10px 24px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}
            onClick={() => setIsEditModalOpen(true)}
          >
            <Edit size={16} /> Edit Tenant
          </button>
        </div>
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
              {(tenant.commercialName || tenant.firstName || 'T')[0].toUpperCase()}
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--dark)', marginBottom: 12 }}>{tenant.commercialName || `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim()}</h1>
            
             <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', color: 'var(--text-secondary)', fontSize: 13, marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Phone size={14} color="var(--forest)" /> {tenant.phone || 'N/A'}
              </div>
              {tenant.otherPhone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                  <Phone size={12} color="var(--text-muted)" /> {tenant.otherPhone} (Alt)
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {tenant.email?.endsWith('@upward.com') ? (
                  <>
                    <AlertCircle size={14} color="var(--error)" /> 
                    <span style={{ color: 'var(--error)', fontWeight: 600 }}>Not Configured</span>
                  </>
                ) : (
                  <>
                    <Mail size={14} color="var(--forest)" /> {tenant.email || 'N/A'}
                  </>
                )}
              </div>
            </div>

            {tenant.email?.endsWith('@upward.com') && (
              <div style={{
                background: 'var(--error-faint)',
                border: '1px solid var(--error-border)',
                borderRadius: 12,
                padding: '12px 16px',
                fontSize: 12,
                color: 'var(--error)',
                textAlign: 'left',
                marginBottom: 24,
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start'
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <strong style={{ display: 'block', marginBottom: 2 }}>Email Missing</strong>
                  This tenant has no registered email. Please click <strong>Edit Tenant</strong> to configure their real email.
                </div>
              </div>
            )}

            <div style={{ padding: '16px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 32 }}>
              <span>Tenant ID</span>
              <span style={{ fontWeight: 600, color: 'var(--dark)' }}>{tenant.uuid.split('-')[0].toUpperCase()}</span>
            </div>

            {/* Units List */}
            <div style={{ textAlign: 'left', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px', marginTop: '12px' }}>
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
                      <span style={{ fontWeight: 600 }}>{unit.rentStartDate ? new Date(unit.rentStartDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Rent Expires</span>
                      <span style={{ fontWeight: 600 }}>{unit.rentDueDate ? new Date(unit.rentDueDate).toLocaleDateString() : 'N/A'}</span>
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

        <div>
          <div style={{ display: 'flex', gap: 32, borderBottom: '1px solid var(--border)', marginBottom: 40 }}>
            {[
              { id: 'profile', label: 'Profile' },
              { id: 'rent', label: 'Rent Details' },
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
              {/* Contact Information */}
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--dark)', marginBottom: 24 }}>Contact Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone Number</label>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--dark)' }}>{tenant.phone || 'N/A'}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Alternative Phone Number</label>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--dark)' }}>{tenant.otherPhone || 'N/A'}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</label>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--dark)' }}>
                      {tenant.email?.endsWith('@upward.com') ? 'N/A' : (tenant.email || 'N/A')}
                    </div>
                  </div>
                </div>
              </div>

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


            </div>
          )}

          {activeDetailTab === 'rent' && (
             <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
               <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--dark)', marginBottom: 8 }}>Tenancy & Rent Details</h3>
               
               {tenant.units && tenant.units.length > 0 ? (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                   {tenant.units.map((unit: any) => {
                     const unitRequests = paymentRequests?.filter(r => r.unitId === unit.id && r.status !== 'PAID') || [];
                     const pendingAmount = unitRequests
                       .filter(r => r.status !== 'PAID')
                       .reduce((sum, r) => sum + (r.amount - r.amountPaid), 0);

                     return (
                       <div key={unit.uuid} className="glass" style={{ padding: 24, borderRadius: 16, border: '1px solid var(--border)' }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                           <div>
                             <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--dark)', marginBottom: 4 }}>{unit.unitName}</h4>
                             <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{unit.property?.name || 'Assigned Property'}</p>
                           </div>
                           <div style={{ textAlign: 'right' }}>
                             <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--forest)' }}>₦{unit.rentAmount.toLocaleString()}</div>
                             <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{unit.rentType || 'Annual'} Rent</div>
                           </div>
                         </div>

                         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, padding: '16px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
                           <div>
                             <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>TENANCY START</label>
                             <div style={{ fontSize: 13, fontWeight: 600 }}>{unit.rentStartDate ? new Date(unit.rentStartDate).toLocaleDateString() : 'N/A'}</div>
                           </div>
                           <div>
                             <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>RENT EXPIRES</label>
                             <div style={{ fontSize: 13, fontWeight: 600 }}>{unit.rentDueDate ? new Date(unit.rentDueDate).toLocaleDateString() : 'N/A'}</div>
                           </div>
                           <div>
                             <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>OUTSTANDING</label>
                             <div style={{ fontSize: 13, fontWeight: 700, color: pendingAmount > 0 ? 'var(--error)' : 'var(--forest)' }}>
                               ₦{pendingAmount.toLocaleString()}
                             </div>
                           </div>
                         </div>

                         {/* Invoices List */}
                         {unitRequests.length > 0 && (
                           <div style={{ marginTop: 24 }}>
                             <h5 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.05em' }}>Recent Invoices</h5>
                             <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                               {unitRequests.map((req: any) => (
                                 <div key={req.uuid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--ivory-dim)', borderRadius: 12, border: '1px solid var(--border)' }}>
                                   <div>
                                     <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)' }}>{req.description || 'Rent Payment'}</div>
                                     <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Due {new Date(req.dueDate).toLocaleDateString()}</div>
                                   </div>
                                   <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                     <div style={{ textAlign: 'right' }}>
                                       <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)' }}>₦{req.amount.toLocaleString()}</div>
                                       <div style={{ fontSize: 10, fontWeight: 700, color: req.status === 'PAID' ? 'var(--forest)' : req.status === 'PARTIAL' ? 'var(--clay)' : 'var(--text-muted)' }}>{req.status}</div>
                                     </div>
                                     {req.status !== 'PAID' && (
                                       <button 
                                         onClick={() => req.amountPaid === 0 && handleEditPaymentRequest(req, unit)}
                                         style={{ 
                                           padding: 8, 
                                           borderRadius: 8, 
                                           background: req.amountPaid > 0 ? 'var(--bg)' : 'white', 
                                           border: '1px solid var(--border)', 
                                           color: 'var(--text-muted)', 
                                           cursor: req.amountPaid > 0 ? 'not-allowed' : 'pointer',
                                           opacity: req.amountPaid > 0 ? 0.5 : 1
                                         }}
                                         title={req.amountPaid > 0 ? "Edit Locked (Payment Received)" : "Edit Request"}
                                         disabled={req.amountPaid > 0}
                                       >
                                         <Edit size={14} />
                                       </button>
                                     )}
                                   </div>
                                 </div>
                               ))}
                             </div>
                           </div>
                         )}

                         <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                           <button 
                             className="btn btn--primary btn--sm" 
                             style={{ borderRadius: 8 }}
                             onClick={() => handleOpenPaymentRequest(unit)}
                           >
                             <CreditCard size={14} style={{ marginRight: 6 }} /> Request Rent
                           </button>
                           <Link href={`/properties/units/${unit.uuid}`} className="btn btn--secondary btn--sm" style={{ borderRadius: 8, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                             <ExternalLink size={14} style={{ marginRight: 6 }} /> View Unit Details
                           </Link>
                         </div>
                       </div>
                     );
                   })}
                 </div>
               ) : (
                 <div style={{ padding: '48px', background: 'var(--ivory-dim)', borderRadius: 24, textAlign: 'center', border: '1px dashed var(--border)' }}>
                   <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>This tenant is not currently assigned to any units.</p>
                   <button className="btn btn--primary" onClick={() => setIsAssignModalOpen(true)}>
                     <Plus size={18} style={{ marginRight: 8 }} /> Assign to Unit
                   </button>
                 </div>
               )}
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
        tenantName={tenant.commercialName || `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim()}
      />

      <CreatePaymentRequestModal 
        isOpen={showPaymentRequestModal}
        onClose={() => setShowPaymentRequestModal(false)}
        unit={selectedUnitForPayment}
        existingRequest={selectedRequestForEdit}
        onProceedToEditor={handleProceedToEditor}
      />

      <style jsx>{`
        .tenant-detail__content {
          max-width: 1000px;
        }
      `}</style>
    </div>
  )
}
