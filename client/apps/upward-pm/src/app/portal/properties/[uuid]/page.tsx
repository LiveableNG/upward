'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { 
  ArrowLeft, 
  MapPin, 
  Users, 
  Building2, 
  Wallet, 
  Mail, 
  Phone,
  ArrowUpRight,
  ShieldCheck,
  Loader2
} from 'lucide-react'
import { getLandlordPropertyDetails } from '@/features/auth/services/landlordAuthService'
import styles from './page.module.css'

export default function LandlordPropertyDetail() {
  const { uuid } = useParams()
  const router = useRouter()

  const { data: property, isLoading, error } = useQuery({
    queryKey: ['landlord-property', uuid],
    queryFn: () => getLandlordPropertyDetails(uuid as string),
    enabled: !!uuid
  })

  if (isLoading) {
    return (
      <div className={styles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <Loader2 className="animate-spin" size={48} color="var(--forest)" />
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className={styles.container}>
        <button onClick={() => router.back()} className={styles.backBtn}>
          <ArrowLeft size={18} /> Back to Dashboard
        </button>
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <h2 style={{ color: 'var(--error)' }}>Property Not Found</h2>
          <p style={{ color: 'var(--text-muted)' }}>We couldn't find the property you're looking for or you don't have access.</p>
        </div>
      </div>
    )
  }

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase()

  return (
    <div className={styles.container}>
      <button onClick={() => router.push('/portal')} className={styles.backBtn}>
        <ArrowLeft size={18} /> Back to Dashboard
      </button>

      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <div>
            <h1 className={styles.title}>{property.name}</h1>
            <div className={styles.address}>
              <MapPin size={16} />
              {property.address}
            </div>
          </div>
          <div className={styles.badge}>{property.propertyType}</div>
        </div>
      </header>

      <div className={styles.grid}>
        <div className={styles.mainContent}>
          {/* Summary Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Occupancy</div>
              <div className={styles.statValue}>
                {property.summary.occupiedUnits} / {property.summary.totalUnits}
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '8px' }}>
                  ({Math.round((property.summary.occupiedUnits / property.summary.totalUnits) * 100)}%)
                </span>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Total Units</div>
              <div className={styles.statValue}>{property.summary.totalUnits}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Property Revenue</div>
              <div className={`${styles.statValue} ${styles.revenue}`}>₦{property.summary.totalRevenue.toLocaleString()}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Outstanding Balance</div>
              <div className={`${styles.statValue} ${styles.outstanding}`}>₦{property.summary.totalOutstanding.toLocaleString()}</div>
            </div>
          </div>

          {/* Unit Breakdown */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <Building2 size={20} />
              Unit Breakdown
            </h2>
            <div className={styles.unitList}>
              {property.units.map((unit: any) => (
                <div key={unit.uuid} className={styles.unitCard}>
                  <div className={styles.unitInfo}>
                    <h4>Unit {unit.unitNumber}</h4>
                    <p>{unit.unitType}</p>
                  </div>
                  <div>
                    <div className={`${styles.status} ${unit.status === 'OCCUPIED' ? styles.occupied : styles.vacant}`}>
                      {unit.status}
                    </div>
                    {unit.tenant && (
                      <div style={{ fontSize: '13px', marginTop: '4px', fontWeight: 600 }}>{unit.tenant.name}</div>
                    )}
                  </div>
                  <div>
                    <div className={styles.statLabel}>Revenue</div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>₦{unit.revenue.toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className={styles.statLabel}>Outstanding</div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: unit.outstanding > 0 ? 'var(--error)' : 'inherit' }}>
                      ₦{unit.outstanding.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside>
          <div className={styles.managerCard}>
            <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.6, marginBottom: '24px' }}>
              Managed By
            </h3>
            <div className={styles.managerHeader}>
              <div className={styles.managerAvatar}>{getInitials(property.manager.name)}</div>
              <div>
                <span className={styles.managerName}>{property.manager.name}</span>
                <span className={styles.managerBusiness}>{property.manager.business}</span>
              </div>
            </div>
            
            <div className={styles.contactList}>
              <div className={styles.contactItem}>
                <Mail size={16} />
                {property.manager.email}
              </div>
              <div className={styles.contactItem}>
                <Phone size={16} />
                {property.manager.phone}
              </div>
              <div className={styles.contactItem}>
                <ShieldCheck size={16} color="var(--clay)" />
                Verified Property Manager
              </div>
            </div>

            <button 
              className="auth-btn auth-btn--primary" 
              style={{ marginTop: '32px', width: '100%', background: 'white', color: 'var(--dark)' }}
              onClick={() => window.location.href = `mailto:${property.manager.email}`}
            >
              Contact Manager
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
