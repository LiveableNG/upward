import React from 'react'
import { AlertCircle, AlertTriangle, Trash2, Plus, CheckCircle } from 'lucide-react'
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
    columns.forEach(col => {
      newRow[col.key] = ''
    })
    const updated = [...previewRows, newRow]
    setPreviewRows(updated)
    revalidateDuplicates(updated)
    // Focus first cell of the newly added row
    setEditingCell({ rowId: newId, field: columns[0]?.key || '' })
  }

  const warningCount = Object.keys(amberWarnings).length

  return (
    <div className="data-grid-container animate-fade-in">
      <div className="data-grid-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Total records to import: <strong style={{ color: 'var(--dark)' }}>{previewRows.length}</strong>
          </div>
          <button 
            type="button" 
            className="btn btn--secondary" 
            onClick={handleAddRow}
            style={{ borderRadius: 8, height: 34, padding: '0 12px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={14} /> Add Row
          </button>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {warningCount > 0 && (
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#166534', fontSize: 13, fontWeight: 600, background: '#dcfce7', padding: '6px 14px', borderRadius: 'var(--radius-full)', border: '1px solid #bbf7d0' }}
              title="Rent end dates were successfully auto-calculated based on your tenancy terms."
            >
              <CheckCircle size={16} /> {warningCount} rent end dates auto-calculated
            </div>
          )}

          {Object.keys(validationErrors).length > 0 && (
            <button 
              type="button"
              onClick={() => {
                const firstErrorKey = Object.keys(validationErrors)[0]
                if (firstErrorKey) {
                  const [rowId, ...fieldParts] = firstErrorKey.split('-')
                  const field = fieldParts.join('-')
                  
                  setEditingCell({ rowId, field })
                  
                  setTimeout(() => {
                    const el = document.getElementById(`cell-${firstErrorKey}`)
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
                    }
                  }, 50)
                }
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--error)', fontSize: 13, fontWeight: 600, background: 'var(--error-bg)', padding: '6px 14px', borderRadius: 'var(--radius-full)', border: '1px solid #fecaca', cursor: 'pointer' }}
            >
              <AlertCircle size={16} /> {Object.keys(validationErrors).length} validation issues found. Click to view issue.
            </button>
          )}
        </div>
      </div>
      <div className="data-grid-table-wrapper">
        <table className="data-grid-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key}>
                  {col.label} {col.required && <span style={{ color: 'var(--error)' }}>*</span>}
                </th>
              ))}
              <th style={{ width: 44 }}></th>
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
                      title={isReadOnly ? (isLeaseYearsDisabled ? 'Only applicable for Lease rent type' : 'Auto-calculated date (Read-only)') : (error || warning || '')}
                    >
                      {isEditing ? (
                        col.type === 'select' && col.options ? (
                          <select
                            className={cn('data-grid-input', error && 'data-grid-input--error', !error && warning && 'data-grid-input--warning')}
                            autoFocus
                            onBlur={() => setEditingCell(null)}
                            value={row[col.key]}
                            onChange={(e) => updateRowField(row.id, col.key, e.target.value)}
                          >
                            <option value="">Select...</option>
                            {col.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : (
                          <input 
                            className={cn('data-grid-input', error && 'data-grid-input--error', !error && warning && 'data-grid-input--warning')}
                            autoFocus
                            onBlur={() => setEditingCell(null)}
                            value={row[col.key]}
                            onChange={(e) => updateRowField(row.id, col.key, e.target.value)}
                          />
                        )
                      ) : (
                        <div 
                          className={cn('data-grid-input', error && 'data-grid-input--error', !error && warning && 'data-grid-input--warning')} 
                          style={{ cursor: isReadOnly ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, background: isReadOnly ? 'rgba(0,0,0,0.02)' : undefined }}
                        >
                          <span>{row[col.key] || <span style={{ color: 'var(--text-muted)', opacity: 0.4 }}>—</span>}</span>
                          {!error && warning && (
                            <CheckCircle size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
                          )}
                        </div>
                      )}
                    </td>
                  )
                })}

                <td style={{ textAlign: 'center' }}>
                  <button onClick={() => {
                    const updated = previewRows.filter(r => r.id !== row.id)
                    setPreviewRows(updated)
                    setValidationErrors(prev => {
                      const next = { ...prev }
                      Object.keys(next).forEach(k => { if (k.startsWith(`${row.id}-`)) delete next[k] })
                      return next
                    })
                    revalidateDuplicates(updated)
                  }} style={{ color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7, padding: 4 }} title="Remove Row">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}



