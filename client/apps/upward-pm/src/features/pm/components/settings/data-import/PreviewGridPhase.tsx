import React, { useState, useMemo } from 'react'
import { Trash2, Plus, CheckCircle, Pencil, AlertCircle } from 'lucide-react'
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
  const handleAddRow = () => {
    const newId = `row-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
    const newRow: any = { id: newId }
    columns.forEach(col => { newRow[col.key] = '' })
    const updated = [...previewRows, newRow]
    setPreviewRows(updated)
    revalidateDuplicates(updated)
    setEditingCell({ rowId: newId, field: columns[0]?.key || '' })
  }

  const stats = useMemo(() => {
    const properties = new Set(previewRows.map(r => r.propertyName || r.name).filter(Boolean)).size
    const units = previewRows.length
    const tenants = previewRows.filter(r => r.tenantEmail || r.tenantFirstName || r.tenantLastName).length
    const landlords = new Set(
      previewRows.map(r => r.landlordEmail || r.landlordFirstName || r.landlordLastName).filter(Boolean)
    ).size
    return { properties, units, tenants, landlords }
  }, [previewRows])

  const warningCount = Object.keys(amberWarnings).length
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flexShrink: 0 }}>

        {/* Title + description row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ textAlign: 'left' }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--dark)', margin: '0 0 5px 0' }}>
              Your data is ready to import.
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              We've prepared your spreadsheet for import.{' '}
              <span style={{ color: 'var(--dark)', fontWeight: 600 }}>Click any cell to edit it</span>{' '}
              before completing the import.
              {errorCount > 0 && (
                <span
                  style={{ marginLeft: 10, color: '#dc2626', fontWeight: 700, cursor: 'pointer' }}
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
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleAddRow}
            style={{ borderRadius: 10, height: 36, padding: '0 14px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
          >
            <Plus size={14} /> Add Row
          </button>
        </div>

        {/* Merged summary card */}
        <div className="pgp-summary">
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Import Ready</div>
            <div className="pgp-summary__entities">
              {[
                { label: stats.properties === 1 ? 'Property' : 'Properties', count: stats.properties },
                { label: stats.units === 1 ? 'Unit' : 'Units', count: stats.units },
                { label: stats.tenants === 1 ? 'Tenant' : 'Tenants', count: stats.tenants },
                { label: stats.landlords === 1 ? 'Landlord' : 'Landlords', count: stats.landlords },
              ].map(({ label, count }) => (
                <div key={label} className="pgp-summary__entity">
                  <span className="pgp-check">✓</span>
                  <span>{count} {label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pgp-summary__divider" />

          <div>
            <div className="pgp-summary__fixes-title">Upward also:</div>
            <div className="pgp-summary__fixes">
              {warningCount > 0 && (
                <span className="pgp-summary__fix"><CheckCircle size={12} /> {warningCount} rent end dates calculated</span>
              )}
              <span className="pgp-summary__fix"><CheckCircle size={12} /> Standardized imported dates</span>
              <span className="pgp-summary__fix"><CheckCircle size={12} /> Validated required fields</span>
            </div>
          </div>
        </div>

        {/* Table section heading */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)' }}>Imported Data</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
              Review and edit any information before importing.
            </span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
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
                              value={row[col.key]}
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
                              value={row[col.key]}
                              onChange={e => updateRowField(row.id, col.key, e.target.value)}
                            />
                          )
                        ) : isReadOnly ? (
                          <div className="pgp-cell-readonly">
                            {row[col.key] || <span style={{ opacity: 0.35 }}>—</span>}
                          </div>
                        ) : (
                          <div
                            className={cn(
                              'pgp-cell-editable',
                              error && 'pgp-input--error',
                              !error && warning && 'data-grid-input--warning'
                            )}
                          >
                            <span>{row[col.key] || <span style={{ color: 'var(--text-muted)', opacity: 0.4 }}>—</span>}</span>
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
