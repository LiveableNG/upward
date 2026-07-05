import React, { useState } from 'react'
import {
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Eye,
  Copy,
  MailOpen,
  Download,
  Mail,
  X,
  Send,
} from 'lucide-react'
import { Square, CheckSquare } from './Checkbox'
import type { InvitedRecord } from '../types'

type SortKey = 'name' | 'email' | 'totalPaid' | 'createdAt' | 'status' | 'pmName'
type SortDir = 'asc' | 'desc'

interface InvitedTableProps {
  paginatedItems: InvitedRecord[]
  navigate: (path: string) => void
  onPreview?: (item: InvitedRecord) => void
}

const statusMeta: Record<string, { label: string; bg: string; color: string }> = {
  INVITED_PENDING: { label: 'Pending', bg: 'var(--warning-faint)', color: 'var(--warning)' },
  INVITED_SIGNED_UP: { label: 'Signed Up', bg: 'rgba(99,102,241,0.08)', color: '#6366f1' },
  GUEST_PAID: { label: 'Guest Paid', bg: 'var(--success-faint)', color: 'var(--success)' },
  SIGNED_UP_PAID: { label: 'Onboarded & Paid', bg: 'var(--success-faint)', color: 'var(--success)' },
}

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  const headers = Object.keys(rows[0] || {})
  const csv = [
    headers.join(','),
    ...rows.map((r) =>
      headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','),
    ),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const SortIcon: React.FC<{ col: SortKey; active: SortKey; dir: SortDir }> = ({ col, active, dir }) =>
  active === col
    ? dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
    : <ChevronDown size={12} style={{ opacity: 0.25 }} />

export const InvitedTable: React.FC<InvitedTableProps> = ({ paginatedItems, navigate, onPreview }) => {
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = [...paginatedItems].sort((a, b) => {
    let va: string | number = '', vb: string | number = ''
    if (sortKey === 'name') { va = `${a.firstName} ${a.lastName}`; vb = `${b.firstName} ${b.lastName}` }
    else if (sortKey === 'email') { va = a.email; vb = b.email }
    else if (sortKey === 'totalPaid') { va = a.totalPaid; vb = b.totalPaid }
    else if (sortKey === 'createdAt') { va = a.createdAt; vb = b.createdAt }
    else if (sortKey === 'status') { va = a.status; vb = b.status }
    else if (sortKey === 'pmName') { va = a.pmName; vb = b.pmName }
    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const allSelected = sorted.length > 0 && selectedIds.size === sorted.length

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(sorted.map((i) => i.id)))
  }

  const toggleOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const selectedItems = sorted.filter((i) => selectedIds.has(i.id))

  const handleExportSelected = () => {
    exportCSV(
      selectedItems.map((i) => ({
        'Name': i.firstName && i.lastName ? `${i.firstName} ${i.lastName}` : '—',
        'Email': i.email,
        'Phone': i.phone,
        'PM Origin': i.pmName,
        'Status': statusMeta[i.status]?.label ?? i.status,
        'Total Paid (₦)': i.totalPaid,
        'Invite Date': new Date(i.createdAt).toLocaleDateString(),
      })),
      `Invited_Selected_${new Date().toISOString().split('T')[0]}.csv`,
    )
  }

  const handleCopyEmails = () => {
    navigator.clipboard.writeText(selectedItems.map((i) => i.email).join(', '))
  }

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

  return (
    <>
      {/* ── Bulk Action Bar ── */}
      {selectedIds.size > 0 && (
        <div style={{
          background: 'var(--accent-faint)',
          border: '1px solid var(--accent-muted)',
          borderRadius: '10px',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '8px',
          fontSize: '13px',
        }}>
          <strong style={{ color: 'var(--accent)' }}>{selectedIds.size} selected</strong>
          <button
            onClick={handleExportSelected}
            className="btn"
            style={{ height: '30px', padding: '0 12px', background: 'var(--surface-hover)', border: '1px solid var(--border)', fontSize: '12px', gap: '6px' }}
          >
            <Download size={13} /> Export Selected
          </button>
          <button
            onClick={handleCopyEmails}
            className="btn"
            style={{ height: '30px', padding: '0 12px', background: 'var(--surface-hover)', border: '1px solid var(--border)', fontSize: '12px', gap: '6px' }}
          >
            <Mail size={13} /> Copy Emails
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '4px' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '2px solid var(--border)' }}>
            <th style={{ padding: '13px 8px 13px 20px', width: '44px' }}>
              <button onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}>
                {allSelected ? <CheckSquare size={17} color="var(--accent)" /> : <Square size={17} />}
              </button>
            </th>
            <th style={thStyle} onClick={() => handleSort('name')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Name <SortIcon col="name" active={sortKey} dir={sortDir} /></span>
            </th>
            <th style={thStyle} onClick={() => handleSort('email')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Contact <SortIcon col="email" active={sortKey} dir={sortDir} /></span>
            </th>
            <th style={thStyle} onClick={() => handleSort('pmName')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Property Manager <SortIcon col="pmName" active={sortKey} dir={sortDir} /></span>
            </th>
            <th style={thStyle} onClick={() => handleSort('status')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Status <SortIcon col="status" active={sortKey} dir={sortDir} /></span>
            </th>
            <th style={thStyle} onClick={() => handleSort('totalPaid')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Total Paid <SortIcon col="totalPaid" active={sortKey} dir={sortDir} /></span>
            </th>
            <th style={thStyle} onClick={() => handleSort('createdAt')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Invited <SortIcon col="createdAt" active={sortKey} dir={sortDir} /></span>
            </th>
            <th style={{ ...thStyle, width: '44px', cursor: 'default' }} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((item) => {
            const meta = statusMeta[item.status] ?? { label: item.status, bg: 'var(--surface-hover)', color: 'var(--text-muted)' }
            return (
              <tr
                key={item.id}
                style={{
                  borderBottom: '1px solid var(--border)',
                  background: selectedIds.has(item.id) ? 'rgba(217,119,87,0.04)' : 'transparent',
                  transition: 'background 0.15s',
                }}
                className="table-row-hover"
              >
                <td style={{ padding: '14px 8px 14px 20px' }} onClick={(e) => toggleOne(item.id, e)}>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}>
                    {selectedIds.has(item.id) ? <CheckSquare size={17} color="var(--accent)" /> : <Square size={17} />}
                  </button>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ fontWeight: 600, fontSize: '13px' }}>
                    {item.firstName && item.lastName ? `${item.firstName} ${item.lastName}` : <span style={{ color: 'var(--text-muted)' }}>Invite Pending</span>}
                  </span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: '13px' }}>{item.email}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.phone}</div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  {item.pmUuid ? (
                    <button
                      onClick={() => navigate(`/pms/${item.pmUuid}`)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontWeight: 600, fontSize: '13px', padding: 0 }}
                    >
                      {item.pmName}
                    </button>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{item.pmName}</span>
                  )}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span className="badge" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                </td>
                <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: '13px' }}>
                  {item.totalPaid > 0 ? `₦${item.totalPaid.toLocaleString()}` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </td>
                <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  {new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td style={{ padding: '14px 12px', position: 'relative' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex', borderRadius: '6px' }}
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {openMenuId === item.id && (
                    <div style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: 'var(--shadow-lg)', zIndex: 100, minWidth: '160px', overflow: 'hidden' }}>
                      {onPreview && (
                        <button onClick={() => { setOpenMenuId(null); onPreview(item) }} className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          <Eye size={14} /> Quick Preview
                        </button>
                      )}
                      <button onClick={() => { setOpenMenuId(null); navigate(`/users/${item.uuid}`) }} className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <Eye size={14} /> View Profile
                      </button>
                      <button onClick={() => { setOpenMenuId(null); navigator.clipboard.writeText(item.email) }} className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <Copy size={14} /> Copy Email
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}

          {sorted.length === 0 && (
            <tr>
              <td colSpan={8} style={{ padding: '64px 24px', textAlign: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', color: 'var(--text-muted)' }}>
                  <MailOpen size={44} style={{ opacity: 0.25 }} />
                  <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-secondary)' }}>No invited tenants yet</span>
                  <span style={{ fontSize: '13px', maxWidth: '320px', textAlign: 'center', lineHeight: 1.5 }}>
                    Property managers invite tenants during the onboarding flow.
                  </span>
                  <button
                    onClick={() => navigate('/emails')}
                    className="btn btn-primary"
                    style={{ height: '38px', padding: '0 20px', gap: '8px', fontSize: '13px', marginTop: '4px' }}
                  >
                    <Send size={14} /> Email Property Managers
                  </button>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <style>{`
        .dropdown-item:hover { background: var(--surface-hover) !important; }
        .table-row-hover:hover { background: var(--surface-hover) !important; }
      `}</style>
    </>
  )
}
