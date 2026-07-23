import { useState, useMemo, useCallback, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { ColumnMapping, SplitConfig, ColumnDef, ImportMode } from './types'
import { suggestMapping, formatPhoneNumberByCountry, validateCell, parseDateString, calculateRentEndDateAndWarning } from './utils'
import { useToast } from '@/components/common/Toast'

export const useDataImport = (columns: ColumnDef[], mode: ImportMode, properties: any[], targetPropertyUuid: string) => {
  const { success, error } = useToast()

  // Overlay states
  const [isOverlayOpen, setIsOverlayOpen] = useState(false)
  const [phase, setPhase] = useState<'mapping' | 'preview'>('mapping')
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null)
  const [activeSheet, setActiveSheet] = useState<string>('')
  const [userColumns, setUserColumns] = useState<string[]>([])
  const [mappings, setMappings] = useState<{ [sheet: string]: ColumnMapping[] }>({})
  const [splitConfigs, setSplitConfigs] = useState<{ [sheet: string]: SplitConfig[] }>({})
  
  // Data table states
  const [previewRows, setPreviewRows] = useState<any[]>([])
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [amberWarnings, setAmberWarnings] = useState<Record<string, string>>({})
  const [editingCell, setEditingCell] = useState<{ rowId: string, field: string } | null>(null)

  
  // Template states
  const [savedTemplates, setSavedTemplates] = useState<{id: string, name: string, data: any}[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('upward_pm_import_templates')
      if (stored) setSavedTemplates(JSON.parse(stored))
    } catch (e) {}
  }, [])

  const saveTemplate = () => {
    const name = prompt('Enter a name for this mapping template:')
    if (!name) return
    
    const newTemplate = {
      id: Date.now().toString(),
      name,
      data: { mappings, splitConfigs }
    }
    const updated = [...savedTemplates, newTemplate]
    setSavedTemplates(updated)
    localStorage.setItem('upward_pm_import_templates', JSON.stringify(updated))
    success('Template saved successfully')
  }

  const applyTemplate = (templateId: string) => {
    const template = savedTemplates.find(t => t.id === templateId)
    if (template) {
      setMappings(template.data.mappings)
      setSplitConfigs(template.data.splitConfigs)
      success('Template applied')
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, fileInputRef: React.RefObject<HTMLInputElement | null>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const newWorkbook = XLSX.read(data, { type: 'array' })

        const validSheets = newWorkbook.SheetNames.filter(sheetName => {
          const worksheet = newWorkbook.Sheets[sheetName]
          if (!worksheet) return false
          const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
          return sheetData.length > 1
        })

        if (validSheets.length === 0) {
          error('No valid sheets with data found in the file.')
          return
        }

        setWorkbook(newWorkbook)
        
        const initialMappings: { [sheet: string]: ColumnMapping[] } = {}
        validSheets.forEach(sheetName => {
          const worksheet = newWorkbook.Sheets[sheetName]
          const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
          const headers = (sheetData[0] as any[]).map((h: any) => String(h || '').trim()).filter(h => h)
          
          initialMappings[sheetName] = headers.map(column => {
            const suggestion = suggestMapping(column, columns)
            return {
              userColumn: column,
              systemField: suggestion?.field || null,
              entityType: suggestion?.entityType || null,
            }
          })
        })

        setMappings(initialMappings)
        setSplitConfigs({})
        setActiveSheet(validSheets[0])
        
        const firstSheetWs = newWorkbook.Sheets[validSheets[0]]
        const firstSheetData = XLSX.utils.sheet_to_json(firstSheetWs, { header: 1, defval: '' })
        const firstSheetHeaders = (firstSheetData[0] as any[]).map((h: any) => String(h || '').trim()).filter(h => h)
        setUserColumns(firstSheetHeaders)

        setIsOverlayOpen(true)

        // Check if all required columns are cleanly mapped (e.g. downloaded sample template)
        const sheetMappings = initialMappings[validSheets[0]] || []
        const mappedFieldKeys = new Set(
          sheetMappings
            .filter(m => m.systemField && m.entityType !== 'skip')
            .map(m => m.systemField as string)
        )
        const missingRequiredKeys = columns.filter(c => c.required && !mappedFieldKeys.has(c.key))

        // Check for duplicate field mappings
        const fieldCounts: Record<string, number> = {}
        sheetMappings.forEach(m => {
          if (m.systemField && m.entityType !== 'skip') {
            fieldCounts[m.systemField] = (fieldCounts[m.systemField] || 0) + 1
          }
        })
        const hasDuplicates = Object.values(fieldCounts).some(count => count > 1)

        if (missingRequiredKeys.length === 0 && !hasDuplicates) {
          // Auto-advance to preview data grid stage
          setTimeout(() => {
            const newRows: any[] = []
            const rawRows = firstSheetData.slice(1) as any[][]

            rawRows.forEach((row, index) => {
              if (!row || row.every(cell => !cell || String(cell).trim() === '')) return

              const mappedRow: any = { id: `row-${Date.now()}-${index}` }
              columns.forEach(col => mappedRow[col.key] = col.type === 'number' ? '' : '')

              sheetMappings.forEach(mapping => {
                if (mapping.systemField && mapping.entityType !== 'skip') {
                  const colIndex = firstSheetHeaders.indexOf(mapping.userColumn)
                  if (colIndex !== -1 && row[colIndex] !== undefined) {
                    mappedRow[mapping.systemField] = String(row[colIndex]).trim()
                  }
                }
              })

              columns.forEach(col => {
                if (col.type === 'number' && mappedRow[col.key]) {
                  const numValue = parseFloat(String(mappedRow[col.key]).replace(/[^0-9.-]/g, ''))
                  mappedRow[col.key] = isNaN(numValue) ? 0 : numValue
                } else if (col.type === 'date' && mappedRow[col.key]) {
                  mappedRow[col.key] = parseDateString(mappedRow[col.key])
                }
              })

              const hasTenantName = !!(mappedRow.tenantFirstName?.trim() || mappedRow.tenantLastName?.trim())
              const hasCommercialName = !!(mappedRow.tenantCommercialName?.trim())
              if ((hasTenantName || hasCommercialName) && (!mappedRow.tenantEmail || mappedRow.tenantEmail.trim() === '')) {
                const cleanName = hasCommercialName
                  ? (mappedRow.tenantCommercialName || '').toLowerCase().replace(/[^a-z0-9]/g, '')
                  : `${(mappedRow.tenantFirstName || '').toLowerCase().replace(/[^a-z0-9]/g, '')}-${(mappedRow.tenantLastName || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`
                mappedRow.tenantEmail = `guest-${cleanName}-${Math.random().toString(36).substring(2, 8)}@upward.com`
              }

              const rowCountry = mode === 'full' ? (mappedRow.propertyCountry || 'Nigeria') : (properties.find(p => p.uuid === targetPropertyUuid)?.country || 'Nigeria')
              if (mappedRow.tenantPhone) mappedRow.tenantPhone = formatPhoneNumberByCountry(mappedRow.tenantPhone, rowCountry)
              if (mappedRow.landlordPhone) mappedRow.landlordPhone = formatPhoneNumberByCountry(mappedRow.landlordPhone, rowCountry)

              newRows.push(mappedRow)
            })

            const newErrors: Record<string, string> = {}
            const newWarnings: Record<string, string> = {}

            newRows.forEach(row => {
              const startDateField = mode === 'full' ? 'unitRentStartDate' : 'rentStartDate'
              const rentTypeField = mode === 'full' ? 'unitRentType' : 'rentType'
              const dueDateField = mode === 'full' ? 'unitRentDueDate' : 'rentDueDate'

              const startDateVal = row[startDateField]
              const rentTypeVal = row[rentTypeField] || 'Annually'
              const leaseYearsVal = row.leaseYears

              if (startDateVal) {
                const { fixedEndDate, warningMessage } = calculateRentEndDateAndWarning(startDateVal, rentTypeVal, leaseYearsVal)
                row[dueDateField] = fixedEndDate
                if (warningMessage) {
                  newWarnings[`${row.id}-${dueDateField}`] = warningMessage
                }
              }

              columns.forEach(col => {
                validateCell(row.id, col.key, row[col.key], col, columns, row, newRows, (val) => {
                  if (typeof val === 'function') {
                    const next = val(newErrors)
                    Object.assign(newErrors, next)
                  } else {
                    Object.assign(newErrors, val)
                  }
                }, true)
              })
            })


            setPreviewRows(newRows)
            setValidationErrors(newErrors)
            setAmberWarnings(newWarnings)
            revalidateDuplicates(newRows)
            setPhase('preview')
            success('Template matched! Auto-advanced to Data Grid.')
          }, 50)
        } else {
          setPhase('mapping')
          success('File read successfully. Map your columns to proceed.')
        }
      } catch (err) {
        console.error(err)
        error('Error reading file. Please ensure it is a valid Excel or CSV file.')
      }
    }
    reader.readAsArrayBuffer(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }


  const updateMapping = (sheetName: string, userColumn: string, systemField: string | null, entityType: string | null) => {
    setMappings(prev => {
      const sheetMappings = prev[sheetName] || []
      const updated = sheetMappings.map(m => m.userColumn === userColumn ? { ...m, systemField, entityType } : m)
      return { ...prev, [sheetName]: updated }
    })
  }

  const toggleSplit = (userColumn: string) => {
    setSplitConfigs(prev => {
      const currentSheetSplits = prev[activeSheet] || []
      const isSplit = currentSheetSplits.some(s => s.userColumn === userColumn)

      if (isSplit) {
        return { ...prev, [activeSheet]: currentSheetSplits.filter(s => s.userColumn !== userColumn) }
      } else {
        return {
          ...prev,
          [activeSheet]: [
            ...currentSheetSplits,
            { userColumn, delimiter: ' ', parts: [
              { index: 0, systemField: null, entityType: null },
              { index: 1, systemField: null, entityType: null }
            ]}
          ]
        }
      }
    })

    setMappings(prev => {
      const sheetMappings = prev[activeSheet] || []
      const isCurrentlySplit = (splitConfigs[activeSheet] || []).some(s => s.userColumn === userColumn)
      if (!isCurrentlySplit) {
        const updated = sheetMappings.map(m => m.userColumn === userColumn ? { ...m, systemField: null, entityType: null } : m)
        return { ...prev, [activeSheet]: updated }
      }
      return prev
    })
  }

  const updateSplitConfig = (userColumn: string, updates: Partial<SplitConfig>) => {
    setSplitConfigs(prev => {
      const currentSheetSplits = prev[activeSheet] || []
      const updated = currentSheetSplits.map(s => s.userColumn === userColumn ? { ...s, ...updates } : s)
      return { ...prev, [activeSheet]: updated }
    })
  }

  const updateSplitPart = (userColumn: string, partIndex: number, field: string | null, entityType: string | null) => {
    setSplitConfigs(prev => {
      const currentSheetSplits = prev[activeSheet] || []
      const updated = currentSheetSplits.map(s => {
        if (s.userColumn === userColumn) {
          const newParts = [...s.parts]
          const partIndexInArray = newParts.findIndex(p => p.index === partIndex)
          if (partIndexInArray >= 0) newParts[partIndexInArray] = { ...newParts[partIndexInArray], systemField: field, entityType }
          return { ...s, parts: newParts }
        }
        return s
      })
      return { ...prev, [activeSheet]: updated }
    })
  }

  const addSplitPart = (userColumn: string) => {
    setSplitConfigs(prev => {
      const currentSheetSplits = prev[activeSheet] || []
      const updated = currentSheetSplits.map(s => {
        if (s.userColumn === userColumn) {
          const newIndex = s.parts.length > 0 ? Math.max(...s.parts.map(p => p.index)) + 1 : 0
          return { ...s, parts: [...s.parts, { index: newIndex, systemField: null, entityType: null }] }
        }
        return s
      })
      return { ...prev, [activeSheet]: updated }
    })
  }

  const removeSplitPart = (userColumn: string, partIndex: number) => {
    setSplitConfigs(prev => {
      const currentSheetSplits = prev[activeSheet] || []
      const updated = currentSheetSplits.map(s => {
        if (s.userColumn === userColumn) return { ...s, parts: s.parts.filter(p => p.index !== partIndex) }
        return s
      })
      return { ...prev, [activeSheet]: updated }
    })
  }

  const revalidateDuplicates = (rows: any[]) => {
    const unitMap = new Map<string, number[]>() 
    
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
      Object.keys(next).forEach(key => {
        if (key.endsWith('-unitName') && (next[key] === 'Duplicate unit' || next[key] === 'Unit already exists in system')) {
          delete next[key]
        }
      })

      unitMap.forEach((indexes, fullKey) => {
        if (indexes.length > 1) {
          indexes.forEach(idx => next[`${rows[idx].id}-unitName`] = 'Duplicate unit')
        } else {
          const idx = indexes[0]
          const row = rows[idx]
          const [propertyKey, unitKey] = fullKey.split('|')
          const existingProp = properties.find(p => p.name.trim().toLowerCase() === propertyKey)
          const unitExists = existingProp?.units?.some((u: any) => u.unitName.trim().toLowerCase() === unitKey)
          if (unitExists) next[`${row.id}-unitName`] = 'Unit already exists in system'
        }
      })
      return next
    })
  }

  const transformData = useCallback(() => {
    if (!workbook) return

    const newRows: any[] = []
    const sheetName = activeSheet
    const worksheet = workbook.Sheets[sheetName]
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', blankrows: true })
    const headers = (rawData[0] as any[]).map((h: any) => String(h || '').trim())
    const rows = rawData.slice(1) as any[][]

    const sheetMappings = mappings[sheetName] || []
    const sheetSplits = splitConfigs[sheetName] || []

    rows.forEach((row, index) => {
      if (!row || row.every(cell => !cell || String(cell).trim() === '')) return

      const mappedRow: any = { id: `row-${Date.now()}-${index}` }

      columns.forEach(col => mappedRow[col.key] = col.type === 'number' ? '' : '')

      sheetMappings.forEach(mapping => {
        if (mapping.systemField && mapping.entityType !== 'skip') {
          const colIndex = headers.indexOf(mapping.userColumn)
          if (colIndex !== -1 && row[colIndex] !== undefined) {
            mappedRow[mapping.systemField] = String(row[colIndex]).trim()
          }
        }
      })

      sheetSplits.forEach(split => {
        const colIndex = headers.indexOf(split.userColumn)
        if (colIndex !== -1 && row[colIndex] !== undefined) {
          const val = String(row[colIndex]).trim()
          const parts = val.split(split.delimiter)
          
          split.parts.forEach(part => {
            if (part.systemField && part.entityType !== 'skip' && part.index < parts.length) {
              if (part.index === split.parts.length - 1 && parts.length > split.parts.length) {
                mappedRow[part.systemField] = parts.slice(part.index).join(split.delimiter).trim()
              } else {
                mappedRow[part.systemField] = parts[part.index].trim()
              }
            }
          })
        }
      })

      columns.forEach(col => {
        if (col.type === 'number' && mappedRow[col.key]) {
          const numValue = parseFloat(mappedRow[col.key].replace(/[^0-9.-]/g, ''))
          mappedRow[col.key] = isNaN(numValue) ? 0 : numValue
        } else if (col.type === 'date' && mappedRow[col.key]) {
          mappedRow[col.key] = parseDateString(mappedRow[col.key])
        }
      })

      const hasTenantName = !!(mappedRow.tenantFirstName?.trim() || mappedRow.tenantLastName?.trim())
      const hasCommercialName = !!(mappedRow.tenantCommercialName?.trim())
      if ((hasTenantName || hasCommercialName) && (!mappedRow.tenantEmail || mappedRow.tenantEmail.trim() === '')) {
        const cleanName = hasCommercialName
          ? (mappedRow.tenantCommercialName || '').toLowerCase().replace(/[^a-z0-9]/g, '')
          : `${(mappedRow.tenantFirstName || '').toLowerCase().replace(/[^a-z0-9]/g, '')}-${(mappedRow.tenantLastName || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`
        mappedRow.tenantEmail = `guest-${cleanName}-${Math.random().toString(36).substring(2, 8)}@upward.com`
      }

      const rowCountry = mode === 'full' ? (mappedRow.propertyCountry || 'Nigeria') : (properties.find(p => p.uuid === targetPropertyUuid)?.country || 'Nigeria')
      if (mappedRow.tenantPhone) mappedRow.tenantPhone = formatPhoneNumberByCountry(mappedRow.tenantPhone, rowCountry)
      if (mappedRow.landlordPhone) mappedRow.landlordPhone = formatPhoneNumberByCountry(mappedRow.landlordPhone, rowCountry)

      newRows.push(mappedRow)
    })

    const newErrors: Record<string, string> = {}
    const newWarnings: Record<string, string> = {}

    newRows.forEach(row => {
      const startDateField = mode === 'full' ? 'unitRentStartDate' : 'rentStartDate'
      const rentTypeField = mode === 'full' ? 'unitRentType' : 'rentType'
      const dueDateField = mode === 'full' ? 'unitRentDueDate' : 'rentDueDate'

      const startDateVal = row[startDateField]
      const rentTypeVal = row[rentTypeField] || 'Annually'
      const leaseYearsVal = row.leaseYears

      if (startDateVal) {
        const { fixedEndDate, warningMessage } = calculateRentEndDateAndWarning(startDateVal, rentTypeVal, leaseYearsVal)
        row[dueDateField] = fixedEndDate
        if (warningMessage) {
          newWarnings[`${row.id}-${dueDateField}`] = warningMessage
        }
      }

      columns.forEach(col => {
        validateCell(row.id, col.key, row[col.key], col, columns, row, newRows, (val) => {
          if (typeof val === 'function') {
            const next = val(newErrors)
            Object.assign(newErrors, next)
          } else {
            Object.assign(newErrors, val)
          }
        }, true)
      })
    })

    setPreviewRows(newRows)
    setValidationErrors(newErrors)
    setAmberWarnings(newWarnings)
    revalidateDuplicates(newRows)

    setPhase('preview')
  }, [workbook, activeSheet, mappings, splitConfigs, columns, mode, properties, targetPropertyUuid])

  const updateRowField = (rowId: string, field: string, value: any) => {
    const rowIndex = previewRows.findIndex(r => r.id === rowId)
    if (rowIndex === -1) return

    const updated = [...previewRows]
    let formattedValue = value
    
    if (field === 'tenantPhone' || field === 'landlordPhone') {
      const rowCountry = mode === 'full' 
        ? (updated[rowIndex].propertyCountry || 'Nigeria') 
        : (properties.find(p => p.uuid === targetPropertyUuid)?.country || 'Nigeria')
      formattedValue = formatPhoneNumberByCountry(value, rowCountry)
    } else if (columns.find(c => c.key === field)?.type === 'date') {
      formattedValue = parseDateString(value)
    }

    updated[rowIndex][field] = formattedValue

    const startDateField = mode === 'full' ? 'unitRentStartDate' : 'rentStartDate'
    const rentTypeField = mode === 'full' ? 'unitRentType' : 'rentType'
    const dueDateField = mode === 'full' ? 'unitRentDueDate' : 'rentDueDate'

    if (field === startDateField || field === rentTypeField || field === 'leaseYears') {
      const row = updated[rowIndex]
      const startDateVal = row[startDateField]
      const rentTypeVal = row[rentTypeField] || 'Annually'
      const leaseYearsVal = row.leaseYears

      if (startDateVal) {
        const { fixedEndDate, warningMessage } = calculateRentEndDateAndWarning(
          startDateVal,
          rentTypeVal,
          leaseYearsVal
        )
        row[dueDateField] = fixedEndDate

        setAmberWarnings(prev => {
          const next = { ...prev }
          const key = `${rowId}-${dueDateField}`
          if (warningMessage) {
            next[key] = warningMessage
          } else {
            delete next[key]
          }
          return next
        })
      }
    }

    setPreviewRows(updated)
    validateCell(rowId, field, formattedValue, undefined, columns, updated[rowIndex], updated, setValidationErrors, false)
    if (field === rentTypeField || field === 'leaseYears') {
      validateCell(rowId, 'leaseYears', updated[rowIndex].leaseYears, undefined, columns, updated[rowIndex], updated, setValidationErrors, false)
      validateCell(rowId, rentTypeField, updated[rowIndex][rentTypeField], undefined, columns, updated[rowIndex], updated, setValidationErrors, false)
    }

    
    if (field === 'unitName' || field === 'propertyName') {
      revalidateDuplicates(updated)
    }
  }

  const closeOverlay = () => {
    setIsOverlayOpen(false)
    setWorkbook(null)
    setPreviewRows([])
    setValidationErrors({})
    setAmberWarnings({})
  }


  return {
    isOverlayOpen, setIsOverlayOpen,
    phase, setPhase,
    workbook, setWorkbook,
    activeSheet, setActiveSheet,
    userColumns, setUserColumns,
    mappings, setMappings,
    splitConfigs, setSplitConfigs,
    previewRows, setPreviewRows,
    validationErrors, setValidationErrors,
    amberWarnings, setAmberWarnings,
    editingCell, setEditingCell,
    savedTemplates,
    saveTemplate, applyTemplate,
    handleFileUpload,
    updateMapping, toggleSplit, updateSplitConfig, updateSplitPart, addSplitPart, removeSplitPart,
    transformData, updateRowField, closeOverlay, revalidateDuplicates
  }
}

