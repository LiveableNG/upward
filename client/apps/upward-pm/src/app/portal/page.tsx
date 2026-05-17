'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Building2, 
  Users, 
  Wallet, 
  TrendingUp, 
  LogOut, 
  Home,
  Plus,
  Loader2
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
import { SettlementSettings } from './components/SettlementSettings'
import { useVerificationStatus } from '@/features/pm/hooks/useVerification'
import { Clock, CheckCircle2 } from 'lucide-react'
import { VerificationForm } from '@/features/pm/components/verification/VerificationForm'
import { Splash } from '@/components/common/Splash'

export default function LandlordDashboard() {
  const router = useRouter()
  const { success: toastSuccess, error: toastError } = useToast()
  const [activeTab, setActiveTab] = React.useState<'overview' | 'settlement' | 'verification'>('overview')
  const [isAddPropertyOpen, setIsAddPropertyOpen] = React.useState(false)
  const [selectedProperty, setSelectedProperty] = React.useState<Property | null>(null)
  const [isAddUnitOpen, setIsAddUnitOpen] = React.useState(false)
  const [activeUnit, setActiveUnit] = React.useState<Unit | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false)
  const [showImportModeModal, setShowImportModeModal] = React.useState(false)
  
  const { data: portfolio, isLoading, error, refetch } = useQuery({
    queryKey: ['landlord-portfolio'],
    queryFn: getLandlordPortfolio
  })

  const { data: verification, isLoading: isVerificationLoading } = useVerificationStatus()

  const renderVerificationContent = () => {
    if (isVerificationLoading) {
      return (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <Splash />
        </div>
      )
    }

    if (verification?.status === 'PENDING' || verification?.status === 'APPROVED') {
      const isApproved = verification.status === 'APPROVED'
      return (
        <div className="animate-fade-in" style={{ 
            background: 'white', 
            padding: 40, 
            borderRadius: 24, 
            border: '1px solid var(--border)',
            textAlign: 'center'
        }}>
            <div style={{ 
                width: 64, 
                height: 64, 
                borderRadius: 20, 
                background: isApproved ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                margin: '0 auto 20px',
                color: isApproved ? 'var(--forest)' : '#3b82f6'
            }}>
                {isApproved ? <CheckCircle2 size={32} /> : <Clock size={32} />}
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
                {isApproved ? 'Profile Verified' : 'Verification Pending'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>
                {isApproved 
                    ? 'Your identity has been successfully verified. Your account is now in good standing.' 
                    : 'We have received your verification details and are currently reviewing them. This usually takes 24-48 hours.'}
            </p>
        </div>
      )
    }

    return <VerificationForm />
  }

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
              {verification?.status === 'APPROVED' ? (
                <span style={{ 
                  padding: '4px 10px', 
                  borderRadius: 20, 
                  background: 'rgba(34, 197, 94, 0.1)', 
                  color: 'var(--forest)', 
                  fontSize: 11, 
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  border: '1px solid rgba(34, 197, 94, 0.2)'
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--forest)' }} />
                  VERIFIED LANDLORD
                </span>
              ) : verification?.status === 'PENDING' ? (
                <span 
                  onClick={() => setActiveTab('verification')}
                  style={{ 
                    padding: '4px 10px', 
                    borderRadius: 20, 
                    background: 'rgba(59, 130, 246, 0.1)', 
                    color: '#3b82f6', 
                    fontSize: 11, 
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                  }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6' }} />
                  PENDING REVIEW
                </span>
              ) : (
                <span 
                  onClick={() => setActiveTab('verification')}
                  style={{ 
                    padding: '4px 10px', 
                    borderRadius: 20, 
                    background: 'rgba(239, 68, 68, 0.1)', 
                    color: '#ef4444', 
                    fontSize: 11, 
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                  }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
                  UNVERIFIED
                </span>
              )}
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
            <button 
                onClick={() => setActiveTab('verification')}
                style={{ 
                    padding: '12px 16px', 
                    background: 'none', 
                    border: 'none', 
                    borderBottom: activeTab === 'verification' ? '2px solid var(--forest)' : 'none',
                    color: activeTab === 'verification' ? 'var(--forest)' : 'var(--text-muted)',
                    fontWeight: 700,
                    cursor: 'pointer'
                }}
            >
                Verification Details
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
                      <td onClick={() => router.push(`/portal/properties/${p.uuid}`)} style={{ cursor: 'pointer' }}>
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
                            onClick={() => router.push(`/portal/properties/${p.uuid}`)}
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
          <SettlementSettings landlord={portfolio?.landlord} />
        )}
        {activeTab === 'verification' && (
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            {renderVerificationContent()}
          </div>
        )}

        {/* Modals */}
        <ManagedAddPropertyModal 
          isOpen={isAddPropertyOpen} 
          onClose={() => {
            setIsAddPropertyOpen(false);
            refetch();
          }} 
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
      </div>
    </div>
  )
}
