import React, { useState, useEffect } from 'react'
import {
  MessageSquare,
  Search,
  Clock,
  Filter,
  RefreshCcw,
  ChevronDown,
  AlertTriangle,
  Lightbulb,
  HelpCircle,
  Eye,
} from 'lucide-react'
import { apiService } from '../services/api.service'

import { DataTable } from '../components/common/table/DataTable'
import type { ColumnDef } from '../components/common/table/DataTable'
import {
  FeedbackDetailsModal,
  type FeedbackLog,
} from '../features/feedback/components/FeedbackDetailsModal'

interface FeedbackStats {
  totalFeedback: number
  feedbackByType: {
    type: string
    _count: number
  }[]
  recentCount: number
}

interface FeedbackProps {
  token: string
}

const Feedback: React.FC<FeedbackProps> = ({ token }) => {
  const [logs, setLogs] = useState<FeedbackLog[]>([])
  const [stats, setStats] = useState<FeedbackStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')

  // Modal details
  const [selectedLog, setSelectedLog] = useState<FeedbackLog | null>(null)

  const fetchStats = async () => {
    setLoadingStats(true)
    try {
      const response = await apiService.get('/admin/feedback/stats', token)
      if (response) {
        setStats(response)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  const fetchLogs = async (pageNum = page) => {
    setLoading(true)
    try {
      let url = `/admin/feedback?page=${pageNum}&limit=50`
      if (typeFilter !== 'ALL') url += `&type=${typeFilter}`
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`

      const response = await apiService.get(url, token)
      if (response && response.data) {
        setLogs(response.data)
        setTotalPages(response.meta.totalPages)
      }
    } catch (error) {
      console.error('Failed to fetch feedback logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    fetchLogs(page)
  }, [page, typeFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchLogs(1)
  }

  const handleRefresh = () => {
    fetchStats()
    fetchLogs(page)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'BUG':
        return <AlertTriangle size={18} color="var(--danger)" />
      case 'SUGGESTION':
        return <Lightbulb size={18} color="var(--warning)" />
      case 'DIFFICULTY':
        return <HelpCircle size={18} color="var(--accent)" />
      default:
        return <MessageSquare size={18} color="var(--text-muted)" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'BUG':
        return 'var(--danger)'
      case 'SUGGESTION':
        return 'var(--warning)'
      case 'DIFFICULTY':
        return 'var(--accent)'
      default:
        return 'var(--text-muted)'
    }
  }

  const getCountByType = (type: string) => {
    if (!stats) return 0
    const item = stats.feedbackByType.find((f) => f.type === type)
    return item ? item._count : 0
  }

  const columns: ColumnDef<FeedbackLog>[] = [
    {
      key: 'createdAt',
      label: 'Submitted At',
      render: (log) => (
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600 }}>
            {new Date(log.createdAt).toLocaleDateString()}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {new Date(log.createdAt).toLocaleTimeString()}
          </div>
        </div>
      ),
    },
    {
      key: 'name',
      label: 'User details',
      render: (log) => (
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>{log.name || 'Anonymous'}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {log.email || 'No email'} {log.userId ? `(UID: ${log.userId})` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (log) => (
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '20px',
            background: `${getTypeColor(log.type)}15`,
            color: getTypeColor(log.type),
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {getTypeIcon(log.type)}
          {log.type}
        </span>
      ),
    },
    {
      key: 'message',
      label: 'Message',
      render: (log) => (
        <div
          style={{
            fontSize: '13px',
            maxWidth: '400px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {log.message}
        </div>
      ),
    },
    {
      key: 'details',
      label: 'Details',
      render: (log) => (
        <button
          onClick={() => setSelectedLog(log)}
          style={{
            background: 'var(--accent-faint)',
            color: 'var(--accent)',
            border: 'none',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Eye size={14} />
          View
        </button>
      ),
    },
  ]

  return (
    <div className="page-container">
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
            <MessageSquare size={24} />
          </div>
          <div>
            <h1 className="section-title" style={{ margin: 0 }}>
              User Feedback & Reports
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
              Review bug reports, app suggestions, and difficulty reviews from tenants and property
              managers.
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          className="btn btn-secondary"
          disabled={loading || loadingStats}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <RefreshCcw size={16} className={loading || loadingStats ? 'spin' : ''} />
          Refresh Data
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div
        className="stats-grid grid-mobile-1"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '20px',
          marginBottom: '24px',
        }}
      >
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="section-label">Total Feedback Received</span>
            <div
              style={{
                color: 'var(--accent)',
                background: 'var(--accent-faint)',
                padding: '6px',
                borderRadius: '8px',
              }}
            >
              <MessageSquare size={18} />
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: '32px', fontWeight: 800, margin: 0 }}>
              {loadingStats ? '...' : stats?.totalFeedback || 0}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0 0 0' }}>
              Total submissions across all apps
            </p>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="section-label">Bug Reports</span>
            <div
              style={{
                color: 'var(--danger)',
                background: 'rgba(239, 68, 68, 0.1)',
                padding: '6px',
                borderRadius: '8px',
              }}
            >
              <AlertTriangle size={18} />
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: '32px', fontWeight: 800, margin: 0, color: 'var(--danger)' }}>
              {loadingStats ? '...' : getCountByType('BUG')}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0 0 0' }}>
              Critical issues needing attention
            </p>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="section-label">Suggestions & Ideas</span>
            <div
              style={{
                color: 'var(--warning)',
                background: 'rgba(245, 158, 11, 0.1)',
                padding: '6px',
                borderRadius: '8px',
              }}
            >
              <Lightbulb size={18} />
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: '32px', fontWeight: 800, margin: 0, color: 'var(--warning)' }}>
              {loadingStats ? '...' : getCountByType('SUGGESTION')}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0 0 0' }}>
              Feature requests & optimizations
            </p>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="section-label">Recent Submissions (30d)</span>
            <div
              style={{
                color: 'var(--success)',
                background: 'var(--success-faint)',
                padding: '6px',
                borderRadius: '8px',
              }}
            >
              <Clock size={18} />
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: '32px', fontWeight: 800, margin: 0 }}>
              {loadingStats ? '...' : stats?.recentCount || 0}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0 0 0' }}>
              Feedback received in last 30 days
            </p>
          </div>
        </div>
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
              placeholder="Search by name, email, or message keyword (Press Enter)..."
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
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value)
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
                <option value="ALL">All Types</option>
                <option value="BUG">Bug Reports</option>
                <option value="SUGGESTION">Suggestions</option>
                <option value="DIFFICULTY">Difficulty</option>
                <option value="OTHER">Other</option>
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
        data={logs}
        columns={columns}
        isLoading={loading}
        emptyTitle="No feedback found."
        keyExtractor={(log) => log.id.toString()}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {/* Details Inspector Modal */}
      <FeedbackDetailsModal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        selectedLog={selectedLog}
        getTypeColor={getTypeColor}
      />
    </div>
  )
}

export default Feedback
