'use client'

import React, { useState, Suspense, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  ChevronLeft, 
  FileSpreadsheet, 
  Download, 
  Plus, 
  X, 
  Trash2, 
  AlertCircle, 
  CheckCircle2,
  Info,
  Building2,
  User,
  Home,
  CreditCard
} from 'lucide-react'
import Papa from 'papaparse'
import { useToast } from '@/components/common/Toast'
import { cn } from '@/lib/utils'
import { useProperties, useBulkCreateUnits, useBulkFullImport } from '@/features/pm/hooks/useProperties'
import { isValidPhoneNumber } from 'libphonenumber-js'

type ImportMode = 'full' | 'units'

interface ColumnDef {
  key: string
  label: string
  category: 'property' | 'landlord' | 'tenant' | 'unit' | 'payment'
  required?: boolean
  type?: 'text' | 'number' | 'email' | 'tel' | 'date' | 'select'
  options?: string[]
}

const FULL_COLUMNS: ColumnDef[] = [
  { key: 'propertyName', label: 'Property Name', category: 'property', required: true },
  { key: 'propertyAddress', label: 'Address', category: 'property', required: true },
  { key: 'propertyType', label: 'Type', category: 'property', type: 'select', options: ['Residential', 'Commercial', 'Industrial'] },
  { key: 'propertyCountry', label: 'Country', category: 'property' },
  { key: 'propertyState', label: 'State', category: 'property' },
  { key: 'propertyArea', label: 'Area', category: 'property' },
  
  { key: 'landlordFirstName', label: 'Landlord First', category: 'landlord' },
  { key: 'landlordLastName', label: 'Landlord Last', category: 'landlord' },
  { key: 'landlordEmail', label: 'Landlord Email', category: 'landlord', type: 'email' },
  { key: 'landlordPhone', label: 'Landlord Phone', category: 'landlord', type: 'tel' },

  { key: 'tenantFirstName', label: 'Tenant First', category: 'tenant', required: true },
  { key: 'tenantLastName', label: 'Tenant Last', category: 'tenant', required: true },
  { key: 'tenantEmail', label: 'Tenant Email', category: 'tenant', required: true, type: 'email' },
  { key: 'tenantPhone', label: 'Tenant Phone', category: 'tenant', type: 'tel' },

  { key: 'unitName', label: 'Unit Name', category: 'unit', required: true },
  { key: 'unitRentAmount', label: 'Rent Amount', category: 'unit', required: true, type: 'number' },
  { key: 'unitRentAmountPaid', label: 'Amount Paid', category: 'unit', type: 'number' },
  { key: 'unitRentType', label: 'Rent Type', category: 'unit', type: 'select', options: ['Monthly', 'Quarterly', 'Annually'] },
  { key: 'unitCurrency', label: 'Currency', category: 'unit', type: 'select', options: ['NGN', 'USD', 'GBP', 'EUR'] },
  { key: 'unitRentStartDate', label: 'Start Date', category: 'unit', type: 'date' },
  { key: 'unitRentDueDate', label: 'Due Date', category: 'unit', type: 'date' },
  { key: 'unitManagementFee', label: 'Mgmt Fee', category: 'unit', type: 'number' },
  { key: 'unitNotes', label: 'Notes', category: 'unit' },
]

const UNIT_COLUMNS: ColumnDef[] = [
  { key: 'unitName', label: 'Unit Name', category: 'unit', required: true },
  { key: 'tenantFirstName', label: 'Tenant First', category: 'tenant', required: true },
  { key: 'tenantLastName', label: 'Tenant Last', category: 'tenant', required: true },
  { key: 'tenantEmail', label: 'Tenant Email', category: 'tenant', required: true, type: 'email' },
  { key: 'tenantPhone', label: 'Tenant Phone', category: 'tenant', type: 'tel' },
  { key: 'rentAmount', label: 'Rent Amount', category: 'unit', required: true, type: 'number' },
  { key: 'rentAmountPaid', label: 'Amount Paid', category: 'unit', type: 'number' },
  { key: 'rentStartDate', label: 'Start Date', category: 'unit', type: 'date' },
  { key: 'rentDueDate', label: 'Due Date', category: 'unit', type: 'date' },
  { key: 'rentType', label: 'Rent Type', category: 'unit', type: 'select', options: ['Monthly', 'Quarterly', 'Annually'] },
  { key: 'managementFee', label: 'Mgmt Fee', category: 'unit', type: 'number' },
  { key: 'currency', label: 'Currency', category: 'unit', type: 'select', options: ['NGN', 'USD', 'GBP', 'EUR'] },
  { key: 'notes', label: 'Notes', category: 'unit' },
]

function ImportContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mode = (searchParams.get('mode') as ImportMode) || 'full'
  
  const { success, info, error } = useToast()
  const { data: properties = [] } = useProperties()
  const bulkCreateUnitsMutation = useBulkCreateUnits()
  const bulkFullImportMutation = useBulkFullImport()

  const [targetPropertyUuid, setTargetPropertyUuid] = useState('')
  const [previewRows, setPreviewRows] = useState<any[]>([])
  const [inviteAfterImport, setInviteAfterImport] = useState(true)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const columns = useMemo(() => mode === 'full' ? FULL_COLUMNS : UNIT_COLUMNS, [mode])

  const handleDownloadTemplate = () => {
    const headers = columns.map(c => c.label)
    
    // Mock data for template - matching column count exactly
    const rows = mode === 'full' ? [
      ['Emerald Court', '12 Admiralty Way, Lekki', 'Residential', 'Nigeria', 'Lagos', 'Lekki Phase 1', 'Alice', 'Owner', 'alice@landlord.com', '+2348011112222', 'John', 'Doe', 'john@tenant.com', '+2348033334444', 'Apt 101', '2500000', '2500000', 'Annually', 'NGN', '2024-01-01', '2025-01-01', '250000', 'Internal memo for unit'],
      ['Emerald Court', '12 Admiralty Way, Lekki', 'Residential', 'Nigeria', 'Lagos', 'Lekki Phase 1', 'Alice', 'Owner', 'alice@landlord.com', '+2348011112222', 'Jane', 'Smith', 'jane@tenant.com', '+2348033335555', 'Apt 102', '150000', '0', 'Monthly', 'NGN', '2024-02-01', '2024-03-01', '15000', ''],
    ] : [
      ['101', 'John', 'Doe', 'john@example.com', '+2348012345678', '2000000', '2000000', '2024-01-01', '2024-05-01', 'Monthly', '200000', 'NGN', 'Imported memo'],
    ]

    const csvContent = [headers, ...rows].map(e => e.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `upward_${mode}_import_template.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    success('Template downloaded!')
  }

  const validateCell = (rowId: number, field: string, value: any, colDef?: ColumnDef) => {
    let errorMsg = ''
    const config = colDef || columns.find(c => c.key === field)
    
    if (config?.required && !value && value !== 0) {
      errorMsg = 'Required'
    } else if (config?.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errorMsg = 'Invalid email'
    } else if (config?.type === 'tel' && value && !isValidPhoneNumber(value)) {
      errorMsg = 'Invalid phone'
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

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        const rows = results.data.map((row: any, index: number) => {
          const rowId = Date.now() + index
          const mappedRow: any = { id: rowId }
          
          columns.forEach(col => {
            const val = row[col.label] || ''
            if (col.type === 'number') {
              mappedRow[col.key] = val ? parseFloat(val.toString().replace(/[^0-9.]/g, '')) : 0
            } else {
              mappedRow[col.key] = val
            }
            // Perform initial validation
            validateCell(rowId, col.key, mappedRow[col.key], col)
          })
          
          return mappedRow
        })
        setPreviewRows(rows)
        info(`Previewing ${rows.length} records.`)
      }
    })
    e.target.value = ''
  }

  const updateRow = (index: number, field: string, value: any) => {
    const updated = [...previewRows]
    updated[index][field] = value
    setPreviewRows(updated)
    validateCell(updated[index].id, field, value)
  }

  const addRow = () => {
    const rowId = Date.now()
    const newRow: any = { id: rowId }
    columns.forEach(col => {
      newRow[col.key] = col.type === 'number' ? 0 : (col.type === 'select' ? col.options?.[0] : '')
      validateCell(rowId, col.key, newRow[col.key], col)
    })
    setPreviewRows([...previewRows, newRow])
  }

  const handleConfirmImport = () => {
    if (mode === 'units' && !targetPropertyUuid) return error("Select a property first")
    if (previewRows.length === 0) return error("No data to import")
    
    if (Object.keys(validationErrors).length > 0) {
      return error("Please fix the highlighted errors before importing.")
    }

    if (mode === 'full') {
      const rowsToSend = previewRows.map(({ id, ...rest }) => rest)
      bulkFullImportMutation.mutate({ rows: rowsToSend, inviteAfterImport }, {
        onSuccess: (res) => {
          success(`Imported ${res.unitsCreated} units across ${res.propertiesCreated} properties!`)
          router.push('/properties')
        }
      })
    } else {
      const unitsToSend = previewRows.map(({ id, ...rest }) => rest)
      bulkCreateUnitsMutation.mutate({ 
        propertyUuid: targetPropertyUuid, 
        units: unitsToSend,
        inviteAfterImport 
      } as any, {
        onSuccess: () => {
          success('Units imported successfully!')
          router.push('/properties')
        }
      })
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'property': return <Building2 size={14} />
      case 'landlord': return <User size={14} />
      case 'tenant': return <User size={14} />
      case 'unit': return <Home size={14} />
      case 'payment': return <CreditCard size={14} />
      default: return null
    }
  }

  return (
    <div className="import-page">
      <header className="import-header">
        <div className="header-left">
          <button className="btn-icon" onClick={() => router.back()}><ChevronLeft size={20} /></button>
          <div>
            <h1 className="dashboard__title">
              {mode === 'full' ? 'Full Property & Tenant Import' : 'Bulk Units Import'}
            </h1>
            <p className="dashboard__subtitle">
              {mode === 'full' ? 'Onboard new properties and their tenants in one shot.' : 'Add multiple units to an existing property.'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn--secondary" onClick={handleDownloadTemplate}>
            <Download size={18} /> Download Template
          </button>
        </div>
      </header>

      <div className="import-container">
        <div className="import-config">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 20 }}>
            {mode === 'units' && (
              <div className="form-group" style={{ maxWidth: 350, flex: 1, marginBottom: 0 }}>
                <label className="form-label">Target Property</label>
                <select className="form-input" value={targetPropertyUuid} onChange={e => setTargetPropertyUuid(e.target.value)}>
                  <option value="">-- Choose Property --</option>
                  {properties.map((p: any) => <option key={p.uuid} value={p.uuid}>{p.name}</option>)}
                </select>
              </div>
            )}
            
            <div className="import-toggles">
              <div className="toggle-item">
                <input 
                  type="checkbox" 
                  id="inviteToggle" 
                  checked={inviteAfterImport} 
                  onChange={e => setInviteAfterImport(e.target.checked)}
                />
                <label htmlFor="inviteToggle">Invite tenants to Upward immediately</label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <label className={cn('btn btn--primary', (mode === 'units' && !targetPropertyUuid) && 'btn--disabled')}>
                <FileSpreadsheet size={18} /> {previewRows.length > 0 ? 'Upload Different File' : 'Upload CSV'}
                <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileUpload} disabled={mode === 'units' && !targetPropertyUuid} />
              </label>
            </div>
          </div>
        </div>

        {previewRows.length > 0 ? (
          <>
            <div className="import-preview">
               <div className="import-preview__header">
                 <div className="header-info">
                   <h3>Preview Data</h3>
                   <span className="badge">{previewRows.length} rows</span>
                   {Object.keys(validationErrors).length > 0 && (
                     <span className="badge badge--error">
                       <AlertCircle size={12} /> {Object.keys(validationErrors).length} errors
                     </span>
                   )}
                 </div>
                 <button className="btn btn--secondary btn--sm" onClick={addRow}><Plus size={14} /> Add Row</button>
               </div>
               
               <div className="import-table-container">
                 <table className="import-table">
                   <thead>
                     <tr>
                        {columns.map(col => (
                          <th key={col.key} className={cn('col-' + col.category)}>
                            <div className="th-content">
                              {getCategoryIcon(col.category)}
                              <span>{col.label}</span>
                              {col.required && <span className="req">*</span>}
                            </div>
                          </th>
                        ))}
                        <th className="sticky-action"></th>
                     </tr>
                   </thead>
                   <tbody>
                     {previewRows.map((row, i) => (
                       <tr key={row.id}>
                         {columns.map(col => (
                           <td key={col.key}>
                             {col.type === 'select' ? (
                               <select 
                                 className={cn('form-input', validationErrors[`${row.id}-${col.key}`] && 'form-input--error')}
                                 value={row[col.key]}
                                 onChange={e => updateRow(i, col.key, e.target.value)}
                               >
                                 {col.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                               </select>
                             ) : (
                               <div className="input-wrapper">
                                 <input 
                                   type={col.type === 'number' ? 'number' : 'text'}
                                   className={cn('form-input', validationErrors[`${row.id}-${col.key}`] && 'form-input--error')}
                                   value={row[col.key]}
                                   onChange={e => updateRow(i, col.key, col.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                                   placeholder={col.label}
                                 />
                                 {validationErrors[`${row.id}-${col.key}`] && (
                                   <div className="error-tooltip">{validationErrors[`${row.id}-${col.key}`]}</div>
                                 )}
                               </div>
                             )}
                           </td>
                         ))}
                         <td className="sticky-action">
                            <button className="btn-icon btn-icon--danger" onClick={() => setPreviewRows(previewRows.filter(r => r.id !== row.id))} title="Remove row">
                              <Trash2 size={16} />
                            </button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
            
            <div className="import-footer">
               <div className="footer-stats">
                 <p>Total Units: <strong>{previewRows.length}</strong></p>
                 <p>Total Properties: <strong>{new Set(previewRows.map(r => r.propertyName)).size}</strong></p>
               </div>
               <div style={{ display: 'flex', gap: 12 }}>
                 <button className="btn btn--secondary" onClick={() => {
                   if(confirm('Clear all preview data?')) {
                     setPreviewRows([])
                     setValidationErrors({})
                   }
                 }}>Reset</button>
                 <button className="btn btn--primary" onClick={handleConfirmImport} disabled={bulkFullImportMutation.isPending || bulkCreateUnitsMutation.isPending || Object.keys(validationErrors).length > 0}>
                   {bulkFullImportMutation.isPending || bulkCreateUnitsMutation.isPending ? 'Processing...' : 'Confirm & Save All'}
                 </button>
               </div>
            </div>
          </>
        ) : (
          <div className="import-empty">
             <div className="empty-card">
               <FileSpreadsheet size={48} className="empty-icon" />
               <h3>Start your import</h3>
               <p>Download our CSV template, fill it with your property and tenant data, then upload it here to preview and save.</p>
               <div className="empty-actions">
                 <button className="btn btn--secondary" onClick={handleDownloadTemplate}><Download size={18} /> Template</button>
                 <label className={cn('btn btn--primary', (mode === 'units' && !targetPropertyUuid) && 'btn--disabled')}>
                   <FileSpreadsheet size={18} /> Upload CSV
                   <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileUpload} disabled={mode === 'units' && !targetPropertyUuid} />
                 </label>
               </div>
               {mode === 'units' && !targetPropertyUuid && (
                 <p className="empty-warning"><Info size={14} /> Please select a target property first</p>
               )}
             </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .import-page { width: 100%; display: flex; flex-direction: column; gap: 24px; padding-bottom: 40px; max-width: var(--max-width); margin: 0 auto; }
        .import-header { display: flex; justify-content: space-between; align-items: center; padding-top: 24px; }
        .header-left { display: flex; align-items: center; gap: 16px; }
        
        .import-container { background: var(--surface); border-radius: var(--radius-lg); border: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; box-shadow: var(--shadow-lg); }
        .import-config { padding: 24px; border-bottom: 1px solid var(--border); background: var(--ivory-dim); }
        
        .import-toggles { display: flex; gap: 24px; align-items: center; }
        .toggle-item { display: flex; alignItems: center; gap: 12px; background: var(--surface); padding: 10px 16px; borderRadius: var(--radius-md); border: 1px solid var(--border); }
        .toggle-item input { width: 18px; height: 18px; cursor: pointer; }
        .toggle-item label { font-size: 13px; font-weight: 500; cursor: pointer; color: var(--text-secondary); }

        .import-preview { display: flex; flex-direction: column; }
        .import-preview__header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; background: var(--surface); }
        .header-info { display: flex; align-items: center; gap: 12px; }
        .badge { background: var(--ivory-dark); padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; color: var(--text-secondary); }
        .badge--error { background: var(--error-bg); color: var(--error); display: flex; align-items: center; gap: 4px; }

        .import-table-container { 
          overflow-x: auto; 
          max-height: calc(100vh - 400px); 
          min-height: 400px; 
          border-top: 1px solid var(--border); 
          scrollbar-width: thin;
          scrollbar-color: var(--border) transparent;
        }
        .import-table-container::-webkit-scrollbar { height: 8px; width: 8px; }
        .import-table-container::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 10px; }
        
        .import-table { 
          width: 100%; 
          border-collapse: separate; 
          border-spacing: 0; 
          font-size: 13px; 
        }
        .import-table th { 
          padding: 12px 16px; 
          text-align: left; 
          font-weight: 600; 
          background: var(--ivory-dim); 
          position: sticky; 
          top: 0; 
          z-index: 10; 
          border-bottom: 2px solid var(--border-strong); 
          white-space: nowrap;
          min-width: 180px;
        }
        .th-content { display: flex; align-items: center; gap: 8px; color: var(--text-secondary); }
        .req { color: var(--error); margin-left: 2px; }

        .import-table th:first-child,
        .import-table td:first-child {
          position: sticky;
          left: 0;
          z-index: 20;
          background: var(--surface);
          border-right: 2px solid var(--border-strong);
        }
        .import-table th:first-child { 
          z-index: 30; 
          background: var(--ivory-dim);
        }
        .import-table tr:hover td:first-child {
          background: var(--surface-hover);
        }

        .col-property { background: #fdf4ff !important; }
        .col-landlord { background: #f0fdf4 !important; }
        .col-tenant { background: #eff6ff !important; }
        .col-unit { background: #fffbeb !important; }

        .import-table td { padding: 8px 12px; border-bottom: 1px solid var(--border); transition: background 0.2s; }
        .import-table tr:hover td { background: var(--surface-hover); }
        
        .input-wrapper { position: relative; }
        .import-table .form-input { 
          width: 100%; 
          padding: 8px 12px; 
          background: transparent; 
          border: 1px solid transparent;
          border-radius: var(--radius-sm);
          font-size: 13px;
        }
        .import-table .form-input:focus { background: var(--surface); border-color: var(--forest); }
        .form-input--error { border-color: var(--error) !important; background: var(--error-bg) !important; }
        
        .error-tooltip {
          position: absolute;
          bottom: 100%;
          left: 0;
          background: var(--error);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 10px;
          white-space: nowrap;
          z-index: 100;
          pointer-events: none;
          margin-bottom: 4px;
          display: none;
        }
        .input-wrapper:hover .error-tooltip { display: block; }

        .import-footer { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; background: var(--surface); border-top: 2px solid var(--border); }
        .footer-stats { display: flex; gap: 24px; font-size: 14px; color: var(--text-secondary); }
        
        .sticky-action { position: sticky; right: 0; background: var(--surface) !important; border-left: 2px solid var(--border); z-index: 15; text-align: center; min-width: 60px !important; }
        .btn-icon--danger:hover { background: var(--error-bg); color: var(--error); }

        .import-empty { padding: 80px 24px; display: flex; justify-content: center; }
        .empty-card { max-width: 500px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px; }
        .empty-icon { color: var(--forest); opacity: 0.15; margin-bottom: 12px; }
        .empty-card h3 { font-size: 20px; font-weight: 700; color: var(--text); }
        .empty-card p { color: var(--text-muted); line-height: 1.6; }
        .empty-actions { display: flex; gap: 16px; margin-top: 12px; }
        .empty-warning { font-size: 13px; color: var(--warning); display: flex; align-items: center; gap: 6px; }

        @media (max-width: 768px) {
          .import-header { flex-direction: column; align-items: flex-start; gap: 16px; }
          .import-footer { flex-direction: column; gap: 16px; align-items: flex-start; }
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