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
import { Property, Unit } from '@/features/pm/services/propertyService'
import { SettlementSettings } from './components/SettlementSettings'

export default function LandlordDashboard() {
  const router = useRouter()
  const { success: toastSuccess, error: toastError } = useToast()
  const [activeTab, setActiveTab] = React.useState<'overview' | 'settlement'>('overview')
  const [isAddPropertyOpen, setIsAddPropertyOpen] = React.useState(false)
  const [selectedProperty, setSelectedProperty] = React.useState<Property | null>(null)
  const [isAddUnitOpen, setIsAddUnitOpen] = React.useState(false)
  const [activeUnit, setActiveUnit] = React.useState<Unit | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false)
  
  const { data: portfolio, isLoading, error, refetch } = useQuery({
    queryKey: ['landlord-portfolio'],
    queryFn: getLandlordPortfolio
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
            <h1>Portfolio Overview</h1>
            <p>Manage your real estate assets and collect rent</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
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

        {activeTab === 'overview' ? (
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
        ) : (
          <SettlementSettings landlord={portfolio?.landlord} />
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
      </div>
    </div>
  )
}
