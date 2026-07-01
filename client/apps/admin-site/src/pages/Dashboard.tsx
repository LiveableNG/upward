import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Download,
  RefreshCcw,
  Trash2,
  Settings,
  AlertTriangle,
  X,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'

interface DashboardProps {
  token: string
  adminRole?: string
}

interface WaitlistRecord {
  id: string
  uuid: string
  email: string
  firstName: string
  lastName: string
  phone: string
  createdAt: string
  converted: boolean
  totalPaid: number
}

interface SignedUpRecord {
  id: string
  uuid: string
  email: string
  firstName: string
  lastName: string
  phone: string
  createdAt: string
  isWaitlist: boolean
  totalPaid: number
  hasPaid: boolean
}

interface InvitedRecord {
  id: string
  uuid: string
  email: string
  firstName: string
  lastName: string
  phone: string
  createdAt: string
  status: 'INVITED_PENDING' | 'INVITED_SIGNED_UP' | 'GUEST_PAID' | 'SIGNED_UP_PAID'
  totalPaid: number
  pmName: string
  pmUuid: string | null
}

interface PmRecord {
  id: string
  uuid: string
  email: string
  firstName: string
  lastName: string
  businessName: string
  phone: string
  isVerified: boolean
  propertiesCount: number
  unitsCount: number
  totalGenerated: number
  createdAt: string
}

interface FeeOverride {
  id: number
  targetType: string
  targetId: string
  fee: number
  createdAt: string
  targetName?: string
}

interface MetricsSummary {
  waitlist: {
    total: number
    converted: number
    totalPaid: number
  }
  signedUp: {
    total: number
    paying: number
    totalPaid: number
  }
  invited: {
    pending: number
    onboarded: number
    guestPaid: number
    onboardedPaid: number
    guestTotalPaid: number
    onboardedTotalPaid: number
    total: number
  }
  sources: {
    pmCount: number
    platformCount: number
  }
  revenue: {
    totalUpwardFees: number
    totalBenefitsFees: number
    totalRentProcessed: number
  }
}

const Dashboard: React.FC<DashboardProps> = ({ token, adminRole }) => {
  const navigate = useNavigate()
  const isSuperadmin = adminRole === 'SUPERADMIN'

  // Tab State
  const [activeTab, setActiveTab] = useState<'waitlist' | 'signedUp' | 'invited' | 'pms' | 'revenue'>('waitlist')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Date Filters
  const [dateRange, setDateRange] = useState<'all' | 'today' | '7days' | '30days' | 'custom'>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Metrics Data State
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null)
  const [waitlistList, setWaitlistList] = useState<WaitlistRecord[]>([])
  const [signedUpList, setSignedUpList] = useState<SignedUpRecord[]>([])
  const [invitedList, setInvitedList] = useState<InvitedRecord[]>([])
  const [pmList, setPmList] = useState<PmRecord[]>([])

  // Selection / Bulk Delete State
  const [selectedWaitlistIds, setSelectedWaitlistIds] = useState<Set<string>>(new Set())
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; ids: string[] }>({ show: false, ids: [] })
  const [deleting, setDeleting] = useState(false)

  // Fee Overrides Modal & Config States
  const [overridesModalOpen, setOverridesModalOpen] = useState(false)
  const [overrides, setOverrides] = useState<FeeOverride[]>([])
  const [loadingOverrides, setLoadingOverrides] = useState(false)
  const [baseFeeInput, setBaseFeeInput] = useState('2000')
  const [savingBaseFee, setSavingBaseFee] = useState(false)
  const [customOverrideType, setCustomOverrideType] = useState('PM')
  const [customOverrideId, setCustomOverrideId] = useState('')
  const [customOverrideFee, setCustomOverrideFee] = useState('2000')
  const [savingOverride, setSavingOverride] = useState(false)

  // Selected PM for override quick action
  const [selectedPmOverride, setSelectedPmOverride] = useState<PmRecord | null>(null)
  const [pmOverrideFeeInput, setPmOverrideFeeInput] = useState('2000')

  // Fetch Main Performance Metrics
  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      let queryStart = startDate
      let queryEnd = endDate

      if (dateRange !== 'custom') {
        const now = new Date()
        if (dateRange === 'today') {
          queryStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
        } else if (dateRange === '7days') {
          queryStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
        } else if (dateRange === '30days') {
          queryStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
        } else {
          queryStart = ''
          queryEnd = ''
        }
      }

      const params = new URLSearchParams({
        ...(queryStart && { startDate: queryStart }),
        ...(queryEnd && { endDate: queryEnd }),
        ...(search && { search }),
      })

      const res = await apiService.get(`/admin/performance-metrics?${params.toString()}`, token)
      setMetrics(res.metrics)
      setWaitlistList(res.directories.waitlist)
      setSignedUpList(res.directories.signedUp)
      setInvitedList(res.directories.invited)
      setPmList(res.directories.pms)
    } catch (err) {
      console.error(err)
      showToast('Failed to fetch dashboard metrics', true)
    } finally {
      setLoading(false)
    }
  }

  // Fetch Fee Overrides List
  const fetchOverrides = async () => {
    setLoadingOverrides(true)
    try {
      const response = await apiService.get('/admin/fees/overrides', token)
      setOverrides(response.overrides || [])
      if (response.baseFee !== undefined) {
        setBaseFeeInput(String(response.baseFee))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingOverrides(false)
    }
  }

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchDashboardData()
    }, 450)
    return () => clearTimeout(handler)
  }, [dateRange, search, startDate, endDate])

  useEffect(() => {
    if (overridesModalOpen) {
      fetchOverrides()
    }
  }, [overridesModalOpen])

  // Reset page when tab changes
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab])

  // Save Base Fee
  const handleSaveBaseFee = async () => {
    setSavingBaseFee(true)
    try {
      await apiService.post('/admin/fees/overrides', {
        targetType: 'PLATFORM',
        targetId: 'GLOBAL_DEFAULT',
        fee: parseFloat(baseFeeInput),
      }, token)
      showToast('Base processing fee saved successfully')
      fetchOverrides()
    } catch (err: any) {
      showToast(err.message || 'Failed to save base fee', true)
    } finally {
      setSavingBaseFee(false)
    }
  }

  // Save custom fee override
  const handleSaveCustomOverride = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customOverrideId.trim()) return

    setSavingOverride(true)
    try {
      await apiService.post('/admin/fees/overrides', {
        targetType: customOverrideType,
        targetId: customOverrideId,
        fee: parseFloat(customOverrideFee),
      }, token)
      showToast('Custom fee override added')
      setCustomOverrideId('')
      fetchOverrides()
    } catch (err: any) {
      showToast(err.message || 'Failed to add custom override', true)
    } finally {
      setSavingOverride(false)
    }
  }

  // Delete custom fee override
  const handleDeleteOverride = async (type: string, id: string) => {
    if (!confirm('Are you sure you want to delete this custom override?')) return
    try {
      await apiService.delete(`/admin/fees/overrides/${type}/${id}`, token)
      showToast('Custom override deleted successfully')
      fetchOverrides()
    } catch (err: any) {
      showToast(err.message || 'Failed to delete override', true)
    }
  }

  // Quick configure PM override modal save
  const handleSavePmQuickOverride = async () => {
    if (!selectedPmOverride) return
    setSavingOverride(true)
    try {
      await apiService.post('/admin/fees/overrides', {
        targetType: 'PM',
        targetId: selectedPmOverride.uuid,
        fee: parseFloat(pmOverrideFeeInput),
      }, token)
      showToast(`Processing fee override saved for PM: ${selectedPmOverride.businessName}`)
      setSelectedPmOverride(null)
    } catch (err: any) {
      showToast(err.message || 'Failed to save PM override', true)
    } finally {
      setSavingOverride(false)
    }
  }

  const handleDeletePmQuickOverride = async () => {
    if (!selectedPmOverride) return
    setSavingOverride(true)
    try {
      await apiService.delete(`/admin/fees/overrides/PM/${selectedPmOverride.uuid}`, token)
      showToast(`Custom override removed for PM: ${selectedPmOverride.businessName}`)
      setSelectedPmOverride(null)
    } catch (err: any) {
      showToast(err.message || 'Failed to remove PM override', true)
    } finally {
      setSavingOverride(false)
    }
  }

  // Bulk Waitlist deletion handlers
  const handleBatchDelete = async (ids: string[]) => {
    setDeleting(true)
    try {
      await apiService.post('/admin/users/batch-delete', { ids }, token)
      showToast(`Successfully deleted ${ids.length} waitlist entry records`)
      setSelectedWaitlistIds(new Set())
      setDeleteModal({ show: false, ids: [] })
      fetchDashboardData()
    } catch (err: any) {
      showToast(err.message || 'Failed to delete selected items', true)
    } finally {
      setDeleting(false)
    }
  }

  const triggerBulkDelete = () => {
    if (selectedWaitlistIds.size === 0) return
    setDeleteModal({ show: true, ids: Array.from(selectedWaitlistIds) })
  }

  const toggleSelectWaitlist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = new Set(selectedWaitlistIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedWaitlistIds(next)
  }

  const toggleSelectAllWaitlist = () => {
    if (selectedWaitlistIds.size === paginatedItems.length) {
      setSelectedWaitlistIds(new Set())
    } else {
      setSelectedWaitlistIds(new Set(paginatedItems.map((item: any) => item.id)))
    }
  }

  // Get active directory lists
  const currentDirectoryList = useMemo(() => {
    switch (activeTab) {
      case 'waitlist':
        return waitlistList
      case 'signedUp':
        return signedUpList
      case 'invited':
        return invitedList
      case 'pms':
        return pmList
      default:
        return []
    }
  }, [activeTab, waitlistList, signedUpList, invitedList, pmList])

  // Client-side pagination
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return currentDirectoryList.slice(start, start + itemsPerPage)
  }, [currentDirectoryList, currentPage])

  const totalPages = Math.ceil(currentDirectoryList.length / itemsPerPage)

  const handleExportExcel = () => {
    if (currentDirectoryList.length === 0) {
      showToast('No directory records to export', true)
      return
    }

    let worksheetData: any[] = []
    if (activeTab === 'waitlist') {
      worksheetData = waitlistList.map((w) => ({
        'Name': `${w.firstName} ${w.lastName}`,
        'Email Address': w.email,
        'Phone Number': w.phone,
        'Status': w.converted ? 'Converted to User' : 'Pending in Waitlist',
        'Acquired Date': new Date(w.createdAt).toLocaleDateString(),
        'Paid Amount (₦)': w.totalPaid,
      }))
    } else if (activeTab === 'signedUp') {
      worksheetData = signedUpList.map((u) => ({
        'Name': `${u.firstName} ${u.lastName}`,
        'Email Address': u.email,
        'Phone Number': u.phone,
        'Signup Mode': u.isWaitlist ? 'Waitlist Converted' : 'Self Signed-up',
        'Has Paid': u.hasPaid ? 'Yes' : 'No',
        'Total Paid (₦)': u.totalPaid,
        'Signup Date': new Date(u.createdAt).toLocaleDateString(),
      }))
    } else if (activeTab === 'invited') {
      worksheetData = invitedList.map((i) => ({
        'Name': `${i.firstName} ${i.lastName}`,
        'Email Address': i.email,
        'Phone Number': i.phone,
        'Invite Classification': i.status
          .replace('INVITED_PENDING', 'Invited (Pending)')
          .replace('INVITED_SIGNED_UP', 'Invited & Signed Up')
          .replace('GUEST_PAID', 'Guest Checkout Completed')
          .replace('SIGNED_UP_PAID', 'Onboarded User (Paid)'),
        'PM Origin': i.pmName,
        'Total Paid (₦)': i.totalPaid,
        'Invite Date': new Date(i.createdAt).toLocaleDateString(),
      }))
    } else if (activeTab === 'pms') {
      worksheetData = pmList.map((p) => ({
        'Business Name': p.businessName,
        'Manager Name': `${p.firstName} ${p.lastName}`,
        'Email Address': p.email,
        'Phone Number': p.phone,
        'Status': p.isVerified ? 'Verified' : 'Unverified',
        'Properties Count': p.propertiesCount,
        'Units Count': p.unitsCount,
        'Revenue Generated (₦)': p.totalGenerated,
        'Join Date': new Date(p.createdAt).toLocaleDateString(),
      }))
    }

    const worksheet = XLSX.utils.json_to_sheet(worksheetData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, `${activeTab.toUpperCase()}_Directory`)

    const maxProps = Object.keys(worksheetData[0] || {})
    worksheet['!cols'] = maxProps.map((key) => ({
      wch: Math.max(
        15,
        key.length,
        ...worksheetData.map((row) => String(row[key as keyof typeof row] || '').length),
      ),
    }))

    XLSX.writeFile(workbook, `Upward_Ecosystem_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`)
    showToast(`Spreadsheet exported with ${worksheetData.length} records!`)
  }

  const getInvitedBadgeStyle = (status: string) => {
    switch (status) {
      case 'SIGNED_UP_PAID':
        return { backgroundColor: 'var(--success-faint)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.15)' }
      case 'GUEST_PAID':
        return { backgroundColor: 'rgba(59, 130, 246, 0.08)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.15)' }
      case 'INVITED_SIGNED_UP':
        return { backgroundColor: 'rgba(99, 102, 241, 0.08)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.15)' }
      case 'INVITED_PENDING':
        return { backgroundColor: 'var(--warning-faint)', color: 'var(--warning)', border: '1px solid rgba(245, 158, 11, 0.15)' }
      default:
        return { backgroundColor: 'var(--surface-hover)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
    }
  }

  const getInvitedLabel = (status: string) => {
    switch (status) {
      case 'SIGNED_UP_PAID':
        return 'Signed Up (Paid)'
      case 'GUEST_PAID':
        return 'Guest (Paid)'
      case 'INVITED_SIGNED_UP':
        return 'Invited & Signed Up'
      case 'INVITED_PENDING':
        return 'Invited (Pending)'
      default:
        return status
    }
  }

  return (
    <div className="page-container fade-in" style={{ paddingTop: '16px' }}>
      
      {/* Top Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 800 }}>Ecosystem Dashboard</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Clean multi-team performance metrics, waitlist actions, and transaction processing fee overrides.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setOverridesModalOpen(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '40px' }}>
            <Settings size={16} /> Overrides Config
          </button>
          <button onClick={fetchDashboardData} className="btn btn-secondary" style={{ height: '40px' }}>
            <RefreshCcw size={16} />
          </button>
        </div>
      </div>

      {/* HERO UNIFIED STAT PANELS (Gradient Premium Cards from metrics, clickable to switch tables) */}
      {metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          
          {/* Card 1: Waitlist */}
          <div
            onClick={() => setActiveTab('waitlist')}
            style={{
              background: activeTab === 'waitlist' ? 'linear-gradient(135deg, var(--white) 0%, var(--surface-hover) 100%)' : 'var(--white)',
              border: activeTab === 'waitlist' ? '2px solid var(--accent)' : '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              cursor: 'pointer',
              boxShadow: activeTab === 'waitlist' ? 'var(--shadow-md)' : 'none',
              transition: 'var(--transition)'
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Waitlist Accounts</span>
            <h2 style={{ fontSize: '32px', fontWeight: 800, margin: '8px 0', color: 'var(--text)' }}>
              {metrics.waitlist.total}
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              <div>Converted: <strong>{metrics.waitlist.converted}</strong></div>
              <div style={{ color: 'var(--success)', fontWeight: 600, marginTop: '2px' }}>Paid: ₦{metrics.waitlist.totalPaid.toLocaleString()}</div>
            </div>
          </div>

          {/* Card 2: Self Signed Up */}
          <div
            onClick={() => setActiveTab('signedUp')}
            style={{
              background: activeTab === 'signedUp' ? 'linear-gradient(135deg, var(--white) 0%, var(--surface-hover) 100%)' : 'var(--white)',
              border: activeTab === 'signedUp' ? '2px solid var(--accent)' : '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              cursor: 'pointer',
              boxShadow: activeTab === 'signedUp' ? 'var(--shadow-md)' : 'none',
              transition: 'var(--transition)'
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Self Signed Up</span>
            <h2 style={{ fontSize: '32px', fontWeight: 800, margin: '8px 0', color: '#6366f1' }}>
              {metrics.signedUp.total}
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              <div>Paying Users: <strong>{metrics.signedUp.paying}</strong></div>
              <div style={{ color: 'var(--success)', fontWeight: 600, marginTop: '2px' }}>Paid: ₦{metrics.signedUp.totalPaid.toLocaleString()}</div>
            </div>
          </div>

          {/* Card 3: Invited & Guest Checkouts */}
          <div
            onClick={() => setActiveTab('invited')}
            style={{
              background: activeTab === 'invited' ? 'linear-gradient(135deg, var(--white) 0%, var(--surface-hover) 100%)' : 'var(--white)',
              border: activeTab === 'invited' ? '2px solid var(--accent)' : '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              cursor: 'pointer',
              boxShadow: activeTab === 'invited' ? 'var(--shadow-md)' : 'none',
              transition: 'var(--transition)'
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Invited & Guest</span>
            <h2 style={{ fontSize: '32px', fontWeight: 800, margin: '8px 0', color: 'var(--warning)' }}>
              {metrics.invited.total}
            </h2>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div>Pending: <strong>{metrics.invited.pending}</strong> • Onboard: <strong>{metrics.invited.onboarded}</strong></div>
              <div>Guest Pay: <strong>{metrics.invited.guestPaid}</strong> (₦{metrics.invited.guestTotalPaid.toLocaleString()})</div>
            </div>
          </div>

          {/* Card 4: Platform Sources */}
          <div
            onClick={() => setActiveTab('pms')}
            style={{
              background: activeTab === 'pms' ? 'linear-gradient(135deg, var(--white) 0%, var(--surface-hover) 100%)' : 'var(--white)',
              border: activeTab === 'pms' ? '2px solid var(--accent)' : '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              cursor: 'pointer',
              boxShadow: activeTab === 'pms' ? 'var(--shadow-md)' : 'none',
              transition: 'var(--transition)'
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>PMs & Platforms</span>
            <h2 style={{ fontSize: '32px', fontWeight: 800, margin: '8px 0', color: 'var(--success)' }}>
              {pmList.length}
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              <div>From PM Invites: <strong>{metrics.sources.pmCount}</strong></div>
              <div>From Platform: <strong>{metrics.sources.platformCount}</strong></div>
            </div>
          </div>

          {/* Card 5: Upward Collected Fees */}
          <div
            onClick={() => setActiveTab('revenue')}
            style={{
              background: activeTab === 'revenue' ? 'linear-gradient(135deg, var(--white) 0%, var(--surface-hover) 100%)' : 'var(--white)',
              border: activeTab === 'revenue' ? '2px solid var(--accent)' : '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              cursor: 'pointer',
              boxShadow: activeTab === 'revenue' ? 'var(--shadow-md)' : 'none',
              transition: 'var(--transition)'
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Collected Upward Fees</span>
            <h2 style={{ fontSize: '26px', fontWeight: 800, margin: '12px 0 8px 0', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              ₦{metrics.revenue.totalUpwardFees.toLocaleString()}
            </h2>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              <div>Benefits Fee: <strong>₦{metrics.revenue.totalBenefitsFees.toLocaleString()}</strong></div>
              <div>Rent Processed: <strong>₦{metrics.revenue.totalRentProcessed.toLocaleString()}</strong></div>
            </div>
          </div>

        </div>
      )}

      {/* Sleek Calm Filter Toolbar */}
      <div className="card" style={{ marginBottom: '24px', padding: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', flex: 1 }}>
            
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '180px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder={`Search inside ${activeTab} directory...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input"
                style={{ paddingLeft: '38px', height: '40px' }}
              />
            </div>

            {/* Date Preset Selector */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }} className="date-chips">
              {(
                [
                  { key: 'all', label: 'All' },
                  { key: 'today', label: 'Today' },
                  { key: '7days', label: '7 Days' },
                  { key: '30days', label: '30 Days' },
                  { key: 'custom', label: 'Custom' },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  className={`date-chip${dateRange === key ? ' active' : ''}`}
                  onClick={() => setDateRange(key)}
                  style={{ height: '34px' }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Custom Dates Inputs */}
            {dateRange === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input"
                  style={{ height: '36px', width: '130px', padding: '0 8px' }}
                />
                <span style={{ color: 'var(--text-muted)' }}>to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input"
                  style={{ height: '36px', width: '130px', padding: '0 8px' }}
                />
              </div>
            )}

          </div>

          {/* Action Tools */}
          <div style={{ display: 'flex', gap: '10px' }}>
            {activeTab === 'waitlist' && selectedWaitlistIds.size > 0 && (
              <button
                onClick={triggerBulkDelete}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)', height: '40px' }}
              >
                <Trash2 size={16} /> Delete Selected ({selectedWaitlistIds.size})
              </button>
            )}
            
            <button
              onClick={handleExportExcel}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '40px' }}
            >
              <Download size={16} /> Export Active Table
            </button>
          </div>

        </div>
      </div>

      {/* Segmented Display Tabs */}
      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
        {(
          [
            { key: 'waitlist', label: `Waitlist (${waitlistList.length})` },
            { key: 'signedUp', label: `Self Registered (${signedUpList.length})` },
            { key: 'invited', label: `Invited Tenants (${invitedList.length})` },
            { key: 'pms', label: `PMs & Platforms (${pmList.length})` },
            { key: 'revenue', label: `Revenue Audit` },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              padding: '12px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === key ? '2px solid var(--accent)' : '2px solid transparent',
              fontWeight: 600,
              color: activeTab === key ? 'var(--text)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'var(--transition)'
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TABLE DIRECTORY VIEWS */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)' }}>
          <div style={{ margin: '0 auto 12px auto' }} className="loader" />
          <span>Refreshing directory audit database...</span>
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <div className="table-container">
              
              {/* 1. WAITLIST TABLE */}
              {activeTab === 'waitlist' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                      {isSuperadmin && (
                        <th style={{ padding: '16px 8px 16px 24px', width: '40px' }}>
                          <button
                            onClick={toggleSelectAllWaitlist}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                          >
                            {selectedWaitlistIds.size === paginatedItems.length && paginatedItems.length > 0 ? (
                              <CheckSquare size={18} color="var(--accent)" />
                            ) : (
                              <Square size={18} />
                            )}
                          </button>
                        </th>
                      )}
                      <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Member Name</th>
                      <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Contact Info</th>
                      <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                      <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Paid Amount</th>
                      <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Joined Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItems.map((item: any) => (
                      <tr
                        key={item.id}
                        onClick={() => navigate(item.converted ? `/users/${item.uuid}` : '#')}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          cursor: item.converted ? 'pointer' : 'default',
                          backgroundColor: selectedWaitlistIds.has(item.id) ? 'var(--accent-faint)' : 'transparent'
                        }}
                        className="table-row-hover"
                      >
                        {isSuperadmin && (
                          <td style={{ padding: '16px 8px 16px 24px' }} onClick={(e) => toggleSelectWaitlist(item.id, e)}>
                            <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                              {selectedWaitlistIds.has(item.id) ? (
                                <CheckSquare size={18} color="var(--accent)" />
                              ) : (
                                <Square size={18} />
                              )}
                            </button>
                          </td>
                        )}
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ fontWeight: 600 }}>{item.firstName} {item.lastName}</span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ fontSize: '13px' }}>{item.email}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.phone}</div>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: item.converted ? 'var(--success-faint)' : 'var(--warning-faint)',
                              color: item.converted ? 'var(--success)' : 'var(--warning)',
                              border: '1px solid transparent'
                            }}
                          >
                            {item.converted ? 'Converted User' : 'In Waitlist'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', fontWeight: 700 }}>
                          {item.totalPaid > 0 ? `₦${item.totalPaid.toLocaleString()}` : '—'}
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '12px', color: 'var(--text-muted)' }}>
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {paginatedItems.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>No waitlist entries matching the criteria.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* 2. SIGNED UP TABLE */}
              {activeTab === 'signedUp' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>User details</th>
                      <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Mode</th>
                      <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Payment Status</th>
                      <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Paid</th>
                      <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Signup Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItems.map((user: any) => (
                      <tr
                        key={user.id}
                        onClick={() => navigate(`/users/${user.uuid}`)}
                        style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                        className="table-row-hover"
                      >
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ fontWeight: 600, display: 'block' }}>{user.firstName} {user.lastName}</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user.email} • {user.phone}</span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ fontSize: '13px' }}>{user.isWaitlist ? 'Waitlist Converted' : 'Direct Signup'}</span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: user.hasPaid ? 'var(--success-faint)' : 'var(--surface-hover)',
                              color: user.hasPaid ? 'var(--success)' : 'var(--text-muted)'
                            }}
                          >
                            {user.hasPaid ? 'Paid' : 'Unpaid'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', fontWeight: 700 }}>
                          {user.totalPaid > 0 ? `₦${user.totalPaid.toLocaleString()}` : '—'}
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '12px', color: 'var(--text-muted)' }}>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {paginatedItems.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>No signed-up users found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* 3. INVITED TENANTS TABLE */}
              {activeTab === 'invited' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tenant details</th>
                      <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Classification</th>
                      <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Property Manager Origin</th>
                      <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Paid</th>
                      <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Invite Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItems.map((tenant: any) => (
                      <tr
                        key={tenant.id}
                        onClick={() => navigate(`/users/${tenant.uuid}`)}
                        style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                        className="table-row-hover"
                      >
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ fontWeight: 600, display: 'block' }}>{tenant.firstName ? `${tenant.firstName} ${tenant.lastName}` : 'Invite Placeholder'}</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tenant.email} • {tenant.phone}</span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span className="badge" style={getInvitedBadgeStyle(tenant.status)}>
                            {getInvitedLabel(tenant.status)}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px' }} onClick={(e) => {
                          if (tenant.pmUuid) {
                            e.stopPropagation()
                            navigate(`/pms/${tenant.pmUuid}`)
                          }
                        }}>
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: tenant.pmUuid ? 'var(--accent)' : 'var(--text)',
                              textDecoration: tenant.pmUuid ? 'underline' : 'none'
                            }}
                          >
                            {tenant.pmName}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', fontWeight: 700 }}>
                          {tenant.totalPaid > 0 ? `₦${tenant.totalPaid.toLocaleString()}` : '—'}
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '12px', color: 'var(--text-muted)' }}>
                          {new Date(tenant.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {paginatedItems.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>No invited tenant records found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* 4. PMs & PLATFORMS TABLE */}
              {activeTab === 'pms' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Business Details</th>
                      <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Properties / Units</th>
                      <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                      <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Revenue Generated</th>
                      <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItems.map((pm: any) => (
                      <tr
                        key={pm.id}
                        onClick={() => navigate(`/pms/${pm.uuid}`)}
                        style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                        className="table-row-hover"
                      >
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ fontWeight: 700, display: 'block', fontSize: '14px' }}>{pm.businessName}</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Manager: {pm.firstName} {pm.lastName}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>{pm.email} • {pm.phone}</span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ fontSize: '13px' }}>Properties: <strong>{pm.propertiesCount}</strong></div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Units: {pm.unitsCount}</div>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: pm.isVerified ? 'var(--success-faint)' : 'var(--error-faint)',
                              color: pm.isVerified ? 'var(--success)' : 'var(--error)'
                            }}
                          >
                            {pm.isVerified ? 'Verified' : 'Unverified'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--success)' }}>
                          ₦{pm.totalGenerated.toLocaleString()}
                        </td>
                        <td style={{ padding: '16px 20px' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setSelectedPmOverride(pm)
                              const match = overrides.find((o) => o.targetType === 'PM' && o.targetId === pm.uuid)
                              setPmOverrideFeeInput(match ? String(match.fee) : '2000')
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Settings size={12} /> Fee Override
                          </button>
                        </td>
                      </tr>
                    ))}
                    {paginatedItems.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>No Property Managers registered.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* 5. REVENUE LEDGER SUMMARY VIEW */}
              {activeTab === 'revenue' && metrics && (
                <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'var(--surface-hover)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <span style={{ fontWeight: 600 }}>Rent Processing Fees Collected (Transaction):</span>
                      <strong style={{ color: 'var(--success)' }}>₦{metrics.revenue.totalUpwardFees.toLocaleString()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'var(--surface-hover)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <span style={{ fontWeight: 600 }}>Upward Benefits Protection Fees:</span>
                      <strong style={{ color: 'var(--accent)' }}>₦{metrics.revenue.totalBenefitsFees.toLocaleString()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'var(--surface-hover)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <span style={{ fontWeight: 600 }}>Total Tenant Rent Volume Handled:</span>
                      <strong style={{ color: 'var(--text)' }}>₦{metrics.revenue.totalRentProcessed.toLocaleString()}</strong>
                    </div>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                    These numbers represent system processing performance metrics filtered by date preset. Default preset is all transactions.
                  </p>
                </div>
              )}

            </div>
          </div>

          {/* Clean Pagination Controls */}
          {activeTab !== 'revenue' && totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, currentDirectoryList.length)} of {currentDirectoryList.length} entries
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="btn btn-secondary"
                  style={{ height: '36px', padding: '0 12px' }}
                >
                  Previous
                </button>
                <span style={{ display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', padding: '0 8px' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="btn btn-secondary"
                  style={{ height: '36px', padding: '0 12px' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ==================== PM OVERRIDE QUICK MODAL ==================== */}
      {selectedPmOverride && (
        <div className="modal-overlay" onClick={() => setSelectedPmOverride(null)}>
          <div className="modal-content card fade-in" style={{ maxWidth: '440px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Configure PM Processing Fee</h3>
              <button onClick={() => setSelectedPmOverride(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>
            
            <div style={{ background: 'var(--surface)', padding: '12px 14px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px' }}>
              <div><strong>PM Account:</strong> {selectedPmOverride.businessName}</div>
              <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>{selectedPmOverride.email}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Custom Fee (₦)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)' }}>₦</span>
                <input
                  type="number"
                  min="0"
                  value={pmOverrideFeeInput}
                  onChange={(e) => setPmOverrideFeeInput(e.target.value)}
                  className="input"
                  style={{ paddingLeft: '32px', fontSize: '16px', fontWeight: 700 }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button onClick={handleSavePmQuickOverride} className="btn btn-primary" style={{ flex: 1, height: '40px' }} disabled={savingOverride}>
                  Save Override
                </button>
                {overrides.some((o) => o.targetType === 'PM' && o.targetId === selectedPmOverride.uuid) && (
                  <button onClick={handleDeletePmQuickOverride} className="btn btn-secondary" style={{ color: 'var(--danger)', height: '40px' }} disabled={savingOverride}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== GLOBAL CONFIG OVERRIDES MODAL ==================== */}
      {overridesModalOpen && (
        <div className="modal-overlay" onClick={() => setOverridesModalOpen(false)}>
          <div
            className="modal-content card fade-in"
            style={{ maxWidth: '600px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>System Fee Overrides</h3>
              <button onClick={() => setOverridesModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {/* Global base configuration */}
            <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '12px' }}>
              <span className="section-label">Global Fallback Processing Fee</span>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)' }}>₦</span>
                  <input
                    type="number"
                    min="0"
                    value={baseFeeInput}
                    onChange={(e) => setBaseFeeInput(e.target.value)}
                    className="input"
                    style={{ paddingLeft: '32px', fontSize: '15px', fontWeight: 700 }}
                  />
                </div>
                <button onClick={handleSaveBaseFee} className="btn btn-primary" style={{ height: '40px' }} disabled={savingBaseFee}>
                  Save Base Fee
                </button>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />

            {/* Config custom override */}
            <form onSubmit={handleSaveCustomOverride} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span className="section-label">Add Custom Fee Override (Company or Platform)</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                <select
                  value={customOverrideType}
                  onChange={(e) => setCustomOverrideType(e.target.value)}
                  className="input"
                >
                  <option value="PM">Property Manager</option>
                  <option value="COMPANY">Company / PM Corp</option>
                  <option value="PLATFORM">External Platform</option>
                </select>
                <input
                  type="text"
                  placeholder="Enter target Entity UUID..."
                  value={customOverrideId}
                  onChange={(e) => setCustomOverrideId(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)' }}>₦</span>
                  <input
                    type="number"
                    value={customOverrideFee}
                    onChange={(e) => setCustomOverrideFee(e.target.value)}
                    className="input"
                    style={{ paddingLeft: '32px' }}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-secondary" style={{ height: '40px' }} disabled={savingOverride}>
                  Add Override
                </button>
              </div>
            </form>

            {/* List custom overrides */}
            {loadingOverrides ? (
              <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>Loading overrides...</div>
            ) : overrides.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className="section-label">Active Custom Overrides</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {overrides.map((ov) => (
                    <div
                      key={ov.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: 'var(--surface-hover)',
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
                            background: ov.targetType === 'PM' ? 'rgba(99,102,241,0.08)' : 'var(--warning-faint)',
                            color: ov.targetType === 'PM' ? '#6366f1' : 'var(--warning)',
                            marginRight: '6px'
                          }}
                        >
                          {ov.targetType}
                        </span>
                        <span style={{ fontFamily: 'monospace' }}>{ov.targetId.slice(0, 8)}...</span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>({ov.targetName || 'unknown'})</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 700 }}>₦{ov.fee.toLocaleString()}</span>
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
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '16px' }}>No active overrides configured.</div>
            )}
          </div>
        </div>
      )}

      {/* ==================== DELETE CONFIRMATION MODAL ==================== */}
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
                Delete {deleteModal.ids.length > 1 ? `${deleteModal.ids.length} waitlist items` : 'waitlist user'}?
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '32px', lineHeight: 1.6 }}>
                This will permanently delete the selected waitlist entries. This action is irreversible.
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
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Styles details overrides */}
      <style>{`
        .table-row-hover:hover {
          background-color: var(--surface-hover) !important;
        }
        .date-chips {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .date-chip {
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid var(--border);
          background: var(--white);
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .date-chip:hover {
          border-color: var(--accent);
          color: var(--accent);
          background: var(--accent-faint);
        }
        .date-chip.active {
          background: var(--accent);
          color: #fff;
          border-color: var(--accent);
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }
        .modal-content {
          background: var(--white);
          border-radius: 16px;
          width: 100%;
          padding: 24px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .loader {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(0,0,0,0.1);
          border-top: 3px solid var(--accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// Helper types for custom checkboxes
const Square: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ width: size, height: size, border: '2px solid var(--border)', borderRadius: '4px' }} />
)
const CheckSquare: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <div style={{ width: size, height: size, border: `2px solid ${color}`, backgroundColor: color, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
)

export default Dashboard
