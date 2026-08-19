'use client'

import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Building2, 
  Users, 
  Wallet, 
  TrendingUp, 
  LogOut, 
  Home,
  Plus,
  Loader2,
  UserPlus,
  ShieldCheck,
  XCircle,
  User,
  MapPin,
  ChevronRight,
  FileText,
  Clock
} from 'lucide-react'
import styles from './page.module.css'
import { useRouter } from 'next/navigation'
import { getLandlordPortfolio, landlordLogout } from '@/features/auth/services/landlordAuthService'
import { useToast } from '@/components/common/Toast'
import { ManagedAddPropertyModal } from '@/features/pm/components/properties/modals/ManagedAddPropertyModal'
import { CreatePaymentRequestModal } from '@/features/pm/components/payments/modals/CreatePaymentRequestModal'
import { ManagedAddUnitModal } from '@/features/pm/components/properties/modals/ManagedAddUnitModal'
import { ImportModeModal } from '@/features/pm/components/properties/modals/ImportModeModal'
import { Property, Unit } from '@/features/pm/services/propertyService'
import { BankInfoForm } from '@/features/pm/components/settings/BankInfoForm'
import { ListSkeleton } from '@/components/skeletons'
import { api } from '@/lib/api'
import { useCredibilityRequests } from '@/features/pm/hooks/useCredibilityRequests'
import { PayoutsList } from '@/features/pm/components/payments/PayoutsList'
import { PaymentsView } from '@/features/pm/components/payments/PaymentsView'
import { AddTenantModal } from '@/features/pm/components/tenants/modals/AddTenantModal'
import { ConfirmationModal } from '@/components/common/ConfirmationModal'

export default function LandlordDashboard() {
  const router = useRouter()
  const { success: toastSuccess, error: toastError } = useToast()
  const [activeTab, setActiveTab] = React.useState<'overview' | 'payments' | 'requests' | 'payouts' | 'settlement'>('overview')
  const [isAddPropertyOpen, setIsAddPropertyOpen] = React.useState(false)
  const [selectedProperty, setSelectedProperty] = React.useState<Property | null>(null)
  const [isAddUnitOpen, setIsAddUnitOpen] = React.useState(false)
  const [activeUnit, setActiveUnit] = React.useState<Unit | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false)
  const [showImportModeModal, setShowImportModeModal] = React.useState(false)
  
  // Requests states
  const [selectedJoinReq, setSelectedJoinReq] = React.useState<any>(null)
  const [isAddTenantOpen, setIsAddTenantOpen] = React.useState(false)
  const [rejectModal, setRejectModal] = React.useState<{
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

  const { data: portfolio, isLoading, error, refetch } = useQuery({
    queryKey: ['landlord-portfolio'],
    queryFn: getLandlordPortfolio
  })



  const queryClient = useQueryClient()

  const { data: credibilityRequests = [], isLoading: loadingCred } = useCredibilityRequests()
  const { data: joinRequests = [], isLoading: loadingJoin } = useQuery({
    queryKey: ['tenant-join-requests'],
    queryFn: async () => {
      const res = await api.get('/pm/tenants/join-requests')
      return res || []
    },
    enabled: activeTab === 'requests'
  })

  const dismissMutation = useMutation({
    mutationFn: (uuid: string) => api.post(`/pm/tenants/join-requests/${uuid}/dismiss`, {}),
    onSuccess: () => {
      toastSuccess('Request dismissed')
      queryClient.invalidateQueries({ queryKey: ['tenant-join-requests'] })
      setRejectModal(prev => ({ ...prev, isOpen: false }))
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
      setRejectModal(prev => ({ ...prev, isOpen: false }))
    },
    onError: () => {
      toastError('Failed to reject request')
    }
  })



  const handleLogout = async () => {
    try {
      await landlordLogout()
      toastSuccess('Logged out successfully')
      router.push('/portal/login')
    } catch (err) {
      toastError('Failed to logout. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div className={styles.dashboard} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animate-spin" size={48} color="var(--forest)" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.dashboard}>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--error)' }}>
           Failed to load portfolio. Please try again later.
        </div>
      </div>
    )
  }

  if (!portfolio) return null;

  const { summary, properties } = portfolio

  return (
    <div className={styles.dashboard}>
      <div className={styles.maxContent}>
        <header className={styles.header}>
          <div className={styles.welcome}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 style={{ margin: 0 }}>Portfolio Overview</h1>
            </div>
            <p style={{ marginTop: 4 }}>Manage your real estate assets and collect rent</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              className={styles.button} 
              onClick={() => setShowImportModeModal(true)}
              style={{ background: 'white', color: 'var(--dark)', borderColor: 'var(--border)' }}
            >
              Bulk Import
            </button>
            <button 
              className={styles.button} 
              onClick={() => setIsAddPropertyOpen(true)}
              style={{ background: 'var(--forest)', color: 'white', borderColor: 'var(--forest)' }}
            >
              <Plus size={18} />
              Add Property
            </button>
            <button 
              className={styles.button} 
              onClick={handleLogout}
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </header>

        <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--border)', marginBottom: 32 }}>
            <button 
                onClick={() => setActiveTab('overview')}
                style={{ 
                    padding: '12px 16px', 
                    background: 'none', 
                    border: 'none', 
                    borderBottom: activeTab === 'overview' ? '2px solid var(--forest)' : 'none',
                    color: activeTab === 'overview' ? 'var(--forest)' : 'var(--text-muted)',
                    fontWeight: 700,
                    cursor: 'pointer'
                }}
            >
                Portfolio Overview
            </button>
            <button 
                onClick={() => router.push('/portal/tenants')}
                style={{ 
                    padding: '12px 16px', 
                    background: 'none', 
                    border: 'none', 
                    color: 'var(--text-muted)',
                    fontWeight: 700,
                    cursor: 'pointer'
                }}
            >
                Tenants Directory
            </button>
            <button 
                onClick={() => router.push('/portal/documents')}
                style={{ 
                    padding: '12px 16px', 
                    background: 'none', 
                    border: 'none', 
                    color: 'var(--text-muted)',
                    fontWeight: 700,
                    cursor: 'pointer'
                }}
            >
                Lease Documents
            </button>
            <button 
                onClick={() => setActiveTab('payments')}
                style={{ 
                    padding: '12px 16px', 
                    background: 'none', 
                    border: 'none', 
                    borderBottom: activeTab === 'payments' ? '2px solid var(--forest)' : 'none',
                    color: activeTab === 'payments' ? 'var(--forest)' : 'var(--text-muted)',
                    fontWeight: 700,
                    cursor: 'pointer'
                }}
            >
                Rent Payments
            </button>
            <button 
                onClick={() => setActiveTab('requests')}
                style={{ 
                    padding: '12px 16px', 
                    background: 'none', 
                    border: 'none', 
                    borderBottom: activeTab === 'requests' ? '2px solid var(--forest)' : 'none',
                    color: activeTab === 'requests' ? 'var(--forest)' : 'var(--text-muted)',
                    fontWeight: 700,
                    cursor: 'pointer'
                }}
            >
                Action Requests {(joinRequests.length + credibilityRequests.length) > 0 && `(${(joinRequests.length + credibilityRequests.length)})`}
            </button>
            <button 
                onClick={() => setActiveTab('payouts')}
                style={{ 
                    padding: '12px 16px', 
                    background: 'none', 
                    border: 'none', 
                    borderBottom: activeTab === 'payouts' ? '2px solid var(--forest)' : 'none',
                    color: activeTab === 'payouts' ? 'var(--forest)' : 'var(--text-muted)',
                    fontWeight: 700,
                    cursor: 'pointer'
                }}
            >
                Payout History
            </button>
             <button 
                onClick={() => setActiveTab('settlement')}
                style={{ 
                    padding: '12px 16px', 
                    background: 'none', 
                    border: 'none', 
                    borderBottom: activeTab === 'settlement' ? '2px solid var(--forest)' : 'none',
                    color: activeTab === 'settlement' ? 'var(--forest)' : 'var(--text-muted)',
                    fontWeight: 700,
                    cursor: 'pointer'
                }}
            >
                Settlement Settings
            </button>
        </div>

        {activeTab === 'overview' && (
          <>
            <section className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}><Building2 size={24} /></div>
                <div>
                  <div className={styles.statLabel}>Total Properties</div>
                  <div className={styles.statValue}>{summary.totalProperties}</div>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}><Home size={24} /></div>
                <div>
                  <div className={styles.statLabel}>Total Units</div>
                  <div className={styles.statValue}>{summary.totalUnits}</div>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}><Wallet size={24} /></div>
                <div>
                  <div className={styles.statLabel}>Total Revenue</div>
                  <div className={styles.statValue}>₦{summary.totalRevenue.toLocaleString()}</div>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}><TrendingUp size={24} /></div>
                <div>
                  <div className={styles.statLabel}>Collection Rate</div>
                  <div className={styles.statValue}>{summary.collectionRate.toFixed(1)}%</div>
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Your Properties</h2>
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>Units</th>
                    <th>Status</th>
                    <th>Revenue</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map((p: any) => (
                    <tr 
                      key={p.uuid} 
                      className={styles.clickableRow}
                    >
                      <td onClick={() => router.push(`/portal/properties/view?uuid=${p.uuid}`)} style={{ cursor: 'pointer' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{p.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.address}</div>
                      </td>
                      <td>{p.unitsCount} Units</td>
                      <td>
                        <div className={styles.managerInfo}>
                          <span className={styles.managerName}>{p.manager.business}</span>
                          <span className={styles.managerBusiness}>{p.manager.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className={styles.revenue}>₦{p.revenue.toLocaleString()}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                           <button 
                            className="btn-text" 
                            onClick={() => {
                              setSelectedProperty(p);
                              setIsAddUnitOpen(true);
                            }}
                            style={{ fontSize: 12, color: 'var(--clay)', fontWeight: 600 }}
                           >
                             Add Unit
                           </button>
                           <button 
                            className="btn-text" 
                            onClick={() => router.push(`/portal/properties/view?uuid=${p.uuid}`)}
                            style={{ fontSize: 12, color: 'var(--forest)', fontWeight: 600 }}
                           >
                             Manage
                           </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
        {activeTab === 'settlement' && (
          <BankInfoForm />
        )}
        {activeTab === 'requests' && (
          <div className="animate-fade-in">
            {loadingCred || loadingJoin ? (
              <ListSkeleton />
            ) : (joinRequests.length === 0 && credibilityRequests.length === 0) ? (
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
                          onClick={() => {
                            setSelectedJoinReq(req)
                            setIsAddTenantOpen(true)
                          }}
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
                                  <span className="request-meta-item__text">{new Date(req.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="request-premium-card__footer">
                            <button 
                              className="btn-card-reject"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRejectModal({
                                  isOpen: true,
                                  type: 'JOIN',
                                  uuid: req.uuid,
                                  name: `${req.tenantFirstName} ${req.tenantLastName}`
                                });
                              }}
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

                {credibilityRequests.length > 0 && (
                  <section className="requests-section animate-slide-up" style={{ marginTop: 40 }}>
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
                                  <span className="request-meta-item__text">Requested {new Date(req.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="request-premium-card__footer">
                            <button 
                              className="btn-card-reject"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRejectModal({
                                  isOpen: true,
                                  type: 'CREDIBILITY',
                                  uuid: req.uuid,
                                  name: req.tenantName
                                });
                              }}
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
            
            <style jsx>{`
              .requests-sections {
                display: flex;
                flex-direction: column;
                gap: 2rem;
              }
              .requests-section__header {
                display: flex;
                align-items: center;
                gap: 14px;
                margin-bottom: 20px;
              }
              .requests-section__icon-wrap {
                width: 44px;
                height: 44px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
              }
              .requests-section__icon-wrap--forest { background: #f0fdf4; color: #166534; border: 1px solid #dcfce7; }
              .requests-section__icon-wrap--orange { background: #fff7ed; color: #ea580c; border: 1px solid #ffedd5; }
              .requests-section__title {
                font-size: 18px;
                font-weight: 800;
                color: var(--text);
                margin: 0;
              }
              .requests-section__subtitle {
                font-size: 13px;
                color: var(--text-muted);
                margin-top: 1px;
                font-weight: 500;
              }
              .requests-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
                gap: 20px;
              }
              .request-premium-card {
                background: var(--surface);
                border: 1px solid var(--border);
                border-radius: 20px;
                display: flex;
                flex-direction: column;
                transition: all 0.2s ease-in-out;
                cursor: pointer;
                overflow: hidden;
              }
              .request-premium-card:hover {
                transform: translateY(-4px);
                border-color: var(--border-strong);
                box-shadow: var(--shadow-md);
              }
              .request-premium-card__body {
                padding: 20px;
                display: flex;
                gap: 16px;
              }
              .request-premium-card__avatar {
                width: 48px;
                height: 48px;
                border-radius: 14px;
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
                gap: 8px;
              }
              .request-premium-card__name {
                font-size: 15px;
                font-weight: 800;
                color: var(--text);
                margin: 0;
              }
              .request-premium-card__badge {
                font-size: 9px;
                font-weight: 800;
                padding: 2px 8px;
                border-radius: 6px;
                text-transform: uppercase;
                background: #f0fdf4;
                color: #166534;
              }
              .request-premium-card__badge--orange { background: #fff7ed; color: #ea580c; }
              .request-premium-card__email {
                font-size: 12px;
                color: var(--text-muted);
                margin-top: 1px;
                font-weight: 500;
              }
              .request-premium-card__meta-grid {
                display: flex;
                flex-direction: column;
                gap: 6px;
                margin-top: 12px;
              }
              .request-meta-item {
                display: flex;
                align-items: center;
                gap: 6px;
              }
              .request-meta-item__icon { color: var(--text-muted); }
              .request-meta-item__text {
                font-size: 12px;
                color: var(--text-secondary);
                font-weight: 600;
              }
              .request-premium-card__footer {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 20px;
                background: var(--ivory-dim);
                border-top: 1px solid var(--border);
              }
              .btn-card-reject {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 12px;
                font-weight: 700;
                color: #ef4444;
                background: transparent;
                border: none;
                cursor: pointer;
              }
              .btn-card-action {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px 14px;
                border-radius: 10px;
                font-size: 12px;
                font-weight: 700;
                border: none;
                cursor: pointer;
              }
              .btn-card-action--forest { background: var(--forest); color: white; }
              .btn-card-action--orange { background: white; color: #ea580c; border: 1px solid #ffedd5; }
              .requests-empty {
                text-align: center;
                padding: 4rem 2rem;
                background: var(--surface);
                border-radius: 24px;
                border: 2px dashed var(--border-strong);
              }
              .requests-empty__icon {
                width: 64px;
                height: 64px;
                background: var(--ivory-dim);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 16px;
                color: var(--text-muted);
              }
              .requests-empty__title { font-size: 20px; font-weight: 800; margin-bottom: 6px; }
              .requests-empty__text { color: var(--text-muted); font-size: 14px; max-width: 360px; margin: 0 auto; }
            `}</style>
          </div>
        )}
        {activeTab === 'payouts' && (
          <div className="animate-fade-in">
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: 'var(--text)' }}>
              Payout History
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
              Monitor and track all past automated settlements disbursed directly to your bank account.
            </p>
            <PayoutsList />
          </div>
        )}
        {activeTab === 'payments' && (
          <div className="animate-fade-in" style={{ background: 'white', padding: 32, borderRadius: 24, border: '1px solid var(--border)' }}>
            <PaymentsView />
          </div>
        )}

        {/* Modals */}
        <ManagedAddPropertyModal 
          isOpen={isAddPropertyOpen} 
          onClose={() => {
            setIsAddPropertyOpen(false);
            refetch();
          }} 
          isLandlordPortal={true}
        />

        {selectedProperty && (
          <ManagedAddUnitModal 
            isOpen={isAddUnitOpen}
            onClose={() => {
              setIsAddUnitOpen(false);
              setSelectedProperty(null);
              refetch();
            }}
            propertyUuid={selectedProperty.uuid}
            properties={portfolio?.properties || []}
          />
        )}

        <ImportModeModal 
          isOpen={showImportModeModal}
          onClose={() => {
            setShowImportModeModal(false);
            refetch();
          }}
          hasProperties={properties.length > 0}
        />

        {isAddTenantOpen && selectedJoinReq && (
          <AddTenantModal
            isOpen={isAddTenantOpen}
            onClose={() => {
              setIsAddTenantOpen(false);
              setSelectedJoinReq(null);
              refetch();
            }}
            initialData={{
              firstName: selectedJoinReq.tenantFirstName,
              lastName: selectedJoinReq.tenantLastName,
              email: selectedJoinReq.tenantEmail,
              unitDetails: selectedJoinReq.unitDetails,
            }}
          />
        )}

        <ConfirmationModal
          isOpen={rejectModal.isOpen}
          onClose={() => setRejectModal(prev => ({ ...prev, isOpen: false }))}
          onConfirm={() => {
            if (rejectModal.type === 'JOIN') {
              dismissMutation.mutate(rejectModal.uuid);
            } else {
              rejectCredMutation.mutate(rejectModal.uuid);
            }
          }}
          title="Reject Request?"
          message={`Are you sure you want to reject the request from ${rejectModal.name}? This action will notify the tenant and cannot be undone.`}
          confirmText="Yes, Reject"
          type="danger"
          isPending={dismissMutation.isPending || rejectCredMutation.isPending}
        />
      </div>
    </div>
  )
}
