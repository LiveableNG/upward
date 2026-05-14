'use client'

import React from 'react'
import { 
  Building2, 
  Users, 
  CreditCard, 
  TrendingUp, 
  Clock, 
  ArrowUpRight,
  PlusCircle,
  ShieldCheck,
  MapPin
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useProperties, useUnits } from '@/features/pm/hooks/useProperties'
import { useTenants } from '@/features/pm/hooks/useTenants'
import { usePaymentRequests } from '@/features/pm/hooks/usePayments'
import { ActivityCarousel } from './ActivityCarousel'
import { TenantRequestsWidget } from './TenantRequestsWidget'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader/PageHeader'
import { StatCard } from '@/components/ui/StatCard/StatCard'
import { StatGrid } from '@/components/ui/StatCard/StatGrid'

export function DashboardView() {
  const router = useRouter()
  const { data: properties = [] } = useProperties()
  const { data: units = [] } = useUnits()
  const { data: tenants = [] } = useTenants()
  const { data: requests = [] } = usePaymentRequests()

  // Stats Calculation
  const totalUnits = units.length
  const activeTenants = tenants.filter(t => t.inviteStatus === 'ON_UPWARD' || t.inviteStatus === 'ACCEPTED').length
  
  const pendingAmount = requests
    .filter(r => r.status !== 'PAID')
    .reduce((sum, r) => sum + (r.amount - r.amountPaid), 0)
    
  const totalRevenue = requests
    .reduce((sum, r) => sum + r.amountPaid, 0)

  const stats = [
    { 
      label: 'Total Units', 
      value: totalUnits.toString(), 
      icon: Building2, 
      trend: `${properties.length} Properties`, 
      type: 'forest' 
    },
    { 
      label: 'Active Tenants', 
      value: activeTenants.toString(), 
      icon: Users, 
      trend: `${Math.round((activeTenants / (totalUnits || 1)) * 100)}% active`, 
      type: 'success' 
    },
    { 
      label: 'Pending Balance', 
      value: `₦${pendingAmount.toLocaleString()}`, 
      icon: CreditCard, 
      trend: `${requests.filter(r => r.status !== 'PAID').length} open requests`, 
      type: 'warning' 
    },
    { 
      label: 'Total Revenue', 
      value: `₦${totalRevenue.toLocaleString()}`, 
      icon: TrendingUp, 
      trend: 'All time collection', 
      type: 'info' 
    },
  ]

  // Recent Activity (Derived from real data)
  const recentRequests = [...requests]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const occupancyRate = totalUnits > 0 ? Math.round((units.filter(u => u.status === 'OCCUPIED').length / totalUnits) * 100) : 0

  return (
    <div className="dashboard animate-fade-in">
      <PageHeader 
        title={`Welcome back!`}
        subtitle="Here is what is happening with your properties today."
        actions={
          <button className="btn btn--primary" onClick={() => router.push('/properties')}>
            <PlusCircle size={18} /> Add Property
          </button>
        }
      />

      <ActivityCarousel />

      <TenantRequestsWidget />

      <StatGrid>
        <StatCard 
          label="Total Units" 
          value={totalUnits} 
          icon={Building2} 
          trend={{ value: properties.length, label: 'Properties', isUp: true }}
          variant="accent"
        />
        <StatCard 
          label="Active Tenants" 
          value={activeTenants} 
          icon={Users} 
          trend={{ value: Math.round((activeTenants / (totalUnits || 1)) * 100), label: '% occupancy', isUp: true }}
        />
        <StatCard 
          label="Pending Balance" 
          value={`₦${pendingAmount.toLocaleString()}`} 
          icon={CreditCard} 
          trend={{ value: requests.filter(r => r.status !== 'PAID').length, label: 'open requests', isUp: false }}
        />
        <StatCard 
          label="Total Revenue" 
          value={`₦${totalRevenue.toLocaleString()}`} 
          icon={TrendingUp} 
          trend={{ value: 100, label: 'All time collection', isUp: true }}
        />
      </StatGrid>

      <div className="dashboard__content">
        <section className="section-card">
          <div className="section-header">
            <h2 className="section-title">Property Portfolio</h2>
            <button className="section-link" onClick={() => router.push('/properties')}>View All</button>
          </div>
          
          <div className="property-summary">
            {properties.slice(0, 3).map(prop => {
              const propUnits = units.filter(u => (u as any).propertyUuid === prop.uuid || u.propertyId === prop.id)
              const occupiedCount = propUnits.filter(u => u.status === 'OCCUPIED').length
              const rate = propUnits.length > 0 ? Math.round((occupiedCount / propUnits.length) * 100) : 0
              
              return (
                <div key={prop.uuid} className="property-item-mini" onClick={() => router.push(`/properties`)} style={{ cursor: 'pointer' }}>
                  <div className="property-item-mini__info">
                    <h4>{prop.name}</h4>
                    <p>{prop.area}, {prop.state} • {propUnits.length} Units</p>
                  </div>
                  <div className={cn(
                    "property-item-mini__status",
                    rate === 100 ? "property-item-mini__status--full" : "property-item-mini__status--partial"
                  )}>
                    {rate}% Occupied
                  </div>
                </div>
              )
            })}
            {properties.length === 0 && (
              <div className="empty-state-mini">
                <MapPin size={32} className="text-muted" />
                <p>No properties added yet.</p>
                <button className="btn btn--secondary btn--sm" onClick={() => router.push('/properties')}>
                  Add Property
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="section-card">
          <div className="section-header">
            <h2 className="section-title">Recent Payment Requests</h2>
            <button className="section-link" onClick={() => router.push('/payments')}>View All</button>
          </div>
          
          <div className="activity-list">
            {recentRequests.map((req) => (
              <div key={req.uuid} className="activity-item">
                <div className="activity-item__icon">
                  <CreditCard size={16} className="text-forest" />
                </div>
                <div className="activity-item__content">
                  <p className="activity-item__text">
                    Request for <strong>₦{req.amount.toLocaleString()}</strong> sent to <strong>{req.tenant?.firstName} {req.tenant?.lastName}</strong> (Unit {req.unit?.unitName})
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p className="activity-item__time">
                      <Clock size={10} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                      {new Date(req.createdAt).toLocaleDateString()}
                    </p>
                    <span className={cn("status-chip status-chip--sm", `status-chip--${req.status.toLowerCase()}`)}>
                      {req.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {recentRequests.length === 0 && (
              <div className="empty-state-mini">
                <CreditCard size={32} className="text-muted" />
                <p>No payment requests yet.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <style jsx>{`
        .empty-state-mini {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          gap: 12px;
          color: var(--text-muted);
          text-align: center;
        }
        .status-chip--sm {
          font-size: 10px;
          padding: 2px 8px;
        }
      `}</style>
    </div>
  )
}
