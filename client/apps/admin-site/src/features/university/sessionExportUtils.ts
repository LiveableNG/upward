import { showToast } from '@upward/client-core'
import type { EarlyAccessRecord, UniversityApplicationRecord } from './types'

export type TrackCode = 'TRACK_A' | 'TRACK_B' | 'TRACK_C' | 'TRACK_D' | 'TRACK_1' | 'TRACK_2' | 'NONE'

export interface ParsedSessionDetails {
  track: string
  trackCode: TrackCode
  attendanceMode: 'Online' | 'In-Person' | 'None'
  sessionDay: string
  sessionVenue: string
  sessionDateTime: string
  sessionBadgeText: string
  cleanNotes: string
  funnelStatus: string
  rawSession: string
}

export function getTrackBadgeMeta(trackCode: TrackCode): {
  label: string
  background: string
  color: string
  border: string
} {
  switch (trackCode) {
    case 'TRACK_A':
      return { label: 'Track A · Foundation', background: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' }
    case 'TRACK_B':
      return { label: 'Track B · Career Dev', background: '#f0fdf4', color: '#166534', border: '#bbf7d0' }
    case 'TRACK_C':
      return { label: 'Track C · Practical & Networking', background: '#fff7ed', color: '#9a3412', border: '#fed7aa' }
    case 'TRACK_D':
      return { label: 'Track D · Networking (Legacy)', background: '#faf5ff', color: '#6b21a8', border: '#e9d5ff' }
    case 'TRACK_2':
      return { label: 'Track 2', background: '#f0fdf4', color: '#166534', border: '#bbf7d0' }
    case 'TRACK_1':
      return { label: 'Track 1', background: '#fff7ed', color: '#9a3412', border: '#ffedd5' }
    default:
      return { label: 'Not Specified', background: '#f3f4f6', color: '#4b5563', border: '#e5e7eb' }
  }
}

/**
 * Robustly parses and separates the strung-up session, track, and interest
 * data stored in early access submissions and cohort applications.
 */
export function parseSessionAndTrack(data: {
  interest?: string | null
  sessionTime?: string | null
  track?: string | null
  experienceLevel?: string | null
}): ParsedSessionDetails {
  const interestRaw = (data.interest || '').trim()
  const sessionRaw = (data.sessionTime || '').trim()
  const trackRaw = (data.track || '').trim()
  const expRaw = (data.experienceLevel || '').trim()

  // 1. Detect Drop-off Funnel Status
  const isDropOff = expRaw.includes('Stage 1') || interestRaw.includes('Drop-off Stage 1')
  const funnelStatus = isDropOff ? 'Drop-off (Stage 1: Basic Info)' : 'Completed RSVP'

  // 2. Parse Track
  let track = 'Not Specified'
  let trackCode: TrackCode = 'NONE'

  const fullTrackSource = `${trackRaw} ${interestRaw} ${expRaw}`
  if (/track[\s_-]*d\b|premium\s*networking/i.test(fullTrackSource)) {
    track = 'Track D — Premium Networking (₦200,000)'
    trackCode = 'TRACK_D'
  } else if (/track[\s_-]*c\b|practical\s*experience/i.test(fullTrackSource)) {
    track = 'Track C — Practical Experience (₦160,000)'
    trackCode = 'TRACK_C'
  } else if (/track[\s_-]*b\b|career\s*development/i.test(fullTrackSource)) {
    track = 'Track B — Career Development (₦100,000)'
    trackCode = 'TRACK_B'
  } else if (/track[\s_-]*a\b|track[\s_-]*a\s*-|\bfoundation\b/i.test(fullTrackSource)) {
    track = 'Track A — Foundation (₦60,000)'
    trackCode = 'TRACK_A'
  } else if (/track[\s_-]*2|already\s*started/i.test(fullTrackSource)) {
    track = 'Track 2 (Already Started)'
    trackCode = 'TRACK_2'
  } else if (/track[\s_-]*1|starting\s*from\s*zero/i.test(fullTrackSource)) {
    track = 'Track 1 (Starting From Zero)'
    trackCode = 'TRACK_1'
  }

  // 3. Extract Raw Session String
  let sessionString = sessionRaw
  if (!sessionString) {
    const sessionMatch = interestRaw.match(/\[Session:\s*([^\]]+)\]/i)
    if (sessionMatch) {
      sessionString = sessionMatch[1].trim()
    } else if (/Online\s*\(Zoom|Physical|In-Person/i.test(interestRaw)) {
      // Find candidate session string if embedded
      const m = interestRaw.match(/(?:Online\s*\([^\)]+\)|[A-Za-z\s/]+\s*\(Physical[^\)]*\))[^-]*-[^\n,\]]+/i)
      if (m) sessionString = m[0].trim()
    }
  }

  // 4. Parse Attendance Mode & Location
  let attendanceMode: 'Online' | 'In-Person' | 'None' = 'None'
  let sessionDay = 'N/A'
  let sessionVenue = 'N/A'
  let sessionDateTime = 'N/A'
  let sessionBadgeText = isDropOff ? 'Stage 1 Drop-off (No Session)' : 'Waitlist Only (No Session RSVP)'

  if (
    sessionString &&
    sessionString.toLowerCase() !== "i don't need an info session" &&
    sessionString.toLowerCase() !== 'none'
  ) {
    const sLower = sessionString.toLowerCase()

    if (
      sLower.includes('online') ||
      sLower.includes('zoom') ||
      sLower.includes('meet') ||
      sLower.includes('webinar')
    ) {
      attendanceMode = 'Online'
      sessionVenue = 'Zoom / Google Meet (Live Webinar)'

      if (sLower.includes('tuesday') || sLower.includes('tue')) {
        sessionDay = 'Tuesday'
      } else if (sLower.includes('saturday') || sLower.includes('sat')) {
        sessionDay = 'Saturday'
      } else if (sLower.includes('thursday') || sLower.includes('thu')) {
        sessionDay = 'Thursday'
      } else if (sLower.includes('friday') || sLower.includes('fri')) {
        sessionDay = 'Friday'
      } else if (sLower.includes('wednesday') || sLower.includes('wed')) {
        sessionDay = 'Wednesday'
      } else {
        sessionDay = 'Live Webinar'
      }

      // Clean session string to retain full date and time without redundant mode text or broken brackets
      let cleanDateTime = sessionString
        .replace(/\s*\((?:Online|Zoom|Google Meet|Live Stream|Live Webinar)\)/gi, '')
        .replace(/^Online\s*(?:\([^\)]*\))?\s*[-·:]*\s*/gi, '')
        .replace(/\s*[-·:]*\s*Online$/gi, '')
        .trim()

      if (!cleanDateTime || cleanDateTime.toLowerCase() === 'online') {
        const timeMatch = sessionString.match(/(\d{1,2}:\d{2}\s*(?:am|pm)[^)]*)/i)
        if (timeMatch) {
          cleanDateTime = timeMatch[1].replace(/^[-\s]+/, '').replace(/\s*\([^)]*\)$/, '').trim()
        } else {
          const parts = sessionString.split('-')
          const lastPart = parts[parts.length - 1].replace(/[()]/g, '').trim()
          cleanDateTime = lastPart || sessionString
        }
      }

      sessionDateTime = cleanDateTime || 'Online Live Session'
      sessionBadgeText = `Online · ${sessionDateTime}`
    } else if (
      sLower.includes('physical') ||
      sLower.includes('in-person') ||
      sLower.includes('abuja') ||
      sLower.includes('port harcourt') ||
      sLower.includes('ph') ||
      sLower.includes('lagos') ||
      sLower.includes('ibadan') ||
      sLower.includes('oyo')
    ) {
      attendanceMode = 'In-Person'
      let cityLabel = 'In-Person'

      if (sLower.includes('abuja')) {
        cityLabel = 'Abuja'
        sessionDay = 'Friday'
        sessionVenue = 'Abuja (Central Business District)'
      } else if (sLower.includes('port harcourt') || sLower.includes('ph')) {
        cityLabel = 'Port Harcourt'
        sessionDay = 'Thursday'
        sessionVenue = 'Port Harcourt (GRA Phase 2)'
      } else if (sLower.includes('lagos') || sLower.includes('yaba')) {
        cityLabel = 'Lagos'
        sessionDay = 'Wednesday'
        sessionVenue = 'Lagos (Yaba Tech Hub)'
      } else if (sLower.includes('ibadan') || sLower.includes('oyo') || sLower.includes('bodija')) {
        cityLabel = 'Oyo / Ibadan'
        sessionDay = 'TBA'
        sessionVenue = 'Oyo / Ibadan (Bodija)'
      } else {
        sessionVenue = 'Physical Venue'
      }

      if (sLower.includes('date coming soon')) {
        sessionDateTime = 'Date Coming Soon'
      } else {
        let cleanDateTime = sessionString
          .replace(/\s*\((?:Physical[^\)]*|In-Person[^\)]*)\)/gi, '')
          .replace(/^[A-Za-z\s/]+\s*(?:\([^\)]*\))?\s*[-·:]*\s*/gi, '')
          .trim()

        if (!cleanDateTime) {
          const timeMatch = sessionString.match(/(\d{1,2}:\d{2}\s*(?:am|pm)[^)]*)/i)
          if (timeMatch) {
            cleanDateTime = timeMatch[1].replace(/^[-\s]+/, '').replace(/\s*\([^)]*\)$/, '').trim()
          } else {
            const parts = sessionString.split('-')
            const lastPart = parts[parts.length - 1].replace(/[()]/g, '').trim()
            cleanDateTime = lastPart || sessionString
          }
        }

        sessionDateTime = cleanDateTime || sessionVenue
      }

      sessionBadgeText = `${cityLabel} · ${sessionDateTime}`
    }
  }

  // 5. Clean Attendee Notes (strip out serialized bracket tags)
  let cleanNotes = interestRaw
    .replace(/\[Track:\s*[^\]]+\]/gi, '')
    .replace(/\[Session:\s*[^\]]+\]/gi, '')
    .replace(/\[Track\s*[12][^\]]*\]/gi, '')
    .trim()

  if (!cleanNotes || cleanNotes === 'Info Session Attendee' || cleanNotes.startsWith('Drop-off Stage 1')) {
    cleanNotes = isDropOff ? 'Drop-off at Step 1 (Contact Info only)' : 'Info Session Attendee'
  }

  return {
    track,
    trackCode,
    attendanceMode,
    sessionDay,
    sessionVenue,
    sessionDateTime,
    sessionBadgeText,
    cleanNotes,
    funnelStatus,
    rawSession: sessionString || 'None',
  }
}

/**
 * Filter matcher for Session types and Academic Webinar dates
 */
export function matchesSessionFilter(
  data: {
    interest?: string | null
    sessionTime?: string | null
    track?: string | null
    experienceLevel?: string | null
  },
  filter: string
): boolean {
  if (!filter || filter === 'ALL') return true

  const parsed = parseSessionAndTrack(data)
  const fullText = `${data.interest || ''} ${data.sessionTime || ''} ${data.track || ''} ${parsed.rawSession || ''} ${parsed.sessionDateTime || ''}`.toLowerCase()

  switch (filter) {
    case 'WEBINAR_NOV_21':
    case '21st November 2026':
      return /21st\s*november|nov\s*21|21\s*nov/i.test(fullText)
    case 'WEBINAR_ALL':
      return /webinar|21st\s*november/i.test(fullText)
    case 'ONLINE_ALL':
      return parsed.attendanceMode === 'Online'
    case 'ONLINE_TUE':
      return parsed.attendanceMode === 'Online' && (parsed.sessionDay === 'Tuesday' || /tuesday|tue/i.test(fullText))
    case 'ONLINE_SAT':
      return parsed.attendanceMode === 'Online' && (parsed.sessionDay === 'Saturday' || /saturday|sat/i.test(fullText))
    case 'PHYSICAL_ALL':
      return parsed.attendanceMode === 'In-Person'
    case 'PHYSICAL_ABUJA':
      return parsed.attendanceMode === 'In-Person' && parsed.sessionVenue.includes('Abuja')
    case 'PHYSICAL_PH':
      return parsed.attendanceMode === 'In-Person' && parsed.sessionVenue.includes('Port Harcourt')
    case 'PHYSICAL_LAGOS':
      return parsed.attendanceMode === 'In-Person' && parsed.sessionVenue.includes('Lagos')
    case 'PHYSICAL_IBADAN':
      return parsed.attendanceMode === 'In-Person' && parsed.sessionVenue.includes('Ibadan')
    case 'NO_SESSION':
      return parsed.attendanceMode === 'None'
    default:
      if (filter.startsWith('DATE:')) {
        const targetDate = filter.replace('DATE:', '').toLowerCase().trim()
        return fullText.includes(targetDate)
      }
      return fullText.includes(filter.toLowerCase().trim())
  }
}

/**
 * Filter matcher for Track selection
 */
export function matchesTrackFilter(
  data: { interest?: string | null; sessionTime?: string | null; track?: string | null; experienceLevel?: string | null },
  filter: string
): boolean {
  if (!filter || filter === 'ALL') return true

  const parsed = parseSessionAndTrack(data)
  return parsed.trackCode === filter
}


/**
 * Helper to build a styled Excel spreadsheet (XML/HTML) with brand styling,
 * generous cell padding, colored headers, and forced text format for phone numbers.
 */
function buildStyledExcelHtml(sheetTitle: string, headers: string[], rows: Array<Array<{ val: string; isPhone?: boolean }>>): string {
  const headerHtml = headers
    .map(
      (h) =>
        `<th style="background-color: #8A4A2A; color: #ffffff; font-weight: bold; font-size: 11pt; padding: 12px 14px; text-align: left; border: 1px solid #703c21; white-space: nowrap;">${h}</th>`
    )
    .join('')

  const rowsHtml = rows
    .map((row, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#fcfaf8'
      const cellsHtml = row
        .map((cell) => {
          const style = cell.isPhone
            ? `padding: 9px 12px; font-size: 10pt; border: 1px solid #e2e8f0; mso-number-format: '\\@';`
            : `padding: 9px 12px; font-size: 10pt; border: 1px solid #e2e8f0;`
          const safeVal = String(cell.val ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
          return `<td style="${style}">${safeVal}</td>`
        })
        .join('')
      return `<tr style="background-color: ${bg};">${cellsHtml}</tr>`
    })
    .join('')

  return `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<!--[if gte mso 9]>
<xml>
  <x:ExcelWorkbook>
    <x:ExcelWorksheets>
      <x:ExcelWorksheet>
        <x:Name>${sheetTitle}</x:Name>
        <x:WorksheetOptions>
          <x:DisplayGridlines/>
        </x:WorksheetOptions>
      </x:ExcelWorksheet>
    </x:ExcelWorksheets>
  </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 11pt; color: #1e293b; }
  table { border-collapse: collapse; width: 100%; }
</style>
</head>
<body>
  <table>
    <thead>
      <tr>${headerHtml}</tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
</body>
</html>`.trim()
}

/**
 * Trigger download of styled spreadsheet (opens in WPS Office / Microsoft Excel / Google Sheets)
 */
function downloadSpreadsheet(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export Early Access Student Cohort records to a cleanly styled spreadsheet
 * without submission IDs, landlord fields, or funnel state.
 */
export function exportEarlyAccessToCsv(records: EarlyAccessRecord[], filename?: string): void {
  if (!records || records.length === 0) {
    showToast('No records to export', true)
    return
  }

  const headers = [
    'Date Submitted',
    'Application Type',
    'Full Name',
    'Email Address',
    'WhatsApp / Contact',
    'City',
    'Age Bracket',
    'Experience Level',
    'Track Selection',
    'Attendance Mode',
    'Session Day / City',
    'Session Venue',
    'Session Date & Time',
    'Referral / Traffic Source',
    'Notes / Reason for Interest',
  ]

  const rows = records.map((rec) => {
    const parsed = parseSessionAndTrack({
      interest: rec.interest,
      experienceLevel: rec.experienceLevel,
    })

    const d = rec.createdAt ? new Date(rec.createdAt) : null
    const dateFormatted = d
      ? `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
      : 'N/A'

    return [
      { val: dateFormatted },
      { val: 'Student Cohort' },
      { val: rec.name },
      { val: rec.email || 'N/A' },
      { val: rec.whatsapp, isPhone: true },
      { val: rec.city },
      { val: rec.ageBracket || 'N/A' },
      { val: rec.experienceLevel?.replace(/\[.*?\]/g, '').trim() || 'N/A' },
      { val: parsed.track },
      { val: parsed.attendanceMode },
      { val: parsed.sessionDay },
      { val: parsed.sessionVenue },
      { val: parsed.sessionDateTime },
      { val: rec.sourceIdentifier || 'Direct' },
      { val: parsed.cleanNotes },
    ]
  })

  const sheetTitle = 'Student Cohort Sessions'
  const htmlContent = buildStyledExcelHtml(sheetTitle, headers, rows)
  const defaultName = `Upward_Academy_Student_Sessions_${new Date().toISOString().split('T')[0]}.xls`

  downloadSpreadsheet(htmlContent, filename || defaultName)
  showToast(`Exported ${records.length} Student Cohort records to spreadsheet`)
}

/**
 * Export University Full Applications to a cleanly styled spreadsheet
 */
export function exportApplicationsToCsv(
  applications: UniversityApplicationRecord[],
  filename?: string
): void {
  if (!applications || applications.length === 0) {
    showToast('No applications to export', true)
    return
  }

  const headers = [
    'Date Submitted',
    'Application Type',
    'Full Name',
    'Email Address',
    'WhatsApp / Contact',
    'City',
    'Age Bracket',
    'Occupation',
    'Experience Level',
    'Track Selection',
    'Attendance Mode',
    'Session Day / City',
    'Session Venue',
    'Session Date & Time',
    'Application Status',
    'Fee Status',
    'Weekly Commitment',
    'Why Upward Academy',
    'Career Goals',
    'Scholarship Requested',
    'Admin Notes',
  ]

  const rows = applications.map((app) => {
    const parsed = parseSessionAndTrack({
      sessionTime: app.sessionTime,
      track: app.track,
      experienceLevel: app.experienceLevel,
    })

    const d = app.createdAt ? new Date(app.createdAt) : null
    const dateFormatted = d
      ? `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
      : 'N/A'

    return [
      { val: dateFormatted },
      { val: 'Student Cohort' },
      { val: app.name },
      { val: app.email },
      { val: app.whatsapp, isPhone: true },
      { val: app.city },
      { val: app.ageBracket || 'N/A' },
      { val: app.occupation || 'N/A' },
      { val: app.experienceLevel || 'N/A' },
      { val: parsed.track },
      { val: parsed.attendanceMode },
      { val: parsed.sessionDay },
      { val: parsed.sessionVenue },
      { val: parsed.sessionDateTime },
      { val: app.status },
      { val: app.feeStatus },
      { val: app.commitment || 'N/A' },
      { val: app.why || 'N/A' },
      { val: app.goals || 'N/A' },
      { val: app.isScholarship ? 'Yes' : 'No' },
      { val: app.notes || 'None' },
    ]
  })

  const sheetTitle = 'Cohort Applications'
  const htmlContent = buildStyledExcelHtml(sheetTitle, headers, rows)
  const defaultName = `Upward_Academy_Cohort_Applications_${new Date().toISOString().split('T')[0]}.xls`

  downloadSpreadsheet(htmlContent, filename || defaultName)
  showToast(`Exported ${applications.length} applications to spreadsheet`)
}

export interface PaymentAndBalanceMeta {
  status: 'PAID_FULL' | 'DEPOSIT_PENDING' | 'REFUNDED' | 'UNPAID'
  badgeLabel: string
  detailText?: string
  isDeposit: boolean
  depositAmount: number
  balanceDue: number
  totalPackage?: number
  trackName?: string
  isFullyCleared: boolean
  color: string
  background: string
  border: string
}

export function getPaymentAndBalanceMeta(app: {
  feeStatus?: string
  notes?: string | null
  track?: string | null
  applicationFee?: number
}): PaymentAndBalanceMeta {
  const isPaid = app.feeStatus === 'PAID'
  const isRefunded = app.feeStatus === 'REFUNDED'
  const notes = app.notes || ''
  const notesLower = notes.toLowerCase()
  const trackStr = (app.track || notes || '')

  if (!isPaid && !isRefunded) {
    return {
      status: 'UNPAID',
      badgeLabel: 'UNPAID',
      detailText: 'Stage 1 Saved (Payment Pending)',
      isDeposit: false,
      depositAmount: 0,
      balanceDue: 0,
      isFullyCleared: false,
      color: '#64748b',
      background: '#f1f5f9',
      border: '#cbd5e1',
    }
  }

  if (isRefunded) {
    return {
      status: 'REFUNDED',
      badgeLabel: 'REFUNDED',
      isDeposit: false,
      depositAmount: 0,
      balanceDue: 0,
      isFullyCleared: false,
      color: '#991b1b',
      background: '#fef2f2',
      border: '#fecaca',
    }
  }

  // Check if it's a deposit payment
  const isDeposit =
    !notesLower.includes('full offer') &&
    !notesLower.includes('full fee') &&
    (notesLower.includes('deposit') ||
      notesLower.includes('down payment') ||
      notesLower.includes('lock-in') ||
      notes.includes('₦25,000'))
  const isFullyCleared = notes.includes('FULLY CLEARED')

  if (isDeposit) {
    let depositAmount = 70000
    let balanceDue = 80000
    let totalPackage = 150000
    let trackName = 'Track C - Practical Experience'

    const isTrackC = trackStr.includes('Track C') || notes.includes('Track C') || notes.includes('₦70,000')
    const isTrackB = !isTrackC && (trackStr.includes('Track B') || notes.includes('Track B') || notes.includes('₦50,000'))
    const isTrackA = !isTrackC && !isTrackB && (trackStr.includes('Track A') || notes.includes('Track A') || notes.includes('₦30,000'))

    if (isTrackA) {
      trackName = 'Track A - Foundation'
      depositAmount = 30000
      balanceDue = 30000
      totalPackage = 60000
    } else if (isTrackB) {
      trackName = 'Track B - Career Development'
      depositAmount = 50000
      const is48h = notes.includes('110,000') || notesLower.includes('48-hour') || notesLower.includes('48h')
      balanceDue = is48h ? 60000 : 70000
      totalPackage = depositAmount + balanceDue
    } else {
      trackName = 'Track C - Practical Experience'
      if (notes.includes('₦25,000') || notesLower.includes('lock-in')) {
        depositAmount = 25000
        balanceDue = 125000
        totalPackage = 150000
      } else {
        depositAmount = 70000
        const is48h = notes.includes('150,000') || notesLower.includes('48-hour') || notesLower.includes('48h') || !notes.includes('160,000')
        balanceDue = is48h ? 80000 : 90000
        totalPackage = depositAmount + balanceDue
      }
    }

    if (!isFullyCleared) {
      const depLabel = (depositAmount / 1000)
      const balLabel = (balanceDue / 1000)
      return {
        status: 'DEPOSIT_PENDING',
        badgeLabel: `DEPOSIT: ₦${depLabel}k · ₦${balLabel}k DUE`,
        detailText: `₦${depositAmount.toLocaleString()} paid · ₦${balanceDue.toLocaleString()} balance remaining (Total ₦${totalPackage.toLocaleString()})`,
        isDeposit: true,
        depositAmount,
        balanceDue,
        totalPackage,
        trackName,
        isFullyCleared: false,
        color: '#b45309',
        background: '#fef3c7',
        border: '#fde68a',
      }
    }

    return {
      status: 'PAID_FULL',
      badgeLabel: `PAID IN FULL (₦${(totalPackage / 1000)}k)`,
      detailText: `₦${depositAmount.toLocaleString()} deposit + ₦${balanceDue.toLocaleString()} balance paid · FULLY CLEARED`,
      isDeposit: true,
      depositAmount,
      balanceDue: 0,
      totalPackage,
      trackName,
      isFullyCleared: true,
      color: '#15803d',
      background: '#dcfce7',
      border: '#bbf7d0',
    }
  }

  // Full upfront payment
  const paymentMatch = notes.match(/\[Payment:\s*([^\]]+)\]/i)?.[1]
  let paidLabel = '✓ PAID IN FULL'
  if (trackStr.includes('Track A')) {
    if (notes.includes('50,000') || notes.includes('50k')) {
      paidLabel = 'PAID IN FULL (₦50k)'
    } else {
      paidLabel = 'PAID IN FULL (₦60k)'
    }
  } else if (trackStr.includes('Track B')) {
    if (notes.includes('100,000') || notes.includes('100k')) {
      paidLabel = 'PAID IN FULL (₦100k)'
    } else {
      paidLabel = 'PAID IN FULL (₦120k)'
    }
  } else if (trackStr.includes('Track C')) {
    if (notes.includes('135,000') || notes.includes('135k')) {
      paidLabel = 'PAID IN FULL (₦135k)'
    } else if (notes.includes('160,000') || notes.includes('160k')) {
      paidLabel = 'PAID IN FULL (₦160k)'
    } else {
      paidLabel = 'PAID IN FULL (₦200k)'
    }
  } else if (paymentMatch) {
    if (paymentMatch.includes('135,000') || paymentMatch.includes('135k')) {
      paidLabel = 'PAID IN FULL (₦135k)'
    } else if (paymentMatch.includes('200,000') || paymentMatch.includes('200k')) {
      paidLabel = 'PAID IN FULL (₦200k)'
    } else if (paymentMatch.includes('100,000') || paymentMatch.includes('100k')) {
      paidLabel = 'PAID IN FULL (₦100k)'
    } else if (paymentMatch.includes('50,000') || paymentMatch.includes('50k')) {
      paidLabel = 'PAID IN FULL (₦50k)'
    } else if (paymentMatch.includes('60,000') || paymentMatch.includes('60k')) {
      paidLabel = 'PAID IN FULL (₦60k)'
    }
  }

  return {
    status: 'PAID_FULL',
    badgeLabel: paidLabel,
    detailText: paymentMatch || 'Verified Cohort Tuition',
    isDeposit: false,
    depositAmount: 0,
    balanceDue: 0,
    isFullyCleared: true,
    color: '#15803d',
    background: '#dcfce7',
    border: '#bbf7d0',
  }
}
