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
  ChevronRight,
  Loader2
} from 'lucide-react'
import styles from './page.module.css'
import { useRouter } from 'next/navigation'
import { getLandlordPortfolio, landlordLogout } from '@/features/auth/services/landlordAuthService'
import { useToast } from '@/components/common/Toast'

export default function LandlordDashboard() {
  const router = useRouter()
  const { success: toastSuccess, error: toastError } = useToast()
  
  const { data, isLoading, error } = useQuery({
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

  if (!data) return null;

  const { summary, properties } = data

  return (
    <div className={styles.dashboard}>
      <div className={styles.maxContent}>
        <header className={styles.header}>
          <div className={styles.welcome}>
            <h1>Portfolio Overview</h1>
            <p>Real-time analysis of your real estate assets</p>
          </div>
          <button 
            className={styles.button} 
            onClick={handleLogout}
          >
            <LogOut size={18} />
            Logout
          </button>
        </header>

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
                <th>Manager</th>
                <th>Revenue</th>
                <th>Outstanding</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {properties.map((p: any) => (
                <tr 
                  key={p.uuid} 
                  onClick={() => router.push(`/portal/properties/${p.uuid}`)}
                  style={{ cursor: 'pointer' }}
                  className={styles.clickableRow}
                >
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{p.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.address}</div>
                  </td>
                  <td>{p.unitsCount} Units</td>
                  <td>
                    <div className={styles.managerInfo}>
                      <span className={styles.managerName}>{p.manager.name}</span>
                      <span className={styles.managerBusiness}>{p.manager.business}</span>
                    </div>
                  </td>
                  <td>
                    <span className={styles.revenue}>₦{p.revenue.toLocaleString()}</span>
                  </td>
                  <td>
                    <span className={styles.outstanding}>₦{p.outstanding.toLocaleString()}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <ChevronRight size={20} color="var(--text-muted)" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  )
}
