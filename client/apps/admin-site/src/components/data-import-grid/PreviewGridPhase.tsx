import React from 'react'
import { AlertCircle, Trash2, Plus } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
import { type ColumnDef } from './types'

interface PreviewGridPhaseProps {
  columns: ColumnDef[]
  previewRows: any[]
  validationErrors: Record<string, string>
  editingCell: { rowId: string, field: string } | null
  setEditingCell: (cell: { rowId: string, field: string } | null) => void
  updateRowField: (rowId: string, field: string, value: any) => void
  setPreviewRows: React.Dispatch<React.SetStateAction<any[]>>
  setValidationErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
  revalidateDuplicates: (rows: any[]) => void
}

export const PreviewGridPhase: React.FC<PreviewGridPhaseProps> = ({
  columns, previewRows, validationErrors, editingCell, setEditingCell,
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
        {Object.keys(validationErrors).length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--error)', fontSize: 13, fontWeight: 600, background: 'var(--error-bg)', padding: '6px 14px', borderRadius: 'var(--radius-full)', border: '1px solid #fecaca' }}>
            <AlertCircle size={16} /> {Object.keys(validationErrors).length} validation issues found. Click cells to edit.
          </div>
        )}
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
                  const isEditing = editingCell?.rowId === row.id && editingCell?.field === col.key
                  const error = validationErrors[`${row.id}-${col.key}`]
                  return (
                    <td key={col.key} onClick={() => setEditingCell({ rowId: row.id, field: col.key })} title={error || ''}>
                      {isEditing ? (
                        <input 
                          className={cn('data-grid-input', error && 'data-grid-input--error')}
                          autoFocus
                          onBlur={() => setEditingCell(null)}
                          value={row[col.key]}
                          onChange={(e) => updateRowField(row.id, col.key, e.target.value)}
                        />
                      ) : (
                        <div className={cn('data-grid-input', error && 'data-grid-input--error')} style={{ cursor: 'pointer' }}>
                          {row[col.key] || <span style={{ color: 'var(--text-muted)', opacity: 0.4 }}>—</span>}
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


