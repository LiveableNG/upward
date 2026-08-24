import React from 'react'
import { Trash2, CheckCircle, Pencil, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ColumnDef } from './types'

interface PreviewGridPhaseProps {
  columns: ColumnDef[]
  previewRows: any[]
  validationErrors: Record<string, string>
  amberWarnings?: Record<string, string>
  editingCell: { rowId: string, field: string } | null
  setEditingCell: (cell: { rowId: string, field: string } | null) => void
  updateRowField: (rowId: string, field: string, value: any) => void
  setPreviewRows: React.Dispatch<React.SetStateAction<any[]>>
  setValidationErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
  revalidateDuplicates: (rows: any[]) => void
}

export const PreviewGridPhase: React.FC<PreviewGridPhaseProps> = ({
  columns, previewRows, validationErrors, amberWarnings = {}, editingCell, setEditingCell,
  updateRowField, setPreviewRows, setValidationErrors, revalidateDuplicates
}) => {
  const errorCount = Object.keys(validationErrors).length

  return (
    <>
      <style>{`
        /* Editable cell — always has a subtle visual treatment */
        .pgp-cell-editable {
          background: #fafbfc;
          border: 1px solid #e8ecf0;
          border-radius: 5px;
          width: 100%;
          min-width: 120px;
          padding: 6px 9px;
          font-size: 13px;
          color: var(--dark, #0f172a);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          cursor: pointer;
          transition: background 0.12s ease, border-color 0.12s ease;
          box-sizing: border-box;
        }
        .pgp-cell-editable:hover {
          background: #eef6ff;
          border-color: #bfdbfe;
        }
        .pgp-cell-editable .pgp-pencil {
          opacity: 0;
          transition: opacity 0.12s ease;
          color: #94a3b8;
          flex-shrink: 0;
        }
        .pgp-cell-editable:hover .pgp-pencil {
          opacity: 1;
        }

        /* Read-only cell */
        .pgp-cell-readonly {
          width: 100%;
          min-width: 120px;
          padding: 6px 9px;
          font-size: 13px;
          color: var(--dark, #0f172a);
          background: transparent;
          cursor: default;
          opacity: 0.55;
        }

        /* Active input — used when editing */
        .pgp-input {
          width: 100%;
          min-width: 120px;
          padding: 6px 9px;
          border: 1.5px solid var(--clay);
          border-radius: 5px;
          background: #fff;
          font-size: 13px;
          color: var(--dark, #0f172a);
          outline: none;
          box-shadow: 0 0 0 3px rgba(184,91,53,0.12);
          box-sizing: border-box;
        }
        .pgp-input:focus { border-color: var(--clay); }
        .pgp-input--error { border-color: var(--error) !important; background: #fef2f2; box-shadow: 0 0 0 3px rgba(239,68,68,0.12) !important; }

        /* Mobile & Touch Devices — Always show pencil icon since hover is unavailable */
        @media (max-width: 768px) {
          .pgp-cell-editable .pgp-pencil {
            opacity: 0.6 !important;
          }
          .pgp-table th:first-child,
          .pgp-table td:first-child {
            position: sticky;
            left: 0;
            background: white;
            z-index: 6;
            box-shadow: 2px 0 4px rgba(0,0,0,0.06);
          }
          .pgp-table th:first-child {
            background: #f1f5f9;
            z-index: 7;
          }
        }

        /* Table overrides for this phase */
        .pgp-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .pgp-table th {
          position: sticky; top: 0; background: #f1f5f9;
          border-bottom: 2px solid #e2e8f0;
          padding: 10px 12px; text-align: left;
          font-weight: 700; color: #334155; white-space: nowrap; z-index: 5;
        }
        .pgp-table td {
          padding: 5px 8px;
          border-bottom: 1px solid #f1f5f9;
        }
        .pgp-table tr:hover td { background: #fafbfc; }

        /* Merged summary card */
        .pgp-summary {
          background: white;
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 20px 24px;
          display: flex;
          gap: 32px;
          align-items: flex-start;
          flex-shrink: 0;
          flex-wrap: wrap;
        }
        .pgp-summary__entities {
          display: flex; gap: 20px; flex-wrap: wrap;
          font-size: 13px; color: var(--text-muted);
        }
        .pgp-summary__entity {
          display: flex; align-items: center; gap: 6px;
          font-weight: 600; color: var(--dark);
        }
        .pgp-summary__entity .pgp-check { color: #16a34a; font-size: 15px; }
        .pgp-summary__divider {
          width: 1px; background: var(--border); align-self: stretch; flex-shrink: 0;
        }
        .pgp-summary__fixes {
          display: flex; flex-direction: column; gap: 4px;
          font-size: 12px; color: var(--text-muted);
        }
        .pgp-summary__fixes-title {
          font-size: 12px; font-weight: 700; color: var(--dark); margin-bottom: 4px;
        }
        .pgp-summary__fix { display: flex; align-items: center; gap: 5px; color: #15803d; }
      `}</style>

      {/* ── Static top section ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flexShrink: 0 }}>

        {/* Title + description row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'left', minWidth: 0, flex: 1 }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--dark)', margin: '0 0 4px 0' }}>
              Your data is ready to import.
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              We've prepared your spreadsheet for import.{' '}
              <span style={{ color: 'var(--dark)', fontWeight: 600 }}>Click or tap any cell to edit</span>{' '}
              before completing the import.
              {errorCount > 0 && (
                <span
                  style={{ marginLeft: 10, color: '#dc2626', fontWeight: 700, cursor: 'pointer', display: 'inline-block', marginTop: 4 }}
                  onClick={() => {
                    const firstKey = Object.keys(validationErrors)[0]
                    if (firstKey) {
                      const [rowId, ...fieldParts] = firstKey.split('-')
                      setEditingCell({ rowId, field: fieldParts.join('-') })
                      setTimeout(() => {
                        document.getElementById(`cell-${firstKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
                      }, 50)
                    }
                  }}
                >
                  <AlertCircle size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                  {errorCount} issue{errorCount > 1 ? 's' : ''} need attention
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Table section heading */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)' }}>Imported Data</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
              Review and edit any information before importing.
            </span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
            <span style={{ color: 'var(--error)' }}>*</span> Required fields
          </span>
        </div>
      </div>

      {/* ── Scrollable table ── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          border: '1px solid var(--border)',
          borderRadius: 14,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table className="pgp-table">
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.key}>
                    {col.label}{col.required && <span style={{ color: 'var(--error)' }}> *</span>}
                  </th>
                ))}
                <th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {previewRows.map(row => (
                <tr key={row.id}>
                  {columns.map(col => {
                    const isLeaseYears = col.key === 'leaseYears'
                    const rentTypeVal = row.unitRentType || row.rentType
                    const isLeaseYearsDisabled = isLeaseYears && rentTypeVal !== 'Lease'
                    const isReadOnly = col.readOnly || isLeaseYearsDisabled

                    const isEditing = !isReadOnly && editingCell?.rowId === row.id && editingCell?.field === col.key
                    const error = validationErrors[`${row.id}-${col.key}`]
                    const warning = amberWarnings[`${row.id}-${col.key}`]

                    let cellValue = row[col.key]
                    if ((col.key === 'tenantEmail' || col.key === 'email') && typeof cellValue === 'string' && cellValue.endsWith('@upward.com')) {
                      cellValue = ''
                    }

                    return (
                      <td
                        key={col.key}
                        id={`cell-${row.id}-${col.key}`}
                        onClick={() => !isReadOnly && setEditingCell({ rowId: row.id, field: col.key })}
                        title={isReadOnly
                          ? (isLeaseYearsDisabled ? 'Only applicable for Lease rent type' : 'Auto-calculated (Read-only)')
                          : (error || warning || '')}
                      >
                        {isEditing ? (
                          col.type === 'select' && col.options ? (
                            <select
                              className={cn('pgp-input', error && 'pgp-input--error')}
                              autoFocus
                              onBlur={() => setEditingCell(null)}
                              value={cellValue}
                              onChange={e => updateRowField(row.id, col.key, e.target.value)}
                            >
                              <option value="">Select...</option>
                              {col.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          ) : (
                            <input
                              className={cn('pgp-input', error && 'pgp-input--error')}
                              autoFocus
                              onBlur={() => setEditingCell(null)}
                              value={cellValue}
                              onChange={e => updateRowField(row.id, col.key, e.target.value)}
                            />
                          )
                        ) : isReadOnly ? (
                          <div className="pgp-cell-readonly">
                            {cellValue || <span style={{ opacity: 0.35 }}>—</span>}
                          </div>
                        ) : (
                          <div
                            className={cn(
                              'pgp-cell-editable',
                              error && 'pgp-input--error',
                              !error && warning && 'data-grid-input--warning'
                            )}
                          >
                            <span>{cellValue || <span style={{ color: 'var(--text-muted)', opacity: 0.4 }}>—</span>}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              {!error && warning && <CheckCircle size={12} style={{ color: '#16a34a', flexShrink: 0 }} />}
                              <Pencil size={11} className="pgp-pencil" />
                            </span>
                          </div>
                        )}
                      </td>
                    )
                  })}
                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => {
                        const updated = previewRows.filter(r => r.id !== row.id)
                        setPreviewRows(updated)
                        setValidationErrors(prev => {
                          const next = { ...prev }
                          Object.keys(next).forEach(k => { if (k.startsWith(`${row.id}-`)) delete next[k] })
                          return next
                        })
                        revalidateDuplicates(updated)
                      }}
                      style={{ color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6, padding: 4 }}
                      title="Remove row"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
