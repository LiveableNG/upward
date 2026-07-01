import React, { useState } from 'react'
import {
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Eye,
  Copy,
  SlidersHorizontal,
  Building2,
  ExternalLink,
  Download,
  X,
} from 'lucide-react'
import { Square, CheckSquare } from './Checkbox'
import type { PmRecord, FeeOverride } from '../types'

type SortKey = 'businessName' | 'propertiesCount' | 'isVerified' | 'totalGenerated' | 'createdAt'
type SortDir = 'asc' | 'desc'

interface PmsTableProps {
  paginatedItems: PmRecord[]
  navigate: (path: string) => void
  overrides?: FeeOverride[]
  setSelectedPmOverride?: (pm: PmRecord) => void
  setPmOverrideFeeInput?: (fee: string) => void
  onPreview?: (item: PmRecord) => void
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

export const PmsTable: React.FC<PmsTableProps> = ({
  paginatedItems,
  navigate,
  onPreview,
}) => {
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
    if (sortKey === 'businessName') { va = a.businessName; vb = b.businessName }
    else if (sortKey === 'propertiesCount') { va = a.propertiesCount; vb = b.propertiesCount }
    else if (sortKey === 'isVerified') { va = a.isVerified ? 1 : 0; vb = b.isVerified ? 1 : 0 }
    else if (sortKey === 'totalGenerated') { va = a.totalGenerated; vb = b.totalGenerated }
    else if (sortKey === 'createdAt') { va = a.createdAt; vb = b.createdAt }
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
      selectedItems.map((p) => ({
        'Business Name': p.businessName,
        'Manager': `${p.firstName} ${p.lastName}`,
        'Email': p.email,
        'Phone': p.phone,
        'Status': p.isVerified ? 'Verified' : 'Unverified',
        'Properties': p.propertiesCount,
        'Units': p.unitsCount,
        'Revenue (₦)': p.totalGenerated,
        'Joined': new Date(p.createdAt).toLocaleDateString(),
      })),
      `PMs_Selected_${new Date().toISOString().split('T')[0]}.csv`,
    )
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
            <th style={thStyle} onClick={() => handleSort('businessName')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Business Details <SortIcon col="businessName" active={sortKey} dir={sortDir} /></span>
            </th>
            <th style={thStyle} onClick={() => handleSort('propertiesCount')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Properties / Units <SortIcon col="propertiesCount" active={sortKey} dir={sortDir} /></span>
            </th>
            <th style={thStyle} onClick={() => handleSort('isVerified')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Status <SortIcon col="isVerified" active={sortKey} dir={sortDir} /></span>
            </th>
            <th style={thStyle} onClick={() => handleSort('totalGenerated')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Revenue Generated <SortIcon col="totalGenerated" active={sortKey} dir={sortDir} /></span>
            </th>
            <th style={thStyle} onClick={() => handleSort('createdAt')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Joined <SortIcon col="createdAt" active={sortKey} dir={sortDir} /></span>
            </th>
            <th style={{ ...thStyle, width: '44px', cursor: 'default' }} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((pm) => (
            <tr
              key={pm.id}
              onClick={() => navigate(`/pms/${pm.uuid}`)}
              style={{
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                background: selectedIds.has(pm.id) ? 'rgba(217,119,87,0.04)' : 'transparent',
                transition: 'background 0.15s',
              }}
              className="table-row-hover"
            >
              <td style={{ padding: '16px 8px 16px 20px' }} onClick={(e) => toggleOne(pm.id, e)}>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}>
                  {selectedIds.has(pm.id) ? <CheckSquare size={17} color="var(--accent)" /> : <Square size={17} />}
                </button>
              </td>
              <td style={{ padding: '16px 16px' }}>
                <span style={{ fontWeight: 700, display: 'block', fontSize: '14px' }}>{pm.businessName}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Manager: {pm.firstName} {pm.lastName}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>{pm.email} • {pm.phone}</span>
              </td>
              <td style={{ padding: '16px 16px' }}>
                <div style={{ fontSize: '13px' }}>Properties: <strong>{pm.propertiesCount}</strong></div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Units: {pm.unitsCount}</div>
              </td>
              <td style={{ padding: '16px 16px' }}>
                <span className="badge" style={{
                  backgroundColor: pm.isVerified ? 'var(--success-faint)' : 'var(--error-faint)',
                  color: pm.isVerified ? 'var(--success)' : 'var(--error)',
                }}>
                  {pm.isVerified ? 'Verified' : 'Unverified'}
                </span>
              </td>
              <td style={{ padding: '16px 16px', fontWeight: 700, color: 'var(--success)' }}>
                ₦{pm.totalGenerated.toLocaleString()}
              </td>
              <td style={{ padding: '16px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                {new Date(pm.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </td>

              {/* Action dropdown */}
              <td style={{ padding: '14px 12px', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === pm.id ? null : pm.id) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex', borderRadius: '6px' }}
                >
                  <MoreHorizontal size={16} />
                </button>
                {openMenuId === pm.id && (
                  <div style={{
                    position: 'absolute', right: 0, top: '100%',
                    background: 'var(--white)', border: '1px solid var(--border)',
                    borderRadius: '10px', boxShadow: 'var(--shadow-lg)', zIndex: 100, minWidth: '190px', overflow: 'hidden',
                  }}>
                    {onPreview && (
                      <button onClick={() => { setOpenMenuId(null); onPreview(pm) }} className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <Eye size={14} /> Quick Preview
                      </button>
                    )}
                    <button onClick={() => { setOpenMenuId(null); navigate(`/pms/${pm.uuid}`) }} className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <ExternalLink size={14} /> View Full Profile
                    </button>
                    <button onClick={() => { setOpenMenuId(null); navigator.clipboard.writeText(pm.email) }} className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <Copy size={14} /> Copy Email
                    </button>
                    <button onClick={() => { setOpenMenuId(null); navigator.clipboard.writeText(pm.uuid) }} className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <Copy size={14} /> Copy UUID
                    </button>
                    <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
                    <button
                      onClick={() => {
                        setOpenMenuId(null)
                        navigate(`/overrides?pmUuid=${pm.uuid}&pmName=${encodeURIComponent(pm.businessName)}`)
                      }}
                      className="dropdown-item"
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#6366f1' }}
                    >
                      <SlidersHorizontal size={14} /> Set Fee Override
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}

          {/* Enhanced Empty State */}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={7} style={{ padding: '72px 24px', textAlign: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
                  <Building2 size={44} style={{ opacity: 0.25 }} />
                  <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-secondary)' }}>No property managers found</span>
                  <span style={{ fontSize: '13px' }}>Adjust search or date filters to see results.</span>
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
