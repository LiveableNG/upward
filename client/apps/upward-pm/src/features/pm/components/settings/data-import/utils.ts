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

const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december']

// "3rd December 2025" / "6th, December 2025" / "15 July 2025"
const parseOrdinalDate = (value: string): string | null => {
  const m = value.match(/^(\d{1,2})\s*(?:st|nd|rd|th)?\s*,?\s+([A-Za-z]+)\s+(\d{4})$/)
  if (!m) return null
  const day = parseInt(m[1], 10)
  const monthIndex = MONTHS.indexOf(m[2].toLowerCase())
  if (monthIndex === -1 || day < 1 || day > 31) return null
  return `${m[3]}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export const parseDateString = (val: any): string => {
  if (!val) return ''
  const strVal = String(val).trim()
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(strVal)) return strVal;

  const ordinal = parseOrdinalDate(strVal)
  if (ordinal) return ordinal

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

// Header text and field names both collapse to letters+digits, so "Rent Amount",
// "rent_amount", "rent-amount" and "RENT AMOUNT" all land on the same token.
const normaliseHeader = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '')

export const suggestMapping = (userColumn: string, columns: ColumnDef[]): { field: string; entityType: string } | null => {
  const candidate = normaliseHeader(userColumn)
  if (!candidate) return null

  // Exact matches only. A near-miss is left for the user to map deliberately —
  // a confident wrong guess is more expensive than no guess.
  for (const col of columns) {
    if (col.readOnly) continue
    if (candidate === normaliseHeader(col.label) || candidate === normaliseHeader(col.key)) {
      return { field: col.key, entityType: col.category }
    }
  }

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
  
  const hasTenantName = row ? [
    row.tenantFirstName, row.tenantLastName, row.tenantCommercialName
  ].some(val => val && val.toString().trim() !== '') : false

  const hasOtherTenantData = row ? [
    row.tenantEmail, row.tenantPhone, row.unitRentStartDate, row.rentStartDate, row.unitRentAmountPaid, row.rentAmountPaid
  ].some(val => val && val.toString().trim() !== '' && val.toString().trim() !== '0') : false

  let isRequired = false
  if (field === 'propertyAddress' || field === 'address' || field === 'unitRentAmount' || field === 'rentAmount') {
    isRequired = true
  } else if (hasTenantName) {
    if ([
      'tenantPhone',
      'unitRentStartDate',
      'rentStartDate',
      'unitRentAmountPaid',
      'rentAmountPaid',
      'unitRentType',
      'rentType'
    ].includes(field)) {
      isRequired = true
    }
    if (field === 'tenantFirstName' && !row.tenantFirstName?.trim() && !row.tenantCommercialName?.trim()) {
      isRequired = true
    }
  } else if (hasOtherTenantData) {
    if (field === 'tenantFirstName' && !row.tenantCommercialName?.trim()) {
      isRequired = true
    }
  }

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

const INVISIBLE_CHARS = /[\t\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/
const PHONE_RE = /(?:\+?\d[\d ()-]{7,}\d)/

export const scrub = (value: unknown) => String(value ?? '').replace(INVISIBLE_CHARS, '').trim()

// Extraction is driven by the target field's type, never by guessing what a column means
export type DateOrder = 'dmy' | 'mdy' | 'iso' | 'unknown'

type FoundDate = { start: number; end: number; y: number; a: number; b: number; ambiguous: boolean }

const MONTH_RE = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*'

// Ordered most-specific first: a looser pattern must never claim part of a stricter one
const DATE_PATTERNS: { re: RegExp; read: (m: RegExpExecArray) => Omit<FoundDate, 'start' | 'end'> }[] = [
  // 2024-01-31 / 2024/01/31
  { re: new RegExp('(\\d{4})[-/.](\\d{1,2})[-/.](\\d{1,2})', 'gi'),
    read: m => ({ y: +m[1], a: +m[3], b: +m[2], ambiguous: false }) },
  // 3rd December 2025 / 15 July 2025
  { re: new RegExp('(\\d{1,2})(?:st|nd|rd|th)?[\\s,]+(' + MONTH_RE + ')[\\s,]+(\\d{4})', 'gi'),
    read: m => ({ y: +m[3], a: +m[1], b: monthIndex(m[2]), ambiguous: false }) },
  // December 3, 2025
  { re: new RegExp('(' + MONTH_RE + ')[\\s,]+(\\d{1,2})(?:st|nd|rd|th)?[\\s,]+(\\d{4})', 'gi'),
    read: m => ({ y: +m[3], a: +m[2], b: monthIndex(m[1]), ambiguous: false }) },
  // 3-Dec-24
  { re: new RegExp('(\\d{1,2})[-\\s](' + MONTH_RE + ')[-\\s](\\d{2,4})', 'gi'),
    read: m => ({ y: fullYear(+m[3]), a: +m[1], b: monthIndex(m[2]), ambiguous: false }) },
  // Jan 2024
  { re: new RegExp('(' + MONTH_RE + ')[\\s,]+(\\d{4})', 'gi'),
    read: m => ({ y: +m[2], a: 1, b: monthIndex(m[1]), ambiguous: false }) },
  // 03/12/2025 — order unknown until the whole column is examined
  { re: new RegExp('(\\d{1,2})[-/.](\\d{1,2})[-/.](\\d{2,4})', 'g'),
    read: m => ({ y: fullYear(+m[3]), a: +m[1], b: +m[2], ambiguous: true }) },
]

function monthIndex(word: string): number {
  const w = word.toLowerCase().slice(0, 3)
  return ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(w) + 1
}

function fullYear(y: number): number {
  if (y > 999) return y
  return y < 70 ? 2000 + y : 1900 + y
}

// Find date-shaped substrings. Never splits on a separator, so a range separator
// can never be confused with the date's own separator.
export const findDates = (text: string): FoundDate[] => {
  const value = scrub(text)
  if (!value) return []
  const claimed: boolean[] = new Array(value.length).fill(false)
  const found: FoundDate[] = []

  DATE_PATTERNS.forEach(({ re, read }) => {
    const rx = new RegExp(re.source, re.flags)
    let m: RegExpExecArray | null
    while ((m = rx.exec(value)) !== null) {
      const start = m.index
      const end = m.index + m[0].length
      let overlaps = false
      for (let i = start; i < end; i++) if (claimed[i]) { overlaps = true; break }
      if (overlaps) continue
      const parsed = read(m)
      const inDayRange = parsed.a >= 1 && parsed.a <= 31 && parsed.b >= 1 && parsed.b <= 31
      const valid = parsed.ambiguous
        ? inDayRange && (parsed.a <= 12 || parsed.b <= 12)
        : parsed.b >= 1 && parsed.b <= 12 && parsed.a >= 1 && parsed.a <= 31
      if (!valid) continue
      for (let i = start; i < end; i++) claimed[i] = true
      found.push({ start, end, ...parsed })
    }
  })

  return found.sort((x, y) => x.start - y.start)
}

// Decide day-first vs month-first once for the whole column, using every row as evidence
export const inferDateOrder = (values: string[]): DateOrder => {
  let sawAmbiguous = false
  let dayFirst = false
  let monthFirst = false

  values.forEach(v => {
    findDates(v).forEach(d => {
      if (!d.ambiguous) return
      sawAmbiguous = true
      if (d.a > 12) dayFirst = true
      if (d.b > 12) monthFirst = true
    })
  })

  if (!sawAmbiguous) return 'iso'
  if (dayFirst && !monthFirst) return 'dmy'
  if (monthFirst && !dayFirst) return 'mdy'
  return 'unknown'
}

const toIso = (d: FoundDate, order: DateOrder): string => {
  let day = d.a
  let month = d.b
  if (d.ambiguous) {
    if (d.a > 12) { day = d.a; month = d.b }
    else if (d.b > 12) { day = d.b; month = d.a }
    else if (order === 'mdy') { day = d.b; month = d.a }
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return ''
  return `${d.y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// occurrence 0 = the first date in the cell, 1 = the second (a range's end)
export const extractDate = (rawValue: unknown, order: DateOrder = 'dmy', occurrence = 0): string => {
  const value = scrub(rawValue)
  if (!value) return ''
  if (/^\d{5}(\.\d+)?$/.test(value)) return occurrence === 0 ? parseDateString(value) : ''
  const dates = findDates(value)
  const hit = dates[occurrence]
  return hit ? toIso(hit, order) : ''
}

export const countDatesIn = (rawValue: unknown) => findDates(String(rawValue ?? '')).length

export interface ExtractOptions {
  dateOrder?: DateOrder
  occurrence?: number
}

export const extractForField = (rawValue: unknown, col: ColumnDef | undefined, opts: ExtractOptions = {}): string => {
  const raw = scrub(rawValue)
  if (!raw || !col) return isBlankToken(raw) ? '' : raw
  if (isBlankToken(raw)) return ''

  // Single-value fields read the first stacked line; text keeps everything on one line
  const value = col.type === 'text' || !col.type
    ? raw.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
    : (firstLine(raw) || raw)
  if (isBlankToken(value)) return ''

  switch (col.type) {
    case 'email': {
      const m = value.match(EMAIL_RE)
      return m ? m[0] : ''
    }
    case 'text': {
      return value
    }
    case 'tel': {
      const m = value.match(PHONE_RE)
      return m ? m[0].replace(/[\s()-]/g, '') : ''
    }
    case 'number':
      return parseMoney(value)
    case 'date':
      return extractDate(value, opts.dateOrder || 'dmy', opts.occurrence || 0)
    default:
      return value
  }
}

// Surname is the last word; everything before it is the first name.
// swapped: the sheet puts the surname first, as "ADEBAYO Tolu".
// A name cell often carries the phone and email too — "Kunle Fashola <k@x.com> 0801…"
export const stripContacts = (value: string) =>
  scrub(value)
    .replace(new RegExp(EMAIL_RE.source, 'gi'), ' ')
    .replace(new RegExp(PHONE_RE.source, 'g'), ' ')
    .replace(/[<>(),;|]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

export const splitPersonName = (value: string, swapped = false) => {
  const cleaned = stripContacts(value)
  if (looksCorporate(cleaned)) return { first: '', last: '', corporate: cleaned }

  const parts = cleaned.split(/\s+/).filter(Boolean).filter(w => !TITLES.test(w))
  if (parts.length === 0) return { first: '', last: '', corporate: '' }
  if (parts.length === 1) return { first: parts[0], last: '', corporate: '' }
  if (swapped) return { first: parts.slice(1).join(' '), last: parts[0], corporate: '' }
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1], corporate: '' }
}

// "ADEBAYO Tolu" — an all-caps leading word across most rows means surname first
export const looksSurnameFirst = (values: string[]): boolean => {
  const usable = values.map(v => scrub(v).split(/\s+/).filter(Boolean)).filter(p => p.length >= 2)
  if (usable.length < 3) return false
  const capsLeading = usable.filter(p => p[0].length > 1 && p[0] === p[0].toUpperCase() && /[A-Z]/.test(p[0])).length
  return capsLeading / usable.length > 0.6
}

// Spellings people use for "nothing here"
const NULL_TOKENS = new Set(['n/a','na','nil','none','tbc','tbd','tba','pending','unknown','-','--','---','.','x','xx','xxx','null','undefined'])
// Excel shows these when a formula breaks; they are not data
const EXCEL_ERRORS = /^#(ref|n\/a|value|div\/0|name|null|num|spill|calc)[!?]?$/i

export const isBlankToken = (value: string) => {
  const v = value.trim().toLowerCase()
  return v === '' || NULL_TOKENS.has(v) || EXCEL_ERRORS.test(v)
}

export const isExcelError = (value: unknown) => EXCEL_ERRORS.test(String(value ?? '').trim())

// A cell may stack several values with alt+enter
export const firstLine = (value: string) => value.split(/[\r\n]+/).map(v => v.trim()).filter(Boolean)[0] || ''
export const countLines = (value: unknown) => scrub(value).split(/[\r\n]+/).map(v => v.trim()).filter(Boolean).length

// "4.2m" -> 4200000, "450k" -> 450000, "(50,000)" -> -50000, "N1,650,000" -> 1650000
export const parseMoney = (raw: string): string => {
  let value = raw.trim()
  if (isBlankToken(value)) return ''

  const negative = /^\(.*\)$/.test(value)
  if (negative) value = value.slice(1, -1)

  const cleaned = value.replace(/,/g, '')
  const match = cleaned.match(/(-?\d+(?:\.\d+)?)\s*([mMkK])?/)
  if (!match) return ''

  let n = parseFloat(match[1])
  if (!isFinite(n)) return ''

  const suffix = (match[2] || '').toLowerCase()
  const wordMillion = /\bmillions?\b/i.test(cleaned)
  const wordThousand = /\bthousands?\b/i.test(cleaned)
  if (suffix === 'm' || wordMillion) n *= 1_000_000
  else if (suffix === 'k' || wordThousand) n *= 1_000

  if (negative) n = -n
  return String(n)
}

// "Full"/"Paid" mean the whole rent; "50%" means that share of it
export const resolvePaidWord = (raw: string, rentAmount: number): string | null => {
  const v = scrub(raw).toLowerCase()
  if (!v) return null
  if (/^(full|paid|fully paid|paid in full|complete|completed|yes)$/.test(v)) return String(rentAmount)
  const pct = v.match(/^(\d{1,3}(?:\.\d+)?)\s*%$/)
  if (pct && rentAmount) return String(Math.round(rentAmount * (parseFloat(pct[1]) / 100)))
  if (/^(none|not paid|unpaid|no|outstanding)$/.test(v)) return '0'
  return null
}

const TITLES = /^(mr|mrs|miss|ms|mister|dr|doctor|chief|engr|engineer|alhaji|alhaja|hajia|barr|barrister|arc|architect|prof|professor|pastor|rev|reverend|sir|lady|madam|elder|deacon|evang)\.?$/i
const COMPANY_TAIL = /\b(ltd|limited|plc|inc|llc|enterprises?|ventures?|nigeria|holdings?|group|company|co|associates|partners|solutions?|services?|international)\.?$/i

export const looksCorporate = (value: string) => {
  const v = scrub(value)
  if (!v) return false
  return COMPANY_TAIL.test(v) || /&\s*co\b/i.test(v)
}

export interface SheetReport {
  sheetName: string
  otherSheets: string[]
  headerRowIndex: number
  headers: string[]
  dataRowCount: number
  hiddenRows: number[]
  totalsRows: number[]
  errorCells: number
  mergedHeader: boolean
  blocking: string | null
}

const looksLikeTotalsRow = (row: unknown[]): boolean => {
  const cells = row.map(c => scrub(c))
  const first = cells.find(Boolean) || ''
  if (/^(grand\s+)?(total|totals|sum|subtotal)\b/i.test(first)) return true
  // No words anywhere, but a number far larger than a normal row carries
  const texts = cells.filter(c => c && !/^[₦N$£€]?\s*[\d,. ]+$/.test(c))
  const numbers = cells.map(c => parseFloat(c.replace(/[^\d.-]/g, ''))).filter(n => isFinite(n))
  return texts.length === 0 && numbers.length > 0
}

// The first row that reads like a header: several filled cells, all distinct, mostly words
const findHeaderRow = (rows: unknown[][]): number => {
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const cells = (rows[i] || []).map(c => scrub(c)).filter(Boolean)
    if (cells.length < 3) continue
    const distinct = new Set(cells.map(c => c.toLowerCase()))
    if (distinct.size !== cells.length) continue
    const wordy = cells.filter(c => /[a-z]/i.test(c)).length
    if (wordy / cells.length < 0.7) continue
    return i
  }
  return 0
}

export const inspectSheet = (workbook: XLSX.WorkBook, sheetName: string): SheetReport => {
  const worksheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as unknown[][]
  const headerRowIndex = findHeaderRow(rows)
  const headers = (rows[headerRowIndex] || []).map(h => scrub(h)).filter(Boolean)

  // Excel marks hidden rows in !rows; they are usually records the manager removed on purpose
  const rowMeta = (worksheet['!rows'] || []) as { hidden?: boolean }[]
  const hiddenRows: number[] = []
  rowMeta.forEach((meta, i) => { if (meta?.hidden && i > headerRowIndex) hiddenRows.push(i) })

  const totalsRows: number[] = []
  let errorCells = 0
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i] || []
    if (row.every(c => scrub(c) === '')) continue
    if (looksLikeTotalsRow(row)) totalsRows.push(i)
    row.forEach(c => { if (isExcelError(c)) errorCells++ })
  }

  const merges = (worksheet['!merges'] || []) as { s: { r: number }; e: { r: number } }[]
  const mergedHeader = merges.some(m => m.s.r <= headerRowIndex && m.e.r >= headerRowIndex)

  const dataRowCount = rows
    .slice(headerRowIndex + 1)
    .filter((r, i) => r.some(c => scrub(c) !== '')
      && !hiddenRows.includes(i + headerRowIndex + 1)
      && !totalsRows.includes(i + headerRowIndex + 1)).length

  let blocking: string | null = null
  if (headers.length < 2) blocking = "We could not find a row of column headings in this sheet."
  else if (mergedHeader) blocking = "Your headings are merged across cells, so we cannot tell the columns apart."
  else if (dataRowCount === 0) blocking = "We could not find any rows of data under your headings."

  return {
    sheetName,
    otherSheets: workbook.SheetNames.filter(n => n !== sheetName),
    headerRowIndex,
    headers,
    dataRowCount,
    hiddenRows,
    totalsRows,
    errorCells,
    mergedHeader,
    blocking,
  }
}
