import { showToast } from '@upward/client-core'
import type { EarlyAccessRecord, UniversityApplicationRecord } from './types'

export interface ParsedSessionDetails {
  track: string
  trackCode: 'TRACK_1' | 'TRACK_2' | 'NONE'
  attendanceMode: 'Online' | 'In-Person' | 'None'
  sessionDay: string
  sessionVenue: string
  sessionDateTime: string
  sessionBadgeText: string
  cleanNotes: string
  funnelStatus: string
  rawSession: string
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
  let trackCode: 'TRACK_1' | 'TRACK_2' | 'NONE' = 'NONE'

  const fullTrackSource = `${trackRaw} ${interestRaw} ${expRaw}`
  if (/track[\s_-]*2|already\s*started/i.test(fullTrackSource)) {
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

    if (sLower.includes('online') || sLower.includes('zoom') || sLower.includes('meet')) {
      attendanceMode = 'Online'
      sessionVenue = 'Zoom / Google Meet (Live Webinar)'

      if (sLower.includes('tuesday') || sLower.includes('tue')) {
        sessionDay = 'Tuesday'
      } else if (sLower.includes('saturday') || sLower.includes('sat')) {
        sessionDay = 'Saturday'
      } else {
        sessionDay = 'Weekly Webinar'
      }

      // Extract time portion (e.g. "6:00 pm, Tuesday, October 20" or "9:00 am, Saturday, October 10")
      const timeMatch = sessionString.match(/(\d{1,2}:\d{2}\s*(?:am|pm)[^)]*)/i)
      if (timeMatch) {
        sessionDateTime = timeMatch[1].replace(/^[-\s]+/, '').replace(/\s*\([^)]*\)$/, '').trim()
      } else {
        const parts = sessionString.split('-')
        const lastPart = parts[parts.length - 1].replace(/[()]/g, '').trim()
        sessionDateTime = lastPart || sessionString
      }

      sessionBadgeText = `Online · ${sessionDateTime !== 'N/A' ? sessionDateTime : 'Zoom/Meet'}`
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
        sessionDay = 'Friday'
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
        const timeMatch = sessionString.match(/(\d{1,2}:\d{2}\s*(?:am|pm)[^)]*)/i)
        if (timeMatch) {
          sessionDateTime = timeMatch[1].replace(/^[-\s]+/, '').replace(/\s*\([^)]*\)$/, '').trim()
        } else {
          const parts = sessionString.split('-')
          const lastPart = parts[parts.length - 1].replace(/[()]/g, '').trim()
          sessionDateTime = lastPart || sessionString
        }
      }

      sessionBadgeText = `${cityLabel} · ${sessionDateTime !== 'N/A' ? sessionDateTime : sessionVenue}`
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
 * Filter matcher for Session types
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

  switch (filter) {
    case 'ONLINE_ALL':
      return parsed.attendanceMode === 'Online'
    case 'ONLINE_TUE':
      return parsed.attendanceMode === 'Online' && parsed.sessionDay === 'Tuesday'
    case 'ONLINE_SAT':
      return parsed.attendanceMode === 'Online' && parsed.sessionDay === 'Saturday'
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
      return true
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
