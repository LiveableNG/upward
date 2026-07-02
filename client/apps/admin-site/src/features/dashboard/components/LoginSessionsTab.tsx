import React, { useState, useEffect } from 'react'
import {
  ChevronUp,
  ChevronDown,
  ShieldCheck,
  Smartphone,
  Laptop,
  Globe,
  RefreshCcw,
  Search,
  Download,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { apiService } from '../../../services/api.service'
import { showToast } from '@upward/client-core'
import type { LoginSession } from '../types'

interface LoginSessionsTabProps {
  token: string
}

type SortKey = 'userName' | 'createdAt' | 'device' | 'browser' | 'ipAddress' | 'location'
type SortDir = 'asc' | 'desc'

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50]

function parseUserAgent(uaStr: string | null): { device: string; browser: string } {
  if (!uaStr) return { device: 'Unknown Device', browser: 'Unknown Browser' }
  const ua = uaStr.toLowerCase()

  // 1. Device Extraction
  let device = 'Desktop PC'
  if (ua.includes('capacitor')) device = 'Mobile App'
  else if (ua.includes('iphone') || ua.includes('ipad')) device = 'iOS Device'
  else if (ua.includes('android')) device = 'Android Mobile'
  else if (ua.includes('macintosh') || ua.includes('mac os')) device = 'Mac'
  else if (ua.includes('linux')) device = 'Linux PC'

  // 2. Browser Extraction
  let browser = 'Web Browser'
  if (ua.includes('chrome') && !ua.includes('chromium')) browser = 'Chrome'
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari'
  else if (ua.includes('firefox')) browser = 'Firefox'
  else if (ua.includes('edge') || ua.includes('edg')) browser = 'Edge'
  else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera'
  else if (ua.includes('capacitor')) browser = 'Native Shell'

  return { device, browser }
}

const SortIcon: React.FC<{ col: SortKey; active: SortKey; dir: SortDir }> = ({ col, active, dir }) =>
  active === col
    ? dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
    : <ChevronDown size={12} style={{ opacity: 0.25 }} />

export const LoginSessionsTab: React.FC<LoginSessionsTabProps> = ({ token }) => {
  const [sessions, setSessions] = useState<LoginSession[]>([])
  const [loading, setLoading] = useState(true)

  // Filters State
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState('all') // today | 7d | 30d | all
  const [role, setRole] = useState('all') // TENANT | PM | all
  const [device, setDevice] = useState('all') // mobile | desktop | all
  const [locationText, setLocationText] = useState('')

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams({
        page: '1', // fetch full filtered lists, we paginate clientside for sorting
        limit: '150',
        ...(search && { search }),
        ...(dateRange !== 'all' && { dateRange }),
        ...(role !== 'all' && { role }),
        ...(device !== 'all' && { device }),
        ...(locationText && { location: locationText }),
      })
      const res = await apiService.get(`/admin/login-sessions?${queryParams.toString()}`, token)
      setSessions(res.data || [])
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'Failed to fetch login sessions', true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(fetchSessions, 400)
    return () => clearTimeout(timer)
  }, [search, dateRange, role, device, locationText])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const handleExportExcel = () => {
    if (sorted.length === 0) {
      showToast('No session records to export', true)
      return
    }

    const worksheetData = sorted.map((s) => ({
      'User Name': s.userName,
      'Email Address': s.userEmail,
      'Role Classification': s.userRole,
      'Login Time': new Date(s.createdAt).toLocaleString('en-GB'),
      'Device Platform': s.parsedDevice,
      'Browser Engine': s.parsedBrowser,
      'IP Address': s.ipAddress || 'N/A',
      'Location (City)': s.city || 'Unknown',
      'Location (Country)': s.country || 'Unknown',
      'Session Status': s.isRevoked ? 'Revoked' : 'Active',
    }))

    const worksheet = XLSX.utils.json_to_sheet(worksheetData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Login_Sessions')

    const maxProps = Object.keys(worksheetData[0] || {})
    worksheet['!cols'] = maxProps.map((key) => ({
      wch: Math.max(
        15,
        key.length,
        ...worksheetData.map((row) => String(row[key as keyof typeof row] || '').length),
      ),
    }))

    XLSX.writeFile(workbook, `Upward_Login_Sessions_${new Date().toISOString().split('T')[0]}.xlsx`)
    showToast(`Spreadsheet exported with ${worksheetData.length} session entries!`)
  }

  // Frontend parsing & sorting
  const processed = sessions.map((s) => {
    const { device: devName, browser: brName } = parseUserAgent(s.userAgent)
    return {
      ...s,
      parsedDevice: devName,
      parsedBrowser: brName,
      locationStr: s.city && s.country && s.city !== 'Unknown' ? `${s.city}, ${s.country}` : s.country || 'Unknown Location',
    }
  })

  const sorted = [...processed].sort((a, b) => {
    let va: string | number = '', vb: string | number = ''
    if (sortKey === 'userName') { va = a.userName; vb = b.userName }
    else if (sortKey === 'createdAt') { va = a.createdAt; vb = b.createdAt }
    else if (sortKey === 'device') { va = a.parsedDevice; vb = b.parsedDevice }
    else if (sortKey === 'browser') { va = a.parsedBrowser; vb = b.parsedBrowser }
    else if (sortKey === 'ipAddress') { va = a.ipAddress || ''; vb = b.ipAddress || '' }
    else if (sortKey === 'location') { va = a.locationStr; vb = b.locationStr }

    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  // Pagination bounds
  const totalPages = Math.ceil(sorted.length / itemsPerPage)
  const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const thStyle: React.CSSProperties = {
    padding: '13px 16px',
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  }

  // Heuristic KPIs
  const activeSessionsCount = sorted.filter((s) => !s.isRevoked).length
  const uniqueUserIds = new Set(sorted.map((s) => s.userId))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ── Sessions KPI Sub-header ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.08)', color: '#6366f1' }}>
            <Globe size={18} />
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Active Sessions</span>
            <h4 style={{ margin: '2px 0 0', fontWeight: 800, fontSize: '18px' }}>{activeSessionsCount}</h4>
          </div>
        </div>
        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '10px', borderRadius: '10px', background: 'var(--success-faint)', color: 'var(--success)' }}>
            <ShieldCheck size={18} />
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Unique Active Users</span>
            <h4 style={{ margin: '2px 0 0', fontWeight: 800, fontSize: '18px' }}>{uniqueUserIds.size}</h4>
          </div>
        </div>
      </div>

      {/* ── Friendly Filter Toolbar ── */}
      <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search user name, email, IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
              style={{ paddingLeft: '34px', height: '36px' }}
            />
          </div>

          {/* Time range presets */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { value: 'all', label: 'All Time' },
              { value: 'today', label: 'Today' },
              { value: '7d', label: 'Last 7 Days' },
              { value: '30d', label: 'Last 30 Days' },
            ].map((preset) => (
              <button
                key={preset.value}
                onClick={() => setDateRange(preset.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid',
                  borderColor: dateRange === preset.value ? 'var(--accent)' : 'var(--border)',
                  background: dateRange === preset.value ? 'var(--accent)' : 'var(--white)',
                  color: dateRange === preset.value ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button onClick={fetchSessions} className="btn btn-secondary" style={{ height: '36px', width: '36px', padding: 0, justifyContent: 'center' }}>
            <RefreshCcw size={14} />
          </button>

          {/* Export Excel */}
          <button
            onClick={handleExportExcel}
            className="btn btn-secondary"
            style={{ height: '36px', padding: '0 14px', gap: '6px', fontSize: '13px', display: 'flex', alignItems: 'center' }}
          >
            <Download size={14} /> Export Excel
          </button>
        </div>

        {/* Extended drop-down filters */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Classification</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="input" style={{ height: '34px', minWidth: '130px', fontSize: '12px' }}>
              <option value="all">All Roles</option>
              <option value="TENANT">Platform Tenants</option>
              <option value="PM">PM Invited Tenants</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Device Class</label>
            <select value={device} onChange={(e) => setDevice(e.target.value)} className="input" style={{ height: '34px', minWidth: '130px', fontSize: '12px' }}>
              <option value="all">All Platforms</option>
              <option value="mobile">Mobile Devices</option>
              <option value="desktop">Desktop PC / Mac</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Location Filter</label>
            <input
              type="text"
              placeholder="e.g. Lagos, Nigeria"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              className="input"
              style={{ height: '34px', maxWidth: '180px', fontSize: '12px' }}
            />
          </div>
        </div>
      </div>

      {/* ── Sessions Table ── */}
      <div className="table-wrapper">
        <div className="table-container">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '2px solid var(--border)' }}>
                <th style={thStyle} onClick={() => handleSort('userName')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>User <SortIcon col="userName" active={sortKey} dir={sortDir} /></span>
                </th>
                <th style={thStyle} onClick={() => handleSort('createdAt')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Login Time <SortIcon col="createdAt" active={sortKey} dir={sortDir} /></span>
                </th>
                <th style={thStyle} onClick={() => handleSort('device')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Device <SortIcon col="device" active={sortKey} dir={sortDir} /></span>
                </th>
                <th style={thStyle} onClick={() => handleSort('browser')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Browser <SortIcon col="browser" active={sortKey} dir={sortDir} /></span>
                </th>
                <th style={thStyle} onClick={() => handleSort('ipAddress')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>IP Address <SortIcon col="ipAddress" active={sortKey} dir={sortDir} /></span>
                </th>
                <th style={thStyle} onClick={() => handleSort('location')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Location <SortIcon col="location" active={sortKey} dir={sortDir} /></span>
                </th>
                <th style={{ ...thStyle, cursor: 'default' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ margin: '0 auto 12px auto' }} className="loader" />
                    <span>Querying login registry...</span>
                  </td>
                </tr>
              ) : paginated.map((session) => (
                <tr key={session.id} style={{ borderBottom: '1px solid var(--border)' }} className="table-row-hover">
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', display: 'block' }}>{session.userName}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{session.userEmail}</span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '12px' }}>
                    {new Date(session.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} at{' '}
                    {new Date(session.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {session.parsedDevice.includes('Mobile') || session.parsedDevice.includes('iOS') ? <Smartphone size={13} style={{ color: 'var(--text-muted)' }} /> : <Laptop size={13} style={{ color: 'var(--text-muted)' }} />}
                      {session.parsedDevice}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {session.parsedBrowser}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '12px', fontFamily: 'monospace' }}>
                    {session.ipAddress || '—'}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {session.locationStr}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span className="badge" style={{
                      background: session.isRevoked ? 'var(--danger-faint)' : 'var(--success-faint)',
                      color: session.isRevoked ? 'var(--danger)' : 'var(--success)',
                    }}>
                      {session.isRevoked ? 'Revoked' : 'Active'}
                    </span>
                  </td>
                </tr>
              ))}

              {!loading && sorted.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '72px 24px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
                      <Globe size={44} style={{ opacity: 0.25 }} />
                      <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-secondary)' }}>No sessions found</span>
                      <span style={{ fontSize: '13px' }}>Try relaxing filters or changing date ranges.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Table Pagination ── */}
      {!loading && sorted.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Showing {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, sorted.length)} of {sorted.length} sessions
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1) }}
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
    </div>
  )
}
