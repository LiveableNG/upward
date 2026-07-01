import React, { useState } from 'react'
import {
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Eye,
  Copy,
  Trash2,
  Users,
} from 'lucide-react'
import { Square, CheckSquare } from './Checkbox'
import type { WaitlistRecord } from '../types'

type SortKey = 'name' | 'email' | 'totalPaid' | 'createdAt' | 'converted'
type SortDir = 'asc' | 'desc'

interface WaitlistTableProps {
  isSuperadmin: boolean
  paginatedItems: WaitlistRecord[]
  selectedWaitlistIds: Set<string>
  toggleSelectAllWaitlist: () => void
  toggleSelectWaitlist: (id: string, e: React.MouseEvent) => void
  navigate: (path: string) => void
  onPreview?: (item: WaitlistRecord) => void
  onDeleteSelected?: () => void
}

const SortIcon: React.FC<{ col: SortKey; active: SortKey; dir: SortDir }> = ({ col, active, dir }) =>
  active === col
    ? dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
    : <ChevronDown size={12} style={{ opacity: 0.25 }} />

export const WaitlistTable: React.FC<WaitlistTableProps> = ({
  isSuperadmin,
  paginatedItems,
  selectedWaitlistIds,
  toggleSelectAllWaitlist,
  toggleSelectWaitlist,
  navigate,
  onPreview,
  onDeleteSelected,
}) => {
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

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
    else if (sortKey === 'converted') { va = a.converted ? 1 : 0; vb = b.converted ? 1 : 0 }
    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ? 1 : -1
    return 0
  })

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

  const allSelected = paginatedItems.length > 0 && selectedWaitlistIds.size === paginatedItems.length

  return (
    <>
      {/* Bulk Action Bar */}
      {selectedWaitlistIds.size > 0 && isSuperadmin && (
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
          <strong style={{ color: 'var(--accent)' }}>{selectedWaitlistIds.size} selected</strong>
          {onDeleteSelected && (
            <button
              onClick={onDeleteSelected}
              className="btn"
              style={{ height: '30px', padding: '0 12px', background: 'var(--danger-faint)', color: 'var(--danger)', border: '1px solid transparent', fontSize: '12px', gap: '6px' }}
            >
              <Trash2 size={13} /> Delete Selected
            </button>
          )}
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '2px solid var(--border)' }}>
            {isSuperadmin && (
              <th style={{ padding: '13px 8px 13px 20px', width: '44px' }}>
                <button onClick={toggleSelectAllWaitlist} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}>
                  {allSelected ? <CheckSquare size={17} color="var(--accent)" /> : <Square size={17} />}
                </button>
              </th>
            )}
            <th style={thStyle} onClick={() => handleSort('name')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Name <SortIcon col="name" active={sortKey} dir={sortDir} /></span>
            </th>
            <th style={thStyle} onClick={() => handleSort('email')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Contact <SortIcon col="email" active={sortKey} dir={sortDir} /></span>
            </th>
            <th style={thStyle} onClick={() => handleSort('converted')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Status <SortIcon col="converted" active={sortKey} dir={sortDir} /></span>
            </th>
            <th style={thStyle} onClick={() => handleSort('totalPaid')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Paid <SortIcon col="totalPaid" active={sortKey} dir={sortDir} /></span>
            </th>
            <th style={thStyle} onClick={() => handleSort('createdAt')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Joined <SortIcon col="createdAt" active={sortKey} dir={sortDir} /></span>
            </th>
            <th style={{ ...thStyle, width: '44px', cursor: 'default' }} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((item) => (
            <tr
              key={item.id}
              style={{
                borderBottom: '1px solid var(--border)',
                background: selectedWaitlistIds.has(item.id) ? 'rgba(217,119,87,0.04)' : 'transparent',
                transition: 'background 0.15s',
              }}
              className="table-row-hover"
            >
              {isSuperadmin && (
                <td style={{ padding: '14px 8px 14px 20px' }} onClick={(e) => toggleSelectWaitlist(item.id, e)}>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}>
                    {selectedWaitlistIds.has(item.id) ? <CheckSquare size={17} color="var(--accent)" /> : <Square size={17} />}
                  </button>
                </td>
              )}
              <td style={{ padding: '14px 16px' }}>
                <span style={{ fontWeight: 600, fontSize: '13px' }}>{item.firstName} {item.lastName}</span>
              </td>
              <td style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: '13px' }}>{item.email}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.phone}</div>
              </td>
              <td style={{ padding: '14px 16px' }}>
                <span className="badge" style={{
                  background: item.converted ? 'var(--success-faint)' : 'var(--warning-faint)',
                  color: item.converted ? 'var(--success)' : 'var(--warning)',
                }}>
                  {item.converted ? 'Converted' : 'Waiting'}
                </span>
              </td>
              <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: '13px' }}>
                {item.totalPaid > 0 ? `₦${item.totalPaid.toLocaleString()}` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
              </td>
              <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                {new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </td>
              {/* Actions */}
              <td style={{ padding: '14px 12px', position: 'relative' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex', borderRadius: '6px' }}
                >
                  <MoreHorizontal size={16} />
                </button>
                {openMenuId === item.id && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    background: 'var(--white)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 100,
                    minWidth: '160px',
                    overflow: 'hidden',
                  }}>
                    {item.converted && onPreview && (
                      <button
                        onClick={() => { setOpenMenuId(null); onPreview(item) }}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}
                        className="dropdown-item"
                      >
                        <Eye size={14} /> Quick Preview
                      </button>
                    )}
                    {item.converted && (
                      <button
                        onClick={() => { setOpenMenuId(null); navigate(`/users/${item.uuid}`) }}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}
                        className="dropdown-item"
                      >
                        <Eye size={14} /> View Profile
                      </button>
                    )}
                    <button
                      onClick={() => { setOpenMenuId(null); navigator.clipboard.writeText(item.email) }}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}
                      className="dropdown-item"
                    >
                      <Copy size={14} /> Copy Email
                    </button>
                    <button
                      onClick={() => { setOpenMenuId(null); navigator.clipboard.writeText(item.id) }}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}
                      className="dropdown-item"
                    >
                      <Copy size={14} /> Copy ID
                    </button>
                    {isSuperadmin && (
                      <button
                        onClick={() => { setOpenMenuId(null) }}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--danger)' }}
                        className="dropdown-item"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}

          {/* Empty State */}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={7} style={{ padding: '64px 24px', textAlign: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
                  <Users size={40} style={{ opacity: 0.3 }} />
                  <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-secondary)' }}>No waitlist entries found</span>
                  <span style={{ fontSize: '13px' }}>Try adjusting your search or date filters.</span>
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
