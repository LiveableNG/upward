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
      ["101", "John", "Doe", "john@example.com", "08012345678", "2000000", "2024-01-01", "2024-05-01", "Monthly"],
      ["102", "Jane", "Smith", "jane@example.com", "08012345679", "1500000", "2024-02-01", "2024-06-01", "Monthly"],
      ["201", "Alice", "Johnson", "alice@example.com", "08012345680", "3000000", "2024-03-01", "2024-07-01", "Annually"],
      ["202", "Bob", "Brown", "bob@example.com", "08012345681", "2500000", "2024-04-01", "2024-08-01", "Bi-Annually"]
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
          status: 'OCCUPIED'
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
      status: 'OCCUPIED' 
    }])
  }

  const updateRow = (index: number, field: string, value: any) => {
    const newArr = [...previewUnits]
    newArr[index][field] = value
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
                    <th>Unit Name</th>
                    <th>TenantFirstName</th>
                    <th>TenantLastName</th>
                    <th>TenantEmail</th>
                    <th>TenantPhone</th>
                    <th>Rent Amount</th>
                    <th>RentStartDate</th>
                    <th>RentDueDate</th>
                    <th>RentFrequency</th>
                    <th></th>
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
                      <td>
                        <button className="btn-icon btn-icon--danger" onClick={() => removeRow(u.id)}>
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="import-footer">
              <button className="btn btn--secondary" onClick={() => setPreviewUnits([])}>
                Reset
              </button>
              <button className="btn btn--primary" onClick={handleConfirmImport} disabled={bulkCreateUnitsMutation.isPending}>
                {bulkCreateUnitsMutation.isPending ? 'Importing...' : 'Confirm & Save All'}
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .import-page {
          padding: 32px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .import-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }
        .import-container {
          background: var(--surface);
          border-radius: 16px;
          border: 1px solid var(--border);
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.05);
        }
        .import-config {
          padding: 24px;
          border-bottom: 1px solid var(--border);
          background: var(--bg);
        }
        .import-dropzone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px;
          border: 2px dashed var(--border);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 20px;
          background: var(--surface);
        }
        .import-dropzone:hover {
          border-color: var(--clay);
          background: var(--surface-hover);
        }
        .import-dropzone--disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .import-dropzone__icon {
          color: var(--clay);
          margin-bottom: 16px;
        }
        .import-preview {
          padding: 24px;
        }
        .import-preview__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .import-table-container {
          overflow-x: auto;
          margin-bottom: 24px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--surface);
          width: 100%;
        }
        .import-table {
          width: 100%;
          min-width: 1200px;
          border-collapse: collapse;
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
        }
        .import-table td {
          padding: 8px 12px;
          border-top: 1px solid var(--border);
          min-width: 120px;
        }
        .import-table td:first-child {
          min-width: 150px;
        }
        .import-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding-top: 24px;
          border-top: 1px solid var(--border);
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
