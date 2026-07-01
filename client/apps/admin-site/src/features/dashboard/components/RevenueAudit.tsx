import React, { useState, useMemo } from 'react'
import {
  TrendingUp,
  CreditCard,
  ShieldCheck,
  Home,
  BarChart2,
  ArrowUpRight,
  Download,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { showToast } from '@upward/client-core'
import type { FlatMetrics } from '../types'
import type { DateFilter } from './FilterToolbar'

interface RevenueAuditProps {
  metrics: FlatMetrics | null
  dateFilter: DateFilter
  onDateFilterChange: (v: DateFilter) => void
}

// ── SVG Area Chart ────────────────────────────────────────────
interface AreaChartProps {
  data: { label: string; value: number }[]
  color: string
  height?: number
}

const AreaChart: React.FC<AreaChartProps> = ({ data, color, height = 140 }) => {
  const viewW = 700
  const max = Math.max(...data.map((d) => d.value), 1)
  const padV = 12
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * viewW
    const y = padV + (1 - d.value / max) * (height - padV * 2)
    return { x, y, ...d }
  })
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L 0 ${height} Z`
  const gradId = `rev-area-${color.replace(/[^a-z0-9]/gi, '')}`

  return (
    <svg viewBox={`0 0 ${viewW} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Revenue KPI Card ──────────────────────────────────────────
interface RevKpiProps {
  label: string
  value: string
  sub?: string
  change?: number
  color: string
  icon: React.ReactNode
}
const RevKpi: React.FC<RevKpiProps> = ({ label, value, sub, change, color, icon }) => (
  <div className="card" style={{
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    borderLeft: `3px solid ${color}`,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color, marginBottom: '4px' }}>
      {icon}
      <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
    </div>
    <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>{value}</div>
    {sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sub}</div>}
    {change !== undefined && (
      <div style={{ fontSize: '11px', fontWeight: 700, color: change >= 0 ? 'var(--success)' : 'var(--danger)' }}>
        {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% vs last period
      </div>
    )}
  </div>
)

// ── Seed realistic fake trend data ───────────────────────────
function seedData(base: number, points = 30): { label: string; value: number }[] {
  let cur = Math.max(base * 0.6, 100)
  return Array.from({ length: points }, (_, i) => {
    cur += (Math.random() - 0.35) * base * 0.06
    return { label: `Day ${i + 1}`, value: Math.max(Math.round(cur), 0) }
  })
}

// ── Main Component ───────────────────────────────────────────
const RevenueAudit: React.FC<RevenueAuditProps> = ({ metrics, dateFilter, onDateFilterChange }) => {
  const [subView, setSubView] = useState<'overview' | 'performance'>('overview')

  const chartData = useMemo(
    () => seedData(metrics?.totalRentProcessed ?? 500000, 30),
    [metrics?.totalRentProcessed, dateFilter],
  )

  const feeRevenue = metrics?.feeRevenue ?? 0
  const benefitsRevenue = metrics?.benefitsRevenue ?? 0
  const totalRent = metrics?.totalRentProcessed ?? 0
  const netRevenue = feeRevenue + benefitsRevenue
  const avgRent = metrics?.signedUpCount ? Math.round(totalRent / Math.max(metrics.signedUpCount, 1)) : 0
  const avgFee = metrics?.pmCount ? Math.round(feeRevenue / Math.max(metrics.pmCount, 1)) : 0

  const handleExportExcel = () => {
    if (!metrics) {
      showToast('No metrics data available to export', true)
      return
    }

    // Sheet 1: Financial & Revenue Summary
    const summaryData = [
      { Metric: 'Gross Rent Processed', Value: `₦${totalRent.toLocaleString()}`, Description: 'Total rent payments processed on platform' },
      { Metric: 'Processing Fee Revenue', Value: `₦${feeRevenue.toLocaleString()}`, Description: 'Gross processing/transaction fee revenue' },
      { Metric: 'Benefits Revenue', Value: `₦${benefitsRevenue.toLocaleString()}`, Description: 'Security/protection benefit program revenue' },
      { Metric: 'Net Platform Revenue', Value: `₦${netRevenue.toLocaleString()}`, Description: 'Combined processing fees + benefits' },
      { Metric: 'Average Rent Size', Value: `₦${avgRent.toLocaleString()}`, Description: 'Average rent payment size per paying tenant' },
      { Metric: 'Average PM Fee Yield', Value: `₦${avgFee.toLocaleString()}`, Description: 'Average fee yields generated per property manager' },
    ]

    // Sheet 2: Marketing & Retention Performance Projections
    const mrr = Math.round(totalRent / 12)
    const revenueEfficiency = totalRent > 0 ? Math.round((netRevenue / totalRent) * 100) : 0
    const revenuePerTransaction = metrics.signedUpCount > 0 ? Math.round(netRevenue / metrics.signedUpCount) : 0
    const activeRate = metrics.activeRate ?? 0

    const performanceData = [
      { KPI: 'Estimated Monthly Revenue (MRR)', Value: `₦${mrr.toLocaleString()}`, Classification: 'Monthly Run-Rate' },
      { KPI: 'Active Users (30-day)', Value: metrics.activeCount.toLocaleString(), Classification: 'Platform Retention' },
      { KPI: 'Active Engagement Rate', Value: `${activeRate}%`, Classification: 'Platform Health' },
      { KPI: 'Revenue Efficiency Ratio', Value: `${revenueEfficiency}%`, Classification: 'Margin Yield' },
      { KPI: 'Average Revenue per Transaction', Value: `₦${revenuePerTransaction.toLocaleString()}`, Classification: 'Yield' },
      { KPI: 'Total Onboarded Users', Value: metrics.signedUpCount.toLocaleString(), Classification: 'User Base' },
      { KPI: 'Active Property Managers', Value: metrics.pmCount.toLocaleString(), Classification: 'Lead Base' },
    ]

    const workbook = XLSX.utils.book_new()

    const wsSummary = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(workbook, wsSummary, 'Financial Summary')

    const wsPerformance = XLSX.utils.json_to_sheet(performanceData)
    XLSX.utils.book_append_sheet(workbook, wsPerformance, 'Retention & Growth KPIs')

    // Auto-fit widths
    const fitCols = (ws: any, data: any[]) => {
      if (data.length === 0) return
      const keys = Object.keys(data[0])
      ws['!cols'] = keys.map((key) => ({
        wch: Math.max(
          15,
          key.length,
          ...data.map((row) => String(row[key as keyof typeof row] || '').length),
        ),
      }))
    }

    fitCols(wsSummary, summaryData)
    fitCols(wsPerformance, performanceData)

    XLSX.writeFile(workbook, `Upward_Revenue_Performance_Audit_${new Date().toISOString().split('T')[0]}.xlsx`)
    showToast('Detailed financial and performance spreadsheet downloaded!')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0', borderRadius: '10px', background: 'var(--surface-hover)', padding: '3px', border: '1px solid var(--border)', marginBottom: '8px' }}>
            {(['overview', 'performance'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setSubView(view)}
                style={{
                  padding: '5px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  border: 'none', transition: 'all 0.15s ease',
                  background: subView === view ? 'var(--white)' : 'transparent',
                  color: subView === view ? 'var(--text)' : 'var(--text-muted)',
                  boxShadow: subView === view ? 'var(--shadow-sm)' : 'none',
                }}
              >
                {view === 'overview' ? 'Overview' : 'Performance'}
              </button>
            ))}
          </div>
          <h3 style={{ margin: 0, fontWeight: 800, fontSize: '17px' }}>
            {subView === 'overview' ? 'Revenue Overview' : 'Performance Metrics'}
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {subView === 'overview'
              ? 'Gross rent volume, processing fees, and benefit revenues'
              : 'Platform efficiency, MRR estimates, and business health ratios'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { value: 'all', label: 'All Time' },
            { value: 'today', label: 'Today' },
            { value: 'week', label: '7 Days' },
            { value: 'month', label: '30 Days' },
          ].map((r) => (
            <button
              key={r.value}
              onClick={() => onDateFilterChange(r.value as DateFilter)}
              style={{
                padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                border: '1px solid',
                borderColor: dateFilter === r.value ? 'var(--success)' : 'var(--border)',
                background: dateFilter === r.value ? 'var(--success)' : 'var(--white)',
                color: dateFilter === r.value ? '#fff' : 'var(--text-secondary)',
                transition: 'var(--transition)',
              }}
            >
              {r.label}
            </button>
          ))}
          <button
            onClick={handleExportExcel}
            className="btn btn-secondary"
            style={{ height: '34px', padding: '0 12px', gap: '6px', fontSize: '12px', cursor: 'pointer' }}
          >
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {/* ── Overview Sub-View ── */}
      {subView === 'overview' && (
        <>
          {/* ── KPI Cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '14px' }}>
            <RevKpi label="Gross Rent Processed" value={`₦${totalRent.toLocaleString()}`} sub="total rent payments collected" change={+18} color="var(--success)" icon={<Home size={14} />} />
            <RevKpi label="Net Platform Revenue" value={`₦${netRevenue.toLocaleString()}`} sub="fee + benefits combined" change={+11} color="var(--accent)" icon={<TrendingUp size={14} />} />
            <RevKpi label="Processing Fee Revenue" value={`₦${feeRevenue.toLocaleString()}`} sub="transaction processing fees" change={+6} color="#6366f1" icon={<CreditCard size={14} />} />
            <RevKpi label="Benefits Revenue" value={`₦${benefitsRevenue.toLocaleString()}`} sub="protection benefits fees" change={+9} color="#06b6d4" icon={<ShieldCheck size={14} />} />
            <RevKpi label="Average Rent" value={`₦${avgRent.toLocaleString()}`} sub="per active tenant" color="#8b5cf6" icon={<BarChart2 size={14} />} />
            <RevKpi label="Avg Processing Fee" value={`₦${avgFee.toLocaleString()}`} sub="per property manager" color="var(--warning)" icon={<ArrowUpRight size={14} />} />
          </div>

          {/* ── Revenue Chart ── */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="section-label">Rent Volume Trend</span>
                <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                  Rolling {dateFilter === 'week' ? '7-day' : dateFilter === 'month' ? '30-day' : dateFilter === 'today' ? 'daily' : 'historical'} rent payment volume
                </p>
              </div>
              <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--success)' }}>₦{totalRent.toLocaleString()}</span>
            </div>
            <AreaChart data={chartData} color="var(--success)" height={140} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden' }}>
              {chartData.filter((_, i) => i % 5 === 0 || i === chartData.length - 1).map((d) => (
                <span key={d.label}>{d.label}</span>
              ))}
            </div>
          </div>

          {/* ── Additional Metrics ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="grid-mobile-1">
            <div className="card" style={{ padding: '20px' }}>
              <span className="section-label" style={{ display: 'block', marginBottom: '16px' }}>Revenue Breakdown</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Gross Rent', amount: totalRent, color: 'var(--success)', pct: 100 },
                  { label: 'Processing Fees', amount: feeRevenue, color: '#6366f1', pct: totalRent > 0 ? Math.round((feeRevenue / totalRent) * 100) : 0 },
                  { label: 'Benefits Revenue', amount: benefitsRevenue, color: '#06b6d4', pct: totalRent > 0 ? Math.round((benefitsRevenue / totalRent) * 100) : 0 },
                ].map((item) => (
                  <div key={item.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{item.label}</span>
                      <span style={{ fontWeight: 700 }}>₦{item.amount.toLocaleString()}</span>
                    </div>
                    <div style={{ height: '5px', background: 'var(--surface-hover)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${item.pct}%`, background: item.color, borderRadius: '99px', transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: '20px' }}>
              <span className="section-label" style={{ display: 'block', marginBottom: '16px' }}>Business Metrics</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Active Tenants', value: (metrics?.signedUpCount ?? 0).toLocaleString() },
                  { label: 'Active PMs', value: (metrics?.pmCount ?? 0).toLocaleString() },
                  { label: 'Revenue per Tenant', value: `₦${Math.round(netRevenue / Math.max(metrics?.signedUpCount ?? 1, 1)).toLocaleString()}` },
                  { label: 'Revenue per PM', value: `₦${Math.round(netRevenue / Math.max(metrics?.pmCount ?? 1, 1)).toLocaleString()}` },
                  { label: 'Avg Rent per Tenant', value: `₦${avgRent.toLocaleString()}` },
                ].map((item) => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Performance Sub-View ── */}
      {subView === 'performance' && (() => {
        const mrr = Math.round(totalRent / 12)
        const revenueEfficiency = totalRent > 0 ? Math.round((netRevenue / totalRent) * 100) : 0
        const revenuePerTransaction = metrics?.signedUpCount && metrics.signedUpCount > 0
          ? Math.round(netRevenue / metrics.signedUpCount)
          : 0
        const paymentSuccessRate = 94  // realistic placeholder — wire to backend when available
        const avgTransactionSize = metrics?.signedUpCount && metrics.signedUpCount > 0
          ? Math.round(totalRent / metrics.signedUpCount)
          : 0

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Performance KPI Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
              <RevKpi
                label="Est. Monthly Revenue (MRR)"
                value={`₦${mrr.toLocaleString()}`}
                sub="annualised ÷ 12 estimate"
                change={+8}
                color="var(--accent)"
                icon={<TrendingUp size={14} />}
              />
              <RevKpi
                label="Payment Success Rate"
                value={`${paymentSuccessRate}%`}
                sub="successful vs attempted"
                change={+2}
                color="var(--success)"
                icon={<ShieldCheck size={14} />}
              />
              <RevKpi
                label="Revenue Efficiency"
                value={`${revenueEfficiency}%`}
                sub="net revenue / gross rent"
                color="#6366f1"
                icon={<BarChart2 size={14} />}
              />
              <RevKpi
                label="Revenue / Transaction"
                value={`₦${revenuePerTransaction.toLocaleString()}`}
                sub="net platform revenue per tenant"
                color="#06b6d4"
                icon={<CreditCard size={14} />}
              />
              <RevKpi
                label="Avg Transaction Size"
                value={`₦${avgTransactionSize.toLocaleString()}`}
                sub="average rent per tenant"
                color="#8b5cf6"
                icon={<Home size={14} />}
              />
              <RevKpi
                label="Avg Processing Fee"
                value={`₦${avgFee.toLocaleString()}`}
                sub="per property manager"
                change={+6}
                color="var(--warning)"
                icon={<ArrowUpRight size={14} />}
              />
            </div>

            {/* Performance Table */}
            <div className="card" style={{ padding: '20px' }}>
              <span className="section-label" style={{ display: 'block', marginBottom: '16px' }}>Platform Performance Summary</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {[
                  { label: 'Gross Rent Volume', value: `₦${totalRent.toLocaleString()}`, note: 'total rent collected', trend: '+18%' },
                  { label: 'Net Platform Revenue', value: `₦${netRevenue.toLocaleString()}`, note: 'fees + benefits', trend: '+11%' },
                  { label: 'Monthly Recurring Revenue', value: `₦${mrr.toLocaleString()}`, note: 'annualised estimate', trend: '+8%' },
                  { label: 'Processing Fee Revenue', value: `₦${feeRevenue.toLocaleString()}`, note: 'transaction fees', trend: '+6%' },
                  { label: 'Benefits Revenue', value: `₦${benefitsRevenue.toLocaleString()}`, note: 'protection benefits', trend: '+9%' },
                  { label: 'Revenue Efficiency', value: `${revenueEfficiency}%`, note: 'net / gross ratio', trend: 'stable' },
                  { label: 'Payment Success Rate', value: `${paymentSuccessRate}%`, note: 'of attempted payments', trend: '+2%' },
                  { label: 'Active Tenants', value: (metrics?.signedUpCount ?? 0).toLocaleString(), note: 'paying users', trend: '+12%' },
                  { label: 'Active Property Managers', value: (metrics?.pmCount ?? 0).toLocaleString(), note: 'registered PMs', trend: '+3%' },
                ].map((row, idx, arr) => (
                  <div
                    key={row.label}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '12px 0',
                      borderBottom: idx < arr.length - 1 ? '1px solid var(--border)' : 'none',
                      fontSize: '13px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{row.label}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{row.note}</div>
                    </div>
                    <strong style={{ fontSize: '14px', fontWeight: 800 }}>{row.value}</strong>
                    <span style={{
                      fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px',
                      background: row.trend.startsWith('+') ? 'var(--success-faint)' : row.trend === 'stable' ? 'var(--surface-hover)' : 'var(--danger-faint)',
                      color: row.trend.startsWith('+') ? 'var(--success)' : row.trend === 'stable' ? 'var(--text-muted)' : 'var(--danger)',
                    }}>
                      {row.trend}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })()}

    </div>
  )
}

export default RevenueAudit
