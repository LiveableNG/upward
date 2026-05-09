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

function PaymentsTable({ searchQuery, dateFilter, requestsOverride }: { searchQuery: string, dateFilter: string, requestsOverride?: any[] }) {
  const { data: initialRequests } = usePaymentRequests()
  const requests = requestsOverride || initialRequests
  const { success, error, info } = useToast()
  const router = useRouter()

  const filteredRequests = (requests || []).filter(req => {
    const unitName = req.unit?.unitName || ''
    const tenantName = `${req.tenant?.firstName || ''} ${req.tenant?.lastName || ''}`
    const propertyName = req.unit?.property?.name || ''
    
    const matchesSearch = 
      unitName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.uuid.toLowerCase().includes(searchQuery.toLowerCase())

    if (dateFilter === 'All Time') return matchesSearch
    
    const reqDate = new Date(req.createdAt)
    const now = new Date()
    
    if (dateFilter === 'This Month') {
      return matchesSearch && reqDate.getMonth() === now.getMonth() && reqDate.getFullYear() === now.getFullYear()
    }
    
    if (dateFilter === 'Last 30 Days') {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(now.getDate() - 30)
      return matchesSearch && reqDate >= thirtyDaysAgo
    }

    return matchesSearch
  })

  // Calculate stats
  const totalCollected = (requests || [])
    .filter(r => r.status === 'PAID' || r.status === 'PARTIAL')
    .reduce((sum, r) => sum + r.amountPaid, 0)
    
  const outstanding = (requests || [])
    .filter(r => r.status !== 'PAID')
    .reduce((sum, r) => sum + (r.amount - r.amountPaid), 0)

  const pendingCount = (requests || []).filter(r => r.status === 'PENDING').length

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
    const link = `${window.location.origin.replace('pm.', '')}/pay/${req.coreRequestUuid}`
    navigator.clipboard.writeText(link)
    success('Payment link copied to clipboard!')
  }

  return (
    <>
      <div className="stats-grid" style={{ marginBottom: 32 }}>
        <div className="stat-card" style={{ background: 'var(--forest-faint)', border: '1px solid var(--forest)' }}>
          <p className="stat-card__label" style={{ color: 'var(--forest)' }}>Total Collected</p>
          <h3 className="stat-card__value" style={{ color: 'var(--forest)' }}>₦{totalCollected.toLocaleString()}</h3>
        </div>
        <div className="stat-card">
          <p className="stat-card__label">Outstanding Balance</p>
          <h3 className="stat-card__value">₦{outstanding.toLocaleString()}</h3>
        </div>
        <div className="stat-card">
          <p className="stat-card__label">Pending Requests</p>
          <h3 className="stat-card__value">{pendingCount}</h3>
        </div>
        <div className="stat-card">
          <p className="stat-card__label">Total Requests</p>
          <h3 className="stat-card__value">{requests?.length || 0}</h3>
        </div>
      </div>

      <div className="table-container">
        <table className="pm-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tenant & Unit</th>
              <th>Property</th>
              <th>Amount</th>
              <th>Due Date</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.map((req) => (
              <tr 
                key={req.uuid} 
                onClick={() => router.push(`/payments/${req.uuid}`)}
                style={{ cursor: 'pointer' }}
                className="hover-row"
              >
                <td style={{ fontWeight: 600, fontSize: 13 }}>{req.uuid.slice(-8).toUpperCase()}</td>
                <td>
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
                </td>
                <td>
                  <span style={{ fontSize: 13 }}>{req.unit?.property?.name}</span>
                </td>
                <td>
                  <div className="amount-text">
                    {req.currency} {req.amountPaid.toLocaleString()} / {req.amount.toLocaleString()}
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: 13 }}>{formatDate(req.dueDate)}</div>
                </td>
                <td>
                  <span className={`status-chip status-chip--${req.status.toLowerCase()}`}>
                    {req.status}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button 
                      className="btn-icon-sm" 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopyLink(req)
                      }}
                      title="Copy Payment Link"
                      style={{ color: 'var(--clay)' }}
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
                </td>
              </tr>
            ))}
            {filteredRequests.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No payment requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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

  // Combine filters for table
  const finalFilteredRequests = (requests || []).filter(req => {
    const matchesStatus = statusFilter === 'All' || req.status === statusFilter
    const matchesProperty = propertyFilter === 'All' || req.unit?.property?.uuid === propertyFilter
    return matchesStatus && matchesProperty
  })

  return (
    <div className="payments-page animate-fade-in">
      <header className="properties-header">
        <div>
          <h1 className="dashboard__title">Payments & Transactions</h1>
          <p className="dashboard__subtitle">Track all incoming payments and manage billing flows.</p>
        </div>
        <div className="properties-header__actions">
          <button className="btn btn--secondary" onClick={handleExport}>
            <Download size={18} />
            Export Statement
          </button>
        </div>
      </header>

      <div className="filters-bar">
        <div className="search-input">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by Tenant, Unit or Property..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="dropdown">
            <button 
              className="filter-select" 
              onClick={() => setIsDateOpen(!isDateOpen)}
            >
              <Calendar size={14} />
              {dateFilter}
              <ChevronDown size={14} className={isDateOpen ? 'rotate-180' : ''} />
            </button>
            
            {isDateOpen && (
              <>
                <div className="dropdown-overlay" onClick={() => setIsDateOpen(false)} />
                <div className="dropdown-menu glass animate-scale-in">
                  {['All Time', 'This Month', 'Last 30 Days'].map(f => (
                    <button 
                      key={f}
                      className={`dropdown-item ${dateFilter === f ? 'active' : ''}`}
                      onClick={() => {
                        setDateFilter(f)
                        setIsDateOpen(false)
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="dropdown">
            <button 
              className="filter-select" 
              onClick={() => setIsMoreOpen(!isMoreOpen)}
            >
              <Filter size={14} />
              More Filters
              {(statusFilter !== 'All' || propertyFilter !== 'All') && (
                <span className="filter-badge" />
              )}
              <ChevronDown size={14} className={isMoreOpen ? 'rotate-180' : ''} />
            </button>

            {isMoreOpen && (
              <>
                <div className="dropdown-overlay" onClick={() => setIsMoreOpen(false)} />
                <div className="dropdown-menu dropdown-menu--wide glass animate-scale-in">
                  <div className="dropdown-section">
                    <label>Status</label>
                    <div className="filter-tags">
                      {['All', 'PAID', 'PENDING', 'PARTIAL', 'OVERDUE'].map(s => (
                        <button 
                          key={s}
                          className={`filter-tag ${statusFilter === s ? 'active' : ''}`}
                          onClick={() => setStatusFilter(s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="dropdown-section">
                    <label>Property</label>
                    <select 
                      className="form-input" 
                      value={propertyFilter}
                      onChange={(e) => setPropertyFilter(e.target.value)}
                    >
                      <option value="All">All Properties</option>
                      {properties?.map(p => (
                        <option key={p.uuid} value={p.uuid}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="dropdown-footer">
                    <button 
                      className="btn-text" 
                      onClick={() => {
                        setStatusFilter('All')
                        setPropertyFilter('All')
                        setIsMoreOpen(false)
                      }}
                    >
                      Reset All
                    </button>
                    <button className="btn btn--primary btn--sm" onClick={() => setIsMoreOpen(false)}>
                      Apply
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <PaymentsTable searchQuery={searchQuery} dateFilter={dateFilter} requestsOverride={finalFilteredRequests} />
    </div>
  )
}
