'use client'

import React, { useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { 
  FileSpreadsheet, 
  Download, 
  Plus, 
  Trash2, 
  ChevronLeft,
  AlertCircle,
  CreditCard,
  User,
  Calendar,
  Check
} from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { parseDateString } from '@/features/pm/components/settings/data-import/utils'
import { useToast } from '@/components/common/Toast'
import { useUnit, useBulkAddRentHistory } from '@/features/pm/hooks/useProperties'
import { cn, formatCurrency } from '@/lib/utils'
import { downloadBlob } from '@/lib/download-helper'

interface ColumnDef {
  key: string
  label: string
  required?: boolean
  type?: 'text' | 'number' | 'email' | 'date'
}

const RENT_COLUMNS: ColumnDef[] = [
  { key: 'tenantEmail', label: 'Tenant Email', required: true, type: 'email' },
  { key: 'tenantFirstName', label: 'Tenant First Name' },
  { key: 'tenantLastName', label: 'Tenant Last Name' },
  { key: 'amount', label: 'Amount Paid', required: true, type: 'number' },
  { key: 'paymentDate', label: 'Payment Date', required: true, type: 'date' },
  { key: 'periodStart', label: 'Period Start', required: true, type: 'date' },
  { key: 'periodEnd', label: 'Period End', type: 'date' },
  { key: 'method', label: 'Method' },
  { key: 'notes', label: 'Notes' }
]

export default function BulkRentPage() {
  const searchParams = useSearchParams()
  const uuid = searchParams.get('uuid')
  const router = useRouter()
  const { success, error, info } = useToast()
  
  const { data: unit } = useUnit(uuid as string)
  const bulkAddMutation = useBulkAddRentHistory()

  const [previewRows, setPreviewRows] = useState<any[]>([])
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const handleDownloadTemplate = () => {
    const headers = RENT_COLUMNS.map(c => c.label)
    const email = unit?.tenant?.email || 'tenant@example.com'
    const firstName = unit?.tenant?.firstName || 'John'
    const lastName = unit?.tenant?.lastName || 'Doe'
    const rentVal = unit?.rentAmount || '1000000'

    const rows = [
      ['past_tenant@example.com', 'Jane', 'Smith', rentVal, '2024-01-15', '2024-01-01', '2024-12-31', 'Bank Transfer', 'Historical 2024 (Fully Paid)'],
      ['past_tenant@example.com', 'Jane', 'Smith', rentVal, '2025-01-15', '2025-01-01', '2025-12-31', 'Bank Transfer', 'Historical 2025 (Fully Paid)'],
      [email, firstName, lastName, rentVal, '2026-01-10', '2026-01-01', '2026-12-31', 'Bank Transfer', 'Rent 2026 (Fully Paid)'],
      [email, firstName, lastName, rentVal, '2027-01-10', '2027-01-01', '2027-12-31', 'Bank Transfer', 'Rent 2027 (Fully Paid)'],
      [email, firstName, lastName, '200000', '2028-01-10', '2028-01-01', '2028-12-31', 'Bank Transfer', 'Rent 2028 (Partial Payment)'],
      [email, firstName, lastName, rentVal, '2029-01-10', '2029-01-01', '2029-12-31', 'Bank Transfer', 'Rent 2029 (Fully Paid)']
    ]

    const csvContent = [headers, ...rows].map(e => e.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    downloadBlob(blob, `rent_history_template_${unit?.unitName || 'unit'}.csv`).then(() => {
      success('Template downloaded!')
    }).catch(err => console.error(err))
  }

  const validateCell = (rowId: number, field: string, value: any, colDef?: ColumnDef) => {
    let errorMsg = ''
    const config = colDef || RENT_COLUMNS.find(c => c.key === field)
    
    if (config?.required && !value && value !== 0) {
      errorMsg = 'Required'
    } else if (config?.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errorMsg = 'Invalid email'
    } else if (config?.type === 'number' && value !== '' && isNaN(parseFloat(value))) {
      errorMsg = 'Must be a number'
    }

    const key = `${rowId}-${field}`
    setValidationErrors(prev => {
      const next = { ...prev }
      if (errorMsg) next[key] = errorMsg
      else delete next[key]
      return next
    })
    return !errorMsg
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fileName = file.name.toLowerCase()
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader()
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]!
          const worksheet = workbook.Sheets[sheetName]!
          const jsonData = XLSX.utils.sheet_to_json(worksheet)

          const rows = jsonData.map((row: any, index: number) => {
            const rowId = Date.now() + index
            const mappedRow: any = { id: rowId }

            RENT_COLUMNS.forEach(col => {
              const val = row[col.label] || ''
              if (col.type === 'number') {
                mappedRow[col.key] = val !== '' ? parseFloat(val.toString().replace(/[^0-9.]/g, '')) : 0
              } else if (col.type === 'date') {
                mappedRow[col.key] = val ? parseDateString(val) : ''
              } else {
                mappedRow[col.key] = val
              }
              validateCell(rowId, col.key, mappedRow[col.key], col)
            })

            return mappedRow
          })

          setPreviewRows(rows)
          info(`Previewing ${rows.length} records from Excel.`)
        } catch (err) {
          console.error(err)
          error('Failed to parse Excel file.')
        }
      }
      reader.readAsArrayBuffer(file)
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: 'greedy',
        complete: (results: any) => {
          // Filter out completely empty rows
          const filteredData = (results.data || []).filter((row: any) => 
            Object.values(row).some(val => val !== null && val !== undefined && val.toString().trim() !== '')
          )

          const rows = filteredData.map((row: any, index: number) => {
            const rowId = Date.now() + index
            const mappedRow: any = { id: rowId }
            
            RENT_COLUMNS.forEach(col => {
              const val = row[col.label] || ''
              if (col.type === 'number') {
                mappedRow[col.key] = val ? parseFloat(val.toString().replace(/[^0-9.]/g, '')) : 0
              } else if (col.type === 'date') {
                mappedRow[col.key] = val ? parseDateString(val) : ''
              } else {
                mappedRow[col.key] = val
              }
              validateCell(rowId, col.key, mappedRow[col.key], col)
            })
            
            return mappedRow
          })
          
          setPreviewRows(rows)
          info(`Previewing ${rows.length} records.`)
        }
      })
    }
    e.target.value = ''
  }

  const updateRow = (index: number, field: string, value: any) => {
    const updated = [...previewRows]
    let val = value
    if (RENT_COLUMNS.find(c => c.key === field)?.type === 'date') {
      val = parseDateString(value)
    }
    updated[index][field] = val
    setPreviewRows(updated)
    validateCell(updated[index].id, field, val)
  }

  const handleAddRow = () => {
    const rowId = Date.now()
    const newRow: any = { 
      id: rowId, 
      tenantEmail: unit?.tenant?.email || '', 
      tenantFirstName: unit?.tenant?.firstName || '',
      tenantLastName: unit?.tenant?.lastName || '',
      amount: unit?.rentAmount || 0, 
      method: 'Bank Transfer' 
    }
    RENT_COLUMNS.forEach(col => {
      if (newRow[col.key] === undefined) {
        newRow[col.key] = col.type === 'number' ? 0 : ''
      }
    })
    
    setPreviewRows([...previewRows, newRow])
    RENT_COLUMNS.forEach(col => validateCell(rowId, col.key, newRow[col.key], col))
  }

  const handleConfirmImport = () => {
    if (previewRows.length === 0) return error("No data to import")
    if (Object.keys(validationErrors).length > 0) return error("Please fix errors first")

    const rowsToSend = previewRows.map(({ id, ...rest }) => rest)
    bulkAddMutation.mutate({ unitUuid: uuid as string, rows: rowsToSend }, {
      onSuccess: (res) => {
        success(`Imported ${res.success} rent records!`)
        router.push(`/properties/units/view?uuid=${uuid}`)
      }
    })
  }

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '10px 12px',
    border: '1px solid ' + (hasError ? 'var(--error)' : 'var(--border)'),
    borderRadius: 8,
    fontSize: 13,
    background: hasError ? 'var(--error-bg)' : 'white',
    outline: 'none',
    transition: 'all 0.2s'
  })

  return (
    <div className="bulk-rent-page animate-fade-in" style={{ padding: '24px 0' }}>
      <header style={{ marginBottom: 32 }}>
        <button className="btn btn--secondary btn--sm" onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', padding: 0, marginBottom: 16 }}>
          <ChevronLeft size={16} /> Back to Unit
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--dark)' }}>Bulk Rent History Upload</h1>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
              Unit: <strong>{unit?.unitName}</strong> • Property: <strong>{unit?.property?.name}</strong>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn--secondary" onClick={handleDownloadTemplate} style={{ borderRadius: 12 }}>
              <Download size={18} style={{ marginRight: 8 }} /> Download Template
            </button>
            <label className="btn btn--primary" style={{ borderRadius: 12, cursor: 'pointer' }}>
              <FileSpreadsheet size={18} style={{ marginRight: 8 }} /> Upload CSV
              <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileUpload} />
            </label>
          </div>
        </div>
      </header>

      <div className="card" style={{ background: 'white', borderRadius: 24, border: '1px solid var(--border)', overflow: 'hidden' }}>
        {previewRows.length > 0 ? (
          <div className="import-preview">
            <div className="table-container" style={{ maxHeight: 600, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--ivory-dim)', zIndex: 10 }}>
                  <tr>
                    {RENT_COLUMNS.map(col => (
                      <th key={col.key} style={{ textAlign: 'left', padding: '16px 20px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 11, fontWeight: 700 }}>
                        {col.label} {col.required && <span style={{ color: 'var(--error)' }}>*</span>}
                      </th>
                    ))}
                    <th style={{ borderBottom: '1px solid var(--border)' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      {RENT_COLUMNS.map(col => (
                        <td key={col.key} style={{ padding: '12px' }}>
                          {col.type === 'date' ? (
                            <input 
                              type="date"
                              value={row[col.key]}
                              onChange={e => updateRow(i, col.key, e.target.value)}
                              style={inputStyle(!!validationErrors[`${row.id}-${col.key}`])}
                            />
                          ) : (
                            <input 
                              type={col.type === 'number' ? 'number' : 'text'}
                              value={row[col.key]}
                              onChange={e => updateRow(i, col.key, e.target.value)}
                              style={inputStyle(!!validationErrors[`${row.id}-${col.key}`])}
                            />
                          )}
                        </td>
                      ))}
                      <td style={{ padding: '12px' }}>
                        <button onClick={() => setPreviewRows(previewRows.filter(r => r.id !== row.id))} style={{ color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6 }}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div style={{ padding: 24, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--ivory-dim)' }}>
               <button className="btn btn--secondary" onClick={handleAddRow} style={{ borderRadius: 10 }}>
                 <Plus size={16} style={{ marginRight: 8 }} /> Add Row
               </button>
               <div style={{ display: 'flex', gap: 12 }}>
                 <button className="btn btn--secondary" onClick={() => { if(confirm('Clear all?')) setPreviewRows([]); }} style={{ borderRadius: 10 }}>Clear All</button>
                 <button 
                    className="btn btn--primary" 
                    onClick={handleConfirmImport} 
                    disabled={bulkAddMutation.isPending || Object.keys(validationErrors).length > 0}
                    style={{ borderRadius: 10, padding: '0 32px' }}
                 >
                    {bulkAddMutation.isPending ? 'Processing...' : 'Confirm & Save History'}
                 </button>
               </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '120px 40px', textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: 'var(--ivory-dim)', color: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <FileSpreadsheet size={40} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Upload Rent History CSV</h2>
            <p style={{ fontSize: 15, color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto 32px', lineHeight: 1.6 }}>
              Quickly import months or years of rent records for this unit. Use our template to ensure your data is formatted correctly.
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <button className="btn btn--secondary" onClick={handleDownloadTemplate} style={{ borderRadius: 12, height: 48, padding: '0 24px' }}>
                <Download size={18} style={{ marginRight: 8 }} /> Template
              </button>
              <label className="btn btn--primary" style={{ borderRadius: 12, height: 48, padding: '0 32px', cursor: 'pointer' }}>
                <FileSpreadsheet size={18} style={{ marginRight: 8 }} /> Choose CSV File
                <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileUpload} />
              </label>
            </div>

            <div style={{ marginTop: 48, display: 'flex', justifyContent: 'center', gap: 40 }}>
              <div style={{ textAlign: 'left', display: 'flex', gap: 12, maxWidth: 240 }}>
                <Check size={20} color="var(--forest)" style={{ marginTop: 2 }} />
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700 }}>Auto-Sync to Tenant</h4>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Matched emails will update tenant rent scores automatically.</p>
                </div>
              </div>
              <div style={{ textAlign: 'left', display: 'flex', gap: 12, maxWidth: 240 }}>
                <Check size={20} color="var(--forest)" style={{ marginTop: 2 }} />
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700 }}>Occupancy Tracking</h4>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>History updates unit balance and occupancy records.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .table-container::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .table-container::-webkit-scrollbar-thumb {
          background: #ddd;
          border-radius: 10px;
        }
      `}</style>
    </div>
  )
}
