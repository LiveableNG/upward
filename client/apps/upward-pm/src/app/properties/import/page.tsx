'use client'

import React, { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, FileSpreadsheet, Download, Plus, X } from 'lucide-react'
import Papa from 'papaparse'
import { useToast } from '@/components/common/Toast'
import { cn } from '@/lib/utils'
import { useProperties, useBulkCreateUnits } from '@/features/pm/hooks/useProperties'

function ImportContent() {
  const router = useRouter()
  const { success, info, error } = useToast()
  const { data: properties } = useProperties()
  const bulkCreateUnitsMutation = useBulkCreateUnits()

  const [targetPropertyUuid, setTargetPropertyUuid] = useState('')
  const [previewUnits, setPreviewUnits] = useState<any[]>([])

  const handleDownloadTemplate = () => {
    const headers = ["Unit Name", "TenantFirstName", "TenantLastName", "TenantEmail", "TenantPhone", "Rent Amount", "RentStartDate", "RentDueDate", "RentFrequency"]
    const rows = [
      ["101", "John", "Doe", "john@example.com", "+2348012345678", "2000000", "2024-01-01", "2024-05-01", "Monthly"],
      ["102", "Jane", "Smith", "jane@example.com", "+2348012345679", "1500000", "2024-02-01", "2024-06-01", "Monthly"],
      ["201", "Alice", "Johnson", "alice@example.com", "+2348012345680", "3000000", "2024-03-01", "2024-07-01", "Annually"],
      ["202", "Bob", "Brown", "bob@example.com", "+2348012345681", "2500000", "2024-04-01", "2024-08-01", "Bi-Annually"]
    ]
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "upward_units_template.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    success('Template downloaded!')
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        const parsedUnits = results.data.map((row: any, index: number) => ({
          id: Date.now() + index,
          unitName: row['Unit Name'] || '',
          tenantFirstName: row['TenantFirstName'] || '',
          tenantLastName: row['TenantLastName'] || '',
          tenantEmail: row['TenantEmail'] || '', 
          tenantPhone: row['TenantPhone'] || '', 
          rentAmount: parseFloat((row['Rent Amount'] || '0').toString().replace(/[^0-9.]/g, '')) || 0,
          rentStartDate: row['RentStartDate'] || '',
          rentDueDate: row['RentDueDate'] || '',
          rentFrequency: row['RentFrequency'] || 'Monthly',
          status: (row['TenantEmail']?.trim() || row['TenantFirstName']?.trim() || row['TenantLastName']?.trim()) ? 'OCCUPIED' : 'VACANT'
        })).filter((u: any) => u.unitName);
        
        info(`Previewing ${parsedUnits.length} units. Review and confirm.`)
        setPreviewUnits(parsedUnits)
      },
      error: () => error('Error parsing CSV file.')
    })
    e.target.value = ''
  }

  const handleConfirmImport = () => {
    if (!targetPropertyUuid) return error('Please select a property first')
    if (previewUnits.length === 0) return error('No units to import')

    const invalidPhones = previewUnits.filter(u => u.tenantPhone && !/^\+234\d{10}$/.test(u.tenantPhone))
    if (invalidPhones.length > 0) {
      return error(`Some rows have invalid phone formats. Must be +2348000000000`)
    }

    const unitsToImport = previewUnits.map(({ id, ...rest }) => rest)
    bulkCreateUnitsMutation.mutate({ propertyUuid: targetPropertyUuid, units: unitsToImport }, {
      onSuccess: (data: any) => {
        success(`Successfully imported ${data.count} units!`)
        router.push('/properties')
      },
      onError: () => error('Failed to import units.')
    })
  }

  const addRow = () => {
    setPreviewUnits([...previewUnits, { 
      id: Date.now(), 
      unitName: '', 
      tenantFirstName: '', 
      tenantLastName: '', 
      tenantEmail: '',
      tenantPhone: '',
      rentAmount: 0, 
      rentStartDate: '',
      rentDueDate: '',
      rentFrequency: 'Monthly',
      status: 'VACANT' 
    }])
  }

  const updateRow = (index: number, field: string, value: any) => {
    const newArr = [...previewUnits]
    newArr[index][field] = value
    
    // Auto-update status based on tenant info presence
    const row = newArr[index]
    row.status = (row.tenantEmail?.trim() || row.tenantFirstName?.trim() || row.tenantLastName?.trim()) ? 'OCCUPIED' : 'VACANT'
    
    setPreviewUnits(newArr)
  }

  const removeRow = (id: any) => {
    setPreviewUnits(previewUnits.filter(u => u.id !== id))
  }

  return (
    <div className="import-page animate-fade-in">
      <header className="import-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn-icon" onClick={() => router.back()}>
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="dashboard__title">Bulk Import Units</h1>
            <p className="dashboard__subtitle">Select a property and upload your units list.</p>
          </div>
        </div>
        <div className="import-header__actions">
          <button className="btn btn--secondary" onClick={handleDownloadTemplate}>
            <Download size={18} />
            Template
          </button>
        </div>
      </header>

      <div className="import-container">
        <div className="import-config">
          <div className="form-group" style={{ maxWidth: 400 }}>
            <label className="form-label">Target Property</label>
            <select 
              className="form-input" 
              value={targetPropertyUuid} 
              onChange={e => setTargetPropertyUuid(e.target.value)}
            >
              <option value="">-- Select Property --</option>
              {properties.map(p => <option key={p.uuid} value={p.uuid}>{p.name}</option>)}
            </select>
          </div>

          {previewUnits.length === 0 && (
            <label className={cn("import-dropzone", !targetPropertyUuid && "import-dropzone--disabled")}>
              <div className="import-dropzone__icon">
                <FileSpreadsheet size={48} />
              </div>
              <h3>Click to upload CSV</h3>
              <p>Ensure your file matches the template structure.</p>
              <input type="file" accept=".csv" style={{display: 'none'}} onChange={handleFileUpload} disabled={!targetPropertyUuid} />
            </label>
          )}
        </div>

        {previewUnits.length > 0 && (
          <div className="import-preview">
            <div className="import-preview__header">
              <h3>Preview & Edit ({previewUnits.length} units)</h3>
              <button className="btn btn--secondary btn--sm" onClick={addRow}>
                <Plus size={14} /> Add Row
              </button>
            </div>
            
            <div className="import-table-container">
              <table className="import-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: '100px', position: 'sticky', top: 0, background: 'var(--surface-hover)', zIndex: 10 }}>Unit</th>
                    <th style={{ minWidth: '150px', position: 'sticky', top: 0, background: 'var(--surface-hover)', zIndex: 10 }}>First Name</th>
                    <th style={{ minWidth: '150px', position: 'sticky', top: 0, background: 'var(--surface-hover)', zIndex: 10 }}>Last Name</th>
                    <th style={{ minWidth: '200px', position: 'sticky', top: 0, background: 'var(--surface-hover)', zIndex: 10 }}>Email</th>
                    <th style={{ minWidth: '150px', position: 'sticky', top: 0, background: 'var(--surface-hover)', zIndex: 10 }}>Phone</th>
                    <th style={{ minWidth: '140px', position: 'sticky', top: 0, background: 'var(--surface-hover)', zIndex: 10 }}>Rent Amount</th>
                    <th style={{ minWidth: '160px', position: 'sticky', top: 0, background: 'var(--surface-hover)', zIndex: 10 }}>Start Date</th>
                    <th style={{ minWidth: '160px', position: 'sticky', top: 0, background: 'var(--surface-hover)', zIndex: 10 }}>Due Date</th>
                    <th style={{ minWidth: '170px', position: 'sticky', top: 0, background: 'var(--surface-hover)', zIndex: 10 }}>Frequency</th>
                    <th style={{ 
                      minWidth: '60px', 
                      position: 'sticky', 
                      top: 0, 
                      right: 0, 
                      background: 'var(--surface-hover)', 
                      zIndex: 20, 
                      borderLeft: '1px solid var(--border)',
                      boxShadow: '-4px 0 10px rgba(0,0,0,0.05)'
                    }}></th>
                  </tr>
                </thead>
                <tbody>
                  {previewUnits.map((u, i) => (
                    <tr key={u.id}>
                      <td>
                        <input className="form-input" value={u.unitName} onChange={e => updateRow(i, 'unitName', e.target.value)} />
                      </td>
                      <td>
                        <input className="form-input" value={u.tenantFirstName} onChange={e => updateRow(i, 'tenantFirstName', e.target.value)} />
                      </td>
                      <td>
                        <input className="form-input" value={u.tenantLastName} onChange={e => updateRow(i, 'tenantLastName', e.target.value)} />
                      </td>
                      <td>
                        <input className="form-input" value={u.tenantEmail} onChange={e => updateRow(i, 'tenantEmail', e.target.value)} />
                      </td>
                      <td>
                        <input className="form-input" value={u.tenantPhone} onChange={e => updateRow(i, 'tenantPhone', e.target.value)} />
                      </td>
                      <td>
                        <input type="number" className="form-input" value={u.rentAmount} onChange={e => updateRow(i, 'rentAmount', parseFloat(e.target.value) || 0)} />
                      </td>
                      <td>
                        <input type="date" className="form-input" value={u.rentStartDate} onChange={e => updateRow(i, 'rentStartDate', e.target.value)} />
                      </td>
                      <td>
                        <input type="date" className="form-input" value={u.rentDueDate} onChange={e => updateRow(i, 'rentDueDate', e.target.value)} />
                      </td>
                      <td>
                        <select className="form-input" value={u.rentFrequency} onChange={e => updateRow(i, 'rentFrequency', e.target.value)}>
                          <option value="Monthly">Monthly</option>
                          <option value="Quarterly">Quarterly</option>
                          <option value="Bi-Annually">Bi-Annually</option>
                          <option value="Annually">Annually</option>
                        </select>
                      </td>
                      <td style={{ 
                        position: 'sticky', 
                        right: 0, 
                        background: 'var(--surface)', 
                        borderLeft: '1px solid var(--border)', 
                        zIndex: 5,
                        boxShadow: '-4px 0 10px rgba(0,0,0,0.05)'
                      }}>
                        <button className="btn-icon btn-icon--danger" onClick={() => removeRow(u.id)}>
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {previewUnits.length > 0 && (
          <div className="import-footer">
            <button className="btn btn--secondary" onClick={() => setPreviewUnits([])}>
              Reset
            </button>
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                className="btn btn--primary" 
                onClick={handleConfirmImport} 
                disabled={bulkCreateUnitsMutation.isPending}
              >
                {bulkCreateUnitsMutation.isPending ? 'Importing...' : 'Confirm & Save All'}
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .import-page {
          padding: 0;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }
        .import-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-6) 0 0 0;
        }
        .import-container {
            background: var(--surface);
            border-radius: var(--radius-lg);
            border: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            margin-bottom: var(--space-8);
          }
        .import-config {
          padding: var(--space-6);
          border-bottom: 1px solid var(--border);
          background: var(--ivory-dim);
        }
        .import-dropzone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px;
          border: 2px dashed var(--border);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s;
          margin-top: var(--space-5);
          background: var(--surface);
        }
        .import-dropzone:hover {
          border-color: var(--forest);
          background: var(--surface-hover);
        }
        .import-dropzone--disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .import-dropzone__icon {
          color: var(--forest);
          margin-bottom: var(--space-4);
        }
        .import-preview {
          display: flex;
          flex-direction: column;
        }
        .import-preview__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-6) var(--space-6) var(--space-4) var(--space-6);
        }
        .import-table-container {
          overflow: auto;
          border-top: 1px solid var(--border);
          background: var(--surface);
          width: 100%;
          max-height: calc(100vh - 320px);
          min-height: 400px;
        }
        .import-table {
          width: max-content;
          min-width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 13px;
        }
        .import-table th {
          background: var(--surface-hover);
          padding: 14px 12px;
          text-align: left;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-size: 11px;
          white-space: nowrap;
          border-bottom: 1px solid var(--border);
          position: sticky;
          top: 0;
          z-index: 20;
        }
        .import-table td {
          padding: 8px 12px;
          border-bottom: 1px solid var(--border);
        }
        .import-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-5) var(--space-6);
          width: 100%;
          background: var(--surface);
          border-top: 1px solid var(--border);
          border-radius: 0 0 var(--radius-lg) var(--radius-lg);
        }
        .btn-icon {
          background: none;
          border: none;
          color: var(--text);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
        }
        .btn-icon:hover {
          background: var(--surface-hover);
        }
        .btn-icon--danger:hover {
          background: var(--error-light);
          color: var(--error);
        }
        .btn--sm {
          padding: 6px 12px;
          font-size: 12px;
        }
      `}</style>
    </div>
  )
}

export default function ImportPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ImportContent />
    </Suspense>
  )
}