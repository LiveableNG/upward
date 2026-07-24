import { type ColumnDef } from './types'
import { isValidPhoneNumber } from 'libphonenumber-js'
import * as XLSX from 'xlsx'

export const formatPhoneNumberByCountry = (phone: string, country: string): string => {
  const phoneStr = (phone || '').toString().trim()
  if (!phoneStr) return ''

  if (phoneStr.includes(',')) {
    return phoneStr.split(',')
      .map(part => formatPhoneNumberByCountry(part, country))
      .filter(Boolean)
      .join(',')
  }

  let cleaned = phoneStr.replace(/\s+/g, '')

  if (cleaned.startsWith('+')) {
    return cleaned
  }

  const normalizedCountry = (country || '').trim().toLowerCase()

  if (normalizedCountry === 'nigeria') {
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      return '+234' + cleaned.substring(1)
    }
    if (cleaned.length === 10 && !cleaned.startsWith('0')) {
      return '+234' + cleaned
    }
  }

  if (normalizedCountry === 'ghana') {
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      return '+233' + cleaned.substring(1)
    }
    if (cleaned.length === 9 && !cleaned.startsWith('0')) {
      return '+233' + cleaned
    }
  }

  if (normalizedCountry === 'united kingdom' || normalizedCountry === 'uk') {
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      return '+44' + cleaned.substring(1)
    }
    if (cleaned.length === 10 && !cleaned.startsWith('0')) {
      return '+44' + cleaned
    }
  }

  if (normalizedCountry === 'united states' || normalizedCountry === 'us' || normalizedCountry === 'usa' || normalizedCountry === 'canada') {
    if (cleaned.startsWith('1') && cleaned.length === 11) {
      return '+' + cleaned
    }
    if (cleaned.length === 10) {
      return '+1' + cleaned
    }
  }

  if (!cleaned.startsWith('+') && normalizedCountry === 'nigeria') {
    return '+234' + cleaned
  }

  return cleaned
}

export const parseDateString = (val: any): string => {
  if (!val) return ''
  const strVal = String(val).trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(strVal)) return strVal;

  if (/^\d{4,5}(\.\d+)?$/.test(strVal)) {
    const serial = parseFloat(strVal)
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000))
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
  }
  const date = new Date(strVal)
  if (!isNaN(date.getTime())) {
    if (strVal.includes('T') || strVal.includes('Z')) {
      return date.toISOString().split('T')[0]
    } else {
      const yyyy = date.getFullYear()
      const mm = String(date.getMonth() + 1).padStart(2, '0')
      const dd = String(date.getDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    }
  }
  return strVal
}

export interface RentDateFixResult {
  fixedEndDate: string
  warningMessage: string | null
}

export const calculateRentEndDateAndWarning = (
  startDateStr: string,
  rentType: string,
  leaseYears?: any,
  uploadedEndDateStr?: string
): RentDateFixResult => {
  if (!startDateStr) {
    return { fixedEndDate: uploadedEndDateStr || '', warningMessage: null }
  }

  const parsedStart = parseDateString(startDateStr)
  if (!parsedStart || !/^\d{4}-\d{2}-\d{2}$/.test(parsedStart)) {
    return { fixedEndDate: uploadedEndDateStr || '', warningMessage: null }
  }

  const [y, m, d] = parsedStart.split('-').map(Number)
  if (!y || !m || !d) {
    return { fixedEndDate: uploadedEndDateStr || '', warningMessage: null }
  }

  const startDate = new Date(Date.UTC(y, m - 1, d))
  const trimmedType = (rentType || '').trim()
  const years = Math.max(1, parseInt(String(leaseYears || '1'), 10) || 1)

  const endDateInclusive = new Date(startDate.getTime())
  if (trimmedType === 'Monthly') {
    endDateInclusive.setUTCMonth(endDateInclusive.getUTCMonth() + 1)
  } else if (trimmedType === 'Lease') {
    endDateInclusive.setUTCFullYear(endDateInclusive.getUTCFullYear() + years)
  } else {
    // Annually or default
    endDateInclusive.setUTCFullYear(endDateInclusive.getUTCFullYear() + 1)
  }
  endDateInclusive.setUTCDate(endDateInclusive.getUTCDate() - 1)

  const fixedY = endDateInclusive.getUTCFullYear()
  const fixedM = String(endDateInclusive.getUTCMonth() + 1).padStart(2, '0')
  const fixedD = String(endDateInclusive.getUTCDate()).padStart(2, '0')
  const fixedEndDate = `${fixedY}-${fixedM}-${fixedD}`

  let warningMessage: string | null = null
  if (trimmedType === 'Lease') {
    warningMessage = `Auto-calculated Rent End Date to ${fixedEndDate} based on ${years}-year Lease term.`
  } else if (trimmedType === 'Monthly') {
    warningMessage = `Auto-calculated Rent End Date to ${fixedEndDate} based on Monthly tenancy term.`
  } else if (trimmedType === 'Annually') {
    warningMessage = `Auto-calculated Rent End Date to ${fixedEndDate} based on Annual tenancy term.`
  }

  return {
    fixedEndDate,
    warningMessage
  }
}

export const suggestMapping = (userColumn: string, columns: ColumnDef[]): { field: string; entityType: string } | null => {
  const userColTrimmed = userColumn.trim().toLowerCase()

  // Ignore Rent End Date or Due Date from auto-mapping
  if (
    userColTrimmed.includes('due date') ||
    userColTrimmed.includes('end date') ||
    userColTrimmed.includes('rent end') ||
    userColTrimmed.includes('rent due')
  ) {
    return null
  }
  
  for (const col of columns) {
    if (!col.readOnly && (userColTrimmed === col.key.toLowerCase() || userColTrimmed === col.label.toLowerCase())) {
      return { field: col.key, entityType: col.category }
    }
  }
  
  // Fuzzy matching for common variations
  if (userColTrimmed.includes('name') && userColTrimmed.includes('first')) return { field: 'tenantFirstName', entityType: 'tenant' }
  if (userColTrimmed.includes('name') && userColTrimmed.includes('last')) return { field: 'tenantLastName', entityType: 'tenant' }
  if (userColTrimmed === 'name' || userColTrimmed === 'tenant name') return null // Better to split
  if (userColTrimmed.includes('email') && userColTrimmed.includes('landlord')) return { field: 'landlordEmail', entityType: 'landlord' }
  if (userColTrimmed.includes('email')) return { field: 'tenantEmail', entityType: 'tenant' }
  if (userColTrimmed.includes('phone') && userColTrimmed.includes('landlord')) return { field: 'landlordPhone', entityType: 'landlord' }
  if (userColTrimmed.includes('phone')) return { field: 'tenantPhone', entityType: 'tenant' }
  if (userColTrimmed.includes('lease') && (userColTrimmed.includes('year') || userColTrimmed.includes('duration'))) return { field: 'leaseYears', entityType: 'unit' }
  
  return null
}

export const getSplitPreview = (workbook: XLSX.WorkBook | null, activeSheet: string, userColumn: string, delimiter: string) => {
  if (!workbook || !activeSheet || !delimiter) return []
  try {
    const worksheet = workbook.Sheets[activeSheet]
    if (!worksheet) return []
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', range: 0 })
    if (data.length < 2) return []

    const headers = (data[0] as any[]).map((h: any) => String(h || '').trim())
    const colIndex = headers.indexOf(userColumn)
    if (colIndex === -1) return []

    return data.slice(1, 4)
      .map((row: any) => String(row[colIndex] || '').trim())
      .filter(val => val !== '')
      .map(val => ({ original: val, parts: val.split(delimiter) }))
  } catch (e) {
    return []
  }
}

export const validateCell = (
  rowId: string, 
  field: string, 
  value: any, 
  colDef: ColumnDef | undefined, 
  columns: ColumnDef[], 
  rowData: any, 
  previewRows: any[],
  setValidationErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  silent = false
) => {
  let errorMsg = ''
  const config = colDef || columns.find(c => c.key === field)
  const row = rowData || previewRows.find(r => r.id === rowId)
  
  const hasAnyTenantData = row ? [
    row.tenantCommercialName, row.tenantFirstName, row.tenantLastName, row.tenantEmail, row.tenantPhone
  ].some(val => val && val.toString().trim() !== '') : false

  const isTenantField = ['tenantFirstName', 'tenantLastName', 'tenantEmail'].includes(field)
  const isRequired = config?.required && !(isTenantField && !hasAnyTenantData)

  if (isRequired && !value && value !== 0) {
    errorMsg = 'Required'
  } else if (field === 'unitRentType' || field === 'rentType') {
    if (value && !['Monthly', 'Annually', 'Lease'].includes(value)) {
      errorMsg = 'Must be Monthly, Annually, or Lease'
    }
  } else if (field === 'leaseYears') {
    const rentTypeVal = row?.unitRentType || row?.rentType
    if (rentTypeVal === 'Lease') {
      if (!value || isNaN(parseInt(value, 10)) || parseInt(value, 10) < 1) {
        errorMsg = 'Lease Years required (min 1)'
      }
    }
  } else if (config?.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    errorMsg = 'Invalid email'
  } else if (config?.type === 'tel' && value) {
    const parts = value.toString().split(',')
    const allValid = parts.every((part: string) => !part.trim() || isValidPhoneNumber(part.trim()))
    if (!allValid) errorMsg = 'Invalid phone'
  } else if (config?.type === 'number' && value !== '' && isNaN(parseFloat(value))) {
    errorMsg = 'Must be a number'
  }

  if (!silent) {
    const key = `${rowId}-${field}`
    setValidationErrors(prev => {
      const next = { ...prev }
      if (errorMsg) next[key] = errorMsg
      else delete next[key]
      return next
    })
  }
  return errorMsg
}

export function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ')
}



