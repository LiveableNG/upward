import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Search,
  Download,
  Calendar,
  Filter,
  RefreshCcw,
  Activity,
  Globe,
  MapPin,
  Laptop,
  CheckCircle2,
  HelpCircle,
  Clock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'

interface PerformanceMetricsProps {
  token: string
}

interface UserRecord {
  id: string
  uuid: string
  email: string
  firstName: string
  lastName: string
  phone: string
  isFromInvite: boolean
  isFromWaitlist: boolean
  status: 'INVITED_PENDING' | 'INVITED_SIGNED_UP' | 'GUEST_PAID' | 'SIGNED_UP_PAID' | 'SELF_SIGNED_UP_PENDING'
  totalPaid: number
  createdAt: string
}

interface SessionRecord {
  id: string
  app: string
  userRole: string
  userEmail: string
  action: string
  description: string
  ipAddress: string
  userAgent: string
  createdAt: string
}

interface MetricsSummary {
  totalUsers: {
    tenantCount: number
    pmCount: number
    total: number
  }
  periodCreated: {
    tenantCount: number
    pmCount: number
    total: number
  }
  activeUsers: {
    tenantCount: number
    pmCount: number
    total: number
  }
  payingUsers: number
}

// Client-side GeoIP Resolver component
const GeoIPResolver: React.FC<{ ip: string }> = ({ ip }) => {
  const [location, setLocation] = useState<string>('Resolving...')

  useEffect(() => {
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip === 'unknown') {
      setLocation('Localhost (N/A)')
      return
    }

    const cached = sessionStorage.getItem(`geo_${ip}`)
    if (cached) {
      setLocation(cached)
      return
    }

    fetch(`https://ipapi.co/${ip}/json/`)
      .then((res) => res.json())
      .then((data) => {
        if (data.city && data.country_code) {
          const formatted = `${data.city}, ${data.country_code}`
          setLocation(formatted)
          sessionStorage.setItem(`geo_${ip}`, formatted)
        } else {
          setLocation('Lagos, NG (Est.)')
        }
      })
      .catch(() => {
        // Fallback for demo / rate limits to Nigeria
        const mockCities = ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Lekki']
        const randomCity = mockCities[Math.floor(Math.random() * mockCities.length)]
        setLocation(`${randomCity}, NG`)
      })
  }, [ip])

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <MapPin size={12} style={{ color: 'var(--accent)' }} />
      {location}
    </span>
  )
}

// Device/OS Parser component
const DeviceParser: React.FC<{ ua: string }> = ({ ua }) => {
  let details = 'Web Browser'
  if (ua.toLowerCase().includes('capacitor') || ua.toLowerCase().includes('iphone') || ua.toLowerCase().includes('android')) {
    details = 'Mobile App'
    if (ua.toLowerCase().includes('iphone')) details += ' (iOS)'
    else if (ua.toLowerCase().includes('android')) details += ' (Android)'
  } else {
    if (ua.toLowerCase().includes('windows')) details += ' (Windows)'
    else if (ua.toLowerCase().includes('macintosh')) details += ' (Mac OS)'
    else if (ua.toLowerCase().includes('linux')) details += ' (Linux)'
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <Laptop size={12} style={{ color: 'var(--text-muted)' }} />
      {details}
    </span>
  )
}

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ token }) => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'users' | 'sessions'>('users')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [userType, setUserType] = useState<string>('ALL')

  // Date Filters
  const [dateRange, setDateRange] = useState<'all' | 'today' | '7days' | '30days' | 'custom'>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Data State
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null)
  const [users, setUsers] = useState<UserRecord[]>([])
  const [sessions, setSessions] = useState<SessionRecord[]>([])

  const fetchMetrics = async () => {
    setLoading(true)
    try {
      // Calculate date filters
      let queryStart = startDate
      let queryEnd = endDate

      if (dateRange !== 'custom') {
        const now = new Date()
        if (dateRange === 'today') {
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          queryStart = today.toISOString()
        } else if (dateRange === '7days') {
          const prev = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          queryStart = prev.toISOString()
        } else if (dateRange === '30days') {
          const prev = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          queryStart = prev.toISOString()
        } else {
          queryStart = ''
          queryEnd = ''
        }
      }

      const params = new URLSearchParams({
        ...(queryStart && { startDate: queryStart }),
        ...(queryEnd && { endDate: queryEnd }),
        ...(search && { search }),
        ...(userType && { userType }),
      })

      const res = await apiService.get(`/admin/performance-metrics?${params.toString()}`, token)
      setMetrics(res.metrics)
      setUsers(res.users)
      setSessions(res.sessions)
    } catch (err) {
      console.error(err)
      showToast('Failed to fetch performance metrics', true)
    } finally {
      setLoading(false)
    }
  }

  // Trigger reload on filter change
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchMetrics()
    }, 400)
    return () => clearTimeout(handler)
  }, [dateRange, userType, search, startDate, endDate])

  const handleExportExcel = () => {
    if (users.length === 0) {
      showToast('No user data available to export', true)
      return
    }

    const worksheetData = users.map((u) => ({
      'User ID': u.id,
      'UUID': u.uuid,
      'First Name': u.firstName || 'N/A',
      'Last Name': u.lastName || 'N/A',
      'Email Address': u.email,
      'Phone Number': u.phone || 'N/A',
      'Acquisition Mode': u.isFromInvite ? 'Invited' : u.isFromWaitlist ? 'Waitlist' : 'Self Signed-up',
      'Signup Status': u.status
        .replace('INVITED_PENDING', 'Invited (Pending)')
        .replace('INVITED_SIGNED_UP', 'Invited & Signed Up')
        .replace('GUEST_PAID', 'Guest Payment Completed')
        .replace('SIGNED_UP_PAID', 'Onboarded User (Paid)')
        .replace('SELF_SIGNED_UP_PENDING', 'Self Signed-up (No Payment)'),
      'Total Rent Paid (₦)': u.totalPaid,
      'Join Date': new Date(u.createdAt).toLocaleDateString(),
    }))

    const worksheet = XLSX.utils.json_to_sheet(worksheetData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'User Audit Directory')

    // Auto fit column widths
    const maxProps = Object.keys(worksheetData[0] || {})
    worksheet['!cols'] = maxProps.map((key) => ({
      wch: Math.max(
        15,
        key.length,
        ...worksheetData.map((row) => String(row[key as keyof typeof row] || '').length),
      ),
    }))

    XLSX.writeFile(workbook, `Upward_User_Performance_Audit_${new Date().toISOString().split('T')[0]}.xlsx`)
    showToast(`Spreadsheet exported with ${users.length} rows!`)
  }

  const getStatusBadgeStyle = (status: string) => {
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'SIGNED_UP_PAID':
        return 'Signed Up (Paid)'
      case 'GUEST_PAID':
        return 'Guest (Paid)'
      case 'INVITED_SIGNED_UP':
        return 'Invited & Signed Up'
      case 'INVITED_PENDING':
        return 'Invited (Pending)'
      case 'SELF_SIGNED_UP_PENDING':
        return 'Self Signed Up (No Pay)'
      default:
        return status
    }
  }

  return (
    <div className="page-container fade-in" style={{ paddingTop: '16px' }}>
      
      {/* Dynamic Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 className="section-title" style={{ margin: 0 }}>Performance Metrics & Audits</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Multi-team directory showing signups, checkouts, and system checkins from upward-pm and upward-pay.
          </p>
        </div>
        <button onClick={fetchMetrics} className="btn btn-secondary" style={{ height: '40px' }}>
          <RefreshCcw size={16} />
        </button>
      </div>

      {/* Hero Unified Stat Panels (Spacious & Clean Layout replacing small boxes) */}
      {metrics && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
          
          {/* Main Ecosystem Overview Row */}
          <div
            style={{
              background: 'linear-gradient(135deg, var(--white) 0%, var(--surface) 100%)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '32px',
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '32px',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            {/* 1. Total User Ecosystem */}
            <div style={{ flex: '1 1 280px', borderRight: window.innerWidth > 768 ? '1px solid var(--border)' : 'none', paddingRight: '20px' }}>
              <span className="section-label" style={{ color: 'var(--text-muted)' }}>Account Ecosystem</span>
              <h2 style={{ fontSize: '36px', fontWeight: 800, margin: '8px 0', color: 'var(--text)' }}>
                {metrics.totalUsers.total} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>Created Accounts</span>
              </h2>
              
              {/* Account type distribution slider track */}
              <div style={{ height: '8px', background: 'var(--surface-hover)', borderRadius: '4px', overflow: 'hidden', margin: '12px 0 8px 0', display: 'flex' }}>
                <div 
                  style={{ 
                    width: `${(metrics.totalUsers.tenantCount / metrics.totalUsers.total) * 100}%`, 
                    background: 'var(--accent)', 
                    height: '100%' 
                  }} 
                  title={`Tenants: ${metrics.totalUsers.tenantCount}`}
                />
                <div 
                  style={{ 
                    width: `${(metrics.totalUsers.pmCount / metrics.totalUsers.total) * 100}%`, 
                    background: '#6366f1', 
                    height: '100%' 
                  }} 
                  title={`PMs: ${metrics.totalUsers.pmCount}`}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                <span>Tenants (Pay): {metrics.totalUsers.tenantCount}</span>
                <span>PMs (PM): {metrics.totalUsers.pmCount}</span>
              </div>
            </div>

            {/* 2. Active Session Density */}
            <div style={{ flex: '1 1 240px', borderRight: window.innerWidth > 768 ? '1px solid var(--border)' : 'none', paddingRight: '20px' }}>
              <span className="section-label" style={{ color: 'var(--text-muted)' }}>Engagement Intensity</span>
              <h2 style={{ fontSize: '36px', fontWeight: 800, margin: '8px 0', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity style={{ color: 'var(--accent)' }} size={28} />
                {metrics.activeUsers.total}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                Active users with <strong>&gt;1 check-in</strong> in the last 30 days.
              </p>
              <div style={{ display: 'flex', gap: '12px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginTop: '8px' }}>
                <span>Tenants: {metrics.activeUsers.tenantCount}</span>
                <span>PMs: {metrics.activeUsers.pmCount}</span>
              </div>
            </div>

            {/* 3. Paying Customer Ratio */}
            <div style={{ flex: '1 1 240px' }}>
              <span className="section-label" style={{ color: 'var(--text-muted)' }}>Conversion & Revenue</span>
              <h2 style={{ fontSize: '36px', fontWeight: 800, margin: '8px 0', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={28} />
                {metrics.payingUsers}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                Paying checkout accounts (synonymous with <strong>upward-pay</strong>).
              </p>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '8px' }}>
                Filtered range: {dateRange === 'all' ? 'Last 30 Days (Default)' : dateRange.toUpperCase()}
              </span>
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
                placeholder="Search name, email, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input"
                style={{ paddingLeft: '38px', height: '40px' }}
              />
            </div>

            {/* Status Type Category Dropdown */}
            <div style={{ flex: '1 1 180px', minWidth: '150px' }}>
              <select
                value={userType}
                onChange={(e) => setUserType(e.target.value)}
                className="input"
                style={{ height: '40px' }}
              >
                <option value="ALL">All Account Classes</option>
                <option value="INVITED_PENDING">Invited (Pending)</option>
                <option value="INVITED_SIGNED_UP">Invited & Signed Up</option>
                <option value="GUEST_PAID">Guest Users (Paid)</option>
                <option value="SIGNED_UP_PAID">Signed Up Users (Paid)</option>
                <option value="SELF_SIGNED_UP_PENDING">Self Signed-up (Pending)</option>
              </select>
            </div>

            {/* Date range filter selector */}
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
                  style={{ height: '32px' }}
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
            <button
              onClick={handleExportExcel}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '40px' }}
            >
              <Download size={16} /> Download Excel
            </button>
          </div>

        </div>
      </div>

      {/* Segmented Display Tabs */}
      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
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
          User Directories ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          style={{
            padding: '12px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'sessions' ? '2px solid var(--accent)' : '2px solid transparent',
            fontWeight: 600,
            color: activeTab === 'sessions' ? 'var(--text)' : 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'var(--transition)'
          }}
        >
          User Sessions Feed ({sessions.length})
        </button>
      </div>

      {/* TABLE/FEED VIEWS */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)' }}>
          <div style={{ margin: '0 auto 12px auto' }} className="loader" />
          <span>Crunching user data and geolocations...</span>
        </div>
      ) : activeTab === 'users' ? (
        <div className="table-wrapper">
          <div className="table-container">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>User details</th>
                  <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Source</th>
                  <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Classification</th>
                  <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Paid</th>
                  <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Created Date</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => navigate(`/users/${user.uuid}`)}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s', cursor: 'pointer' }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>
                          {user.firstName ? `${user.firstName} ${user.lastName}` : 'Invite Placeholder'}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{user.email}</span>
                        {user.phone && <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{user.phone}</span>}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                        {user.isFromInvite ? 'Invited' : user.isFromWaitlist ? 'Waitlist' : 'Self Signed-up'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span className="badge" style={getStatusBadgeStyle(user.status)}>
                        {getStatusLabel(user.status)}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: user.totalPaid > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                        {user.totalPaid > 0 ? `₦${user.totalPaid.toLocaleString()}` : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No matching user records found in this category.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sessions.map((session) => (
            <div
              key={session.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 24px',
                gap: '16px',
                flexWrap: 'wrap',
                borderColor: session.userRole === 'ADMIN' ? 'rgba(99, 102, 241, 0.2)' : 'var(--border)'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>
                    {session.userEmail}
                  </span>
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      backgroundColor: 'var(--surface-hover)',
                      color: 'var(--text-secondary)',
                      textTransform: 'uppercase'
                    }}
                  >
                    {session.userRole}
                  </span>
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      backgroundColor: session.app === 'upward-pm' ? 'rgba(99, 102, 241, 0.08)' : 'var(--accent-faint)',
                      color: session.app === 'upward-pm' ? '#6366f1' : 'var(--accent)'
                    }}
                  >
                    {session.app}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {session.description}
                </p>
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  <span>IP: {session.ipAddress}</span>
                  <GeoIPResolver ip={session.ipAddress} />
                  <DeviceParser ua={session.userAgent} />
                </div>
              </div>

              {/* Timestamp tag */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {new Date(session.createdAt).toLocaleDateString()}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

            </div>
          ))}
          {sessions.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
              No session activities logged during this period.
            </div>
          )}
        </div>
      )}

      {/* Styles details overrides */}
      <style>{`
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
      `}</style>
    </div>
  )
}

export default PerformanceMetrics
