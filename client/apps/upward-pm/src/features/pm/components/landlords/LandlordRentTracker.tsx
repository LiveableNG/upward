'use client'

import React, { useMemo } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  AlertCircle, 
  CheckCircle2,
  Calendar,
  Building2,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { Unit } from '../../services/propertyService'
import { cn } from '@/lib/utils'

interface LandlordRentTrackerProps {
  units: Unit[]
  paymentRequests: any[]
}

export function LandlordRentTracker({ units, paymentRequests }: LandlordRentTrackerProps) {
  // 1. Filter payment requests for these units
  const unitIds = units.map(u => u.id)
  const landlordRequests = paymentRequests.filter(req => unitIds.includes(req.unitId))

  // 2. Financial Aggregation
  const stats = useMemo(() => {
    const totalRequested = landlordRequests.reduce((sum, req) => sum + req.amount, 0)
    const totalPaid = landlordRequests.reduce((sum, req) => sum + req.amountPaid, 0)
    const outstanding = totalRequested - totalPaid
    const collectionRate = totalRequested > 0 ? (totalPaid / totalRequested) * 100 : 0
    
    // Group by month for trend (Last 6 months)
    const monthlyTrend: Record<string, { total: number, paid: number }> = {}
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    landlordRequests.forEach(req => {
      const date = new Date(req.dueDate)
      const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`
      if (!monthlyTrend[monthKey]) monthlyTrend[monthKey] = { total: 0, paid: 0 }
      monthlyTrend[monthKey].total += req.amount
      monthlyTrend[monthKey].paid += req.amountPaid
    })

    const trendData = Object.entries(monthlyTrend)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .slice(-6)

    return { totalRequested, totalPaid, outstanding, collectionRate, trendData }
  }, [landlordRequests])

  return (
    <div className="landlord-rent-tracker animate-fade-in">
      
      {/* Top Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
        {[
          { label: 'Total Portfolio Value', value: `₦${stats.totalRequested.toLocaleString()}`, icon: Building2, color: 'var(--dark)' },
          { label: 'Total Collected', value: `₦${stats.totalPaid.toLocaleString()}`, icon: CheckCircle2, color: 'var(--forest)' },
          { label: 'Outstanding Balance', value: `₦${stats.outstanding.toLocaleString()}`, icon: AlertCircle, color: 'var(--accent)' },
          { label: 'Collection Rate', value: `${stats.collectionRate.toFixed(1)}%`, icon: TrendingUp, color: 'var(--forest)' },
        ].map((stat, i) => (
          <div key={i} className="glass" style={{ padding: 24, borderRadius: 24, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--ivory-dim)', color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <stat.icon size={20} />
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--forest)', background: 'var(--forest-faint)', padding: '4px 8px', borderRadius: 100, display: 'flex', alignItems: 'center', gap: 4 }}>
                <ArrowUpRight size={10} /> 12%
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>{stat.label}</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--dark)' }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 32 }}>
        
        {/* Left: Collection Trend (Custom CSS Chart) */}
        <div className="glass" style={{ padding: 32, borderRadius: 32, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--dark)' }}>Collection Performance</h3>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, fontWeight: 600 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--forest)' }} /> Expected
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--accent)' }} /> Collected
              </div>
            </div>
          </div>

          <div style={{ height: 300, display: 'flex', alignItems: 'flex-end', gap: 32, paddingBottom: 40, borderBottom: '1px solid var(--border)', position: 'relative' }}>
            {stats.trendData.length > 0 ? stats.trendData.map(([month, data], i) => {
              const maxVal = Math.max(...stats.trendData.map(d => d[1].total))
              const totalHeight = (data.total / maxVal) * 100
              const paidHeight = (data.paid / data.total) * 100
              
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ 
                    width: '100%', 
                    height: `${totalHeight}%`, 
                    background: 'var(--ivory-dim)', 
                    borderRadius: '8px 8px 0 0', 
                    position: 'relative', 
                    overflow: 'hidden',
                    minHeight: 4
                  }}>
                    <div style={{ 
                      position: 'absolute', 
                      bottom: 0, 
                      left: 0, 
                      right: 0, 
                      height: `${paidHeight}%`, 
                      background: 'var(--forest)', 
                      opacity: 0.8,
                      borderRadius: '8px 8px 0 0',
                      transition: 'height 1s ease-out'
                    }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>{month}</span>
                </div>
              )
            }) : (
              <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-muted)', paddingBottom: 100 }}>
                Insufficient data for performance trend
              </div>
            )}
          </div>
        </div>

        {/* Right: Payment Status Breakdown */}
        <div className="glass" style={{ padding: 32, borderRadius: 32, border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--dark)', marginBottom: 24 }}>Payment Status</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              { label: 'Fully Paid', count: landlordRequests.filter(r => r.status === 'PAID').length, color: 'var(--forest)', total: landlordRequests.length },
              { label: 'Partially Paid', count: landlordRequests.filter(r => r.status === 'PARTIAL').length, color: 'var(--accent)', total: landlordRequests.length },
              { label: 'Pending', count: landlordRequests.filter(r => r.status === 'PENDING').length, color: 'var(--text-muted)', total: landlordRequests.length },
            ].map((status, i) => {
              const percentage = status.total > 0 ? (status.count / status.total) * 100 : 0
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                    <span style={{ color: 'var(--dark)' }}>{status.label}</span>
                    <span style={{ color: status.color }}>{status.count} Units</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--ivory-dim)', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ width: `${percentage}%`, height: '100%', background: status.color, borderRadius: 10 }} />
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ marginTop: 40, padding: 24, background: 'var(--dark)', borderRadius: 20, color: 'white' }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Revenue Insight</h4>
            <p style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.5 }}>
              Your collection rate is currently <strong>{stats.collectionRate.toFixed(1)}%</strong>. 
              Focus on the {landlordRequests.filter(r => r.status === 'PENDING').length} pending requests to maximize this month's revenue.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom: Recent Requests */}
      <div style={{ marginTop: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--dark)', marginBottom: 24 }}>Recent Rent Requests</h3>
        <div style={{ background: 'white', borderRadius: 24, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <table className="tenant-table">
            <thead style={{ background: 'var(--ivory-dim)' }}>
              <tr>
                <th style={{ padding: '16px 24px', fontSize: 11 }}>UNIT</th>
                <th style={{ padding: '16px 24px', fontSize: 11 }}>DUE DATE</th>
                <th style={{ padding: '16px 24px', fontSize: 11 }}>AMOUNT</th>
                <th style={{ padding: '16px 24px', fontSize: 11 }}>PAID</th>
                <th style={{ padding: '16px 24px', fontSize: 11 }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {landlordRequests.slice(0, 5).map(req => {
                const unit = units.find(u => u.id === req.unitId)
                return (
                  <tr key={req.uuid} className="tenant-table-row">
                    <td style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--dark)' }}>{unit?.unitName || 'Unknown Unit'}</td>
                    <td style={{ padding: '16px 24px', fontSize: 13 }}>{new Date(req.dueDate).toLocaleDateString()}</td>
                    <td style={{ padding: '16px 24px', fontWeight: 700 }}>₦{req.amount.toLocaleString()}</td>
                    <td style={{ padding: '16px 24px', color: 'var(--forest)', fontWeight: 600 }}>₦{req.amountPaid.toLocaleString()}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <span className={`badge badge--${req.status.toLowerCase()}`} style={{ fontSize: 10 }}>{req.status}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
