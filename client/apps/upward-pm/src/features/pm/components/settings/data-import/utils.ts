import { ColumnDef } from './types'
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
    if (cleaned.startsWith('234')) {
      return '+' + cleaned
    }
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      return '+234' + cleaned.substring(1)
    }
    if (cleaned.length === 10 && !cleaned.startsWith('0')) {
      return '+234' + cleaned
    }
  }

  if (normalizedCountry === 'ghana') {
    if (cleaned.startsWith('233')) {
      return '+' + cleaned
    }
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      return '+233' + cleaned.substring(1)
    }
    if (cleaned.length === 9 && !cleaned.startsWith('0')) {
      return '+233' + cleaned
    }
  }

  if (normalizedCountry === 'united kingdom' || normalizedCountry === 'uk') {
    if (cleaned.startsWith('44')) {
      return '+' + cleaned
    }
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      return '+44' + cleaned.substring(1)
    }
    if (cleaned.length === 10 && !cleaned.startsWith('0')) {
      return '+44' + cleaned
    }
  }

  if (normalizedCountry === 'united states' || normalizedCountry === 'us' || normalizedCountry === 'usa' || normalizedCountry === 'canada') {
    if (cleaned.startsWith('1') && cleaned.length >= 10) {
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
  if (/^\d{4,5}$/.test(strVal)) {
    const serial = parseInt(strVal, 10)
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000))
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
  }
  const date = new Date(strVal)
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]
  }
  return strVal
}

export const suggestMapping = (userColumn: string, columns: ColumnDef[]): { field: string; entityType: string } | null => {
  const userColTrimmed = userColumn.trim().toLowerCase()
  
  for (const col of columns) {
    if (userColTrimmed === col.key.toLowerCase() || userColTrimmed === col.label.toLowerCase()) {
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
