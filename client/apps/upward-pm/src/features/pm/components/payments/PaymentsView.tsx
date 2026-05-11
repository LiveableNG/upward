'use client'

import React, { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Download, 
  Search, 
  Filter, 
  MoreHorizontal,
  Calendar,
  CreditCard,
  Copy,
  CheckCircle,
  Eye,
  Trash2,
  ChevronDown
} from 'lucide-react'
import { usePaymentRequests } from '../../hooks/usePayments'
import { useProperties } from '../../hooks/useProperties'
import { useToast } from '@/components/common/Toast'

import { DataTable, Column } from '@/components/common/DataTable'
import { PageHeader } from '@/components/ui/PageHeader/PageHeader'
import { StatCard } from '@/components/ui/StatCard/StatCard'
import { StatGrid } from '@/components/ui/StatCard/StatGrid'
import { ControlBar } from '@/components/ui/ControlBar/ControlBar'
import { SearchInput } from '@/components/ui/ControlBar/SearchInput'
import { FilterDropdown } from '@/components/ui/ControlBar/FilterDropdown'

function PaymentsTable({ searchQuery, dateFilter, requestsOverride, allRequests }: { searchQuery: string, dateFilter: string, requestsOverride?: any[], allRequests?: any[] }) {
  const { success, error, info } = useToast()
  const router = useRouter()

  const displayRequests = requestsOverride || []
  const statsSource = allRequests || displayRequests

  // Calculate stats based on ALL requests for this PM
  const totalCollected = statsSource
    .filter(r => r.status === 'PAID' || r.status === 'PARTIAL')
    .reduce((sum, r) => sum + r.amountPaid, 0)
    
  const outstanding = statsSource
    .filter(r => r.status !== 'PAID')
    .reduce((sum, r) => sum + (r.amount - r.amountPaid), 0)

  const pendingCount = statsSource.filter(r => r.status === 'PENDING').length

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(dateStr))
  }

  const handleCopyLink = (req: any) => {
    if (!req.coreRequestUuid) {
       return error('Payment link not available for this request')
    }
    const link = `https://upward.goodtenants.io/pay/${req.coreRequestUuid}`
    navigator.clipboard.writeText(link)
    success('Payment link copied to clipboard!')
  }

  const columns: Column<any>[] = [
    {
      header: 'ID',
      render: (req) => <span style={{ fontWeight: 600, fontSize: 13 }}>{req.uuid.slice(-8).toUpperCase()}</span>
    },
    {
      header: 'Tenant & Unit',
      render: (req) => (
        <div className="tenant-cell">
          <div className="tenant-avatar">
            {req.tenant ? `${req.tenant.firstName?.[0] || ''}${req.tenant.lastName?.[0] || ''}` : 'U'}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>
              {req.tenant ? `${req.tenant.firstName} ${req.tenant.lastName}` : 'No Tenant'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Unit {req.unit?.unitName}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Property',
      render: (req) => <span style={{ fontSize: 13 }}>{req.unit?.property?.name}</span>
    },
    {
      header: 'Amount',
      render: (req) => (
        <div className="amount-text">
          {req.currency} {req.amountPaid.toLocaleString()} / {req.amount.toLocaleString()}
        </div>
      )
    },
    {
      header: 'Due Date',
      render: (req) => <div style={{ fontSize: 13 }}>{formatDate(req.dueDate)}</div>
    },
    {
      header: 'Status',
      render: (req) => (
        <span className={`status-chip status-chip--${req.status.toLowerCase()}`}>
          {req.status}
        </span>
      )
    },
    {
      header: '',
      align: 'right',
      render: (req) => (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button 
            className="btn-icon-sm" 
            onClick={(e) => {
              e.stopPropagation()
              handleCopyLink(req)
            }}
            title="Copy Payment Link"
            style={{ color: 'var(--accent)' }}
          >
            <Copy size={16} />
          </button>
          <button 
            className="btn-icon-sm"
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/properties/units/${req.unit?.uuid}`)
            }}
            title="View Unit"
          >
            <Eye size={16} />
          </button>
        </div>
      )
    }
  ]

  return (
    <>
      <StatGrid>
        <StatCard 
          label="Total Collected" 
          value={`₦${totalCollected.toLocaleString()}`} 
          icon={CreditCard} 
          variant="accent"
        />
        <StatCard 
          label="Outstanding Balance" 
          value={`₦${outstanding.toLocaleString()}`} 
          icon={Calendar} 
        />
        <StatCard 
          label="Pending Requests" 
          value={pendingCount} 
          icon={CheckCircle} 
        />
        <StatCard 
          label="Total Requests" 
          value={statsSource.length} 
          icon={Eye} 
        />
      </StatGrid>

      <DataTable
        columns={columns}
        data={displayRequests}
        onRowClick={(req) => router.push(`/payments/${req.uuid}`)}
        emptyMessage="No payment requests found."
        pageSize={10}
      />
    </>
  )
}

export function PaymentsView() {
  const { data: requests } = usePaymentRequests()
  const { data: properties } = useProperties()
  const { success, info } = useToast()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('All Time')
  const [statusFilter, setStatusFilter] = useState('All')
  const [propertyFilter, setPropertyFilter] = useState('All')
  
  const [isDateOpen, setIsDateOpen] = useState(false)
  const [isMoreOpen, setIsMoreOpen] = useState(false)

  const handleExport = () => {
    if (!requests || requests.length === 0) return info('No data to export')
    
    const headers = ['ID', 'Tenant', 'Unit', 'Property', 'Amount', 'Amount Paid', 'Due Date', 'Status']
    const rows = (requests || []).map(req => [
      req.uuid.slice(-8).toUpperCase(),
      req.tenant ? `${req.tenant.firstName} ${req.tenant.lastName}` : 'No Tenant',
      req.unit?.unitName || 'N/A',
      req.unit?.property?.name || 'N/A',
      req.amount,
      req.amountPaid,
      req.dueDate,
      req.status
    ])

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `upward_payments_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    success('Statement exported successfully!')
  }

  // Consolidated filtering logic
  const filteredRequests = (requests || []).filter(req => {
    // 1. Status Filter (including derived OVERDUE)
    const isOverdue = req.status === 'PENDING' && new Date(req.dueDate) < new Date()
    const matchesStatus = 
      statusFilter === 'All' || 
      (statusFilter === 'OVERDUE' ? isOverdue : req.status === statusFilter)

    if (!matchesStatus) return false

    // 2. Property Filter
    const matchesProperty = propertyFilter === 'All' || req.unit?.property?.uuid === propertyFilter
    if (!matchesProperty) return false

    // 3. Search Filter
    const unitName = req.unit?.unitName || ''
    const tenantName = `${req.tenant?.firstName || ''} ${req.tenant?.lastName || ''}`
    const propertyName = req.unit?.property?.name || ''
    const matchesSearch = 
      !searchQuery ||
      unitName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.uuid.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (!matchesSearch) return false

    // 4. Date Filter
    if (dateFilter === 'All Time') return true
    
    const reqDate = new Date(req.createdAt)
    const now = new Date()
    
    if (dateFilter === 'This Month') {
      return reqDate.getMonth() === now.getMonth() && reqDate.getFullYear() === now.getFullYear()
    }
    
    if (dateFilter === 'Last 30 Days') {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(now.getDate() - 30)
      return reqDate >= thirtyDaysAgo
    }

    return true
  })

  return (
    <div className="payments-page animate-fade-in">
      <PageHeader 
        title="Payments & Transactions" 
        subtitle="Track all incoming payments and manage billing flows."
        actions={
          <button className="btn btn--secondary" onClick={handleExport}>
            <Download size={18} />
            Export Statement
          </button>
        }
      />

      <ControlBar>
        <SearchInput 
          value={searchQuery} 
          onChange={setSearchQuery} 
          placeholder="Search by Tenant, Unit or Property..." 
        />
        
        <div style={{ display: 'flex', gap: 12 }}>
          <FilterDropdown 
            label="Date Range" 
            value={dateFilter}
            icon={Calendar}
            options={[
              { label: 'All Time', value: 'All Time' },
              { label: 'This Month', value: 'This Month' },
              { label: 'Last 30 Days', value: 'Last 30 Days' }
            ]}
            onChange={setDateFilter}
          />

          <FilterDropdown 
            label="More Filters" 
            value={statusFilter !== 'All' || propertyFilter !== 'All' ? 'active' : ''}
            icon={Filter}
          >
            <div className="dropdown-menu--wide animate-scale-in" style={{ padding: 16 }}>
              <div className="dropdown-section" style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 12, textTransform: 'uppercase' }}>Status</label>
                <div className="filter-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['All', 'PAID', 'PENDING', 'PARTIAL', 'OVERDUE'].map(s => (
                    <button 
                      key={s}
                      className={`filter-tag ${statusFilter === s ? 'active' : ''}`}
                      onClick={() => setStatusFilter(s)}
                      style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1px solid var(--border)', background: statusFilter === s ? 'var(--forest-faint)' : 'white', color: statusFilter === s ? 'var(--forest)' : 'var(--text-secondary)', cursor: 'pointer' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="dropdown-section" style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 12, textTransform: 'uppercase' }}>Property</label>
                <select 
                  className="form-input" 
                  value={propertyFilter}
                  onChange={(e) => setPropertyFilter(e.target.value)}
                  style={{ width: '100%', height: 40, borderRadius: 8, border: '1px solid var(--border)', padding: '0 12px' }}
                >
                  <option value="All">All Properties</option>
                  {properties?.map(p => (
                    <option key={p.uuid} value={p.uuid}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <button 
                  className="btn-text" 
                  onClick={() => {
                    setStatusFilter('All')
                    setPropertyFilter('All')
                  }}
                  style={{ fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Reset All
                </button>
                <button 
                  className="btn btn--primary btn--sm" 
                  onClick={() => {}} 
                  style={{ padding: '6px 16px', borderRadius: 8, fontSize: 13 }}
                >
                  Apply
                </button>
              </div>
            </div>
          </FilterDropdown>
        </div>
      </ControlBar>

      <PaymentsTable 
        searchQuery={searchQuery} 
        dateFilter={dateFilter} 
        requestsOverride={filteredRequests} 
        allRequests={requests || []} 
      />
    </div>
  )
}
