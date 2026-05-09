'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  FileSpreadsheet, 
  Download, 
  Plus, 
  Trash2, 
  AlertCircle, 
  Building2,
  User,
  Home,
  CreditCard,
  Info
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
  { key: 'unitRentType', label: 'Rent Type', category: 'unit', type: 'select', options: ['Monthly', 'Annually'] },
  { key: 'unitCurrency', label: 'Currency', category: 'unit', type: 'select', options: ['NGN', 'USD', 'GBP', 'EUR'] },
  { key: 'unitRentStartDate', label: 'Start Date', category: 'unit', type: 'date' },
  { key: 'unitRentDueDate', label: 'Due Date', category: 'unit', type: 'date' },
  { key: 'unitManagementFee', label: 'Mgmt Fee', category: 'unit', type: 'number' },
  { key: 'unitNotes', label: 'Notes', category: 'unit' },
  { key: 'unitType', label: 'Unit Type', category: 'unit', type: 'select', options: ['Flat / Apartment', 'Duplex', 'Shared Apartment', 'Studio', 'Bungalow', '4 Bedroom Semi-detached Duplex', 'Detached Duplex', '2 Bedroom Flat', '2 Bedroom Serviced Flat', '3 Bedroom Flat', '3 Bedroom Serviced Flat', '2 Bedroom Apartment', 'Studio / Self Contained Flat', 'Mini Flat / 1 Bedroom Flat', 'Flats', 'Terrace House', 'Town House', 'Detached House', 'Semi-detached Duplex', 'Semi-detached House', 'Shortlet Apartment', 'Office Space', 'Studio Room / Self-contain', 'Block Of Flats'] },
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
  { key: 'rentType', label: 'Rent Type', category: 'unit', type: 'select', options: ['Monthly', 'Annually'] },
  { key: 'managementFee', label: 'Mgmt Fee', category: 'unit', type: 'number' },
  { key: 'currency', label: 'Currency', category: 'unit', type: 'select', options: ['NGN', 'USD', 'GBP', 'EUR'] },
  { key: 'notes', label: 'Notes', category: 'unit' },
  { key: 'unitType', label: 'Unit Type', category: 'unit', type: 'select', options: ['Flat / Apartment', 'Duplex', 'Shared Apartment', 'Studio', 'Bungalow', '4 Bedroom Semi-detached Duplex', 'Detached Duplex', '2 Bedroom Flat', '2 Bedroom Serviced Flat', '3 Bedroom Flat', '3 Bedroom Serviced Flat', '2 Bedroom Apartment', 'Studio / Self Contained Flat', 'Mini Flat / 1 Bedroom Flat', 'Flats', 'Terrace House', 'Town House', 'Detached House', 'Semi-detached Duplex', 'Semi-detached House', 'Shortlet Apartment', 'Office Space', 'Studio Room / Self-contain', 'Block Of Flats'] },
]

export const DataImportTab: React.FC = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialMode = (searchParams.get('mode') as ImportMode) || 'full'
  
  const [mode, setMode] = useState<ImportMode>(initialMode)
  
  useEffect(() => {
    const m = searchParams.get('mode')
    if (m === 'full' || m === 'units') {
      setMode(m as ImportMode)
    }
  }, [searchParams])
  
  const { success, info, error } = useToast()
  const { data: properties = [] } = useProperties()
  const bulkCreateUnitsMutation = useBulkCreateUnits()
  const bulkFullImportMutation = useBulkFullImport()

  const [targetPropertyUuid, setTargetPropertyUuid] = useState('')
  const [previewRows, setPreviewRows] = useState<any[]>([])
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const columns = useMemo(() => mode === 'full' ? FULL_COLUMNS : UNIT_COLUMNS, [mode])

  const handleDownloadTemplate = () => {
    const headers = columns.map(c => c.label)
    
    const rows = mode === 'full' ? [
      // Property 1: 5 Units, same Landlord
      ['Emerald Court', '12 Admiralty Way, Lekki', 'Residential', 'Nigeria', 'Lagos', 'Lekki Phase 1', 'Alice', 'Owner', 'alice@landlord.com', '+2348011112222', 'John', 'Doe', 'john@tenant.com', '+2348033334444', 'Apt 101', '2500000', '2500000', 'Annually', 'NGN', '2024-01-01', '2025-01-01', '250000', 'Tenant with 3 units across 3 properties', 'Flat / Apartment'],
      ['Emerald Court', '12 Admiralty Way, Lekki', 'Residential', 'Nigeria', 'Lagos', 'Lekki Phase 1', 'Alice', 'Owner', 'alice@landlord.com', '+2348011112222', 'Jane', 'Smith', 'jane@tenant.com', '+2348044445555', 'Apt 102', '2500000', '2500000', 'Annually', 'NGN', '2024-01-01', '2025-01-01', '250000', 'Standard Unit', 'Flat / Apartment'],
      ['Emerald Court', '12 Admiralty Way, Lekki', 'Residential', 'Nigeria', 'Lagos', 'Lekki Phase 1', 'Alice', 'Owner', 'alice@landlord.com', '+2348011112222', 'Robert', 'Jackson', 'rob@tenant.com', '+2348055556666', 'Apt 103', '2500000', '0', 'Annually', 'NGN', '2024-01-01', '2025-01-01', '250000', 'Unpaid record', 'Flat / Apartment'],
      ['Emerald Court', '12 Admiralty Way, Lekki', 'Residential', 'Nigeria', 'Lagos', 'Lekki Phase 1', 'Alice', 'Owner', 'alice@landlord.com', '+2348011112222', 'Emily', 'Davis', 'emily@tenant.com', '+2348066667777', 'Apt 104', '2500000', '2500000', 'Annually', 'NGN', '2024-01-01', '2025-01-01', '250000', 'Standard Unit', 'Flat / Apartment'],
      ['Emerald Court', '12 Admiralty Way, Lekki', 'Residential', 'Nigeria', 'Lagos', 'Lekki Phase 1', 'Alice', 'Owner', 'alice@landlord.com', '+2348011112222', 'Michael', 'Brown', 'mike@tenant.com', '+2348077778888', 'Apt 105', '2500000', '2500000', 'Annually', 'NGN', '2024-01-01', '2025-01-01', '250000', 'Property with 5 units total', 'Flat / Apartment'],

      // Property 2: Same Landlord (Alice), Same Tenant (John Doe)
      ['Sapphire Heights', '45 Glover Road, Ikoyi', 'Residential', 'Nigeria', 'Lagos', 'Ikoyi', 'Alice', 'Owner', 'alice@landlord.com', '+2348011112222', 'John', 'Doe', 'john@tenant.com', '+2348033334444', 'Suite 2A', '3500000', '3500000', 'Annually', 'NGN', '2024-02-01', '2025-02-01', '350000', 'Landlord with multiple properties', 'Office Space'],
      ['Sapphire Heights', '45 Glover Road, Ikoyi', 'Residential', 'Nigeria', 'Lagos', 'Ikoyi', 'Alice', 'Owner', 'alice@landlord.com', '+2348011112222', 'Sarah', 'Lee', 'sarah@tenant.com', '+2348088889999', 'Suite 2B', '3500000', '3500000', 'Annually', 'NGN', '2024-02-01', '2025-02-01', '350000', 'Commercial Unit', 'Office Space'],

      // Property 3: New Landlord, Same Tenant (John Doe)
      ['Ruby Terraces', '88 Isaac John St, Ikeja', 'Residential', 'Nigeria', 'Lagos', 'Ikeja GRA', 'Charlie', 'Ventures', 'charlie@ventures.com', '+2348033334444', 'John', 'Doe', 'john@tenant.com', '+2348033334444', 'Flat 1', '1800000', '1800000', 'Annually', 'NGN', '2024-03-01', '2025-03-01', '180000', 'Tenant with 3 units total', 'Flat / Apartment'],
      ['Ruby Terraces', '88 Isaac John St, Ikeja', 'Residential', 'Nigeria', 'Lagos', 'Ikeja GRA', 'Charlie', 'Ventures', 'charlie@ventures.com', '+2348033334444', 'Olivia', 'Taylor', 'olivia@tenant.com', '+2348099990000', 'Flat 2', '1800000', '1800000', 'Annually', 'NGN', '2024-03-01', '2025-03-01', '180000', 'Standard Unit', 'Flat / Apartment'],
    ] : [
      ['101', 'John', 'Doe', 'john@example.com', '+2348012345678', '2000000', '2000000', '2024-01-01', '2024-05-01', 'Monthly', '200000', 'NGN', 'Tenant Unit 1', 'Flat / Apartment'],
      ['102', 'Jane', 'Smith', 'jane@example.com', '+2348023456789', '2500000', '2500000', '2024-02-01', '2025-02-01', 'Annually', '250000', 'NGN', 'Tenant Unit 2', 'Flat / Apartment'],
      ['101', 'John', 'Doe', 'john@example.com', '+2348012345678', '1500000', '1500000', '2024-03-01', '2025-03-01', 'Annually', '150000', 'NGN', 'Tenant Unit 3', 'Flat / Apartment'],
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
            validateCell(rowId, col.key, mappedRow[col.key], col)
          })
          
          return mappedRow
        })
        
        // Filter out duplicates (within the CSV and against the system)
        const seenUnits = new Set<string>()
        const filteredRows = rows.filter((row: any) => {
          const propertyKey = mode === 'full' ? (row.propertyName || '').trim().toLowerCase() : (properties.find(p => p.uuid === targetPropertyUuid)?.name || '').trim().toLowerCase()
          const unitKey = (row.unitName || '').trim().toLowerCase()
          const fullKey = `${propertyKey}|${unitKey}`
          
          if (seenUnits.has(fullKey)) return false
          
          // Check against system
          const existingProp = properties.find(p => p.name.trim().toLowerCase() === propertyKey)
          const unitExists = existingProp?.units?.some((u: any) => u.unitName.trim().toLowerCase() === unitKey)
          
          if (unitExists) return false
          
          seenUnits.add(fullKey)
          return true
        })

        setPreviewRows(filteredRows)
        revalidateDuplicates(filteredRows)
        
        const filteredCount = rows.length - filteredRows.length
        if (filteredCount > 0) {
          info(`Previewing ${filteredRows.length} records. ${filteredCount} duplicates were filtered out.`)
        } else {
          info(`Previewing ${filteredRows.length} records.`)
        }
      }
    })
    e.target.value = ''
  }

  const updateRow = (index: number, field: string, value: any) => {
    const updated = [...previewRows]
    updated[index][field] = value
    setPreviewRows(updated)
    validateCell(updated[index].id, field, value)
    
    // If unitName or propertyName changed, re-validate duplicates
    if (field === 'unitName' || field === 'propertyName') {
      revalidateDuplicates(updated)
    }
  }

  const revalidateDuplicates = (rows: any[]) => {
    const unitMap = new Map<string, number[]>() // key -> array of row indexes
    
    rows.forEach((row, idx) => {
      const propertyKey = mode === 'full' ? (row.propertyName || '').trim().toLowerCase() : (properties.find(p => p.uuid === targetPropertyUuid)?.name || '').trim().toLowerCase()
      const unitKey = (row.unitName || '').trim().toLowerCase()
      
      if (unitKey) {
        const fullKey = `${propertyKey}|${unitKey}`
        if (!unitMap.has(fullKey)) unitMap.set(fullKey, [])
        unitMap.get(fullKey)!.push(idx)

      }
    })

    setValidationErrors(prev => {
      const next = { ...prev }
      // Clear all existing duplicate errors first
      Object.keys(next).forEach(key => {
        if (key.endsWith('-unitName') && (next[key] === 'Duplicate unit' || next[key] === 'Unit already exists in system')) {
          delete next[key]
        }
      })

      unitMap.forEach((indexes, fullKey) => {
        if (indexes.length > 1) {
          indexes.forEach(idx => {
            const rowId = rows[idx].id
            next[`${rowId}-unitName`] = 'Duplicate unit'
          })
        } else {
          // Check against system for single occurrences
          const idx = indexes[0]
          const row = rows[idx]
          const [propertyKey, unitKey] = fullKey.split('|')
          
          const existingProp = properties.find(p => p.name.trim().toLowerCase() === propertyKey)
          const unitExists = existingProp?.units?.some((u: any) => u.unitName.trim().toLowerCase() === unitKey)
          
          if (unitExists) {
            next[`${row.id}-unitName`] = 'Unit already exists in system'
          }
        }
      })
      return next
    })
  }

  const handleAddRow = () => {
    const rowId = Date.now()
    const newRow: any = { id: rowId }
    columns.forEach(col => {
      newRow[col.key] = col.type === 'number' ? 0 : ''
    })
    
    const updated = [...previewRows, newRow]
    setPreviewRows(updated)
    revalidateDuplicates(updated)
    
    // Initial validation for the new row
    columns.forEach(col => {
      validateCell(rowId, col.key, newRow[col.key], col)
    })
  }

  const handleConfirmImport = () => {
    if (mode === 'units' && !targetPropertyUuid) return error("Select a property first")
    if (previewRows.length === 0) return error("No data to import")
    if (Object.keys(validationErrors).length > 0) return error("Please fix errors first")

    if (mode === 'full') {
      const rowsToSend = previewRows.map(({ id, ...rest }) => rest)
      bulkFullImportMutation.mutate({ rows: rowsToSend }, {
        onSuccess: (res) => {
          success(`Imported ${res.unitsCreated} units across ${res.propertiesCreated} properties!`)
          router.push('/properties')
        }
      })
    } else {
      const unitsToSend = previewRows.map(({ id, ...rest }) => rest)
      bulkCreateUnitsMutation.mutate({ 
        propertyUuid: targetPropertyUuid, 
        units: unitsToSend
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
    <div className="import-tab animate-fade-in" style={{ padding: '24px 0' }}>
      <div className="import-tab__header" style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--dark)', marginBottom: 8 }}>Bulk Data Import</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Onboard properties and tenants in bulk via CSV upload.</p>
        </div>
        
        <div style={{ display: 'flex', background: 'var(--ivory-dim)', padding: 4, borderRadius: 12 }}>
          <button 
            className={cn('tab-btn', mode === 'full' && 'tab-btn--active')}
            onClick={() => { setMode('full'); setPreviewRows([]); }}
            style={tabBtnStyle(mode === 'full')}
          >
            Full Import
          </button>
          <button 
            className={cn('tab-btn', mode === 'units' && 'tab-btn--active')}
            onClick={() => { setMode('units'); setPreviewRows([]); }}
            style={tabBtnStyle(mode === 'units')}
          >
            Units Only
          </button>
        </div>
      </div>

      <div className="import-card" style={{ background: 'white', borderRadius: 24, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div className="import-card__top" style={{ padding: 24, background: 'var(--ivory-dim)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              {mode === 'units' && (
                <select 
                  className="form-input" 
                  style={{ width: 250, height: 42 }}
                  value={targetPropertyUuid} 
                  onChange={e => setTargetPropertyUuid(e.target.value)}
                >
                  <option value="">-- Choose Property --</option>
                  {properties.map((p: any) => <option key={p.uuid} value={p.uuid}>{p.name}</option>)}
                </select>
              )}
              <label className={cn('btn btn--primary', (mode === 'units' && !targetPropertyUuid) && 'btn--disabled')} style={{ height: 42, borderRadius: 12 }}>
                <FileSpreadsheet size={18} style={{ marginRight: 8 }} /> 
                {previewRows.length > 0 ? 'Change File' : 'Upload CSV'}
                <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileUpload} disabled={mode === 'units' && !targetPropertyUuid} />
              </label>
            </div>
            
            <button className="btn btn--secondary" onClick={handleDownloadTemplate} style={{ height: 42, borderRadius: 12 }}>
              <Download size={18} style={{ marginRight: 8 }} /> Template
            </button>
            <button className="btn btn--secondary" onClick={handleAddRow} style={{ height: 42, borderRadius: 12, background: 'var(--forest-faint)', color: 'var(--forest)', borderColor: 'rgba(0,102,68,0.2)' }}>
              <Plus size={18} style={{ marginRight: 8 }} /> Add Row
            </button>
          </div>
        </div>

        {previewRows.length > 0 ? (
          <div className="import-preview">
            <div className="import-table-container" style={{ maxHeight: 500, overflow: 'auto' }}>
              <table className="import-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 5 }}>
                  <tr>
                    {columns.map(col => (
                      <th key={col.key} style={{ textAlign: 'left', padding: '16px', borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {getCategoryIcon(col.category)}
                          {col.label}
                          {col.required && <span style={{ color: 'var(--error)' }}>*</span>}
                        </div>
                      </th>
                    ))}
                    <th style={{ borderBottom: '2px solid var(--border)' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      {columns.map(col => (
                        <td key={col.key} style={{ padding: '8px 12px' }}>
                          <input 
                            type="text"
                            value={row[col.key]}
                            onChange={e => updateRow(i, col.key, e.target.value)}
                            style={{ 
                              width: '100%', 
                              padding: '8px', 
                              border: '1px solid ' + (validationErrors[`${row.id}-${col.key}`] ? 'var(--error)' : 'transparent'),
                              borderRadius: 4,
                              background: validationErrors[`${row.id}-${col.key}`] ? 'var(--error-bg)' : 'transparent'
                            }}
                          />
                        </td>
                      ))}
                      <td style={{ padding: '8px 12px' }}>
                        <button onClick={() => setPreviewRows(previewRows.filter(r => r.id !== row.id))} style={{ color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="import-footer" style={{ padding: 24, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                Total records: <strong>{previewRows.length}</strong>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn--secondary" onClick={() => setPreviewRows([])}>Cancel</button>
                <button className="btn btn--primary" onClick={handleConfirmImport} disabled={bulkFullImportMutation.isPending || bulkCreateUnitsMutation.isPending || Object.keys(validationErrors).length > 0}>
                   {bulkFullImportMutation.isPending || bulkCreateUnitsMutation.isPending ? 'Processing...' : 'Confirm Import'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '80px 40px', textAlign: 'center' }}>
            <FileSpreadsheet size={48} style={{ color: 'var(--forest)', opacity: 0.2, marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Ready to import?</h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto 24px' }}>
              Download the template, fill in your data, and upload it here to preview before saving.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn--primary" onClick={handleAddRow} style={{ borderRadius: 12, padding: '12px 32px' }}>
                <Plus size={18} style={{ marginRight: 8 }} /> Start with Manual Entry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const tabBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: '8px 16px',
  borderRadius: 10,
  border: 'none',
  background: active ? 'white' : 'transparent',
  color: active ? 'var(--dark)' : 'var(--text-muted)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: active ? 'var(--shadow-sm)' : 'none',
  transition: 'all 0.2s'
})
