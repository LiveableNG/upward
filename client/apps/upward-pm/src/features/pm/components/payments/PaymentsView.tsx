'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  ChevronDown,
  ArrowRightLeft
} from 'lucide-react'
import { usePaymentRequests, useCancelPaymentRequest } from '../../hooks/usePayments'
import { useProperties } from '../../hooks/useProperties'
import { useToast } from '@/components/common/Toast'
import { PayoutsList } from './PayoutsList'
import { ApprovePaymentsQueue } from './ApprovePaymentsQueue'
import { downloadBlob } from '@/lib/download-helper'

import { DataTable, Column } from '@/components/common/DataTable'
import { PageHeader } from '@/components/ui/PageHeader/PageHeader'
import { StatCard } from '@/components/ui/StatCard/StatCard'
import { StatGrid } from '@/components/ui/StatCard/StatGrid'
import { ControlBar } from '@/components/ui/ControlBar/ControlBar'
import { SearchInput } from '@/components/ui/ControlBar/SearchInput'
import { FilterDropdown } from '@/components/ui/ControlBar/FilterDropdown'
import { FilterGroup } from '@/components/ui/ControlBar/FilterGroup'
import { ConfirmationModal } from '@/components/common/ConfirmationModal'

function PaymentsTable({ searchQuery, dateFilter, requestsOverride, allRequests }: { searchQuery: string, dateFilter: string, requestsOverride?: any[], allRequests?: any[] }) {
  const { success, error, info } = useToast()
  const router = useRouter()
  const cancelMutation = useCancelPaymentRequest()
  
  const [requestToCancel, setRequestToCancel] = useState<any>(null)

  const displayRequests = requestsOverride || []
  const statsSource = allRequests || displayRequests


  const totalCollected = statsSource
    .filter(r => r.status === 'PAID' || r.status === 'PARTIAL')
    .reduce((sum, r) => sum + r.amountPaid, 0)
    
  const outstanding = statsSource
    .filter(r => r.status !== 'PAID' && r.status !== 'CANCELLED')
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
    const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'
    const link = `${baseUrl}/pay/${req.coreRequestUuid}`
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
          {(req.status === 'PENDING' || req.status === 'SCHEDULED') && req.amountPaid === 0 && (
            <button 
              className="btn-icon-sm" 
              onClick={(e) => {
                e.stopPropagation()
                setRequestToCancel(req)
              }}
              title="Cancel Request"
              style={{ color: 'var(--error)' }}
            >
              <Trash2 size={16} />
            </button>
          )}
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
          {!(typeof window !== 'undefined' && window.location.pathname.startsWith('/portal')) && (
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
          )}
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
      
      {/* Status-based sorting: PENDING > PARTIAL > Others, then by Due Date */}
      <DataTable
        columns={columns}
        data={[...displayRequests].sort((a, b) => {
          const statusPriority: Record<string, number> = { 'PENDING': 0, 'PARTIAL': 1, 'PAID': 2, 'CANCELLED': 3 }
          const priorityA = statusPriority[a.status] ?? 4
          const priorityB = statusPriority[b.status] ?? 4
          
          if (priorityA !== priorityB) return priorityA - priorityB
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        })}
        onRowClick={(req) => {
          const isPortal = typeof window !== 'undefined' && window.location.pathname.startsWith('/portal')
          router.push(isPortal ? `/portal/payments/${req.uuid}` : `/payments/${req.uuid}`)
        }}
        emptyMessage="No payment requests found."
        pageSize={10}
      />

      <ConfirmationModal 
        isOpen={!!requestToCancel}
        onClose={() => setRequestToCancel(null)}
        onConfirm={() => {
          if (requestToCancel) {
            cancelMutation.mutate(requestToCancel.uuid, {
              onSuccess: () => {
                success('Payment request cancelled')
                setRequestToCancel(null)
              },
              onError: (err: any) => {
                error(err.message || 'Failed to cancel payment request')
              }
            })
          }
        }}
        title="Cancel Payment Request"
        message="Are you sure you want to cancel this payment request? This action cannot be undone."
        confirmText="Yes, Cancel Request"
        type="danger"
        isPending={cancelMutation.isPending}
      />
    </>
  )
}

export function PaymentsView({ initialPaymentRequests }: { initialPaymentRequests?: any }) {
  const { data: requests = [] } = usePaymentRequests(initialPaymentRequests)
  const { data: properties = [] } = useProperties()
  const { success, info } = useToast()
  const searchParams = useSearchParams()
  const initialStatus = searchParams?.get('status') || 'All'
  
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('All Time')
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [propertyFilter, setPropertyFilter] = useState('All')
  const initialTab = searchParams?.get('tab')
  const [activeTab, setActiveTab] = useState<'requests' | 'payouts' | 'proofs'>(
    initialTab === 'proofs' || initialTab === 'payouts' ? initialTab : 'requests',
  )
  
  const [isDateOpen, setIsDateOpen] = useState(false)
  const [isMoreOpen, setIsMoreOpen] = useState(false)

  useEffect(() => {
    const statusParam = searchParams?.get('status')
    if (statusParam) {
      setStatusFilter(statusParam)
    }
    const tabParam = searchParams?.get('tab')
    if (tabParam === 'proofs' || tabParam === 'payouts' || tabParam === 'requests') {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  const handleExport = () => {
    if (!requests || requests.length === 0) return info('No data to export')
    
    const headers = ['ID', 'Tenant', 'Unit', 'Property', 'Amount', 'Amount Paid', 'Due Date', 'Status']
    const rows = (requests || []).map((req: any) => [
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
    downloadBlob(blob, `upward_payments_${new Date().toISOString().split('T')[0]}.csv`).then(() => {
      success('Statement exported successfully!')
    }).catch((err: any) => console.error(err))
  }

  const filteredRequests = (requests || []).filter((req: any) => {
    const getStartOfDay = (date: Date) => {
      const d = new Date(date)
      d.setHours(0, 0, 0, 0)
      return d
    }

    const today = getStartOfDay(new Date())
    const dueDate = getStartOfDay(new Date(req.dueDate))
    const isOverdue = (req.status === 'PENDING' || req.status === 'PARTIAL') && dueDate < today
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

      <div className="tab-switcher">
        <button 
          className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <CreditCard size={18} />
          Payment Requests
        </button>
        <button 
          className={`tab-btn ${activeTab === 'payouts' ? 'active' : ''}`}
          onClick={() => setActiveTab('payouts')}
        >
          <ArrowRightLeft size={18} />
          Manage Payouts
        </button>
        <button 
          className={`tab-btn ${activeTab === 'proofs' ? 'active' : ''}`}
          onClick={() => setActiveTab('proofs')}
        >
          <CheckCircle size={18} />
          Review Proofs
        </button>
      </div>

      {activeTab === 'requests' ? (
        <>
          <ControlBar>
        <SearchInput 
          value={searchQuery} 
          onChange={setSearchQuery} 
          placeholder="Search by Tenant, Unit or Property..." 
        />
        
        <FilterGroup>
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
                  {['All', 'PAID', 'PENDING', 'SCHEDULED', 'PARTIAL', 'OVERDUE'].map(s => (
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
                  {properties?.map((p: any) => (
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
        </FilterGroup>
      </ControlBar>

      <PaymentsTable 
        searchQuery={searchQuery} 
        dateFilter={dateFilter} 
        requestsOverride={filteredRequests} 
        allRequests={requests || []} 
      />
      </>
      ) : activeTab === 'payouts' ? (
        <PayoutsList />
      ) : (
        <div className="mt-4 max-w-4xl">
          <ApprovePaymentsQueue />
        </div>
      )}

      <style jsx>{`
        .tab-switcher {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 0;
        }
        .tab-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-muted);
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          transition: all 0.2s;
        }
        .tab-btn:hover {
          color: var(--text);
          background: var(--bg-soft);
        }
        .tab-btn.active {
          color: var(--clay);
          border-bottom-color: var(--clay);
        }
      `}</style>
    </div>
  )
}
