import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { RefreshCcw, SlidersHorizontal, Clock } from 'lucide-react'
import * as XLSX from 'xlsx'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'

// Feature Components
import MetricsCards from '../features/dashboard/components/MetricsCards'
import FilterToolbar, { type DateFilter } from '../features/dashboard/components/FilterToolbar'
import { WaitlistTable } from '../features/dashboard/components/WaitlistTable'
import { SignedUpTable } from '../features/dashboard/components/SignedUpTable'
import { InvitedTable } from '../features/dashboard/components/InvitedTable'
import { PmsTable } from '../features/dashboard/components/PmsTable'
import RevenueAudit from '../features/dashboard/components/RevenueAudit'
import OverviewTab from '../features/dashboard/components/OverviewTab'
import PreviewDrawer, { type DrawerEntity } from '../features/dashboard/components/PreviewDrawer'
import { DeleteConfirmationModal } from '../features/dashboard/components/DeleteConfirmationModal'
import { LoginSessionsTab } from '../features/dashboard/components/LoginSessionsTab'
import SkeletonStyles, { MetricCardSkeleton, TableSkeleton } from '../features/dashboard/components/Skeletons'

// Feature Types
import type {
  WaitlistRecord,
  SignedUpRecord,
  InvitedRecord,
  PmRecord,
  MetricsSummary,
} from '../features/dashboard/types'
import { flattenMetrics } from '../features/dashboard/types'

type ActiveTab = 'overview' | 'waitlist' | 'signedUp' | 'invited' | 'pms' | 'revenue' | 'sessions'

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50]

function readLocalPref<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(key)
    if (val !== null) return JSON.parse(val) as T
  } catch { /* ignore */ }
  return fallback
}

function writeLocalPref(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }
}

interface DashboardProps {
  token: string
  adminRole?: string
}

const Dashboard: React.FC<DashboardProps> = ({ token, adminRole }) => {
  const navigate = useNavigate()
  const isSuperadmin = adminRole === 'SUPERADMIN'

  // ── Tab State (persisted) ──────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ActiveTab>(
    readLocalPref<ActiveTab>('dash_activeTab', 'overview'),
  )
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState<number>(
    readLocalPref<number>('dash_itemsPerPage', 10),
  )

  // ── Date Filters ───────────────────────────────────────────────
  const [dateRange, setDateRange] = useState<DateFilter>('all')

  // ── Metrics Data State ─────────────────────────────────────────
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null)
  const flatMetrics = useMemo(() => {
    return metrics ? flattenMetrics(metrics) : null
  }, [metrics])
  const [waitlistList, setWaitlistList] = useState<WaitlistRecord[]>([])
  const [signedUpList, setSignedUpList] = useState<SignedUpRecord[]>([])
  const [invitedList, setInvitedList] = useState<InvitedRecord[]>([])
  const [pmList, setPmList] = useState<PmRecord[]>([])

  // ── Selection / Bulk Delete State ──────────────────────────────
  const [selectedWaitlistIds, setSelectedWaitlistIds] = useState<Set<string>>(new Set())
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; ids: string[] }>({ show: false, ids: [] })
  const [deleting, setDeleting] = useState(false)

  // ── Preview Drawer State ───────────────────────────────────────
  const [drawerEntity, setDrawerEntity] = useState<DrawerEntity | null>(null)

  // ── Last Refreshed Timestamp ───────────────────────────────────
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [elapsed, setElapsed] = useState('')

  useEffect(() => {
    if (!lastRefreshed) return
    const update = () => {
      const secs = Math.floor((Date.now() - lastRefreshed.getTime()) / 1000)
      if (secs < 60) setElapsed(`${secs}s ago`)
      else if (secs < 3600) setElapsed(`${Math.floor(secs / 60)}m ago`)
      else setElapsed(`${Math.floor(secs / 3600)}h ago`)
    }
    update()
    const id = setInterval(update, 10000)
    return () => clearInterval(id)
  }, [lastRefreshed])

  // ── Fetch Dashboard Data ───────────────────────────────────────
  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      let queryStart = ''
      let queryEnd = ''

      const now = new Date()
      if (dateRange === 'today') {
        queryStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      } else if (dateRange === 'week') {
        queryStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      } else if (dateRange === 'month') {
        queryStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      } else {
        queryStart = ''
        queryEnd = ''
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
      setLastRefreshed(new Date())
    }
  }

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchDashboardData()
    }, 450)
    return () => clearTimeout(handler)
  }, [dateRange, search])

  // ── Persist preferences ────────────────────────────────────────
  useEffect(() => {
    writeLocalPref('dash_activeTab', activeTab)
  }, [activeTab])

  useEffect(() => {
    writeLocalPref('dash_itemsPerPage', itemsPerPage)
  }, [itemsPerPage])

  // Reset page when tab or items-per-page changes
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, itemsPerPage])

  // ── Tab navigation helper ──────────────────────────────────────
  const handleTabChange = (tab: string) => {
    if (tab === 'signed-up') setActiveTab('signedUp')
    else setActiveTab(tab as ActiveTab)
  }

  // ── Bulk Waitlist delete handlers ──────────────────────────────
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

  // ── Preview Drawer helpers ─────────────────────────────────────
  const openDrawerForUser = (item: WaitlistRecord | SignedUpRecord | InvitedRecord) => {
    setDrawerEntity({
      kind: 'user',
      uuid: item.uuid,
      name: `${item.firstName} ${item.lastName}`,
      email: item.email,
      phone: item.phone,
      status: 'user' in item ? 'TENANT' : 'PENDING_TENANT',
      type: 'hasPaid' in item && (item as SignedUpRecord).hasPaid ? 'TENANT' : 'PENDING_TENANT',
      joinedAt: item.createdAt,
      totalPaid: item.totalPaid,
    })
  }

  const openDrawerForPm = (pm: PmRecord) => {
    setDrawerEntity({
      kind: 'pm',
      uuid: pm.uuid,
      name: pm.businessName,
      email: pm.email,
      phone: pm.phone,
      status: pm.isVerified ? 'VERIFIED' : 'UNVERIFIED',
      type: pm.isVerified ? 'VERIFIED' : 'UNVERIFIED',
      joinedAt: pm.createdAt,
      totalPaid: pm.totalGenerated,
      propertyCount: pm.propertiesCount,
    })
  }

  // ── Directory list (active tab) ────────────────────────────────
  const currentDirectoryList = useMemo(() => {
    switch (activeTab) {
      case 'waitlist': return waitlistList
      case 'signedUp': return signedUpList
      case 'invited': return invitedList
      case 'pms': return pmList
      default: return []
    }
  }, [activeTab, waitlistList, signedUpList, invitedList, pmList])

  // ── Client-side pagination ─────────────────────────────────────
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return currentDirectoryList.slice(start, start + itemsPerPage)
  }, [currentDirectoryList, currentPage, itemsPerPage])

  const totalPages = Math.ceil(currentDirectoryList.length / itemsPerPage)

  // ── Excel export ───────────────────────────────────────────────
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

  // ── Tab definitions ─────────────────────────────────────────────
  const TABS: { key: ActiveTab; label: (counts: Record<string, number>) => string }[] = [
    { key: 'overview', label: () => 'Overview' },
    { key: 'waitlist', label: (c) => `Waitlist (${c.waitlist})` },
    { key: 'signedUp', label: (c) => `Self Registered (${c.signedUp})` },
    { key: 'invited', label: (c) => `Invited Tenants (${c.invited})` },
    { key: 'pms', label: (c) => `PMs & Platforms (${c.pms})` },
    { key: 'revenue', label: () => 'Revenue Audit' },
    { key: 'sessions', label: () => 'Login Sessions' },
  ]

  const tabCounts = {
    waitlist: waitlistList.length,
    signedUp: signedUpList.length,
    invited: invitedList.length,
    pms: pmList.length,
  }

  const showDirectoryControls = activeTab !== 'overview' && activeTab !== 'revenue' && activeTab !== 'sessions'

  return (
    <div className="page-container fade-in" style={{ paddingTop: '16px' }}>
      <SkeletonStyles />

      {/* ── Top Header & Actions ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 800 }}>Ecosystem Dashboard</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Multi-team performance metrics, tenant directories, and platform health insights.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link
            to="/overrides"
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '40px', textDecoration: 'none' }}
          >
            <SlidersHorizontal size={16} /> Overrides Config
          </Link>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
            <button onClick={fetchDashboardData} className="btn btn-secondary" style={{ height: '40px', width: '40px', justifyContent: 'center' }}>
              <RefreshCcw size={16} />
            </button>
            {elapsed && (
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
                <Clock size={9} /> Updated {elapsed}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Metrics Summary Cards ── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {Array.from({ length: 6 }).map((_, i) => <MetricCardSkeleton key={i} />)}
        </div>
      ) : (
        <MetricsCards metrics={flatMetrics} onTabChange={handleTabChange} />
      )}

      {/* ── Filter Toolbar (only for directory tabs) ── */}
      {showDirectoryControls && (
        <FilterToolbar
          search={search}
          onSearchChange={setSearch}
          dateFilter={dateRange}
          onDateFilterChange={setDateRange}
          onExport={handleExportExcel}
          onRefresh={fetchDashboardData}
          resultCount={currentDirectoryList.length}
          tabLabel={activeTab}
        />
      )}

      {/* ── Segmented Display Tabs ── */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border)', marginBottom: '20px', marginTop: '8px', overflowX: 'auto' }}>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              padding: '12px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === key ? '2px solid var(--accent)' : '2px solid transparent',
              fontWeight: 600,
              fontSize: '13px',
              color: activeTab === key ? 'var(--text)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'var(--transition)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {label(tabCounts)}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' && (
        loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
              {Array.from({ length: 8 }).map((_, i) => <MetricCardSkeleton key={i} />)}
            </div>
          </div>
        ) : (
          <OverviewTab metrics={flatMetrics} />
        )
      )}

      {/* ── Revenue Tab ── */}
      {activeTab === 'revenue' && (
        <RevenueAudit metrics={flatMetrics} />
      )}

      {/* ── Sessions Tab ── */}
      {activeTab === 'sessions' && (
        <LoginSessionsTab token={token} />
      )}

      {/* ── Directory Table Views ── */}
      {showDirectoryControls && (
        <>
          {loading ? (
            <div className="table-wrapper">
              <div className="table-container">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <TableSkeleton rows={itemsPerPage} cols={5} />
                </table>
              </div>
            </div>
          ) : (
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
                    onPreview={(item) => openDrawerForUser(item)}
                    onDeleteSelected={triggerBulkDelete}
                  />
                )}

                {activeTab === 'signedUp' && (
                  <SignedUpTable
                    paginatedItems={paginatedItems as SignedUpRecord[]}
                    navigate={navigate}
                    onPreview={(item) => openDrawerForUser(item)}
                  />
                )}

                {activeTab === 'invited' && (
                  <InvitedTable
                    paginatedItems={paginatedItems as InvitedRecord[]}
                    navigate={navigate}
                    onPreview={(item) => openDrawerForUser(item)}
                  />
                )}

                {activeTab === 'pms' && (
                  <PmsTable
                    paginatedItems={paginatedItems as PmRecord[]}
                    navigate={navigate}
                    onPreview={(pm) => openDrawerForPm(pm)}
                  />
                )}
              </div>
            </div>
          )}

          {/* ── Pagination Controls ── */}
          {!loading && totalPages >= 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {currentDirectoryList.length > 0
                    ? `Showing ${((currentPage - 1) * itemsPerPage) + 1}–${Math.min(currentPage * itemsPerPage, currentDirectoryList.length)} of ${currentDirectoryList.length}`
                    : 'No entries'}
                </span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="input"
                  style={{ height: '34px', width: 'auto', padding: '0 10px', fontSize: '12px', fontWeight: 600 }}
                >
                  {ITEMS_PER_PAGE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n} / page</option>
                  ))}
                </select>
              </div>

              {totalPages > 1 && (
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
              )}
            </div>
          )}
        </>
      )}

      {/* ── Preview Drawer ── */}
      <PreviewDrawer
        entity={drawerEntity}
        onClose={() => setDrawerEntity(null)}
      />

      {/* ── Delete Confirmation Modal ── */}
      <DeleteConfirmationModal
        isOpen={deleteModal.show}
        onClose={() => setDeleteModal({ show: false, ids: [] })}
        ids={deleteModal.ids}
        onConfirm={handleBatchDelete}
        deleting={deleting}
      />

      {/* ── Shared Styles ── */}
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
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

export default Dashboard
