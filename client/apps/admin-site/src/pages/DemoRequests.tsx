import React, { useState, useEffect } from 'react'
import { CalendarClock, Search, Filter, RefreshCcw, ChevronDown, Clock, CheckCircle, UserCheck } from 'lucide-react'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'
import { DataTable } from '../components/common/table/DataTable'
import type { ColumnDef } from '../components/common/table/DataTable'

interface DemoRequest {
  id: number
  uuid: string
  name: string
  email: string
  phone: string
  tenants: string
  demoDate: string
  status: string // 'PENDING' | 'CONTACTED' | 'COMPLETED'
  createdAt: string
  updatedAt: string
}

export default function DemoRequests({ token }: { token: string }) {
  const [requests, setRequests] = useState<DemoRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const fetchRequests = async (pageNum = page) => {
    setLoading(true)
    try {
      let url = `/admin/demo-requests?page=${pageNum}&limit=25`
      if (statusFilter !== 'ALL') url += `&status=${statusFilter}`
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`

      const response = await apiService.get(url, token)
      if (response && response.success) {
        setRequests(response.data)
        setTotalPages(response.meta.totalPages)
        setTotalCount(response.meta.total)
      }
    } catch (error) {
      console.error('Failed to fetch demo requests:', error)
      showToast('Failed to load demo requests', true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests(page)
  }, [page, statusFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchRequests(1)
  }

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await apiService.patch(`/admin/demo-requests/${id}/status`, { status: newStatus }, token)
      showToast(`Status updated to ${newStatus}`)
      fetchRequests(page)
    } catch (error) {
      console.error('Failed to update status:', error)
      showToast('Failed to update status', true)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'var(--warning)'
      case 'CONTACTED':
        return 'var(--accent)'
      case 'COMPLETED':
        return 'var(--success)'
      default:
        return 'var(--text-muted)'
    }
  }

  const columns: ColumnDef<DemoRequest>[] = [
    {
      key: 'createdAt',
      label: 'Submitted At',
      render: (req) => (
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600 }}>
            {new Date(req.createdAt).toLocaleDateString()}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {new Date(req.createdAt).toLocaleTimeString()}
          </div>
        </div>
      ),
    },
    {
      key: 'name',
      label: 'Contact Details',
      render: (req) => (
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>{req.name}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{req.email}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{req.phone}</div>
        </div>
      ),
    },
    {
      key: 'demoDate',
      label: 'Requested Demo Date',
      render: (req) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={14} className="text-muted" />
          <span style={{ fontSize: '13px', fontWeight: 500 }}>
            {new Date(req.demoDate).toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </span>
        </div>
      ),
    },
    {
      key: 'tenants',
      label: 'Estimated Tenants',
      render: (req) => (
        <span style={{ fontSize: '13px', fontWeight: 500 }}>{req.tenants}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (req) => (
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '20px',
            background: `${getStatusColor(req.status)}15`,
            color: getStatusColor(req.status),
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {req.status === 'PENDING' && <Clock size={12} />}
          {req.status === 'CONTACTED' && <UserCheck size={12} />}
          {req.status === 'COMPLETED' && <CheckCircle size={12} />}
          {req.status}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (req) => (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <select
            value={req.status}
            onChange={(e) => handleStatusChange(req.id, e.target.value)}
            style={{
              padding: '6px 24px 6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              appearance: 'none',
              outline: 'none',
            }}
          >
            <option value="PENDING">Pending</option>
            <option value="CONTACTED">Contacted</option>
            <option value="COMPLETED">Completed</option>
          </select>
          <ChevronDown
            size={12}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
        </div>
      ),
    },
  ]

  return (
    <div className="page-container fade-in" style={{ padding: '24px' }}>
      {/* Page Header */}
      <div
        className="page-header flex-mobile-column"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            className="icon-container"
            style={{
              background: 'var(--accent-faint)',
              color: 'var(--accent)',
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CalendarClock size={24} />
          </div>
          <div>
            <h1 className="section-title" style={{ margin: 0 }}>
              Property Manager Demo Requests
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
              Track and manage scheduling requests for Property Manager product demos ({totalCount} total).
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchRequests(page)}
          className="btn btn-secondary"
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <RefreshCcw size={16} className={loading ? 'spin' : ''} />
          Refresh Data
        </button>
      </div>

      {/* Filters/Search Bar */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search by name, email, or phone number (Press Enter)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 42px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '14px',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flex: '0 1 auto',
              minWidth: '180px',
            }}
          >
            <div style={{ position: 'relative', width: '100%' }}>
              <Filter
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
                style={{
                  width: '100%',
                  padding: '11px 32px 11px 36px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  fontSize: '14px',
                  appearance: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="CONTACTED">Contacted</option>
                <option value="COMPLETED">Completed</option>
              </select>
              <ChevronDown
                size={14}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
            </div>
          </div>
        </form>
      </div>

      {/* Logs Table */}
      <DataTable
        data={requests}
        columns={columns}
        isLoading={loading}
        emptyTitle="No demo requests found."
        keyExtractor={(req) => req.id.toString()}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  )
}
