import React, { useState, useEffect, useMemo } from 'react'
import { Search, Trash2, CheckSquare, Square, Download, AlertTriangle } from 'lucide-react'
import { apiService } from '../services/api.service'

interface UserData {
  id: string
  email: string
  full_name: string
  role: string | null
  benefits: string[]
  drop_off_stage: string
  started_at: string
  last_activity: string
  selectedSession: string | null
}

interface DropOffAnalysisProps {
  token: string
}

const DropOffAnalysis: React.FC<DropOffAnalysisProps> = ({ token }) => {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState({
    stage: 'All',
    role: 'All',
  })
  const [showDeleteModal, setShowDeleteModal] = useState<{ show: boolean; ids: string[] }>({
    show: false,
    ids: [],
  })

  useEffect(() => {
    fetchUsers()
  }, [token])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const result = await apiService.get('/admin/drop-off', token)
      setUsers(result.data)
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStage = filters.stage === 'All' || user.drop_off_stage === filters.stage
      const matchesRole = filters.role === 'All' || user.role === filters.role

      return matchesSearch && matchesStage && matchesRole
    })
  }, [users, searchTerm, filters])

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) newSelected.delete(id)
    else newSelected.add(id)
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredUsers.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filteredUsers.map((u) => u.id)))
  }

  const handleDelete = async (ids: string[]) => {
    try {
      await apiService.post('/admin/users/batch-delete', { ids }, token)
      setUsers(users.filter((u) => !ids.includes(u.id)))
      setSelectedIds(new Set())
      setShowDeleteModal({ show: false, ids: [] })
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const handleExportCSV = () => {
    if (filteredUsers.length === 0) return

    const headers = [
      'Full Name',
      'Email',
      'Stage',
      'Role',
      'Last Activity',
      'Selected Session',
    ].join(',')

    const rows = filteredUsers.map((u) => {
      return [
        `"${(u.full_name || 'Anonymous').replace(/"/g, '""')}"`,
        `"${u.email.replace(/"/g, '""')}"`,
        `"${u.drop_off_stage.replace(/"/g, '""')}"`,
        `"${(u.role || '').replace(/"/g, '""')}"`,
        new Date(u.last_activity).toLocaleString(),
        `"${(u.selectedSession || '').replace(/"/g, '""')}"`,
      ].join(',')
    })

    const csvContent = [headers, ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `drop_off_analysis_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const stages = ['All', ...Array.from(new Set(users.map((u) => u.drop_off_stage)))]
  const roles = ['All', ...Array.from(new Set(users.filter((u) => u.role).map((u) => u.role!)))]

  return (
    <div className="page-container fade-in">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
        }}
      >
        <h2 className="section-title" style={{ margin: 0 }}>
          Drop-off Analysis
        </h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          {selectedIds.size > 0 && (
            <button
              onClick={() => setShowDeleteModal({ show: true, ids: Array.from(selectedIds) })}
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
          <button
            onClick={handleExportCSV}
            disabled={filteredUsers.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              backgroundColor: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 600,
              opacity: filteredUsers.length === 0 ? 0.5 : 1,
              cursor: filteredUsers.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {/* Filters Bar */}
        <div
          className="flex-mobile-column"
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            backgroundColor: 'var(--surface)',
          }}
        >
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={18}
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
              placeholder="Search email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 16px 10px 40px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--white)',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <select
              value={filters.stage}
              onChange={(e) => setFilters({ ...filters, stage: e.target.value })}
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                fontSize: '13px',
              }}
            >
              {stages.map((s) => (
                <option key={s} value={s}>
                  {s === 'All' ? 'All Stages' : s}
                </option>
              ))}
            </select>

            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                fontSize: '13px',
              }}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r === 'All' ? 'All Roles' : r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr
                style={{
                  backgroundColor: 'var(--surface)',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <th style={{ padding: '16px 24px', width: '48px' }}>
                  <button
                    onClick={toggleSelectAll}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}
                  >
                    {selectedIds.size === filteredUsers.length && filteredUsers.length > 0 ? (
                      <CheckSquare size={20} color="var(--accent)" />
                    ) : (
                      <Square size={20} />
                    )}
                  </button>
                </th>
                <th
                  style={{
                    padding: '16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  User
                </th>
                <th
                  style={{
                    padding: '16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Current Stage
                </th>
                <th
                  style={{
                    padding: '16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Role
                </th>
                <th
                  style={{
                    padding: '16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Last Activity
                </th>
                <th
                  style={{
                    padding: '16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}
                  >
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}
                  >
                    No users found matching filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      transition: 'var(--transition)',
                    }}
                  >
                    <td style={{ padding: '16px 24px' }}>
                      <button
                        onClick={() => toggleSelect(user.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}
                      >
                        {selectedIds.has(user.id) ? (
                          <CheckSquare size={20} color="var(--accent)" />
                        ) : (
                          <Square size={20} />
                        )}
                      </button>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px' }}>
                          {user.full_name || 'Anonymous'}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {user.email}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor:
                            user.drop_off_stage === 'Completed' ? '#dcfce7' : '#fef3c7',
                          color: user.drop_off_stage === 'Completed' ? '#166534' : '#92400e',
                          textTransform: 'uppercase',
                        }}
                      >
                        {user.drop_off_stage}
                      </span>
                    </td>
                    <td style={{ padding: '16px', fontSize: '13px' }}>{user.role || '—'}</td>
                    <td style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      {new Date(user.last_activity).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <button
                        onClick={() => setShowDeleteModal({ show: true, ids: [user.id] })}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal.show && (
        <div
          className="modal-overlay"
          style={{ alignItems: 'flex-start', paddingTop: '80px' }}
          onClick={() => setShowDeleteModal({ show: false, ids: [] })}
        >
          <div
            className="modal-content"
            style={{ maxWidth: '400px' }}
            onClick={(e) => e.stopPropagation()}
          >
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
                Are you sure?
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '32px' }}>
                You are about to delete {showDeleteModal.ids.length} user(s). This action cannot be
                undone.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowDeleteModal({ show: false, ids: [] })}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '1px solid var(--border)',
                    background: 'var(--white)',
                    borderRadius: '12px',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(showDeleteModal.ids)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: 'none',
                    background: '#dc2626',
                    color: 'var(--white)',
                    borderRadius: '12px',
                    fontWeight: 600,
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DropOffAnalysis
