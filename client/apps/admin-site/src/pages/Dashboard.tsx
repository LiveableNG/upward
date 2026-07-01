import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCcw, Settings } from 'lucide-react'
import * as XLSX from 'xlsx'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'

// Feature Components
import { MetricsCards } from '../features/dashboard/components/MetricsCards'
import { FilterToolbar } from '../features/dashboard/components/FilterToolbar'
import { WaitlistTable } from '../features/dashboard/components/WaitlistTable'
import { SignedUpTable } from '../features/dashboard/components/SignedUpTable'
import { InvitedTable } from '../features/dashboard/components/InvitedTable'
import { PmsTable } from '../features/dashboard/components/PmsTable'
import { RevenueAudit } from '../features/dashboard/components/RevenueAudit'
import { PmOverrideModal } from '../features/dashboard/components/PmOverrideModal'
import { GlobalOverridesModal } from '../features/dashboard/components/GlobalOverridesModal'
import { DeleteConfirmationModal } from '../features/dashboard/components/DeleteConfirmationModal'

// Feature Types
import type {
  WaitlistRecord,
  SignedUpRecord,
  InvitedRecord,
  PmRecord,
  FeeOverride,
  MetricsSummary,
} from '../features/dashboard/types'

interface DashboardProps {
  token: string
  adminRole?: string
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

  // Save Custom Overrides
  const handleSaveCustomOverride = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingOverride(true)
    try {
      await apiService.post('/admin/fees/overrides', {
        targetType: customOverrideType,
        targetId: customOverrideId,
        fee: parseFloat(customOverrideFee),
      }, token)
      showToast('Custom fee override saved successfully')
      setCustomOverrideId('')
      fetchOverrides()
    } catch (err: any) {
      showToast(err.message || 'Failed to save override', true)
    } finally {
      setSavingOverride(false)
    }
  }

  // Delete Specific Override
  const handleDeleteOverride = async (targetType: string, targetId: string) => {
    try {
      await apiService.delete(`/admin/fees/overrides/${targetType}/${targetId}`, token)
      showToast('Fee override deleted successfully')
      fetchOverrides()
    } catch (err: any) {
      showToast(err.message || 'Failed to delete override', true)
    }
  }

  // Quick overrides helpers
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

      {/* Metrics Summary Cards */}
      <MetricsCards
        metrics={metrics}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalPmsCount={pmList.length}
      />

      {/* Filter Toolbar */}
      <FilterToolbar
        activeTab={activeTab}
        search={search}
        setSearch={setSearch}
        dateRange={dateRange}
        setDateRange={setDateRange}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        selectedWaitlistIds={selectedWaitlistIds}
        triggerBulkDelete={triggerBulkDelete}
        handleExportExcel={handleExportExcel}
      />

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
              {activeTab === 'waitlist' && (
                <WaitlistTable
                  isSuperadmin={isSuperadmin}
                  paginatedItems={paginatedItems as WaitlistRecord[]}
                  selectedWaitlistIds={selectedWaitlistIds}
                  toggleSelectAllWaitlist={toggleSelectAllWaitlist}
                  toggleSelectWaitlist={toggleSelectWaitlist}
                  navigate={navigate}
                />
              )}

              {activeTab === 'signedUp' && (
                <SignedUpTable
                  paginatedItems={paginatedItems as SignedUpRecord[]}
                  navigate={navigate}
                />
              )}

              {activeTab === 'invited' && (
                <InvitedTable
                  paginatedItems={paginatedItems as InvitedRecord[]}
                  navigate={navigate}
                />
              )}

              {activeTab === 'pms' && (
                <PmsTable
                  paginatedItems={paginatedItems as PmRecord[]}
                  navigate={navigate}
                  overrides={overrides}
                  setSelectedPmOverride={setSelectedPmOverride}
                  setPmOverrideFeeInput={setPmOverrideFeeInput}
                />
              )}

              {activeTab === 'revenue' && (
                <RevenueAudit metrics={metrics} />
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

      {/* PM OVERRIDE QUICK MODAL */}
      <PmOverrideModal
        selectedPmOverride={selectedPmOverride}
        onClose={() => setSelectedPmOverride(null)}
        pmOverrideFeeInput={pmOverrideFeeInput}
        setPmOverrideFeeInput={setPmOverrideFeeInput}
        handleSavePmQuickOverride={handleSavePmQuickOverride}
        handleDeletePmQuickOverride={handleDeletePmQuickOverride}
        overrides={overrides}
        savingOverride={savingOverride}
      />

      {/* GLOBAL CONFIG OVERRIDES MODAL */}
      <GlobalOverridesModal
        isOpen={overridesModalOpen}
        onClose={() => setOverridesModalOpen(false)}
        baseFeeInput={baseFeeInput}
        setBaseFeeInput={setBaseFeeInput}
        handleSaveBaseFee={handleSaveBaseFee}
        savingBaseFee={savingBaseFee}
        customOverrideType={customOverrideType}
        setCustomOverrideType={setCustomOverrideType}
        customOverrideId={customOverrideId}
        setCustomOverrideId={setCustomOverrideId}
        customOverrideFee={customOverrideFee}
        setCustomOverrideFee={setCustomOverrideFee}
        handleSaveCustomOverride={handleSaveCustomOverride}
        savingOverride={savingOverride}
        loadingOverrides={loadingOverrides}
        overrides={overrides}
        handleDeleteOverride={handleDeleteOverride}
      />

      {/* DELETE CONFIRMATION MODAL */}
      <DeleteConfirmationModal
        isOpen={deleteModal.show}
        onClose={() => setDeleteModal({ show: false, ids: [] })}
        ids={deleteModal.ids}
        onConfirm={handleBatchDelete}
        deleting={deleting}
      />

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

export default Dashboard
