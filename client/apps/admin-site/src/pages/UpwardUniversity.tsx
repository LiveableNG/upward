import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  GraduationCap,
  Building,
  Users,
  MapPin,
  Search,
  RefreshCcw,
  Eye,
  ArrowLeft,
  Phone,
  Video,
  Award,
  ExternalLink,
  Calendar,
  Layers,
  AlertCircle,
  Trash2,
  Link2,
  Copy,
  Check,
  Plus,
  TrendingUp,
  BarChart2,
  Share2,
} from 'lucide-react'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'
import { DataTable } from '../components/common/table/DataTable'
import type { ColumnDef } from '../components/common/table/DataTable'
import { Modal } from '../components/common/modal/Modal'

interface EarlyAccessRecord {
  id: string
  type: 'STUDENT' | 'LANDLORD'
  name: string
  whatsapp: string
  email?: string | null
  city: string
  ageBracket?: string | null
  experienceLevel?: string | null
  interest?: string | null
  propertyCount?: string | null
  landlordStatus?: string | null
  managementStyle?: string | null
  createdAt: string
  updatedAt: string
}

interface UniversityApplicationRecord {
  id: string
  name: string
  whatsapp: string
  email: string
  city: string
  ageBracket: string
  occupation?: string | null
  experienceLevel?: string | null
  goals?: string | null
  commitment: string
  why: string
  timing?: string | null
  isScholarship?: boolean
  scholarshipVideoUrl?: string | null
  sessionTime?: string | null
  status: 'SUBMITTED' | 'REVIEWED' | 'ADMITTED' | 'REJECTED' | 'FEE_PAID' | 'REFUNDED'
  applicationFee: number
  feeStatus: 'PENDING' | 'PAID' | 'REFUNDED'
  paymentRef?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export interface TrafficSourceRecord {
  id: string
  identifier: string
  name: string
  channel: string
  targetUrl: string
  description?: string | null
  totalViews: number
  uniqueViews: number
  conversions: number
  conversionRate: number
  isActive: boolean
  lastVisitedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface TrafficStats {
  totalSources: number
  totalViews: number
  uniqueViews: number
  totalConversions: number
  overallConversionRate: number
  channelBreakdown: Array<{ channel: string; views: number; uniqueViews: number; conversions: number }>
}

export interface TrafficVisitRecord {
  id: string
  sourceId?: string | null
  identifier: string
  visitorId: string
  sessionId: string
  ipHash?: string | null
  userAgent?: string | null
  referer?: string | null
  path: string
  isUnique: boolean
  createdAt: string
}

interface EarlyAccessStats {
  totalSubmissions: number
  studentCount: number
  landlordCount: number
  cityBreakdown: Array<{ city: string; count: number }>
}

interface ApplicationStats {
  totalApplications: number
  pendingReviewCount: number
  admittedCount: number
  feePaidCount: number
}

interface UpwardUniversityProps {
  token: string
  adminRole?: string
}

export default function UpwardUniversity({ token, adminRole }: UpwardUniversityProps) {
  const isDeveloper = adminRole === 'DEVELOPER'
  const [activeTab, setActiveTab] = useState<'APPLICATIONS' | 'EARLY_ACCESS' | 'TRAFFIC'>('APPLICATIONS')

  // Applications State
  const [applications, setApplications] = useState<UniversityApplicationRecord[]>([])
  const [appStats, setAppStats] = useState<ApplicationStats | null>(null)
  const [loadingApps, setLoadingApps] = useState(true)
  const [appPage, setAppPage] = useState(1)
  const [appTotalPages, setAppTotalPages] = useState(1)
  const [appSearch, setAppSearch] = useState('')
  const [selectedApp, setSelectedApp] = useState<UniversityApplicationRecord | null>(null)

  // Early Access State
  const [records, setRecords] = useState<EarlyAccessRecord[]>([])
  const [stats, setStats] = useState<EarlyAccessStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Traffic / Referral State
  const [trafficSources, setTrafficSources] = useState<TrafficSourceRecord[]>([])
  const [trafficStats, setTrafficStats] = useState<TrafficStats | null>(null)
  const [loadingTraffic, setLoadingTraffic] = useState(true)
  const [loadingTrafficStats, setLoadingTrafficStats] = useState(true)
  const [trafficPage, setTrafficPage] = useState(1)
  const [trafficTotalPages, setTrafficTotalPages] = useState(1)
  const [trafficSearch, setTrafficSearch] = useState('')
  const [trafficChannelFilter, setTrafficChannelFilter] = useState('ALL')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isVisitsModalOpen, setIsVisitsModalOpen] = useState(false)
  const [selectedSourceForVisits, setSelectedSourceForVisits] = useState<TrafficSourceRecord | null>(null)
  const [visitsList, setVisitsList] = useState<TrafficVisitRecord[]>([])
  const [loadingVisits, setLoadingVisits] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [creatingSource, setCreatingSource] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    identifier: '',
    channel: 'INSTAGRAM',
    targetUrl: '/university',
    description: '',
  })

  // Filters
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'STUDENT' | 'LANDLORD'>('ALL')
  const [search, setSearch] = useState('')

  // Detail Modal State
  const [selectedRecord, setSelectedRecord] = useState<EarlyAccessRecord | null>(null)

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    name: string
    type: 'APPLICATION' | 'EARLY_ACCESS' | 'TRAFFIC_SOURCE'
  } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      if (deleteTarget.type === 'APPLICATION') {
        const res = await apiService.delete(`/admin/university/applications/${deleteTarget.id}`, token)
        if (res && res.success) {
          showToast('Application deleted successfully')
          if (selectedApp && selectedApp.id === deleteTarget.id) setSelectedApp(null)
          fetchApplications(appPage)
          fetchAppStats()
        }
      } else if (deleteTarget.type === 'EARLY_ACCESS') {
        const res = await apiService.delete(`/admin/early-access/${deleteTarget.id}`, token)
        if (res && res.success) {
          showToast('Early access record deleted successfully')
          if (selectedRecord && selectedRecord.id === deleteTarget.id) setSelectedRecord(null)
          fetchRecords(page)
          fetchStats()
        }
      } else if (deleteTarget.type === 'TRAFFIC_SOURCE') {
        const res = await apiService.delete(`/admin/university/traffic/sources/${deleteTarget.id}`, token)
        if (res && res.success) {
          showToast('Tracking source deleted successfully')
          fetchTrafficSources(trafficPage)
          fetchTrafficStats()
        }
      }
    } catch (err) {
      console.error('Failed to delete record:', err)
      showToast('Failed to delete record', true)
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const fetchAppStats = async () => {
    try {
      const response = await apiService.get('/admin/university/applications/stats', token)
      if (response && response.data) {
        setAppStats(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch university application stats:', error)
    }
  }

  const fetchApplications = async (pageNum = appPage) => {
    setLoadingApps(true)
    try {
      let url = `/admin/university/applications?page=${pageNum}&limit=50`
      if (appSearch.trim()) url += `&search=${encodeURIComponent(appSearch.trim())}`

      const response = await apiService.get(url, token)
      if (response && response.data) {
        setApplications(response.data)  
        setAppTotalPages(response.meta?.totalPages || 1)
      }
    } catch (error) {
      console.error('Failed to fetch university applications:', error)
      showToast('Failed to load full applications', true)
    } finally {
      setLoadingApps(false)
    }
  }

  const handleUpdateAppStatus = async (id: string, updates: { status?: string; feeStatus?: string; notes?: string }) => {
    try {
      const res = await apiService.patch(`/admin/university/applications/${id}`, updates, token)
      if (res && res.success) {
        showToast('Application updated successfully')
        if (selectedApp && selectedApp.id === id) {
          setSelectedApp(res.data)
        }
        fetchApplications(appPage)
        fetchAppStats()
      }
    } catch (err) {
      console.error('Failed to update application status:', err)
      showToast('Failed to update application status', true)
    }
  }

  const fetchStats = async () => {
    setLoadingStats(true)
    try {
      const response = await apiService.get('/admin/early-access/stats', token)
      if (response && response.data) {
        setStats(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch early access stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  const fetchRecords = async (pageNum = page) => {
    setLoading(true)
    try {
      let url = `/admin/early-access?page=${pageNum}&limit=50`
      if (typeFilter !== 'ALL') url += `&type=${typeFilter}`
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`

      const response = await apiService.get(url, token)
      if (response && response.data) {
        setRecords(response.data)
        setTotalPages(response.meta?.totalPages || 1)
      }
    } catch (error) {
      console.error('Failed to fetch early access records:', error)
      showToast('Failed to load early access applications', true)
    } finally {
      setLoading(false)
    }
  }

  // Traffic & Analytics Fetching
  const fetchTrafficStats = async () => {
    setLoadingTrafficStats(true)
    try {
      const response = await apiService.get('/admin/university/traffic/stats', token)
      if (response && response.data) {
        setTrafficStats(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch traffic stats:', error)
    } finally {
      setLoadingTrafficStats(false)
    }
  }

  const fetchTrafficSources = async (pageNum = trafficPage) => {
    setLoadingTraffic(true)
    try {
      let url = `/admin/university/traffic/sources?page=${pageNum}&limit=50`
      if (trafficChannelFilter !== 'ALL') url += `&channel=${trafficChannelFilter}`
      if (trafficSearch.trim()) url += `&search=${encodeURIComponent(trafficSearch.trim())}`

      const response = await apiService.get(url, token)
      if (response && response.data) {
        setTrafficSources(response.data)
        setTrafficTotalPages(response.meta?.totalPages || 1)
      }
    } catch (error) {
      console.error('Failed to fetch traffic sources:', error)
      showToast('Failed to load traffic sources', true)
    } finally {
      setLoadingTraffic(false)
    }
  }

  const fetchVisitsForSource = async (source: TrafficSourceRecord) => {
    setSelectedSourceForVisits(source)
    setIsVisitsModalOpen(true)
    setLoadingVisits(true)
    try {
      const response = await apiService.get(`/admin/university/traffic/sources/${source.id}/visits?limit=50`, token)
      if (response && response.data) {
        setVisitsList(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch source visits:', error)
      showToast('Failed to load recent visits', true)
    } finally {
      setLoadingVisits(false)
    }
  }

  const handleCreateSource = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.name.trim() || !createForm.identifier.trim()) {
      showToast('Name and identifier are required', true)
      return
    }

    setCreatingSource(true)
    try {
      const response = await apiService.post(
        '/admin/university/traffic/sources',
        {
          name: createForm.name.trim(),
          identifier: createForm.identifier.trim().toLowerCase(),
          channel: createForm.channel,
          targetUrl: createForm.targetUrl.trim() || '/university',
          description: createForm.description.trim() || undefined,
        },
        token
      )

      if (response && response.success) {
        showToast('Tracking source created successfully!')
        setIsCreateModalOpen(false)
        setCreateForm({
          name: '',
          identifier: '',
          channel: 'INSTAGRAM',
          targetUrl: '/university',
          description: '',
        })
        fetchTrafficSources(1)
        fetchTrafficStats()
      } else {
        showToast(response?.message || 'Failed to create tracking source', true)
      }
    } catch (error: any) {
      console.error('Failed to create tracking source:', error)
      showToast(error?.response?.data?.message || error?.message || 'Failed to create source', true)
    } finally {
      setCreatingSource(false)
    }
  }

  const handleToggleSourceActive = async (source: TrafficSourceRecord) => {
    try {
      const response = await apiService.patch(
        `/admin/university/traffic/sources/${source.id}`,
        { isActive: !source.isActive },
        token
      )
      if (response && response.success) {
        showToast(`Tracking link ${!source.isActive ? 'activated' : 'paused'}`)
        fetchTrafficSources(trafficPage)
      }
    } catch (error) {
      console.error('Failed to update source status:', error)
      showToast('Failed to update status', true)
    }
  }

  const handleCopyLink = (identifier: string, targetUrl = '/university') => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://upward.ng'
    let fullUrl = `${origin}/university/${identifier}`
    if (targetUrl && targetUrl.includes('/apply')) {
      fullUrl = `${origin}/university/apply?ref=${identifier}`
    } else if (targetUrl && targetUrl !== '/university') {
      fullUrl = `${origin}${targetUrl}${targetUrl.includes('?') ? '&' : '?'}ref=${identifier}`
    }

    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedId(identifier)
      showToast('Tracking link copied to clipboard!')
      setTimeout(() => setCopiedId(null), 2500)
    }).catch(() => {
      showToast('Could not copy link', true)
    })
  }

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  useEffect(() => {
    fetchAppStats()
    fetchStats()
    fetchTrafficStats()
  }, [])

  useEffect(() => {
    if (activeTab === 'APPLICATIONS') {
      fetchApplications(appPage)
    } else if (activeTab === 'EARLY_ACCESS') {
      fetchRecords(page)
    } else if (activeTab === 'TRAFFIC') {
      fetchTrafficSources(trafficPage)
    }
  }, [activeTab, appPage, page, trafficPage, typeFilter, trafficChannelFilter])

  const handleAppSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setAppPage(1)
    fetchApplications(1)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchRecords(1)
  }

  const handleRefresh = () => {
    fetchAppStats()
    fetchStats()
    if (activeTab === 'APPLICATIONS') {
      fetchApplications(appPage)
    } else {
      fetchRecords(page)
    }
    showToast('Records refreshed')
  }

  // Column definitions for University Applications DataTable
  const appColumns: ColumnDef<UniversityApplicationRecord>[] = [
    {
      key: 'applicant',
      label: 'Applicant Name & Email',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.name}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{row.email}</div>
          {(row.isScholarship || row.scholarshipVideoUrl) && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '4px',
                fontSize: '10.5px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '999px',
                background: '#fef3c7',
                color: '#b45309',
                border: '1px solid #fde68a',
              }}
            >
              <Award size={11} />
              SCHOLARSHIP CANDIDATE
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'contact',
      label: 'WhatsApp',
      render: (row) => {
        const rawPhone = row.whatsapp || ''
        const cleanPhone = rawPhone.replace(/[^0-9+]/g, '')
        return (
          <a
            href={cleanPhone ? `https://wa.me/${cleanPhone}` : '#'}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#25D366',
              fontWeight: 500,
              fontSize: '13px',
              textDecoration: 'none',
            }}
            onClick={(e) => {
              if (!cleanPhone) e.preventDefault()
              e.stopPropagation()
            }}
          >
            <Phone size={14} />
            {rawPhone || 'N/A'}
          </a>
        )
      },
    },
    {
      key: 'city',
      label: 'City & Age',
      render: (row) => (
        <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={13} color="var(--accent)" />
            <b>{row.city}</b>
          </span>
          <span style={{ margin: '0 6px', color: 'var(--border)' }}>•</span>
          <span>{row.ageBracket}</span>
        </div>
      ),
    },
    {
      key: 'occupation',
      label: 'Occupation & Exp',
      render: (row) => (
        <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
          <div><b>{row.occupation || 'Not specified'}</b></div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{row.experienceLevel || 'Beginner'}</div>
          {row.sessionTime && (
            <div style={{ fontSize: '11px', color: '#92400e', background: '#fef3c7', padding: '1px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '3px', fontWeight: 600 }}>
              <Calendar size={11} /> {row.sessionTime}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'feeStatus',
      label: 'App Fee (₦5,000)',
      render: (row) => {
        const isPaid = row.feeStatus === 'PAID'
        const isRefunded = row.feeStatus === 'REFUNDED'
        return (
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              background: isPaid ? '#dcfce7' : isRefunded ? '#fef2f2' : '#fef9c3',
              color: isPaid ? '#15803d' : isRefunded ? '#991b1b' : '#a16207',
              border: `1px solid ${isPaid ? '#bbf7d0' : isRefunded ? '#fecaca' : '#fef08a'}`,
            }}
          >
            {isPaid ? '✓ PAID' : isRefunded ? 'REFUNDED' : 'PENDING'}
          </span>
        )
      },
    },
    {
      key: 'status',
      label: 'Application Status',
      render: (row) => {
        const isPaid = row.feeStatus === 'PAID'
        const isStageDropoff = !isPaid && row.status === 'SUBMITTED'
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: row.status === 'SUBMITTED' ? '#fff7ed' : row.status === 'ADMITTED' ? '#f0f7f2' : '#f3f4f6',
                color: row.status === 'SUBMITTED' ? '#c2410c' : row.status === 'ADMITTED' ? '#166534' : '#4b5563',
                border: `1px solid ${row.status === 'SUBMITTED' ? '#ffedd5' : row.status === 'ADMITTED' ? '#bbf7d0' : '#e5e7eb'}`,
              }}
            >
              {row.status}
            </span>
            {isStageDropoff && (
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: '#b45309',
                  background: '#fef3c7',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid #fde68a',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <AlertCircle size={10} /> Stage 2/3 Drop-off (Fee Unpaid)
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'createdAt',
      label: 'Applied Date',
      render: (row) => (
        <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
          {new Date(row.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setSelectedApp(row)}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}
          >
            <Eye size={14} />
            View Application
          </button>
          {isDeveloper && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setDeleteTarget({ id: row.id, name: row.name, type: 'APPLICATION' })
              }}
              className="btn btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 10px',
                background: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
              title="Delete Application"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ),
    },
  ]

  // Column definitions for DataTable
  const columns: ColumnDef<EarlyAccessRecord>[] = [
    {
      key: 'type',
      label: 'Application Type',
      render: (row) => {
        const isStudent = row.type === 'STUDENT'
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              background: isStudent ? '#fbf1ed' : '#f0f7f2',
              color: isStudent ? '#d97757' : '#166534',
              border: `1px solid ${isStudent ? 'rgba(217, 119, 87, 0.2)' : 'rgba(22, 101, 52, 0.2)'}`,
            }}
          >
            {isStudent ? <GraduationCap size={14} /> : <Building size={14} />}
            {isStudent ? 'Student Cohort' : 'Landlord Programme'}
          </span>
        )
      },
    },
    {
      key: 'applicant',
      label: 'Applicant',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.name}</div>
          {row.email ? (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{row.email}</div>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
              No email provided
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'contact',
      label: 'WhatsApp / Contact',
      render: (row) => {
        const rawPhone = row.whatsapp || ''
        const cleanPhone = rawPhone.replace(/[^0-9+]/g, '')
        return (
          <a
            href={cleanPhone ? `https://wa.me/${cleanPhone}` : '#'}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#25D366',
              fontWeight: 500,
              fontSize: '13px',
              textDecoration: 'none',
            }}
            onClick={(e) => {
              if (!cleanPhone) e.preventDefault()
              e.stopPropagation()
            }}
          >
            <Phone size={14} />
            {rawPhone || 'N/A'}
          </a>
        )
      },
    },
    {
      key: 'city',
      label: 'City',
      render: (row) => (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12.5px',
            color: 'var(--text-secondary)',
          }}
        >
          <MapPin size={13} color="var(--accent)" />
          {row.city}
        </span>
      ),
    },
    {
      key: 'details',
      label: 'Program Details',
      render: (row) => {
        if (row.type === 'STUDENT') {
          return (
            <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              <div>
                Age: <b>{row.ageBracket || 'N/A'}</b>
                <span style={{ margin: '0 6px', color: 'var(--border)' }}>•</span>
                Exp: <b>{row.experienceLevel || 'N/A'}</b>
              </div>
              {row.experienceLevel && row.experienceLevel.includes('Stage 1') ? (
                <div
                  style={{
                    marginTop: '4px',
                    fontSize: '11px',
                    color: '#c2410c',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: '#fff7ed',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid #ffedd5',
                  }}
                >
                  <Layers size={11} /> Drop-off Stage 1: Basic Info
                </div>
              ) : row.interest ? (
                <div
                  style={{
                    marginTop: '4px',
                    fontSize: '11.5px',
                    color: '#b45309',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: '#fef3c7',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid #fde68a',
                  }}
                >
                  <Calendar size={11} /> {row.interest}
                </div>
              ) : null}
            </div>
          )
        }
        return (
          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            <span>
              Properties: <b>{row.propertyCount || 'N/A'}</b>
            </span>
            <span style={{ margin: '0 6px', color: 'var(--border)' }}>•</span>
            <span>
              Status: <b>{row.landlordStatus || 'N/A'}</b>
            </span>
          </div>
        )
      },
    },
    {
      key: 'createdAt',
      label: 'Submitted Date',
      render: (row) => (
        <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
          {new Date(row.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', gap: '6px', alignItems: 'center' }}
            onClick={(e) => {
              e.stopPropagation()
              setSelectedRecord(row)
            }}
          >
            <Eye size={13} />
            View
          </button>
          {isDeveloper && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setDeleteTarget({ id: row.id, name: row.name, type: 'EARLY_ACCESS' })
              }}
              className="btn btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 10px',
                background: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
              title="Delete Record"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ),
    },
  ]

  const getChannelBadge = (channel: string) => {
    const ch = (channel || 'OTHER').toUpperCase()
    const colorMap: Record<string, { bg: string; color: string; border: string }> = {
      INSTAGRAM: { bg: '#fdf2f8', color: '#db2777', border: '#fbcfe8' },
      FACEBOOK: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
      TIKTOK: { bg: '#f3f4f6', color: '#111827', border: '#e5e7eb' },
      TWITTER: { bg: '#f0f9ff', color: '#0284c7', border: '#bae6fd' },
      WHATSAPP: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
      FLYER: { bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
      INFLUENCER: { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
      YOUTUBE: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
      OTHER: { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' },
    }
    const theme = colorMap[ch] || colorMap.OTHER
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 700,
          background: theme.bg,
          color: theme.color,
          border: `1px solid ${theme.border}`,
          textTransform: 'uppercase',
        }}
      >
        {ch}
      </span>
    )
  }

  // Column definitions for Traffic Sources DataTable
  const trafficColumns: ColumnDef<TrafficSourceRecord>[] = [
    {
      key: 'name',
      label: 'Campaign / Source Name',
      render: (row) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13.5px' }}>{row.name}</span>
            {getChannelBadge(row.channel)}
          </div>
          {row.description && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{row.description}</div>
          )}
        </div>
      ),
    },
    {
      key: 'identifier',
      label: 'Tracking Identifier & Link',
      render: (row) => {
        const isCopied = copiedId === row.identifier
        const linkPath = row.targetUrl && row.targetUrl.includes('/apply')
          ? `/university/apply?ref=${row.identifier}`
          : `/university/${row.identifier}`
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <code
              style={{
                fontSize: '12px',
                background: '#f8fafc',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                color: '#8A4A2A',
                fontWeight: 600,
                fontFamily: 'monospace',
              }}
            >
              {linkPath}
            </code>
            <button
              type="button"
              onClick={() => handleCopyLink(row.identifier, row.targetUrl)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                border: isCopied ? '1px solid #bbf7d0' : '1px solid var(--border)',
                background: isCopied ? '#f0fdf4' : '#ffffff',
                color: isCopied ? '#166534' : 'var(--text-secondary)',
                transition: 'all 0.15s ease',
              }}
              title="Copy tracking link"
            >
              {isCopied ? <Check size={12} color="#166534" /> : <Copy size={12} />}
              {isCopied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )
      },
    },
    {
      key: 'uniqueViews',
      label: 'Unique Visitors',
      render: (row) => (
        <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#8A4A2A' }}>
            {row.uniqueViews.toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {row.totalViews} total views
          </div>
        </div>
      ),
    },
    {
      key: 'conversions',
      label: 'Conversions',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 700, fontSize: '13.5px', color: row.conversions > 0 ? '#15803d' : 'var(--text-primary)' }}>
            {row.conversions}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            leads & apps
          </div>
        </div>
      ),
    },
    {
      key: 'conversionRate',
      label: 'Conv. Rate',
      render: (row) => {
        const rate = row.conversionRate || 0
        const isHigh = rate >= 5
        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '11.5px',
              fontWeight: 700,
              background: isHigh ? '#dcfce7' : '#f3f4f6',
              color: isHigh ? '#15803d' : '#4b5563',
              border: `1px solid ${isHigh ? '#bbf7d0' : '#e5e7eb'}`,
            }}
          >
            {rate}%
          </span>
        )
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <button
          type="button"
          onClick={() => handleToggleSourceActive(row)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 10px',
            borderRadius: '20px',
            fontSize: '11.5px',
            fontWeight: 600,
            cursor: 'pointer',
            border: `1px solid ${row.isActive ? '#bbf7d0' : '#fecaca'}`,
            background: row.isActive ? '#f0fdf4' : '#fef2f2',
            color: row.isActive ? '#166534' : '#dc2626',
          }}
          title="Click to toggle active state"
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: row.isActive ? '#16a34a' : '#dc2626',
            }}
          />
          {row.isActive ? 'Active' : 'Paused'}
        </button>
      ),
    },
    {
      key: 'lastVisitedAt',
      label: 'Last Visit',
      render: (row) => (
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {row.lastVisitedAt
            ? new Date(row.lastVisitedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'No visits yet'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px 10px', fontSize: '12px', display: 'inline-flex', gap: '4px', alignItems: 'center' }}
            onClick={(e) => {
              e.stopPropagation()
              fetchVisitsForSource(row)
            }}
            title="View recent visitor log"
          >
            <Eye size={13} />
            Visits Log
          </button>
          {isDeveloper && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setDeleteTarget({ id: row.id, name: row.name, type: 'TRAFFIC_SOURCE' })
              }}
              className="btn btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 10px',
                background: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
              title="Delete Tracking Source"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="page-container fade-in" style={{ paddingTop: '16px' }}>
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            to="/dashboard"
            className="btn btn-secondary"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="section-title" style={{ margin: 0 }}>
              Upward University Management
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
              Review cohort applications, applicant profiles, and early access leads
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          className="btn btn-secondary"
          style={{ height: '40px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <RefreshCcw size={16} />
          Refresh
        </button>
      </div>

      {/* ── Main Section Tabs ── */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('APPLICATIONS')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            background: activeTab === 'APPLICATIONS' ? '#8A4A2A' : 'transparent',
            color: activeTab === 'APPLICATIONS' ? '#fff' : 'var(--text-secondary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <GraduationCap size={16} />
          Full Student Applications ({appStats?.totalApplications || 0})
        </button>
        <button
          onClick={() => setActiveTab('EARLY_ACCESS')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            background: activeTab === 'EARLY_ACCESS' ? '#8A4A2A' : 'transparent',
            color: activeTab === 'EARLY_ACCESS' ? '#fff' : 'var(--text-secondary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <Users size={16} />
          Early Access & Info Leads ({stats?.totalSubmissions || 0})
        </button>
        <button
          onClick={() => setActiveTab('TRAFFIC')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            background: activeTab === 'TRAFFIC' ? '#8A4A2A' : 'transparent',
            color: activeTab === 'TRAFFIC' ? '#fff' : 'var(--text-secondary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <Share2 size={16} />
          Traffic & Referral Sources ({trafficStats?.totalSources || 0})
        </button>
      </div>

      {/* ── Stats Cards Grid ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {activeTab === 'APPLICATIONS' ? (
          <>
            <div
              className="card"
              style={{
                padding: '20px',
                borderRadius: '14px',
                background: 'var(--card-bg, #fff)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', color: '#8A4A2A', fontWeight: 700 }}>
                  TOTAL COHORT APPS
                </span>
                <GraduationCap size={20} color="#8A4A2A" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: 'var(--text-primary)' }}>
                {loadingApps ? '...' : appStats?.totalApplications ?? applications.length}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Full application submissions
              </div>
            </div>

            <div
              className="card"
              style={{
                padding: '20px',
                borderRadius: '14px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', color: '#15803d', fontWeight: 700 }}>
                  PAID FEES (₦5,000)
                </span>
                <Building size={20} color="#15803d" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: '#166534' }}>
                {loadingApps ? '...' : (appStats?.feePaidCount ?? applications.filter(a => a.feeStatus === 'PAID').length)}
              </div>
              <div style={{ fontSize: '12px', color: '#15803d', marginTop: '4px', fontWeight: 500 }}>
                Verified paid ₦5,000 application fee
              </div>
            </div>

            <div
              className="card"
              style={{
                padding: '20px',
                borderRadius: '14px',
                background: '#fffbf5',
                border: '1px solid #fde68a',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', color: '#b45309', fontWeight: 700 }}>
                  SCHOLARSHIP CANDIDATES
                </span>
                <Award size={20} color="#b45309" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: '#92400e' }}>
                {loadingApps ? '...' : applications.filter(a => a.isScholarship || a.scholarshipVideoUrl).length}
              </div>
              <div style={{ fontSize: '12px', color: '#b45309', marginTop: '4px', fontWeight: 500 }}>
                Submitted video link for scholarship
              </div>
            </div>

            <div
              className="card"
              style={{
                padding: '20px',
                borderRadius: '14px',
                background: 'var(--card-bg, #fff)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 700 }}>
                  ADMITTED COHORT
                </span>
                <Users size={20} color="var(--accent)" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: 'var(--text-primary)' }}>
                {loadingApps ? '...' : (appStats?.admittedCount ?? applications.filter(a => a.status === 'ADMITTED').length)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Admitted into 2026 Cohort
              </div>
            </div>
          </>
        ) : activeTab === 'EARLY_ACCESS' ? (
          <>
            <div
              className="card"
              style={{
                padding: '20px',
                borderRadius: '14px',
                background: 'var(--card-bg, #fff)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  TOTAL LEADS
                </span>
                <Users size={20} color="var(--accent)" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: 'var(--text-primary)' }}>
                {loadingStats ? '...' : stats?.totalSubmissions || 0}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Combined roster leads
              </div>
            </div>

            <div
              className="card"
              style={{
                padding: '20px',
                borderRadius: '14px',
                background: 'var(--card-bg, #fff)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#d97757', fontWeight: 600 }}>
                  STUDENT COHORT LEADS
                </span>
                <GraduationCap size={20} color="#d97757" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: 'var(--text-primary)' }}>
                {loadingStats ? '...' : stats?.studentCount || 0}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {stats && stats.totalSubmissions > 0
                  ? `${Math.round((stats.studentCount / stats.totalSubmissions) * 100)}% of total leads`
                  : '2026 Cohort'}
              </div>
            </div>

            <div
              className="card"
              style={{
                padding: '20px',
                borderRadius: '14px',
                background: 'var(--card-bg, #fff)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#166534', fontWeight: 600 }}>
                  LANDLORD PROGRAMME LEADS
                </span>
                <Building size={20} color="#166534" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: 'var(--text-primary)' }}>
                {loadingStats ? '...' : stats?.landlordCount || 0}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {stats && stats.totalSubmissions > 0
                  ? `${Math.round((stats.landlordCount / stats.totalSubmissions) * 100)}% of total leads`
                  : 'Micro-course registrations'}
              </div>
            </div>

            <div
              className="card"
              style={{
                padding: '20px',
                borderRadius: '14px',
                background: 'var(--card-bg, #fff)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  TOP ACTIVE CITIES
                </span>
                <MapPin size={20} color="var(--accent)" />
              </div>
              <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {stats?.cityBreakdown && stats.cityBreakdown.length > 0 ? (
                  stats.cityBreakdown.slice(0, 4).map((c) => (
                    <span
                      key={c.city}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        background: 'var(--bg-secondary, #f3f4f6)',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {c.city}: <b>{c.count}</b>
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No city data yet</span>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div
              className="card"
              style={{
                padding: '20px',
                borderRadius: '14px',
                background: 'var(--card-bg, #fff)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', color: '#8A4A2A', fontWeight: 700 }}>
                  UNIQUE VISITORS
                </span>
                <Users size={20} color="#8A4A2A" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: '#8A4A2A' }}>
                {loadingTrafficStats ? '...' : (trafficStats?.uniqueViews ?? 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Deduplicated organic & referral visitors
              </div>
            </div>

            <div
              className="card"
              style={{
                padding: '20px',
                borderRadius: '14px',
                background: 'var(--card-bg, #fff)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 700 }}>
                  TOTAL PAGEVIEWS
                </span>
                <Eye size={20} color="var(--accent)" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: 'var(--text-primary)' }}>
                {loadingTrafficStats ? '...' : (trafficStats?.totalViews ?? 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Total session hits across all sources
              </div>
            </div>

            <div
              className="card"
              style={{
                padding: '20px',
                borderRadius: '14px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', color: '#15803d', fontWeight: 700 }}>
                  ATTRIBUTED CONVERSIONS
                </span>
                <Award size={20} color="#15803d" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: '#166534' }}>
                {loadingTrafficStats ? '...' : (trafficStats?.totalConversions ?? 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: '#15803d', marginTop: '4px', fontWeight: 500 }}>
                Applications & lead form completions
              </div>
            </div>

            <div
              className="card"
              style={{
                padding: '20px',
                borderRadius: '14px',
                background: '#fffbf5',
                border: '1px solid #fde68a',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', color: '#b45309', fontWeight: 700 }}>
                  OVERALL CONVERSION RATE
                </span>
                <TrendingUp size={20} color="#b45309" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: '#92400e' }}>
                {loadingTrafficStats ? '...' : `${trafficStats?.overallConversionRate ?? 0}%`}
              </div>
              <div style={{ fontSize: '12px', color: '#b45309', marginTop: '4px', fontWeight: 500 }}>
                Conversions / unique visitors
              </div>
            </div>
          </>
        )}
      </div>

      {activeTab === 'APPLICATIONS' ? (
        <>
          {/* ── Applications Search Controls ── */}
          <div
            className="card"
            style={{
              padding: '16px',
              borderRadius: '14px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Full Cohort Applications ({appStats?.totalApplications || 0})
            </div>
            <form onSubmit={handleAppSearchSubmit} style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="text"
                  placeholder="Search applications..."
                  value={appSearch}
                  onChange={(e) => setAppSearch(e.target.value)}
                  style={{
                    paddingLeft: '36px',
                    paddingRight: '12px',
                    height: '38px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '13px',
                    width: '280px',
                  }}
                />
              </div>
              <button type="submit" className="btn btn-secondary" style={{ height: '38px' }}>
                Search
              </button>
            </form>
          </div>

          <DataTable<UniversityApplicationRecord>
            data={applications}
            columns={appColumns}
            keyExtractor={(item) => item.id}
            isLoading={loadingApps}
            currentPage={appPage}
            totalPages={appTotalPages}
            onPageChange={setAppPage}
          />
        </>
      ) : activeTab === 'EARLY_ACCESS' ? (
        <>
          {/* ── Early Access Type Tabs & Search Controls ── */}
          <div
            className="card"
            style={{
              padding: '16px',
              borderRadius: '14px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            {/* Type Filter Pills */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  setTypeFilter('ALL')
                  setPage(1)
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: typeFilter === 'ALL' ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: typeFilter === 'ALL' ? 'var(--accent)' : 'transparent',
                  color: typeFilter === 'ALL' ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                }}
              >
                All Submissions ({stats?.totalSubmissions || 0})
              </button>
              <button
                onClick={() => {
                  setTypeFilter('STUDENT')
                  setPage(1)
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: typeFilter === 'STUDENT' ? '1px solid #d97757' : '1px solid var(--border)',
                  background: typeFilter === 'STUDENT' ? '#d97757' : 'transparent',
                  color: typeFilter === 'STUDENT' ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                }}
              >
                Students ({stats?.studentCount || 0})
              </button>
              <button
                onClick={() => {
                  setTypeFilter('LANDLORD')
                  setPage(1)
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: typeFilter === 'LANDLORD' ? '1px solid #166534' : '1px solid var(--border)',
                  background: typeFilter === 'LANDLORD' ? '#166534' : 'transparent',
                  color: typeFilter === 'LANDLORD' ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                }}
              >
                Landlords ({stats?.landlordCount || 0})
              </button>
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="text"
                  placeholder="Search by name, whatsapp, email, city..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    paddingLeft: '36px',
                    paddingRight: '12px',
                    height: '38px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '13px',
                    width: '280px',
                  }}
                />
              </div>
              <button type="submit" className="btn btn-secondary" style={{ height: '38px' }}>
                Search
              </button>
            </form>
          </div>

          <DataTable<EarlyAccessRecord>
            data={records}
            columns={columns}
            keyExtractor={(item) => item.id}
            isLoading={loading}
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      ) : (
        <>
          {/* ── Traffic & Source Links Controls ── */}
          <div
            className="card"
            style={{
              padding: '16px',
              borderRadius: '14px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            {/* Filter by Channel */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Channel:</span>
              <select
                value={trafficChannelFilter}
                onChange={(e) => {
                  setTrafficChannelFilter(e.target.value)
                  setTrafficPage(1)
                }}
                style={{
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: '#fff',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="ALL">All Channels</option>
                <option value="INSTAGRAM">Instagram</option>
                <option value="FACEBOOK">Facebook</option>
                <option value="TIKTOK">TikTok</option>
                <option value="TWITTER">Twitter / X</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="FLYER">Flyers & Posters</option>
                <option value="INFLUENCER">Influencer Promo</option>
                <option value="YOUTUBE">YouTube</option>
                <option value="OTHER">Other / Direct</option>
              </select>
            </div>

            {/* Search and Create Action */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  setTrafficPage(1)
                  fetchTrafficSources(1)
                }}
                style={{ display: 'flex', gap: '8px' }}
              >
                <div style={{ position: 'relative' }}>
                  <Search
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Search source name or slug..."
                    value={trafficSearch}
                    onChange={(e) => setTrafficSearch(e.target.value)}
                    style={{
                      paddingLeft: '36px',
                      paddingRight: '12px',
                      height: '38px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      fontSize: '13px',
                      width: '260px',
                    }}
                  />
                </div>
                <button type="submit" className="btn btn-secondary" style={{ height: '38px' }}>
                  Search
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setCreateForm({
                    name: '',
                    identifier: '',
                    channel: 'INSTAGRAM',
                    targetUrl: '/university',
                    description: '',
                  })
                  setIsCreateModalOpen(true)
                }}
                className="btn btn-primary"
                style={{
                  height: '38px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#8A4A2A',
                  color: '#fff',
                  padding: '0 16px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                <Plus size={16} />
                Create Source Link
              </button>
            </div>
          </div>

          <DataTable<TrafficSourceRecord>
            data={trafficSources}
            columns={trafficColumns}
            keyExtractor={(item) => item.id}
            isLoading={loadingTraffic}
            currentPage={trafficPage}
            totalPages={trafficTotalPages}
            onPageChange={setTrafficPage}
          />
        </>
      )}

      {/* ── Detail Modal ── */}
      <Modal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title={selectedRecord?.name || 'Application Details'}
        description={
          selectedRecord ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '4px',
                fontSize: '12px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '12px',
                background: selectedRecord.type === 'STUDENT' ? '#fbf1ed' : '#f0f7f2',
                color: selectedRecord.type === 'STUDENT' ? '#d97757' : '#166534',
              }}
            >
              {selectedRecord.type === 'STUDENT' ? 'Student Early Access' : 'Landlord Programme'} •{' '}
              {new Date(selectedRecord.createdAt).toLocaleDateString()}
            </span>
          ) : undefined
        }
        icon={
          selectedRecord?.type === 'STUDENT' ? (
            <GraduationCap size={20} />
          ) : (
            <Building size={20} />
          )
        }
        maxWidth="560px"
        footerActions={
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <button className="btn btn-secondary" onClick={() => setSelectedRecord(null)}>
              Close
            </button>
          </div>
        }
      >
        {selectedRecord && (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '20px',
              }}
            >
              <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  WhatsApp Contact
                </div>
                <div style={{ fontWeight: 600, marginTop: '2px', color: 'var(--text-primary)' }}>
                  {selectedRecord.whatsapp}
                </div>
              </div>
              <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  Email Address
                </div>
                <div
                  style={{
                    fontWeight: 600,
                    marginTop: '2px',
                    color: 'var(--text-primary)',
                    wordBreak: 'break-all',
                  }}
                >
                  {selectedRecord.email || 'None'}
                </div>
              </div>
              <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  Target City
                </div>
                <div style={{ fontWeight: 600, marginTop: '2px', color: 'var(--text-primary)' }}>
                  {selectedRecord.city}
                </div>
              </div>
              <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  Submission ID
                </div>
                <div
                  style={{
                    fontWeight: 600,
                    marginTop: '2px',
                    color: 'var(--text-primary)',
                    fontSize: '11px',
                  }}
                >
                  {selectedRecord.id}
                </div>
              </div>
            </div>

            {selectedRecord.type === 'STUDENT' ? (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#d97757' }}>
                  Student Cohort Answers
                </h4>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    marginBottom: '12px',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Age Bracket:
                    </span>
                    <div style={{ fontWeight: 600 }}>{selectedRecord.ageBracket || 'N/A'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Experience / Stage:
                    </span>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>
                      {selectedRecord.experienceLevel || 'N/A'}
                    </div>
                  </div>
                </div>

                {selectedRecord.experienceLevel && selectedRecord.experienceLevel.includes('Stage 1') && (
                  <div
                    style={{
                      background: '#fff7ed',
                      border: '1.5px solid #ffedd5',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      marginBottom: '12px',
                      fontSize: '13px',
                      color: '#9a3412',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: 600,
                    }}
                  >
                    <Layers size={16} color="#c2410c" />
                    <div>
                      <strong>Funnel Status: Drop-off at Stage 1</strong>
                      <div style={{ fontSize: '11.5px', fontWeight: 400, color: '#c2410c' }}>
                        Applicant entered basic contact info but dropped off before completing motivation & payment steps.
                      </div>
                    </div>
                  </div>
                )}
                {selectedRecord.interest && (
                  <div style={{ marginTop: '12px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Information & Q&A Session Choice:
                    </span>
                    <div
                      style={{
                        background: '#fef3c7',
                        color: '#92400e',
                        border: '1px solid #fde68a',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        marginTop: '4px',
                        fontSize: '13px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <Calendar size={15} />
                      {selectedRecord.interest}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#166534' }}>
                  Landlord Profile Answers
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Property Count:
                    </span>
                    <div style={{ fontWeight: 600 }}>{selectedRecord.propertyCount || 'N/A'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Status:</span>
                    <div style={{ fontWeight: 600 }}>{selectedRecord.landlordStatus || 'N/A'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Management:
                    </span>
                    <div style={{ fontWeight: 600 }}>
                      {selectedRecord.managementStyle || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isDeveloper && (
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setDeleteTarget({ id: selectedRecord.id, name: selectedRecord.name, type: 'EARLY_ACCESS' })}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: '#fef2f2',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={15} />
                  Delete Early Access Record
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Full Application Detail Modal ── */}
      <Modal
        isOpen={!!selectedApp}
        onClose={() => setSelectedApp(null)}
        title={selectedApp?.name || 'Full Cohort Application'}
        description={
          selectedApp ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '4px',
                fontSize: '12px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '12px',
                background: '#fff7ed',
                color: '#c2410c',
              }}
            >
              2026 Cohort • Applied {new Date(selectedApp.createdAt).toLocaleDateString()}
            </span>
          ) : undefined
        }
        icon={<GraduationCap size={20} />}
        maxWidth="640px"
        footerActions={
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <button className="btn btn-secondary" onClick={() => setSelectedApp(null)}>
              Close
            </button>
          </div>
        }
      >
        {selectedApp && (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 1fr',
                gap: '12px',
                marginBottom: '20px',
              }}
            >
              <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  WhatsApp Contact
                </div>
                <div style={{ fontWeight: 600, marginTop: '2px', color: 'var(--text-primary)' }}>
                  {selectedApp.whatsapp}
                </div>
              </div>
              <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Email Address
                </div>
                <div style={{ fontWeight: 600, marginTop: '2px', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                  {selectedApp.email}
                </div>
              </div>
              <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  City & Age
                </div>
                <div style={{ fontWeight: 600, marginTop: '2px', color: 'var(--text-primary)' }}>
                  {selectedApp.city} ({selectedApp.ageBracket})
                </div>
              </div>
              <div style={{ background: selectedApp.feeStatus === 'PAID' ? '#dcfce7' : '#fef9c3', padding: '12px', borderRadius: '8px', border: `1px solid ${selectedApp.feeStatus === 'PAID' ? '#bbf7d0' : '#fef08a'}` }}>
                <div style={{ fontSize: '11px', color: selectedApp.feeStatus === 'PAID' ? '#15803d' : '#a16207', textTransform: 'uppercase', fontWeight: 700 }}>
                  Fee Payment Status
                </div>
                <div style={{ fontWeight: 700, marginTop: '2px', color: selectedApp.feeStatus === 'PAID' ? '#15803d' : '#a16207' }}>
                  {selectedApp.feeStatus === 'PAID' ? '✓ PAID (₦5,000)' : 'PENDING'}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#8A4A2A' }}>
                Application Questionnaire Responses
              </h4>

              <div style={{ marginBottom: '14px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Occupation:
                </span>
                <div style={{ fontWeight: 600, fontSize: '13px', marginTop: '2px' }}>
                  {selectedApp.occupation || 'Not specified'}
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Real Estate Experience:
                </span>
                <div style={{ fontWeight: 600, fontSize: '13px', marginTop: '2px' }}>
                  {selectedApp.experienceLevel || 'Beginner'}
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Goals / Desired Outcomes:
                </span>
                <div style={{ background: '#fafafa', padding: '10px 14px', borderRadius: '8px', marginTop: '4px', fontSize: '13px', border: '1px solid var(--border)' }}>
                  {selectedApp.goals || 'N/A'}
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Can commit 6–8 hours/week?
                </span>
                <div style={{ background: '#fafafa', padding: '10px 14px', borderRadius: '8px', marginTop: '4px', fontSize: '13px', border: '1px solid var(--border)' }}>
                  {selectedApp.commitment}
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Why Upward University?
                </span>
                <div style={{ background: '#fafafa', padding: '10px 14px', borderRadius: '8px', marginTop: '4px', fontSize: '13px', border: '1px solid var(--border)' }}>
                  {selectedApp.why}
                </div>
              </div>

              {selectedApp.timing && (
                <div style={{ marginBottom: '14px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Why is now the right time?
                  </span>
                  <div style={{ background: '#fafafa', padding: '10px 14px', borderRadius: '8px', marginTop: '4px', fontSize: '13px', border: '1px solid var(--border)' }}>
                    {selectedApp.timing}
                  </div>
                </div>
              )}

              {selectedApp.sessionTime && (
                <div style={{ marginBottom: '14px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Information & Q&A Session Choice:
                  </span>
                  <div
                    style={{
                      background: '#fef3c7',
                      color: '#92400e',
                      border: '1px solid #fde68a',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      marginTop: '4px',
                      fontSize: '13px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Calendar size={15} />
                    {selectedApp.sessionTime}
                  </div>
                </div>
              )}

              {/* ── Program Scholarship & Video Link Card ── */}
              {(selectedApp.isScholarship || selectedApp.scholarshipVideoUrl) && (
                <div
                  style={{
                    background: '#fffbf5',
                    border: '1.5px solid #fde68a',
                    borderRadius: '12px',
                    padding: '16px',
                    margin: '16px 0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#b45309',
                        background: '#fef3c7',
                        padding: '3px 10px',
                        borderRadius: '999px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      <Award size={13} />
                      Program Scholarship Candidate
                    </span>
                  </div>
                  <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#92400e', fontWeight: 600 }}>
                    This applicant applied for a Program Scholarship and submitted a 1–2 minute video link.
                  </p>

                  {selectedApp.scholarshipVideoUrl ? (
                    <div style={{ background: '#ffffff', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px 14px' }}>
                      <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
                        Submitted Video URL:
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', wordBreak: 'break-all', flex: 1 }}>
                          {selectedApp.scholarshipVideoUrl}
                        </span>
                        <a
                          href={selectedApp.scholarshipVideoUrl.startsWith('http') ? selectedApp.scholarshipVideoUrl : `https://${selectedApp.scholarshipVideoUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '12.5px',
                            padding: '7px 14px',
                            borderRadius: '8px',
                            background: '#8A4A2A',
                            color: '#fff',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          <Video size={14} />
                          Watch Video <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '12.5px', color: '#b45309', fontStyle: 'italic' }}>
                      No video link provided.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Admin Audit & Status Controls ── */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '16px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text-primary)' }}>
                Admin Audit & Status Management
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
                    Application Fee Status (₦5,000)
                  </label>
                  <select
                    value={selectedApp.feeStatus || 'PENDING'}
                    onChange={(e) => handleUpdateAppStatus(selectedApp.id, { feeStatus: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      fontSize: '13px',
                      fontWeight: 600,
                      background: selectedApp.feeStatus === 'PAID' ? '#dcfce7' : '#fff',
                      color: selectedApp.feeStatus === 'PAID' ? '#15803d' : '#0f172a',
                    }}
                  >
                    <option value="PENDING">PENDING (Unpaid)</option>
                    <option value="PAID">✓ PAID (Offline/Bank/Manual/Paystack)</option>
                    <option value="REFUNDED">REFUNDED</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
                    Cohort Admission Status
                  </label>
                  <select
                    value={selectedApp.status || 'SUBMITTED'}
                    onChange={(e) => handleUpdateAppStatus(selectedApp.id, { status: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      fontSize: '13px',
                      fontWeight: 600,
                      background: selectedApp.status === 'ADMITTED' ? '#f0f7f2' : selectedApp.status === 'REJECTED' ? '#fef2f2' : '#fff',
                      color: selectedApp.status === 'ADMITTED' ? '#166534' : selectedApp.status === 'REJECTED' ? '#991b1b' : '#0f172a',
                    }}
                  >
                    <option value="SUBMITTED">SUBMITTED (Under Review)</option>
                    <option value="REVIEWED">REVIEWED</option>
                    <option value="ADMITTED">✓ ADMITTED</option>
                    <option value="REJECTED">✗ REJECTED</option>
                  </select>
                </div>
              </div>

              {isDeveloper && (
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ id: selectedApp.id, name: selectedApp.name, type: 'APPLICATION' })}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      background: '#fef2f2',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={15} />
                    Delete Application Record
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Create New Tracking Link Modal ── */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => !creatingSource && setIsCreateModalOpen(false)}
        title="Create Campaign Tracking Link"
        description="Generate a unique tracking identifier to monitor organic, ad, or flyer traffic with GA-level anti-reload tracking."
        icon={<Link2 size={20} color="#8A4A2A" />}
        maxWidth="580px"
      >
        <form onSubmit={handleCreateSource}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Campaign / Source Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Instagram Ads — Lagos Cohort"
                value={createForm.name}
                onChange={(e) => {
                  const val = e.target.value
                  setCreateForm((prev) => ({
                    ...prev,
                    name: val,
                    identifier: prev.identifier === slugify(prev.name) ? slugify(val) : prev.identifier,
                  }))
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  fontSize: '13.5px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Marketing Channel *
                </label>
                <select
                  value={createForm.channel}
                  onChange={(e) => setCreateForm({ ...createForm, channel: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '13px',
                    fontWeight: 600,
                    background: '#fff',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="INSTAGRAM">Instagram</option>
                  <option value="FACEBOOK">Facebook</option>
                  <option value="TIKTOK">TikTok</option>
                  <option value="TWITTER">Twitter / X</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="FLYER">Flyer & Campus Posters</option>
                  <option value="INFLUENCER">Influencer Outreach</option>
                  <option value="YOUTUBE">YouTube</option>
                  <option value="OTHER">Other / Direct</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Target Destination *
                </label>
                <select
                  value={createForm.targetUrl}
                  onChange={(e) => setCreateForm({ ...createForm, targetUrl: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '13px',
                    fontWeight: 600,
                    background: '#fff',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="/university">Main Landing Page (/university)</option>
                  <option value="/university/apply">Direct Application (/university/apply)</option>
                  <option value="/university/scholarships">Scholarship Page (/university/scholarships)</option>
                  <option value="/university/landlord">Landlord Programme (/university/landlord)</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Unique Slug / Identifier *
              </label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span
                  style={{
                    padding: '10px 12px',
                    background: '#f8fafc',
                    border: '1px solid var(--border)',
                    borderRight: 'none',
                    borderRadius: '8px 0 0 8px',
                    fontSize: '12.5px',
                    color: 'var(--text-muted)',
                    fontFamily: 'monospace',
                  }}
                >
                  /university/
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g. ig-lagos-1"
                  value={createForm.identifier}
                  onChange={(e) => setCreateForm({ ...createForm, identifier: slugify(e.target.value) })}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '0 8px 8px 0',
                    border: '1px solid var(--border)',
                    fontSize: '13.5px',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    color: '#8A4A2A',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Only lowercase letters, numbers, and dashes (auto-formatted).
              </p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Campaign Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Target: UNILAG students, Ad budget: ₦50k, Duration: 2 weeks"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Generated URL Preview Box */}
            {createForm.identifier && (
              <div
                style={{
                  background: '#fdf8f5',
                  border: '1px solid #f4e4d8',
                  borderRadius: '10px',
                  padding: '12px 14px',
                }}
              >
                <div style={{ fontSize: '11px', color: '#8A4A2A', fontWeight: 700, textTransform: 'uppercase' }}>
                  Live Link Preview:
                </div>
                <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#8A4A2A', fontWeight: 700, marginTop: '4px', wordBreak: 'break-all' }}>
                  {typeof window !== 'undefined' ? window.location.origin : 'https://upward.ng'}
                  {createForm.targetUrl.includes('/apply')
                    ? `/university/apply?ref=${createForm.identifier}`
                    : `/university/${createForm.identifier}`}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={creatingSource}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={creatingSource}
              style={{
                background: '#8A4A2A',
                color: '#fff',
                padding: '8px 20px',
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Plus size={16} />
              {creatingSource ? 'Creating Link...' : 'Create Tracking Link'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Recent Visits Log Modal ── */}
      <Modal
        isOpen={isVisitsModalOpen}
        onClose={() => setIsVisitsModalOpen(false)}
        title={selectedSourceForVisits ? `Traffic Activity: ${selectedSourceForVisits.name}` : 'Recent Visits Log'}
        description={
          selectedSourceForVisits ? (
            <span>
              Identifier: <code style={{ color: '#8A4A2A', fontWeight: 700 }}>{selectedSourceForVisits.identifier}</code> •{' '}
              Total: <b>{selectedSourceForVisits.totalViews}</b> views (<b>{selectedSourceForVisits.uniqueViews}</b> unique) •{' '}
              Conversions: <b>{selectedSourceForVisits.conversions}</b>
            </span>
          ) : undefined
        }
        icon={<BarChart2 size={20} color="#8A4A2A" />}
        maxWidth="740px"
        footerActions={
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <button className="btn btn-secondary" onClick={() => setIsVisitsModalOpen(false)}>
              Close
            </button>
          </div>
        }
      >
        <div>
          {loadingVisits ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading recent visit activity...
            </div>
          ) : visitsList.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No recorded visits yet for this link. Share the link to start tracking!
            </div>
          ) : (
            <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 600 }}>Timestamp</th>
                    <th style={{ padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 600 }}>Type</th>
                    <th style={{ padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 600 }}>Visitor / Session</th>
                    <th style={{ padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 600 }}>Referrer</th>
                    <th style={{ padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 600 }}>Path</th>
                  </tr>
                </thead>
                <tbody>
                  {visitsList.map((v) => (
                    <tr key={v.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 10px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(v.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: v.isUnique ? '#dcfce7' : '#f3f4f6',
                            color: v.isUnique ? '#15803d' : '#4b5563',
                          }}
                        >
                          {v.isUnique ? 'Unique' : 'Repeat'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        <div>{v.visitorId.slice(0, 16)}...</div>
                      </td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-secondary)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {v.referer || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Direct</span>}
                      </td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '11.5px' }}>
                        {v.path}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

      {/* ── Confirmation Modal for Deletion ── */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Confirm Record Deletion"
      >
        {deleteTarget && (
          <div style={{ padding: '4px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: '#dc2626' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fef2f2', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <AlertCircle size={24} color="#dc2626" />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Are you sure?</h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--text-primary)', background: '#fafafa', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              You are about to permanently delete the{' '}
              {deleteTarget.type === 'APPLICATION'
                ? 'University Application'
                : deleteTarget.type === 'EARLY_ACCESS'
                ? 'Early Access / Info Request'
                : 'Traffic Source Tracking Link'}{' '}
              for <strong>{deleteTarget.name}</strong>.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                <Trash2 size={15} />
                {deleting ? 'Deleting...' : 'Yes, Delete Record'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
