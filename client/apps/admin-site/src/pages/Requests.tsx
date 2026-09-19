import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import {
  Inbox,
  Home,
  CalendarClock,
  Search,
  Filter,
  RefreshCcw,
  ChevronDown,
  Clock,
  CheckCircle,
  UserCheck,
  Eye,
  X,
  Mail,
  Phone,
  MessageSquare,
  MapPin,
  Building,
  ShieldCheck,
  Check,
  Key,
  Coins,
  Percent,
} from 'lucide-react'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'
import { DataTable } from '../components/common/table/DataTable'
import type { ColumnDef } from '../components/common/table/DataTable'

// Types
export interface HomeRequestLocation {
  state: string
  area: string
  subArea?: string
}

export interface HomeRequestPMReveal {
  id: number
  uuid: string
  createdAt: string
  pm: {
    id: number
    uuid: string
    name: string
    businessName: string | null
    email: string
    phone: string | null
  } | null
}

export interface HomeRequest {
  id: number
  uuid: string
  requestType: 'RENT' | 'BUY' | string
  fullName: string | null
  email: string
  phone: string
  locations: HomeRequestLocation[]
  budgetMin: number
  budgetMax: number
  savedAmount: number | null
  overallBudget: number | null
  propertyTypes: string[]
  beds: number
  moveInDate: string | null
  amenities: string[]
  notes: string | null
  source: string
  status: string
  createdAt: string
  updatedAt: string
  revealCount: number
  contactReveals: HomeRequestPMReveal[]
}

export interface DemoRequest {
  id: number
  uuid: string
  name: string
  email: string
  phone: string
  tenants: string
  demoDate: string
  status: string
  createdAt: string
  updatedAt: string
}

export function formatCurrencyNGN(amount?: number | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '₦0'
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function Requests({ token }: { token: string }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') === 'sales' ? 'sales' : 'home'

  // Home Requests State
  const [homeRequests, setHomeRequests] = useState<HomeRequest[]>([])
  const [homeLoading, setHomeLoading] = useState(true)
  const [homePage, setHomePage] = useState(1)
  const [homeTotalPages, setHomeTotalPages] = useState(1)
  const [homeTotalCount, setHomeTotalCount] = useState(0)
  const [homeSearch, setHomeSearch] = useState('')
  const [homeStatusFilter, setHomeStatusFilter] = useState('ALL')
  const [homeTypeFilter, setHomeTypeFilter] = useState<'ALL' | 'RENT' | 'BUY'>('ALL')

  // Sales / Demo Requests State
  const [demoRequests, setDemoRequests] = useState<DemoRequest[]>([])
  const [demoLoading, setDemoLoading] = useState(true)
  const [demoPage, setDemoPage] = useState(1)
  const [demoTotalPages, setDemoTotalPages] = useState(1)
  const [demoTotalCount, setDemoTotalCount] = useState(0)
  const [demoSearch, setDemoSearch] = useState('')
  const [demoStatusFilter, setDemoStatusFilter] = useState('ALL')

  // Slide-Over Preview Drawer State
  const [selectedHomeRequest, setSelectedHomeRequest] = useState<HomeRequest | null>(null)
  const [selectedDemoRequest, setSelectedDemoRequest] = useState<DemoRequest | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  const handleTabChange = (tab: 'home' | 'sales') => {
    setSearchParams({ tab })
    setSelectedHomeRequest(null)
    setSelectedDemoRequest(null)
  }

  // Fetch Home Requests
  const fetchHomeRequests = useCallback(
    async (pageNum = homePage) => {
      setHomeLoading(true)
      try {
        let url = `/admin/home-requests?page=${pageNum}&limit=25`
        if (homeStatusFilter !== 'ALL') url += `&status=${homeStatusFilter}`
        if (homeTypeFilter !== 'ALL') url += `&requestType=${homeTypeFilter}`
        if (homeSearch.trim()) url += `&search=${encodeURIComponent(homeSearch.trim())}`

        const response = await apiService.get(url, token)
        if (response && response.success) {
          setHomeRequests(response.data)
          setHomeTotalPages(response.meta.totalPages)
          setHomeTotalCount(response.meta.total)
          // Keep preview updated if open
          if (selectedHomeRequest) {
            const fresh = response.data.find((r: HomeRequest) => r.id === selectedHomeRequest.id)
            if (fresh) setSelectedHomeRequest(fresh)
          }
        }
      } catch (error) {
        console.error('Failed to fetch home requests:', error)
        showToast('Failed to load home requests', true)
      } finally {
        setHomeLoading(false)
      }
    },
    [homePage, homeStatusFilter, homeTypeFilter, homeSearch, token, selectedHomeRequest],
  )

  // Fetch Demo / Sales Requests
  const fetchDemoRequests = useCallback(
    async (pageNum = demoPage) => {
      setDemoLoading(true)
      try {
        let url = `/admin/demo-requests?page=${pageNum}&limit=25`
        if (demoStatusFilter !== 'ALL') url += `&status=${demoStatusFilter}`
        if (demoSearch.trim()) url += `&search=${encodeURIComponent(demoSearch.trim())}`

        const response = await apiService.get(url, token)
        if (response && response.success) {
          setDemoRequests(response.data)
          setDemoTotalPages(response.meta.totalPages)
          setDemoTotalCount(response.meta.total)
          // Keep preview updated if open
          if (selectedDemoRequest) {
            const fresh = response.data.find((r: DemoRequest) => r.id === selectedDemoRequest.id)
            if (fresh) setSelectedDemoRequest(fresh)
          }
        }
      } catch (error) {
        console.error('Failed to fetch sales demo requests:', error)
        showToast('Failed to load sales demo requests', true)
      } finally {
        setDemoLoading(false)
      }
    },
    [demoPage, demoStatusFilter, demoSearch, token, selectedDemoRequest],
  )

  useEffect(() => {
    if (activeTab === 'home') {
      fetchHomeRequests(homePage)
    } else {
      fetchDemoRequests(demoPage)
    }
  }, [activeTab, homePage, homeStatusFilter, homeTypeFilter, demoPage, demoStatusFilter])

  // ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedHomeRequest(null)
        setSelectedDemoRequest(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Prevent background scrolling when preview drawer is open
  const isAnyDrawerOpen = !!selectedHomeRequest || !!selectedDemoRequest
  useEffect(() => {
    document.body.style.overflow = isAnyDrawerOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isAnyDrawerOpen])

  // Status Handlers
  const handleHomeStatusChange = async (id: number, newStatus: string) => {
    setIsUpdatingStatus(true)
    try {
      await apiService.patch(`/admin/home-requests/${id}/status`, { status: newStatus }, token)
      showToast(`Status updated to ${newStatus}`)
      setHomeRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)),
      )
      if (selectedHomeRequest && selectedHomeRequest.id === id) {
        setSelectedHomeRequest({ ...selectedHomeRequest, status: newStatus })
      }
    } catch (error) {
      console.error('Failed to update home request status:', error)
      showToast('Failed to update status', true)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleDemoStatusChange = async (id: number, newStatus: string) => {
    setIsUpdatingStatus(true)
    try {
      await apiService.patch(`/admin/demo-requests/${id}/status`, { status: newStatus }, token)
      showToast(`Status updated to ${newStatus}`)
      setDemoRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)),
      )
      if (selectedDemoRequest && selectedDemoRequest.id === id) {
        setSelectedDemoRequest({ ...selectedDemoRequest, status: newStatus })
      }
    } catch (error) {
      console.error('Failed to update sales demo status:', error)
      showToast('Failed to update status', true)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const getHomeStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'submitted':
        return '#f59e0b'
      case 'contacted':
        return '#3b82f6'
      case 'assigned':
        return '#8b5cf6'
      case 'closed':
        return '#10b981'
      default:
        return 'var(--text-muted)'
    }
  }

  const getDemoStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return '#f59e0b'
      case 'CONTACTED':
        return '#3b82f6'
      case 'COMPLETED':
        return '#10b981'
      default:
        return 'var(--text-muted)'
    }
  }

  const cleanPhoneForWhatsApp = (phone: string) => {
    const cleaned = phone.replace(/[^0-9]/g, '')
    if (cleaned.startsWith('0')) {
      return `234${cleaned.slice(1)}`
    }
    return cleaned
  }

  // Columns for Home Requests (supporting both Rent and Buy/Sale)
  const homeColumns: ColumnDef<HomeRequest>[] = [
    {
      key: 'createdAt',
      label: 'Submitted',
      render: (req) => (
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600 }}>
            {new Date(req.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {new Date(req.createdAt).toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (req) => {
        const isBuy = (req.requestType || 'RENT').toUpperCase() === 'BUY'
        return (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '6px',
              background: isBuy ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.12)',
              color: isBuy ? '#10b981' : '#3b82f6',
              border: `1px solid ${isBuy ? 'rgba(16, 185, 129, 0.25)' : 'rgba(59, 130, 246, 0.25)'}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {isBuy ? <Building size={12} /> : <Key size={12} />}
            {isBuy ? 'BUY' : 'RENT'}
          </span>
        )
      },
    },
    {
      key: 'fullName',
      label: 'Prospect',
      render: (req) => (
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
            {req.fullName || 'Anonymous Prospect'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{req.email}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{req.phone}</div>
        </div>
      ),
    },
    {
      key: 'locations',
      label: 'Target Areas',
      render: (req) => (
        <div style={{ maxWidth: '220px' }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px',
              alignItems: 'center',
            }}
          >
            {req.locations && req.locations.length > 0 ? (
              req.locations.map((loc, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: 'var(--accent-faint)',
                    color: 'var(--accent)',
                    border: '1px solid var(--accent-muted)',
                  }}
                >
                  {loc.area || loc.state}
                </span>
              ))
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Any Area</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'financials',
      label: 'Budget / Financials',
      render: (req) => {
        const isBuy = (req.requestType || 'RENT').toUpperCase() === 'BUY'
        if (isBuy) {
          return (
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                {formatCurrencyNGN(req.overallBudget || req.budgetMax)}
              </div>
              <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                Saved: {formatCurrencyNGN(req.savedAmount)}
              </div>
            </div>
          )
        }
        return (
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
              {formatCurrencyNGN(req.budgetMin)} – {formatCurrencyNGN(req.budgetMax)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/ year</div>
          </div>
        )
      },
    },
    {
      key: 'specs',
      label: 'Specs',
      render: (req) => (
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600 }}>
            {req.beds} {req.beds === 1 ? 'Bed' : 'Beds'}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              textTransform: 'capitalize',
            }}
          >
            {req.propertyTypes?.length ? req.propertyTypes.join(', ') : 'Any Type'}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (req) => {
        const color = getHomeStatusColor(req.status)
        return (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '20px',
              background: `${color}15`,
              color,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              textTransform: 'capitalize',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: color,
              }}
            />
            {req.status}
          </span>
        )
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (req) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setSelectedHomeRequest(req)}
            className="btn btn-secondary"
            style={{
              padding: '6px 10px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              borderRadius: '8px',
            }}
          >
            <Eye size={13} />
            Preview
          </button>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <select
              value={req.status}
              disabled={isUpdatingStatus}
              onChange={(e) => handleHomeStatusChange(req.id, e.target.value)}
              style={{
                padding: '6px 22px 6px 10px',
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
              <option value="submitted">Submitted</option>
              <option value="contacted">Contacted</option>
              <option value="assigned">Assigned</option>
              <option value="closed">Closed</option>
            </select>
            <ChevronDown
              size={12}
              style={{
                position: 'absolute',
                right: '6px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>
      ),
    },
  ]

  // Columns for Sales Demo Requests
  const demoColumns: ColumnDef<DemoRequest>[] = [
    {
      key: 'createdAt',
      label: 'Submitted',
      render: (req) => (
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600 }}>
            {new Date(req.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {new Date(req.createdAt).toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            })}
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
      label: 'Requested Demo Time',
      render: (req) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={14} style={{ color: 'var(--text-muted)' }} />
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
      label: 'Portfolio / Tenants',
      render: (req) => <span style={{ fontSize: '13px', fontWeight: 500 }}>{req.tenants}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (req) => {
        const color = getDemoStatusColor(req.status)
        return (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '20px',
              background: `${color}15`,
              color,
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
        )
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (req) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setSelectedDemoRequest(req)}
            className="btn btn-secondary"
            style={{
              padding: '6px 10px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              borderRadius: '8px',
            }}
          >
            <Eye size={13} />
            Preview
          </button>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <select
              value={req.status}
              disabled={isUpdatingStatus}
              onChange={(e) => handleDemoStatusChange(req.id, e.target.value)}
              style={{
                padding: '6px 22px 6px 10px',
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
                right: '6px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>
      ),
    },
  ]

  return (
    <div className="page-container fade-in" style={{ padding: '24px', position: 'relative' }}>
      {/* Page Header */}
      <div
        className="page-header flex-mobile-column"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '20px',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
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
            <Inbox size={24} />
          </div>
          <div>
            <h1 className="section-title" style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
              Requests Hub
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
              Preview and manage buyer & renter property briefs, and PM sales demo bookings.
            </p>
          </div>
        </div>

        <button
          onClick={() =>
            activeTab === 'home' ? fetchHomeRequests(homePage) : fetchDemoRequests(demoPage)
          }
          className="btn btn-secondary"
          disabled={activeTab === 'home' ? homeLoading : demoLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '10px',
          }}
        >
          <RefreshCcw
            size={16}
            className={activeTab === 'home' ? (homeLoading ? 'spin' : '') : demoLoading ? 'spin' : ''}
          />
          Refresh
        </button>
      </div>

      {/* Tabs Switcher */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border)',
          marginBottom: '20px',
          paddingBottom: '2px',
        }}
      >
        <button
          onClick={() => handleTabChange('home')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'home' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'home' ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'var(--transition)',
          }}
        >
          <Home size={16} />
          Find a Home Requests (Rent & Buy)
          {homeTotalCount > 0 && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '10px',
                background: activeTab === 'home' ? 'var(--accent-faint)' : 'var(--surface-hover)',
                color: activeTab === 'home' ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              {homeTotalCount}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('sales')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'sales' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'sales' ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'var(--transition)',
          }}
        >
          <CalendarClock size={16} />
          PM Demo Requests
          {demoTotalCount > 0 && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '10px',
                background: activeTab === 'sales' ? 'var(--accent-faint)' : 'var(--surface-hover)',
                color: activeTab === 'sales' ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              {demoTotalCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (activeTab === 'home') {
              setHomePage(1)
              fetchHomeRequests(1)
            } else {
              setDemoPage(1)
              fetchDemoRequests(1)
            }
          }}
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
              placeholder={
                activeTab === 'home'
                  ? 'Search by prospect name, email, phone, or notes (Press Enter)...'
                  : 'Search by PM name, email, or phone (Press Enter)...'
              }
              value={activeTab === 'home' ? homeSearch : demoSearch}
              onChange={(e) =>
                activeTab === 'home' ? setHomeSearch(e.target.value) : setDemoSearch(e.target.value)
              }
              style={{
                width: '100%',
                padding: '12px 12px 12px 42px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '14px',
                color: 'var(--text)',
              }}
            />
          </div>

          {/* If Home Requests Tab, show Rent vs Buy intent selector filter */}
          {activeTab === 'home' && (
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['ALL', 'RENT', 'BUY'] as const).map((typeOpt) => (
                <button
                  key={typeOpt}
                  type="button"
                  onClick={() => {
                    setHomeTypeFilter(typeOpt)
                    setHomePage(1)
                  }}
                  style={{
                    padding: '9px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: homeTypeFilter === typeOpt ? 'var(--accent)' : 'var(--border)',
                    background: homeTypeFilter === typeOpt ? 'var(--accent-faint)' : 'var(--surface)',
                    color: homeTypeFilter === typeOpt ? 'var(--accent)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                  }}
                >
                  {typeOpt === 'ALL' ? 'All Types' : typeOpt === 'RENT' ? 'Rent Only' : 'Buy / Sale'}
                </button>
              ))}
            </div>
          )}

          {/* Status Dropdown Filter */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flex: '0 1 auto',
              minWidth: '160px',
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
              {activeTab === 'home' ? (
                <select
                  value={homeStatusFilter}
                  onChange={(e) => {
                    setHomeStatusFilter(e.target.value)
                    setHomePage(1)
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
                    color: 'var(--text)',
                  }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="contacted">Contacted</option>
                  <option value="assigned">Assigned</option>
                  <option value="closed">Closed</option>
                </select>
              ) : (
                <select
                  value={demoStatusFilter}
                  onChange={(e) => {
                    setDemoStatusFilter(e.target.value)
                    setDemoPage(1)
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
                    color: 'var(--text)',
                  }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              )}
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

      {/* Main Table Content */}
      {activeTab === 'home' ? (
        <DataTable
          data={homeRequests}
          columns={homeColumns}
          isLoading={homeLoading}
          emptyTitle="No home requests found."
          keyExtractor={(req) => req.id.toString()}
          currentPage={homePage}
          totalPages={homeTotalPages}
          onPageChange={setHomePage}
        />
      ) : (
        <DataTable
          data={demoRequests}
          columns={demoColumns}
          isLoading={demoLoading}
          emptyTitle="No sales demo requests found."
          keyExtractor={(req) => req.id.toString()}
          currentPage={demoPage}
          totalPages={demoTotalPages}
          onPageChange={setDemoPage}
        />
      )}

      {/* SLIDE-OVER DETAIL DRAWER FOR HOME REQUEST (BUY OR RENT) */}
      {selectedHomeRequest &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              onClick={() => setSelectedHomeRequest(null)}
              style={{
                position: 'fixed',
                inset: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(15, 23, 42, 0.45)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                zIndex: 99998,
                animation: 'fadeIn 0.2s ease-out',
              }}
            />

            {/* Drawer Panel */}
            <div
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                width: '100%',
                maxWidth: '600px',
                height: '100vh',
                background: 'var(--surface)',
                boxShadow: '-12px 0 40px rgba(0, 0, 0, 0.25)',
                zIndex: 99999,
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                overflowY: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
            {/* Drawer Header */}
            <div
              style={{
                padding: '24px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                background: 'var(--surface)',
                position: 'sticky',
                top: 0,
                zIndex: 10,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background:
                        (selectedHomeRequest.requestType || 'RENT').toUpperCase() === 'BUY'
                          ? 'rgba(16, 185, 129, 0.12)'
                          : 'rgba(59, 130, 246, 0.12)',
                      color:
                        (selectedHomeRequest.requestType || 'RENT').toUpperCase() === 'BUY'
                          ? '#10b981'
                          : '#3b82f6',
                      border: `1px solid ${
                        (selectedHomeRequest.requestType || 'RENT').toUpperCase() === 'BUY'
                          ? 'rgba(16, 185, 129, 0.25)'
                          : 'rgba(59, 130, 246, 0.25)'
                      }`,
                    }}
                  >
                    {(selectedHomeRequest.requestType || 'RENT').toUpperCase() === 'BUY'
                      ? 'HOME PURCHASE (FOR SALE)'
                      : 'RENTAL REQUEST'}
                  </span>

                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      background: `${getHomeStatusColor(selectedHomeRequest.status)}18`,
                      color: getHomeStatusColor(selectedHomeRequest.status),
                      textTransform: 'uppercase',
                    }}
                  >
                    {selectedHomeRequest.status}
                  </span>
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                  {selectedHomeRequest.fullName || 'Anonymous Prospect'}
                </h2>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Submitted on {new Date(selectedHomeRequest.createdAt).toLocaleString()}
                </div>
              </div>

              <button
                onClick={() => setSelectedHomeRequest(null)}
                style={{
                  padding: '8px',
                  borderRadius: '10px',
                  background: 'var(--surface-hover)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Quick Contact Action Bar */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                }}
              >
                <a
                  href={`mailto:${selectedHomeRequest.email}`}
                  className="btn btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 12px',
                    fontSize: '13px',
                    borderRadius: '10px',
                    color: 'var(--text)',
                  }}
                >
                  <Mail size={15} />
                  Email
                </a>
                <a
                  href={`tel:${selectedHomeRequest.phone}`}
                  className="btn btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 12px',
                    fontSize: '13px',
                    borderRadius: '10px',
                    color: 'var(--text)',
                  }}
                >
                  <Phone size={15} />
                  Call
                </a>
                <a
                  href={`https://wa.me/${cleanPhoneForWhatsApp(selectedHomeRequest.phone)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 12px',
                    fontSize: '13px',
                    borderRadius: '10px',
                    color: '#25D366',
                  }}
                >
                  <MessageSquare size={15} />
                  WhatsApp
                </a>
              </div>

              {/* Status Update Card */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-hover)',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
                  UPDATE REQUEST STATUS
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {['submitted', 'contacted', 'assigned', 'closed'].map((statusOption) => (
                    <button
                      key={statusOption}
                      disabled={isUpdatingStatus}
                      onClick={() => handleHomeStatusChange(selectedHomeRequest.id, statusOption)}
                      style={{
                        padding: '8px 4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor:
                          selectedHomeRequest.status === statusOption
                            ? getHomeStatusColor(statusOption)
                            : 'var(--border)',
                        background:
                          selectedHomeRequest.status === statusOption
                            ? `${getHomeStatusColor(statusOption)}15`
                            : 'var(--surface)',
                        color:
                          selectedHomeRequest.status === statusOption
                            ? getHomeStatusColor(statusOption)
                            : 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                      }}
                    >
                      {selectedHomeRequest.status === statusOption && <Check size={12} />}
                      {statusOption}
                    </button>
                  ))}
                </div>
              </div>

              {/* BUY / SALE SPECIFIC FINANCIAL CARD */}
              {(selectedHomeRequest.requestType || 'RENT').toUpperCase() === 'BUY' ? (
                <div
                  style={{
                    padding: '20px',
                    borderRadius: '14px',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    background: 'rgba(16, 185, 129, 0.03)',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: '#059669',
                      margin: '0 0 16px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Coins size={16} />
                    Buyer Financial Readiness
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        OVERALL PURCHASE BUDGET
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', marginTop: '2px' }}>
                        {formatCurrencyNGN(selectedHomeRequest.overallBudget || selectedHomeRequest.budgetMax)}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        AMOUNT SAVED / DEPOSIT
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                        {formatCurrencyNGN(selectedHomeRequest.savedAmount)}
                      </div>
                    </div>
                  </div>

                  {selectedHomeRequest.savedAmount && (selectedHomeRequest.overallBudget || selectedHomeRequest.budgetMax) ? (
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: 'rgba(16, 185, 129, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#065f46' }}>
                        <Percent size={15} />
                        Deposit Coverage Ratio
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#059669' }}>
                        {Math.min(
                          100,
                          Math.round(
                            (selectedHomeRequest.savedAmount /
                              (selectedHomeRequest.overallBudget || selectedHomeRequest.budgetMax || 1)) *
                              100,
                          ),
                        )}
                        % Ready
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                /* RENT SPECIFIC BUDGET CARD */
                <div
                  style={{
                    padding: '20px',
                    borderRadius: '14px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: 'var(--text-muted)',
                      margin: '0 0 16px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Key size={16} />
                    Rental Budget & Timeline
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        ANNUAL RENT BUDGET
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent)', marginTop: '2px' }}>
                        {formatCurrencyNGN(selectedHomeRequest.budgetMin)} – {formatCurrencyNGN(selectedHomeRequest.budgetMax)}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>per annum</div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        MOVE-IN TIMELINE
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginTop: '2px' }}>
                        {selectedHomeRequest.moveInDate
                          ? new Date(selectedHomeRequest.moveInDate).toLocaleDateString(undefined, {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'Immediate / Flexible'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Property Details & Location Card */}
              <div
                style={{
                  padding: '20px',
                  borderRadius: '14px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                }}
              >
                <h3
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: 'var(--text-muted)',
                    margin: '0 0 16px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Building size={16} />
                  Property Specifications
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      BEDROOMS
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginTop: '2px' }}>
                      {selectedHomeRequest.beds} {selectedHomeRequest.beds === 1 ? 'Bedroom' : 'Bedrooms'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      PROPERTY TYPES
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                      {selectedHomeRequest.propertyTypes?.join(', ') || 'Any Property Type'}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
                    TARGET LOCATIONS ({selectedHomeRequest.locations?.length || 0})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedHomeRequest.locations && selectedHomeRequest.locations.length > 0 ? (
                      selectedHomeRequest.locations.map((loc, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            background: 'var(--surface-hover)',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            fontSize: '12px',
                            fontWeight: 500,
                          }}
                        >
                          <MapPin size={12} style={{ color: 'var(--accent)' }} />
                          <span>
                            <strong>{loc.area}</strong>, {loc.state}
                            {loc.subArea && ` (${loc.subArea})`}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Any Location in Nigeria</span>
                    )}
                  </div>
                </div>

                {selectedHomeRequest.amenities && selectedHomeRequest.amenities.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
                      REQUESTED AMENITIES
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selectedHomeRequest.amenities.map((amenity, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: 'var(--surface-hover)',
                            fontSize: '11px',
                            fontWeight: 500,
                            color: 'var(--text-secondary)',
                          }}
                        >
                          ✓ {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedHomeRequest.notes && (
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>
                      NOTES & SPECIAL PREFERENCES
                    </div>
                    <div
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        background: 'var(--surface-hover)',
                        fontSize: '13px',
                        lineHeight: '1.5',
                        color: 'var(--text)',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {selectedHomeRequest.notes}
                    </div>
                  </div>
                )}
              </div>

              {/* PM Unlocks */}
              <div
                style={{
                  padding: '20px',
                  borderRadius: '14px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                }}
              >
                <h3
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: 'var(--text-muted)',
                    margin: '0 0 12px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <ShieldCheck size={16} />
                  PM Unlocks & Outreach ({selectedHomeRequest.contactReveals?.length || 0})
                </h3>

                {selectedHomeRequest.contactReveals && selectedHomeRequest.contactReveals.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selectedHomeRequest.contactReveals.map((rev) => (
                      <div
                        key={rev.id}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '10px',
                          border: '1px solid var(--border)',
                          background: 'var(--surface-hover)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                            {rev.pm?.name || 'Property Manager'}
                            {rev.pm?.businessName && (
                              <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '6px' }}>
                                ({rev.pm.businessName})
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {rev.pm?.email} • {rev.pm?.phone || 'No phone'}
                          </div>
                        </div>

                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>
                          Unlocked
                          <br />
                          {new Date(rev.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No Property Managers have unlocked this prospect’s contact details yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>,
        document.body,
      )}

      {/* SLIDE-OVER DETAIL DRAWER FOR DEMO REQUEST */}
      {selectedDemoRequest &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              onClick={() => setSelectedDemoRequest(null)}
              style={{
                position: 'fixed',
                inset: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(15, 23, 42, 0.45)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                zIndex: 99998,
                animation: 'fadeIn 0.2s ease-out',
              }}
            />

            {/* Drawer Panel */}
            <div
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                width: '100%',
                maxWidth: '580px',
                height: '100vh',
                background: 'var(--surface)',
                boxShadow: '-12px 0 40px rgba(0, 0, 0, 0.25)',
                zIndex: 99999,
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                overflowY: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                style={{
                  padding: '24px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  background: 'var(--surface)',
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '12px',
                        background: `${getDemoStatusColor(selectedDemoRequest.status)}18`,
                        color: getDemoStatusColor(selectedDemoRequest.status),
                      }}
                    >
                      {selectedDemoRequest.status}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      ID #{selectedDemoRequest.id}
                    </span>
                  </div>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                    {selectedDemoRequest.name}
                  </h2>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Submitted on {new Date(selectedDemoRequest.createdAt).toLocaleString()}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedDemoRequest(null)}
                  style={{
                    padding: '8px',
                    borderRadius: '10px',
                    background: 'var(--surface-hover)',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Outreach */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                  }}
                >
                  <a
                    href={`mailto:${selectedDemoRequest.email}`}
                    className="btn btn-secondary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '10px 12px',
                      fontSize: '13px',
                      borderRadius: '10px',
                      color: 'var(--text)',
                    }}
                  >
                    <Mail size={15} />
                    Email
                  </a>
                  <a
                    href={`tel:${selectedDemoRequest.phone}`}
                    className="btn btn-secondary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '10px 12px',
                      fontSize: '13px',
                      borderRadius: '10px',
                      color: 'var(--text)',
                    }}
                  >
                    <Phone size={15} />
                    Call
                  </a>
                  <a
                    href={`https://wa.me/${cleanPhoneForWhatsApp(selectedDemoRequest.phone)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '10px 12px',
                      fontSize: '13px',
                      borderRadius: '10px',
                      color: '#25D366',
                    }}
                  >
                    <MessageSquare size={15} />
                    WhatsApp
                  </a>
                </div>

                {/* Status Update */}
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-hover)',
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
                    UPDATE DEMO STATUS
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    {['PENDING', 'CONTACTED', 'COMPLETED'].map((statusOption) => (
                      <button
                        key={statusOption}
                        disabled={isUpdatingStatus}
                        onClick={() => handleDemoStatusChange(selectedDemoRequest.id, statusOption)}
                        style={{
                          padding: '8px 4px',
                          fontSize: '12px',
                          fontWeight: 600,
                          borderRadius: '8px',
                          border: '1px solid',
                          borderColor:
                            selectedDemoRequest.status === statusOption
                              ? getDemoStatusColor(statusOption)
                              : 'var(--border)',
                          background:
                            selectedDemoRequest.status === statusOption
                              ? `${getDemoStatusColor(statusOption)}15`
                              : 'var(--surface)',
                          color:
                            selectedDemoRequest.status === statusOption
                              ? getDemoStatusColor(statusOption)
                              : 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
                      >
                        {selectedDemoRequest.status === statusOption && <Check size={12} />}
                        {statusOption}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Demo Details */}
                <div
                  style={{
                    padding: '20px',
                    borderRadius: '14px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: 'var(--text-muted)',
                      margin: '0 0 16px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <CalendarClock size={16} />
                    Demo Booking Details
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        REQUESTED DEMO TIME
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
                        {new Date(selectedDemoRequest.demoDate).toLocaleString('en-US', {
                          dateStyle: 'full',
                          timeStyle: 'short',
                        })}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                          ESTIMATED PORTFOLIO / TENANTS
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginTop: '2px' }}>
                          {selectedDemoRequest.tenants}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                          LAST UPDATED
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {new Date(selectedDemoRequest.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>,
          document.body,
        )}

      {/* Global CSS for animation keyframes */}
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  )
}
