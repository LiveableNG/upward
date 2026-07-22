'use client'

import React, { useEffect, useRef, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FileSpreadsheet, Download, Upload } from 'lucide-react'
import { useToast } from '@/components/common/Toast'
import { cn } from '@/lib/utils'
import { useProperties, useBulkCreateUnits, useBulkFullImport } from '@/features/pm/hooks/useProperties'
import { downloadBlob } from '@/lib/download-helper'
import { FormSelect } from '@/components/ui/Select/FormSelect'

import { ImportMode, FULL_COLUMNS, UNIT_COLUMNS } from './data-import/types'
import { useDataImport } from './data-import/useDataImport'
import { ImportOverlay } from './data-import/ImportOverlay'

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
  
  const { success, error } = useToast()
  const { data: properties = [] } = useProperties()
  const bulkCreateUnitsMutation = useBulkCreateUnits()
  const bulkFullImportMutation = useBulkFullImport()

  const [targetPropertyUuid, setTargetPropertyUuid] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const columns = useMemo(() => mode === 'full' ? FULL_COLUMNS : UNIT_COLUMNS, [mode])

  const importState = useDataImport(columns, mode, properties, targetPropertyUuid)

  const propertyOptions = useMemo(() => {
    return properties.map((p: any) => ({
      label: p.name,
      value: p.uuid
    }))
  }, [properties])

  const handleDownloadTemplate = () => {
    const headers = columns.map(c => c.label)
    
    const rows = mode === 'full' ? [
      ['Emerald Court', '12 Admiralty Way, Lekki', 'Residential', 'Nigeria', 'Lagos', 'Lekki Phase 1', 'Alice', 'Owner', 'alice@landlord.com', '+2348011112222', '', 'John', 'Doe', 'john@tenant.com', '+2348033334444', 'Apt 101', '2500000', '2500000', 'Annually', 'NGN', '2024-01-01', '2025-01-01', '250000', 'Tenant with 3 units across 3 properties', 'Flat / Apartment'],
      ['Sapphire Heights', '45 Glover Road, Ikoyi', 'Residential', 'Nigeria', 'Lagos', 'Ikoyi', 'Alice', 'Owner', 'alice@landlord.com', '+2348011112222', '', 'John', 'Doe', 'john@tenant.com', '+2348033334444', 'Suite 2A', '3500000', '3500000', 'Annually', 'NGN', '2024-02-01', '2025-02-01', '350000', 'Landlord with multiple properties', 'Office Space'],
    ] : [
      ['101', '', 'John', 'Doe', 'john@example.com', '+2348012345678', '2000000', '2000000', '2024-01-01', '2024-05-01', 'Monthly', '200000', 'NGN', 'Tenant Unit 1', 'Flat / Apartment'],
    ]

    const csvContent = [headers, ...rows].map(e => e.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    downloadBlob(blob, `upward_${mode}_import_template.csv`).then(() => {
      success('Template downloaded successfully!')
    }).catch((err: any) => console.error(err))
  }

  const parseBackendError = (message: string): string => {
    if (!message) return 'Failed to import data'
    
    // Parse nested class-validator messages like "rows.0.unitRentAmountPaid must be a number"
    if (message.includes('rows.')) {
      const parts = message.split(',').map(p => p.trim())
      const formattedParts = parts.slice(0, 3).map(part => {
        const match = part.match(/rows\.(\d+)\.([a-zA-Z0-9_]+)\s+(.+)/)
        if (match) {
          const rowNum = parseInt(match[1], 10) + 1
          const fieldKey = match[2]
          const restOfError = match[3]
          const colLabel = columns.find(c => c.key === fieldKey)?.label || fieldKey
          return `Row ${rowNum}: ${colLabel} ${restOfError}`
        }
        return part
      })

      const extraCount = parts.length > 3 ? parts.length - 3 : 0
      return formattedParts.join('\n') + (extraCount > 0 ? `\n...and ${extraCount} more issue(s)` : '')
    }
    return message
  }

  const handleConfirmImport = () => {
    if (importState.previewRows.length === 0) return error("No data to import")
    if (Object.keys(importState.validationErrors).length > 0) {
      const firstErrorKey = Object.keys(importState.validationErrors)[0]
      const [rowId, field] = firstErrorKey.split('-')
      const rowIndex = importState.previewRows.findIndex(r => r.id === rowId)
      const colLabel = columns.find(c => c.key === field)?.label || field
      return error(`Error at Row ${rowIndex + 1}, Column "${colLabel}": ${importState.validationErrors[firstErrorKey]}`)
    }

    if (mode === 'full') {
      const rowsToSend = importState.previewRows.map(({ id, ...rest }) => rest)
      bulkFullImportMutation.mutate({ rows: rowsToSend }, {
        onSuccess: (res) => {
          success(`Imported ${res.unitsCreated} units across ${res.propertiesCreated} properties!`)
          importState.setIsOverlayOpen(false)
          router.push('/properties')
        },
        onError: (err: any) => error(parseBackendError(err?.message || 'Failed to import data'))
      })
    } else {
      const unitsToSend = importState.previewRows.map(({ id, ...rest }) => rest)
      bulkCreateUnitsMutation.mutate({ propertyUuid: targetPropertyUuid, units: unitsToSend } as any, {
        onSuccess: () => {
          success('Units imported successfully!')
          importState.setIsOverlayOpen(false)
          router.push('/properties')
        },
        onError: (err: any) => error(parseBackendError(err?.message || 'Failed to import units'))
      })
    }
  }


  return (
    <div className="import-tab animate-fade-in" style={{ padding: '16px 0', maxWidth: 900, margin: '0 auto' }}>
      
      {/* Header and Mode Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--dark)', marginBottom: 4 }}>
            Bulk Data Import
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Import your properties, landlords, or units via CSV or Excel spreadsheet.
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', background: 'var(--bg)', padding: 4, borderRadius: 12, border: '1px solid var(--border)' }}>
          <button
            onClick={() => setMode('full')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: mode === 'full' ? 'white' : 'transparent',
              color: mode === 'full' ? 'var(--dark)' : 'var(--text-muted)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: mode === 'full' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            Full Portfolio
          </button>
          <button
            onClick={() => setMode('units')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: mode === 'units' ? 'white' : 'transparent',
              color: mode === 'units' ? 'var(--dark)' : 'var(--text-muted)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: mode === 'units' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            Units & Leases
          </button>
        </div>
      </div>

      {/* Target Property Selection for Units mode */}
      {mode === 'units' && (
        <div style={{ marginBottom: 20, background: 'white', padding: 20, borderRadius: 16, border: '1px solid var(--border)' }}>
          <label className="form-label" style={{ fontWeight: 600, fontSize: 13, color: 'var(--dark)', display: 'block', marginBottom: 8 }}>
            Select Target Property <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <FormSelect
            value={targetPropertyUuid}
            onChange={val => setTargetPropertyUuid(val)}
            options={propertyOptions}
            placeholder="-- Choose property to add units into --"
            triggerStyle={{ height: 44, borderRadius: 10 }}
            searchable
          />
        </div>
      )}

      {/* Clean Dropzone Upload Box */}
      <div 
        style={{ 
          border: '2px dashed var(--border)', 
          borderRadius: 20, 
          padding: '60px 32px', 
          textAlign: 'center', 
          background: 'white',
          transition: 'all 0.2s'
        }}
      >
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid var(--border)' }}>
          <FileSpreadsheet size={28} style={{ color: 'var(--clay)' }} />
        </div>
        
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--dark)', marginBottom: 6 }}>
          Upload your Excel or CSV file
        </h3>
        
        <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto 24px', lineHeight: 1.5 }}>
          Drag and drop your spreadsheet here or click to browse. We support .csv, .xlsx, and .xls formats.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
          <label className={cn('btn btn--primary', (mode === 'units' && !targetPropertyUuid) && 'btn--disabled')} style={{ borderRadius: 12, padding: '12px 28px', height: 44, cursor: 'pointer', fontSize: 14 }}>
            <Upload size={18} style={{ marginRight: 8 }} /> Select File
            <input type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={(e) => importState.handleFileUpload(e, fileInputRef)} disabled={mode === 'units' && !targetPropertyUuid} ref={fileInputRef}/>
          </label>
          
          <button className="btn btn--secondary" onClick={handleDownloadTemplate} style={{ borderRadius: 12, padding: '12px 24px', height: 44, fontSize: 14 }}>
            <Download size={18} style={{ marginRight: 8 }} /> Download Template
          </button>
        </div>
      </div>

      {importState.isOverlayOpen && (
        <ImportOverlay 
          {...importState}
          mode={mode}
          columns={columns}
          isPending={bulkFullImportMutation.isPending || bulkCreateUnitsMutation.isPending}
          handleConfirmImport={handleConfirmImport}
        />
      )}
    </div>
  )
}
