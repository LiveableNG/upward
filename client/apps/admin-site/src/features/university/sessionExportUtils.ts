import { showToast } from '@upward/client-core'
import type { EarlyAccessRecord, UniversityApplicationRecord } from './types'

export interface ParsedSessionDetails {
  track: string
  trackCode: 'TRACK_1' | 'TRACK_2' | 'NONE'
  attendanceMode: 'Online' | 'In-Person' | 'None'
  sessionDay: string
  sessionVenue: string
  sessionDateTime: string
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

      // Extract Clean Date Time
      // Examples: "Online (Zoom/Meet) - 6:00 pm, Tuesday, October 20"
      // or "Tuesday, Oct 20 · 6:00 PM"
      const dashIdx = sessionString.indexOf('-')
      if (dashIdx !== -1) {
        sessionDateTime = sessionString.slice(dashIdx + 1).trim()
      } else {
        sessionDateTime = sessionString
      }
    } else if (
      sLower.includes('physical') ||
      sLower.includes('in-person') ||
      sLower.includes('abuja') ||
      sLower.includes('port harcourt') ||
      sLower.includes('lagos') ||
      sLower.includes('ibadan') ||
      sLower.includes('oyo')
    ) {
      attendanceMode = 'In-Person'

      if (sLower.includes('abuja')) {
        sessionDay = 'Friday'
        sessionVenue = 'Abuja (Central Business District)'
      } else if (sLower.includes('port harcourt') || sLower.includes('ph')) {
        sessionDay = 'Friday'
        sessionVenue = 'Port Harcourt (GRA Phase 2)'
      } else if (sLower.includes('lagos') || sLower.includes('yaba')) {
        sessionDay = 'Wednesday'
        sessionVenue = 'Lagos (Yaba Tech Hub)'
      } else if (sLower.includes('ibadan') || sLower.includes('oyo') || sLower.includes('bodija')) {
        sessionDay = 'TBA'
        sessionVenue = 'Oyo / Ibadan (Bodija)'
      } else {
        sessionVenue = 'Physical Venue'
      }

      const dashIdx = sessionString.indexOf('-')
      if (dashIdx !== -1) {
        sessionDateTime = sessionString.slice(dashIdx + 1).trim()
      } else {
        sessionDateTime = sessionString
      }
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
 * Helper to safely escape CSV cell content
 */
function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""'
  const str = String(val).replace(/"/g, '""')
  return `"${str}"`
}

/**
 * Export Early Access (Student Cohort & Landlord) records to clean CSV
 */
export function exportEarlyAccessToCsv(records: EarlyAccessRecord[], filename?: string): void {
  if (!records || records.length === 0) {
    showToast('No records to export', true)
    return
  }

  const headers = [
    'Submission ID',
    'Date Submitted',
    'Application Type',
    'Full Name',
    'Email Address',
    'WhatsApp / Contact',
    'City',
    'Age Bracket',
    'Experience Level',
    'Funnel Status',
    'Track Selection',
    'Attendance Mode',
    'Session Day / City',
    'Session Venue',
    'Session Date & Time',
    'Notes / Reason for Interest',
    'Properties Managed (Landlords)',
    'Landlord Status',
    'Management Style',
  ]

  const rows = records.map((rec) => {
    const isStudent = rec.type === 'STUDENT'
    const parsed = isStudent
      ? parseSessionAndTrack({
          interest: rec.interest,
          experienceLevel: rec.experienceLevel,
        })
      : null

    const submittedDate = rec.createdAt ? new Date(rec.createdAt).toLocaleString('en-US') : 'N/A'

    return [
      escapeCsvCell(rec.id),
      escapeCsvCell(submittedDate),
      escapeCsvCell(isStudent ? 'Student Cohort' : 'Landlord Programme'),
      escapeCsvCell(rec.name),
      escapeCsvCell(rec.email || 'N/A'),
      escapeCsvCell(rec.whatsapp),
      escapeCsvCell(rec.city),
      escapeCsvCell(isStudent ? rec.ageBracket || 'N/A' : 'N/A'),
      escapeCsvCell(isStudent ? rec.experienceLevel || 'N/A' : 'N/A'),
      escapeCsvCell(parsed ? parsed.funnelStatus : 'Active Submission'),
      escapeCsvCell(parsed ? parsed.track : 'N/A'),
      escapeCsvCell(parsed ? parsed.attendanceMode : 'N/A'),
      escapeCsvCell(parsed ? parsed.sessionDay : 'N/A'),
      escapeCsvCell(parsed ? parsed.sessionVenue : 'N/A'),
      escapeCsvCell(parsed ? parsed.sessionDateTime : 'N/A'),
      escapeCsvCell(parsed ? parsed.cleanNotes : rec.interest || 'N/A'),
      escapeCsvCell(!isStudent ? rec.propertyCount || 'N/A' : 'N/A'),
      escapeCsvCell(!isStudent ? rec.landlordStatus || 'N/A' : 'N/A'),
      escapeCsvCell(!isStudent ? rec.managementStyle || 'N/A' : 'N/A'),
    ].join(',')
  })

  const csvContent = [headers.join(','), ...rows].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  const defaultName = `Upward_Academy_Sessions_${new Date().toISOString().split('T')[0]}.csv`

  link.setAttribute('href', url)
  link.setAttribute('download', filename || defaultName)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  showToast(`Exported ${records.length} records to CSV`)
}

/**
 * Export University Full Applications to clean CSV
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
    'Application ID',
    'Date Submitted',
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

    const submittedDate = app.createdAt ? new Date(app.createdAt).toLocaleString('en-US') : 'N/A'

    return [
      escapeCsvCell(app.id),
      escapeCsvCell(submittedDate),
      escapeCsvCell(app.name),
      escapeCsvCell(app.email),
      escapeCsvCell(app.whatsapp),
      escapeCsvCell(app.city),
      escapeCsvCell(app.ageBracket || 'N/A'),
      escapeCsvCell(app.occupation || 'N/A'),
      escapeCsvCell(app.experienceLevel || 'N/A'),
      escapeCsvCell(parsed.track),
      escapeCsvCell(parsed.attendanceMode),
      escapeCsvCell(parsed.sessionDay),
      escapeCsvCell(parsed.sessionVenue),
      escapeCsvCell(parsed.sessionDateTime),
      escapeCsvCell(app.status),
      escapeCsvCell(app.feeStatus),
      escapeCsvCell(app.commitment || 'N/A'),
      escapeCsvCell(app.why || 'N/A'),
      escapeCsvCell(app.goals || 'N/A'),
      escapeCsvCell(app.isScholarship ? 'Yes' : 'No'),
      escapeCsvCell(app.notes || 'None'),
    ].join(',')
  })

  const csvContent = [headers.join(','), ...rows].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  const defaultName = `Upward_Academy_Cohort_Applications_${new Date().toISOString().split('T')[0]}.csv`

  link.setAttribute('href', url)
  link.setAttribute('download', filename || defaultName)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  showToast(`Exported ${applications.length} applications to CSV`)
}
