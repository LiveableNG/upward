import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Users,
  Search,
  Mail,
  Phone,
  Clock,
  ChevronDown,
  Download,
  Trash2,
  CheckSquare,
  Square,
  AlertTriangle,
  CalendarDays,
  Filter,
  X,
  CheckCircle2,
  UserPlus,
  RefreshCcw
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'
import { formatName } from '@upward/common-utils'

interface Stats {
  totalUsers: number
  joinedLast24h: number
  convertedCount: number
  joinedFromInviteCount: number
  selfSignupCount: number
  launchEmailsSent: number
  launchEmailsFailed: number
  conversionRate: number
}

interface User {
  id: string
  uuid: string
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  isFromWaitlist: boolean
  isFromInvite: boolean
  unsubscribed: boolean
  updatedAt: string
  createdAt: string
}

interface Meta {
  total: number
  page: number
  limit: number
  totalPages: number
}

interface FeeOverride {
  id: number
  targetType: string
  targetId: string
  fee: number
  createdAt: string
  targetName?: string
  targetEmail?: string
}

interface FeeTarget {
  id: string
  name: string
  email: string
  type: string
  fee: number | null
}

interface DashboardProps {
  token: string
  adminRole?: string
}

const Dashboard: React.FC<DashboardProps> = ({ token, adminRole }) => {
  const isSuperadmin = adminRole === 'SUPERADMIN'
  const navigate = useNavigate()

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'users' | 'pms'>('users')

  // Shared state
  const [overrides, setOverrides] = useState<FeeOverride[]>([])

  // Users Tab state
  const [stats, setStats] = useState<Stats | null>(null)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; ids: string[] }>({
    show: false,
    ids: [],
  })

  // PMs Tab state
  const [pmList, setPmList] = useState<FeeTarget[]>([])
  const [loadingPms, setLoadingPms] = useState(false)
  const [pmSearch, setPmSearch] = useState('')

  // Filters for Users
  const [filters, setFilters] = useState({
    search: '',
    isWaitlist: 'all' as 'all' | 'true' | 'false',
    isInvited: 'all' as 'all' | 'true' | 'false',
    unsubscribed: 'all' as 'all' | 'true' | 'false',
  })
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'yesterday' | '2days' | '1week'>('all')
  const [page, setPage] = useState(1)

  // Tenant Editing Modal state
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [userFee, setUserFee] = useState('2000')
  const [savingUser, setSavingUser] = useState(false)

  // PM Override Modal state
  const [selectedPm, setSelectedPm] = useState<FeeTarget | null>(null)
  const [pmFee, setPmFee] = useState('2000')
  
  // Base Fee Configuration state
  const [baseFeeInput, setBaseFeeInput] = useState('2000')
  const [savingBaseFee, setSavingBaseFee] = useState(false)
  const [feeTargetType, setFeeTargetType] = useState<'PM' | 'COMPANY' | 'PLATFORM'>('PM')

  // Custom Override Form (Company/Platform) inside PM modal
  const [customOverrideType, setCustomOverrideType] = useState('COMPANY')
  const [customOverrideId, setCustomOverrideId] = useState('')
  const [customOverrideFee, setCustomOverrideFee] = useState('2000')

  const [savingOverride, setSavingOverride] = useState(false)

  // Compute date bounds from dateRange
  const dateBounds = useMemo(() => {
    const now = new Date()
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const endOfDay = (d: Date) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
    if (dateRange === 'today') {
      return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() }
    }
    if (dateRange === 'yesterday') {
      const y = new Date(now)
      y.setDate(y.getDate() - 1)
      return { from: startOfDay(y).toISOString(), to: endOfDay(y).toISOString() }
    }
    if (dateRange === '2days') {
      const d = new Date(now)
      d.setDate(d.getDate() - 1)
      return { from: startOfDay(d).toISOString(), to: endOfDay(now).toISOString() }
    }
    if (dateRange === '1week') {
      const d = new Date(now)
      d.setDate(d.getDate() - 6)
      return { from: startOfDay(d).toISOString(), to: endOfDay(now).toISOString() }
    }
    return null
  }, [dateRange])

  // Fetch Overrides List
  const fetchOverrides = async () => {
    try {
      const response = await apiService.get('/admin/fees/overrides', token)
      if (response && response.success) {
        setOverrides(response.data)
        const globalOverride = response.data.find((o: any) => o.targetType === 'SYSTEM' && o.targetId === 'GLOBAL')
        if (globalOverride) {
          setBaseFeeInput(String(globalOverride.fee))
        } else {
          setBaseFeeInput('2000')
        }
      }
    } catch (error) {
      console.error('Failed to fetch overrides:', error)
    }
  }

  // Fetch Stats
  const fetchAnalytics = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        ...(filters.search && { search: filters.search }),
        ...(filters.isWaitlist !== 'all' && { isWaitlist: filters.isWaitlist }),
        ...(filters.isInvited !== 'all' && { isInvited: filters.isInvited }),
        ...(filters.unsubscribed !== 'all' && { unsubscribed: filters.unsubscribed }),
        ...(dateBounds?.from && { createdFrom: dateBounds.from }),
        ...(dateBounds?.to && { createdTo: dateBounds.to }),
      })
      const statsRes = await apiService.get(`/admin/analytics?${params.toString()}`, token)
      setStats(statsRes.data)
    } catch (err) {
      console.error('Failed to fetch analytics', err)
    }
  }, [token, filters, dateBounds])

  // Fetch Users
  const fetchUsers = useCallback(
    async (pageToFetch: number, isLoadMore = false) => {
      setLoadingUsers(true)
      try {
        const params = new URLSearchParams({
          page: pageToFetch.toString(),
          limit: '20',
          ...(filters.search && { search: filters.search }),
          ...(filters.isWaitlist !== 'all' && { isWaitlist: filters.isWaitlist }),
          ...(filters.isInvited !== 'all' && { isInvited: filters.isInvited }),
          ...(filters.unsubscribed !== 'all' && { unsubscribed: filters.unsubscribed }),
          ...(dateBounds?.from && { createdFrom: dateBounds.from }),
          ...(dateBounds?.to && { createdTo: dateBounds.to }),
        })

        const res = await apiService.get(`/admin/users?${params.toString()}`, token)

        if (isLoadMore) {
          setAllUsers((prev) => [...prev, ...res.data])
        } else {
          setAllUsers(res.data)
        }
        setPage(pageToFetch)
        setMeta(res.meta)
      } catch (err) {
        console.error('Failed to fetch users', err)
      } finally {
        setLoadingUsers(false)
        setLoading(false)
      }
    },
    [token, filters, dateBounds],
  )

  // Fetch Property Managers, Companies, or Platforms
  const fetchPms = useCallback(async () => {
    setLoadingPms(true)
    try {
      const response = await apiService.get(`/admin/fees/targets?type=${feeTargetType}&q=${encodeURIComponent(pmSearch)}`, token)
      if (response && response.success) {
        setPmList(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch target list:', error)
    } finally {
      setLoadingPms(false)
    }
  }, [token, pmSearch, feeTargetType])

  // Initial load
  useEffect(() => {
    fetchOverrides()
  }, [])

  // Sync analytics
  useEffect(() => {
    if (activeTab === 'users') {
      const timeout = setTimeout(() => {
        fetchAnalytics()
      }, 500)
      return () => clearTimeout(timeout)
    }
  }, [fetchAnalytics, activeTab])

  // Sync users
  useEffect(() => {
    if (activeTab === 'users') {
      const timeout = setTimeout(() => {
        fetchUsers(1, false)
      }, 300)
      return () => clearTimeout(timeout)
    }
  }, [
    filters.search,
    filters.isWaitlist,
    filters.isInvited,
    filters.unsubscribed,
    dateRange,
    fetchUsers,
    activeTab
  ])

  // Sync PMs
  useEffect(() => {
    if (activeTab === 'pms') {
      const timeout = setTimeout(() => {
        fetchPms()
      }, 300)
      return () => clearTimeout(timeout)
    }
  }, [pmSearch, fetchPms, activeTab])

  const handleExportCSV = async () => {
    if (allUsers.length === 0) return

    const headers = [
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'From Waitlist',
      'From Invite',
      'Unsubscribed',
      'Updated At',
    ].join(',')

    const rows = allUsers.map((user) => {
      return [
        `"${formatName(user.firstName || '').replace(/"/g, '""')}"`,
        `"${formatName(user.lastName || '').replace(/"/g, '""')}"`,
        `"${(user.email || '').replace(/"/g, '""')}"`,
        `"${(user.phone || '').replace(/"/g, '""')}"`,
        user.isFromWaitlist ? 'Yes' : 'No',
        user.isFromInvite ? 'Yes' : 'No',
        user.unsubscribed ? 'Yes' : 'No',
        new Date(user.updatedAt).toLocaleString(),
      ].join(',')
    })

    const csvContent = [headers, ...rows].join('\n')

    try {
      await apiService.post(
        '/admin/logs/event',
        {
          action: 'EXPORT_CSV',
          details: `Exported ${allUsers.length} users to CSV`,
        },
        token,
      )
    } catch (err) {
      console.error('Failed to log export event:', err)
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `upward_users_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast(`Exported ${allUsers.length} users to CSV`)
  }

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === allUsers.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(allUsers.map((u) => u.id)))
  }

  const handleBatchDelete = async (ids: string[]) => {
    try {
      await apiService.post('/admin/users/batch-delete', { ids }, token)
      setAllUsers((prev) => prev.filter((u) => !ids.includes(u.id)))
      setSelectedIds(new Set())
      setDeleteModal({ show: false, ids: [] })
      showToast(`${ids.length} user${ids.length === 1 ? '' : 's'} deleted`)
    } catch (err) {
      console.error('Delete error:', err)
      showToast('Failed to delete users', true)
    }
  }

  const handleEmailFiltered = async () => {
    if (!meta || meta.total === 0) return

    setLoadingUsers(true)
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: meta.total.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.isWaitlist !== 'all' && { isWaitlist: filters.isWaitlist }),
        ...(filters.isInvited !== 'all' && { isInvited: filters.isInvited }),
        ...(filters.unsubscribed !== 'all' && { unsubscribed: filters.unsubscribed }),
        ...(dateBounds?.from && { createdFrom: dateBounds.from }),
        ...(dateBounds?.to && { createdTo: dateBounds.to }),
      })

      const res = await apiService.get(`/admin/users?${params.toString()}`, token)
      const allFilteredIds = res.data.map((u: User) => u.id)

      navigate('/emails', { state: { userIds: allFilteredIds } })
    } catch (err) {
      console.error('Failed to prepare filtered emails', err)
      showToast('Failed to prepare audience list', true)
    } finally {
      setLoadingUsers(false)
    }
  }

  // --- Modal Openers ---
  const handleOpenPmModal = (pm: FeeTarget) => {
    setSelectedPm(pm)
    const matchedOverride = overrides.find(o => o.targetType === pm.type && o.targetId === pm.id)
    setPmFee(matchedOverride ? String(matchedOverride.fee) : '2000')
    setCustomOverrideId('')
    setCustomOverrideFee('2000')
  }

  // --- API Action Executions ---
  const handleSaveUserDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    setSavingUser(true)
    try {
      await apiService.patch(`/admin/users/${selectedUser.id}`, {
        firstName: editFirstName,
        lastName: editLastName,
        email: editEmail,
        phone: editPhone
      }, token)
      
      showToast('User details updated successfully')
      fetchUsers(page, false)
      
      // Update local state if needed
      setSelectedUser(prev => prev ? {
        ...prev,
        firstName: editFirstName,
        lastName: editLastName,
        email: editEmail,
        phone: editPhone
      } : null)
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'Failed to update user', true)
    } finally {
      setSavingUser(false)
    }
  }

  const handleSaveUserFee = async () => {
    if (!selectedUser) return
    const feeNum = parseFloat(userFee)
    if (isNaN(feeNum) || feeNum < 0) {
      showToast('Please enter a valid fee.', true)
      return
    }

    setSavingOverride(true)
    try {
      await apiService.post('/admin/fees/overrides', {
        targetType: 'USER',
        targetId: selectedUser.uuid,
        fee: feeNum
      }, token)
      
      showToast('User custom fee override saved')
      await fetchOverrides()
      fetchUsers(page, false)
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'Failed to save override', true)
    } finally {
      setSavingOverride(false)
    }
  }

  const handleDeleteUserFee = async () => {
    if (!selectedUser) return
    
    setSavingOverride(true)
    try {
      await apiService.delete(`/admin/fees/overrides/USER/${selectedUser.uuid}`, token)
      showToast('User fee override removed')
      setUserFee('2000')
      await fetchOverrides()
      fetchUsers(page, false)
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'Failed to delete override', true)
    } finally {
      setSavingOverride(false)
    }
  }

  const handleSavePmFee = async () => {
    if (!selectedPm) return
    const feeNum = parseFloat(pmFee)
    if (isNaN(feeNum) || feeNum < 0) {
      showToast('Please enter a valid fee.', true)
      return
    }

    setSavingOverride(true)
    try {
      await apiService.post('/admin/fees/overrides', {
        targetType: selectedPm.type,
        targetId: selectedPm.id,
        fee: feeNum
      }, token)
      
      showToast(`${selectedPm.type} fee override saved`)
      await fetchOverrides()
      fetchPms()
    } catch (err: any) {
      console.error(err)
      showToast(err.message || `Failed to save ${selectedPm.type} fee override`, true)
    } finally {
      setSavingOverride(false)
    }
  }

  const handleDeletePmFee = async () => {
    if (!selectedPm) return

    setSavingOverride(true)
    try {
      await apiService.delete(`/admin/fees/overrides/${selectedPm.type}/${selectedPm.id}`, token)
      showToast(`${selectedPm.type} fee override removed`)
      setPmFee('2000')
      await fetchOverrides()
      fetchPms()
    } catch (err: any) {
      console.error(err)
      showToast(err.message || `Failed to delete ${selectedPm.type} override`, true)
    } finally {
      setSavingOverride(false)
    }
  }
  const handleSaveBaseFee = async () => {
    const feeNum = parseFloat(baseFeeInput)
    if (isNaN(feeNum) || feeNum < 0) {
      showToast('Please enter a valid fee amount', true)
      return
    }

    setSavingBaseFee(true)
    try {
      await apiService.post('/admin/fees/overrides', {
        targetType: 'SYSTEM',
        targetId: 'GLOBAL',
        fee: feeNum
      }, token)

      showToast('Global base processing fee updated successfully')
      await fetchOverrides()
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'Failed to update base fee', true)
    } finally {
      setSavingBaseFee(false)
    }
  }

  const handleSaveCustomOverride = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customOverrideId.trim()) {
      showToast('Please enter a target ID', true)
      return
    }
    const feeNum = parseFloat(customOverrideFee)
    if (isNaN(feeNum) || feeNum < 0) {
      showToast('Please enter a valid fee amount', true)
      return
    }

    setSavingOverride(true)
    try {
      await apiService.post('/admin/fees/overrides', {
        targetType: customOverrideType,
        targetId: customOverrideId.trim(),
        fee: feeNum
      }, token)

      showToast(`${customOverrideType} override saved successfully`)
      setCustomOverrideId('')
      setCustomOverrideFee('2000')
      await fetchOverrides()
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'Failed to save override', true)
    } finally {
      setSavingOverride(false)
    }
  }

  const handleDeleteOverride = async (type: string, id: string) => {
    if (!confirm('Are you sure you want to delete this custom override?')) return
    
    try {
      await apiService.delete(`/admin/fees/overrides/${type}/${id}`, token)
      showToast('Override deleted')
      fetchOverrides()
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'Failed to delete override', true)
    }
  }

  const activeFilterCount =
    (filters.isWaitlist !== 'all' ? 1 : 0) +
    (filters.isInvited !== 'all' ? 1 : 0) +
    (filters.unsubscribed !== 'all' ? 1 : 0)

  // Get active override details for target
  const getOverrideLabel = (type: string, id: string) => {
    const match = overrides.find(o => o.targetType === type && o.targetId === id)
    return match ? `₦${match.fee.toLocaleString()}` : 'Default (2k)'
  }

  return (
    <div className="page-container fade-in" style={{ paddingTop: '20px' }}>
      
      {/* Title & Top Refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 className="section-title" style={{ margin: 0 }}>
          Admin Dashboard
        </h2>
        <button
          onClick={() => {
            fetchOverrides()
            if (activeTab === 'users') {
              fetchAnalytics()
              fetchUsers(page, false)
            } else {
              fetchPms()
            }
          }}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <RefreshCcw size={16} /> Refresh
        </button>
      </div>

      {/* Segmented Control Tabs */}
      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '12px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'users' ? '2px solid var(--accent)' : '2px solid transparent',
            fontWeight: 600,
            color: activeTab === 'users' ? 'var(--text)' : 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'var(--transition)'
          }}
        >
          Tenants
        </button>
        <button
          onClick={() => setActiveTab('pms')}
          style={{
            padding: '12px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'pms' ? '2px solid var(--accent)' : '2px solid transparent',
            fontWeight: 600,
            color: activeTab === 'pms' ? 'var(--text)' : 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'var(--transition)'
          }}
        >
          Property Managers & Fees
        </button>
      </div>

      {/* ==================== TENANTS TAB CONTENT ==================== */}
      {activeTab === 'users' && (
        <>
          {loading || !stats ? (
            <div style={{ color: 'var(--text-muted)', padding: '48px 0', textAlign: 'center' }}>
              Loading analytics and tenant list...
            </div>
          ) : (
            <>
              {/* Stats Summary Cards */}
              <div
                className="stats-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(auto-fit, minmax(240px, 1fr))`,
                  gap: '20px',
                  marginBottom: '24px',
                }}
              >
                {statItems(stats).map((stat, idx) => (
                  <div
                    key={idx}
                    className="card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '20px',
                      padding: '24px',
                    }}
                  >
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '16px',
                        backgroundColor: `${stat.color}10`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: stat.color,
                      }}
                    >
                      <stat.icon size={24} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="section-label" style={{ marginBottom: '4px' }}>
                        {stat.label}
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 800 }}>{stat.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Filters Block */}
              <div className="card" style={{ marginBottom: '16px', padding: '20px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <CalendarDays size={16} style={{ color: 'var(--text-muted)' }} />
                    <span className="section-label">Sign-up Period</span>
                  </div>
                  <div className="date-chips">
                    {(
                      [
                        { key: 'all', label: 'All Time' },
                        { key: 'today', label: 'Today' },
                        { key: 'yesterday', label: 'Yesterday' },
                        { key: '2days', label: 'Last 2 Days' },
                        { key: '1week', label: 'Last 7 Days' },
                      ] as const
                    ).map(({ key, label }) => (
                      <button
                        key={key}
                        className={`date-chip${dateRange === key ? ' active' : ''}`}
                        onClick={() => setDateRange(key)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <Users size={16} style={{ color: 'var(--text-muted)' }} />
                    <span className="section-label">Waitlist Status</span>
                  </div>
                  <div className="date-chips">
                    {[
                      { key: 'all' as const, label: 'All' },
                      { key: 'true' as const, label: 'From Waitlist' },
                      { key: 'false' as const, label: 'Self Signed-up' },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        className={`date-chip${filters.isWaitlist === key ? ' active' : ''}`}
                        onClick={() => setFilters((prev) => ({ ...prev, isWaitlist: key }))}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <UserPlus size={16} style={{ color: 'var(--text-muted)' }} />
                    <span className="section-label">Invitation Status</span>
                  </div>
                  <div className="date-chips">
                    {[
                      { key: 'all' as const, label: 'All' },
                      { key: 'true' as const, label: 'From Invite' },
                      { key: 'false' as const, label: 'Not Invited' },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        className={`date-chip${filters.isInvited === key ? ' active' : ''}`}
                        onClick={() => setFilters((prev) => ({ ...prev, isInvited: key }))}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <Mail size={16} style={{ color: 'var(--text-muted)' }} />
                    <span className="section-label">Subscription Status</span>
                  </div>
                  <div className="date-chips">
                    {[
                      { key: 'all' as const, label: 'All' },
                      { key: 'true' as const, label: 'Unsubscribed' },
                      { key: 'false' as const, label: 'Subscribed' },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        className={`date-chip${filters.unsubscribed === key ? ' active' : ''}`}
                        onClick={() => setFilters((prev) => ({ ...prev, unsubscribed: key }))}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <Filter size={16} style={{ color: 'var(--text-muted)' }} />
                  <span className="section-label" style={{ flex: 1 }}>
                    Filters
                    {activeFilterCount > 0 && (
                      <span
                        style={{
                          marginLeft: '8px',
                          background: 'var(--accent)',
                          color: 'white',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '999px',
                        }}
                      >
                        {activeFilterCount}
                      </span>
                    )}
                  </span>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          isWaitlist: 'all',
                          isInvited: 'all',
                          unsubscribed: 'all',
                        }))
                      }
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      <X size={12} /> Clear filters
                    </button>
                  )}
                </div>
                <div className="filter-bar">
                  <div className="filter-field search-field" style={{ flex: 1 }}>
                    <label>Search Tenants</label>
                    <div style={{ position: 'relative' }}>
                      <Search
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
                      <input
                        type="text"
                        placeholder="Email, name or phone..."
                        value={filters.search}
                        onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tenants Table Card */}
              <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div
                  style={{
                    padding: '24px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Tenants list</h3>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      Showing {allUsers.length} of {meta?.total || 0} users (Click a row to edit details or configure checkout fees)
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {isSuperadmin && selectedIds.size > 0 && (
                      <button
                        onClick={() => setDeleteModal({ show: true, ids: Array.from(selectedIds) })}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 16px',
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          borderRadius: '12px',
                          fontSize: '14px',
                          fontWeight: 600,
                        }}
                      >
                        <Trash2 size={16} /> Delete Selected ({selectedIds.size})
                      </button>
                    )}
                    {meta && meta.total > 0 && (
                      <button
                        onClick={handleEmailFiltered}
                        disabled={loadingUsers}
                        className="btn btn-secondary"
                        style={{ borderRadius: '12px', height: '42px' }}
                      >
                        <Mail size={16} style={{ color: 'var(--accent)' }} />
                        Email Filtered ({meta.total})
                      </button>
                    )}
                    <button
                      onClick={handleExportCSV}
                      disabled={allUsers.length === 0}
                      className="btn btn-secondary"
                      style={{ borderRadius: '12px', height: '42px' }}
                    >
                      <Download size={16} /> Export CSV
                    </button>
                  </div>
                </div>

                <div className="table-container">
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                        {isSuperadmin && (
                          <th style={{ padding: '16px 8px 16px 24px', width: '40px' }}>
                            <button
                              onClick={toggleSelectAll}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              {selectedIds.size === allUsers.length && allUsers.length > 0 ? (
                                <CheckSquare size={18} color="var(--accent)" />
                              ) : (
                                <Square size={18} />
                              )}
                            </button>
                          </th>
                        )}
                        <th style={{ padding: isSuperadmin ? '16px 16px 16px 8px' : '16px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Member</th>
                        <th style={{ padding: '16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Contact</th>
                        <th style={{ padding: '16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Origin</th>
                        <th style={{ padding: '16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fee</th>
                        <th style={{ padding: '16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Joined Date</th>
                        {isSuperadmin && <th style={{ padding: '16px', width: '80px' }} />}
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers.map((user) => (
                        <tr
                          key={user.id}
                          onClick={() => navigate(`/users/${user.uuid}`)}
                          style={{
                            borderBottom: '1px solid var(--border)',
                            verticalAlign: 'top',
                            backgroundColor: selectedIds.has(user.id) ? 'var(--accent-faint)' : 'transparent',
                            transition: 'background-color 0.2s',
                            cursor: 'pointer'
                          }}
                          className="table-row-hover"
                        >
                          {isSuperadmin && (
                            <td style={{ padding: '16px 8px 16px 24px', verticalAlign: 'middle' }} onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => toggleSelect(user.id, e)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--text-muted)',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                              >
                                {selectedIds.has(user.id) ? (
                                  <CheckSquare size={18} color="var(--accent)" />
                                ) : (
                                  <Square size={18} />
                                )}
                              </button>
                            </td>
                          )}
                          <td style={{ padding: isSuperadmin ? '16px 16px 16px 8px' : '16px 24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div
                                style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '12px',
                                  background: 'var(--surface-hover)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  color: 'var(--accent)',
                                  flexShrink: 0,
                                }}
                              >
                                {user.firstName ? formatName(user.firstName)[0] : user.email[0].toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '14px' }}>
                                  {formatName(user.firstName || '')} {formatName(user.lastName || '')}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                                <Mail size={14} color="var(--text-muted)" /> {user.email}
                              </div>
                              {user.phone && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                                  <Phone size={14} color="var(--text-muted)" /> {user.phone}
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {user.isFromWaitlist && (
                                <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>Waitlist</span>
                              )}
                              {user.isFromInvite && (
                                <span className="badge" style={{ background: '#f3e8ff', color: '#6b21a8' }}>Invitation</span>
                              )}
                              {!user.isFromWaitlist && !user.isFromInvite && (
                                <span className="badge" style={{ background: '#ecfdf5', color: '#047857' }}>Self Signup</span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>
                              {getOverrideLabel('USER', user.uuid)}
                            </span>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Clock size={14} /> {new Date(user.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </td>
                          {isSuperadmin && (
                            <td style={{ padding: '16px', verticalAlign: 'middle' }} onClick={(e) => e.stopPropagation()}>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                  onClick={() => setDeleteModal({ show: true, ids: [user.id] })}
                                  title="Delete user"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    borderRadius: '6px',
                                    transition: 'color 0.2s',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
                                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {meta && meta.page < meta.totalPages && (
                  <div style={{ padding: '24px', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                    <button
                      onClick={() => fetchUsers(page + 1, true)}
                      disabled={loadingUsers}
                      className="btn btn-secondary"
                      style={{ height: '48px', padding: '0 32px', borderRadius: '12px' }}
                    >
                      {loadingUsers ? 'Loading...' : 'Show More Users'}
                      {!loadingUsers && <ChevronDown size={18} />}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ==================== PROPERTY MANAGERS & FEE TAB CONTENT ==================== */}
      {activeTab === 'pms' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Base Fee Configuration */}
          <div className="card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 12px 0', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Global Base Processing Fee
            </h4>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', maxWidth: '400px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)' }}>₦</span>
                <input
                  type="number"
                  min="0"
                  value={baseFeeInput}
                  onChange={(e) => setBaseFeeInput(e.target.value)}
                  className="input"
                  style={{ paddingLeft: '32px', fontSize: '16px', fontWeight: 700 }}
                />
              </div>
              <button onClick={handleSaveBaseFee} className="btn btn-primary" style={{ height: '44px' }} disabled={savingBaseFee}>
                {savingBaseFee ? 'Saving...' : 'Save Base Fee'}
              </button>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '8px 0 0 0' }}>
              This sets the fallback processing fee for all users across the system if no individual tenant, PM, company, or platform override exists. Default is ₦2,000.
            </p>
          </div>

          <div className="card">
            {/* Sub-tabs Segmented Control */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', marginBottom: '20px', paddingBottom: '12px' }}>
              {(['PM', 'COMPANY', 'PLATFORM'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setFeeTargetType(type)
                    setPmSearch('')
                  }}
                  className={`date-chip${feeTargetType === type ? ' active' : ''}`}
                  style={{ borderRadius: '8px' }}
                >
                  {type === 'PM' ? 'Property Managers' : type === 'COMPANY' ? 'Companies' : 'Platforms'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                {feeTargetType === 'PM' ? 'Property Managers (PMs)' : feeTargetType === 'COMPANY' ? 'Companies' : 'Platforms'}
              </h3>
              <div style={{ position: 'relative', width: '300px' }}>
                <Search
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
                <input
                  type="text"
                  placeholder={`Search ${feeTargetType === 'PM' ? 'PMs' : feeTargetType === 'COMPANY' ? 'Companies' : 'Platforms'}...`}
                  value={pmSearch}
                  onChange={(e) => setPmSearch(e.target.value)}
                  className="input"
                  style={{ paddingLeft: '36px' }}
                />
              </div>
            </div>

            <div className="table-container">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {feeTargetType === 'PM' ? 'Property Manager' : feeTargetType === 'COMPANY' ? 'Company Name' : 'Platform Name'}
                    </th>
                    <th style={{ padding: '16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email</th>
                    <th style={{ padding: '16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Custom Fee</th>
                    <th style={{ padding: '16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingPms ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '48px', textAlign: 'center' }}>
                        <div className="loader" style={{ margin: '0 auto' }}></div>
                      </td>
                    </tr>
                  ) : pmList.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No targets found.
                      </td>
                    </tr>
                  ) : (
                    pmList.map((pm) => (
                      <tr
                        key={pm.id}
                        onClick={() => {
                          if (pm.type === 'PM') {
                            navigate(`/pms/${pm.id}`)
                          } else {
                            handleOpenPmModal(pm)
                          }
                        }}
                        style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                        className="table-row-hover"
                      >
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: 'var(--accent-faint)',
                                color: 'var(--accent)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                              }}
                            >
                              {(pm.name || 'P')[0].toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 600, fontSize: '14px' }}>{pm.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>{pm.email}</td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '14px' }}>
                            {getOverrideLabel(pm.type, pm.id)}
                          </span>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenPmModal(pm)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px' }}
                          >
                            Configure Override
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TENANT DETAILS & FEE MODAL ==================== */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div
            className="modal-content card fade-in"
            style={{ maxWidth: '540px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Configure Tenant Details</h3>
              <button
                onClick={() => setSelectedUser(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', padding: '12px', background: 'var(--surface)', borderRadius: '12px' }}>
              <UserPlus size={18} style={{ color: 'var(--accent)', marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>UUID target</div>
                <div style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 700, wordBreak: 'break-all' }}>{selectedUser.uuid}</div>
              </div>
            </div>

            {/* Member Details Form */}
            <form onSubmit={handleSaveUserDetails} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 800, margin: '8px 0 0 0', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                1. Edit Details
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>First Name</label>
                  <input type="text" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="input" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>Last Name</label>
                  <input type="text" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="input" />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>Email</label>
                <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="input" required />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>Phone</label>
                <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="input" />
              </div>

              <button type="submit" className="btn btn-secondary" style={{ alignSelf: 'flex-end', height: '40px' }} disabled={savingUser}>
                {savingUser ? 'Saving details...' : 'Save User Info'}
              </button>
            </form>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />

            {/* Custom Processing Fee Override */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 800, margin: 0, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                2. Processing Fee Override (₦)
              </h4>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)' }}>₦</span>
                  <input
                    type="number"
                    min="0"
                    value={userFee}
                    onChange={(e) => setUserFee(e.target.value)}
                    className="input"
                    style={{ paddingLeft: '32px', fontSize: '16px', fontWeight: 700 }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleSaveUserFee} className="btn btn-primary" style={{ height: '44px' }} disabled={savingOverride}>
                    Save Override
                  </button>
                  {overrides.some(o => o.targetType === 'USER' && o.targetId === selectedUser.uuid) && (
                    <button onClick={handleDeleteUserFee} className="btn btn-secondary" style={{ color: 'var(--danger)', height: '44px' }} disabled={savingOverride}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                This sets a custom fee for this user. Fallback is the associated PM fee or Platform Default (₦2,000).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ==================== PM DETAILS & FEES MODAL ==================== */}
      {selectedPm && (
        <div className="modal-overlay" onClick={() => setSelectedPm(null)}>
          <div
            className="modal-content card fade-in"
            style={{ maxWidth: '600px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Configure PM & Hierarchy Fees</h3>
              <button
                onClick={() => setSelectedPm(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* PM Target Details Info */}
            <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '12px' }}>
              <span className="section-label">Property Manager Details</span>
              <div style={{ fontWeight: 700, fontSize: '16px', marginTop: '6px' }}>{selectedPm.name}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{selectedPm.email}</div>
              <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: '4px' }}>Target ID: {selectedPm.id}</div>
            </div>

            {/* PM Level Override */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 800, margin: 0, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                1. PM Processing Fee Override
              </h4>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)' }}>₦</span>
                  <input
                    type="number"
                    min="0"
                    value={pmFee}
                    onChange={(e) => setPmFee(e.target.value)}
                    className="input"
                    style={{ paddingLeft: '32px', fontSize: '15px', fontWeight: 700 }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleSavePmFee} className="btn btn-primary" style={{ height: '42px' }} disabled={savingOverride}>
                    Save Override
                  </button>
                  {overrides.some(o => o.targetType === 'PM' && o.targetId === selectedPm.id) && (
                    <button onClick={handleDeletePmFee} className="btn btn-secondary" style={{ color: 'var(--danger)', height: '42px' }} disabled={savingOverride}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />

            {/* Hierarchical Override Form (Company / Platform overrides) */}
            <form onSubmit={handleSaveCustomOverride} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 800, margin: 0, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                2. Configure Company or Platform Overrides
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>Type</label>
                  <select
                    value={customOverrideType}
                    onChange={(e) => setCustomOverrideType(e.target.value)}
                    className="input"
                  >
                    <option value="COMPANY">Company</option>
                    <option value="PLATFORM">Platform</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>Target ID (UUID)</label>
                  <input
                    type="text"
                    placeholder="Enter target UUID..."
                    value={customOverrideId}
                    onChange={(e) => setCustomOverrideId(e.target.value)}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>Fee Amount (₦)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)' }}>₦</span>
                  <input
                    type="number"
                    min="0"
                    value={customOverrideFee}
                    onChange={(e) => setCustomOverrideFee(e.target.value)}
                    className="input"
                    style={{ paddingLeft: '32px', fontWeight: 700 }}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-secondary" style={{ alignSelf: 'flex-end', height: '40px' }} disabled={savingOverride}>
                {savingOverride ? 'Saving...' : 'Add Custom Override'}
              </button>
            </form>

            {/* List Active Company/Platform Overrides in System */}
            {overrides.some(o => o.targetType === 'COMPANY' || o.targetType === 'PLATFORM') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className="section-label">Active Company/Platform Overrides in System</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
                  {overrides
                    .filter(o => o.targetType === 'COMPANY' || o.targetType === 'PLATFORM')
                    .map((ov) => (
                      <div
                        key={ov.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: 'var(--surface)',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          fontSize: '13px'
                        }}
                      >
                        <div>
                          <span
                            className="badge"
                            style={{
                              fontSize: '9px',
                              padding: '2px 6px',
                              background: ov.targetType === 'COMPANY' ? 'var(--warning-faint)' : 'var(--success-faint)',
                              color: ov.targetType === 'COMPANY' ? 'var(--warning)' : 'var(--success)',
                              marginRight: '6px'
                            }}
                          >
                            {ov.targetType}
                          </span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{ov.targetId.slice(0, 8)}...</span>
                          <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>({ov.targetName})</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--accent)' }}>₦{ov.fee.toLocaleString()}</span>
                          <button
                            onClick={() => handleDeleteOverride(ov.targetType, ov.targetId)}
                            style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== DELETE MODAL ==================== */}
      {deleteModal.show && (
        <div className="modal-overlay" style={{ alignItems: 'center' }} onClick={() => setDeleteModal({ show: false, ids: [] })}>
          <div className="modal-content" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                }}
              >
                <AlertTriangle size={32} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>
                Delete {deleteModal.ids.length > 1 ? `${deleteModal.ids.length} users` : 'user'}?
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '32px', lineHeight: 1.6 }}>
                This action cannot be undone. The selected user records will be permanently removed.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setDeleteModal({ show: false, ids: [] })}
                  className="btn btn-secondary"
                  style={{ flex: 1, height: '44px' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleBatchDelete(deleteModal.ids)}
                  className="btn btn-primary"
                  style={{ flex: 1, backgroundColor: '#dc2626', height: '44px' }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .table-row-hover:hover {
          background-color: var(--surface-hover) !important;
        }
        .date-chip {
          padding: 8px 16px;
          background: var(--white);
          border: 1px solid var(--border);
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
          cursor: pointer;
          transition: var(--transition);
        }
        .date-chip.active {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
        }
        .date-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .filter-bar {
          display: flex;
          gap: 16px;
          margin-top: 12px;
        }
        .filter-field label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .filter-field input {
          width: 100%;
          padding: 10px 16px 10px 36px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--surface);
          font-size: 14px;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  )
}

const statItems = (stats: Stats) => [
  { label: 'Total Users', value: stats.totalUsers, icon: Users, color: '#d97757' },
  { label: 'Joined from Waitlist', value: stats.convertedCount, icon: CheckCircle2, color: '#10b981' },
  { label: 'Joined from Invitation', value: stats.joinedFromInviteCount, icon: UserPlus, color: '#a855f7' },
  { label: 'Self Sign-ups', value: stats.selfSignupCount, icon: Users, color: '#ec4899' },
  { label: 'Launch Emails Sent', value: stats.launchEmailsSent, icon: Mail, color: '#6366f1' },
  { label: 'Launch Emails Failed', value: stats.launchEmailsFailed, icon: AlertTriangle, color: '#f59e0b' },
]

export default Dashboard
