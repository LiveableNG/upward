import type { ApplicationTimelineStep } from './exclusiveHomeApplications'
import type { HomeRequestLocation } from './homeRequestLocations'

export type HomeRequestPropertyType =
  | 'apartment'
  | 'studio'
  | 'house'
  | 'duplex'
  | 'terrace'
  | 'any'

export type HomeRequestStatus =
  | 'submitted'
  | 'agent_assigned'
  | 'options_shared'
  | 'viewing'
  | 'closed'

export const HOME_REQUEST_PROPERTY_TYPES: {
  value: HomeRequestPropertyType
  label: string
}[] = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'studio', label: 'Studio' },
  { value: 'house', label: 'House' },
  { value: 'duplex', label: 'Duplex' },
  { value: 'terrace', label: 'Terrace' },
  { value: 'any', label: 'Any' },
]

export type HomeRequest = {
  id: string
  locations: HomeRequestLocation[]
  budgetMin: number
  budgetMax: number
  propertyType: HomeRequestPropertyType
  beds: number
  moveInDate: string
  notes?: string
  status: HomeRequestStatus
  submittedAt: string
  timeline: ApplicationTimelineStep[]
}

export const HOME_REQUEST_STORAGE_KEY = 'upward_exclusive_home_requests'

export const HOME_REQUEST_STATUS_LABELS: Record<HomeRequestStatus, string> = {
  submitted: 'Submitted',
  agent_assigned: 'Agent assigned',
  options_shared: 'Options shared',
  viewing: 'Viewing',
  closed: 'Closed',
}

export const HOME_REQUEST_PAGE_COPY = {
  formTitle: 'Request a home',
  formSubtitle: 'Tell us what you need — no browsing required',
  trustBanner:
    'Handled by NIESV-verified agents · Scam-protected process · 0% agent fees for Upward members',
  propertyTypeLabel: 'Property type',
  submitLabel: 'Submit request',
  browseLink: 'Or browse available homes',
  submittedTitle: 'Request received',
  submittedHeadline: 'We’re on it',
  submittedText:
    'A verified agent will review your brief and reach out with matching options. You’ll get updates here.',
  submittedNextTitle: 'What happens next',
  detailTitle: 'Your request',
  listTitle: 'My requests & applications',
  listSubtitle: 'Track home requests and listing applications',
  requestsTab: 'Requests',
  applicationsTab: 'Applications',
  requestsEmptyTitle: 'No requests yet',
  requestsEmptyText: 'Tell us what you’re looking for and a verified agent will match you.',
  requestsEmptyCta: 'Request a home',
}

/** Demo request for UI preview — shown when local storage is empty. */
export const MOCK_HOME_REQUESTS: HomeRequest[] = [
  {
    id: 'req-lekki-2bed',
    locations: [
      { state: 'Lagos', area: 'Yaba' },
      { state: 'Lagos', area: 'Yaba', subArea: 'Sabo' },
      { state: 'Lagos', area: 'Ikeja', subArea: 'Allen' },
    ],
    budgetMin: 2_000_000,
    budgetMax: 2_800_000,
    propertyType: 'apartment',
    beds: 2,
    moveInDate: '2026-09-01',
    notes: 'Gated estate preferred. Must allow small dog.',
    status: 'agent_assigned',
    submittedAt: '2026-07-18T10:30:00.000Z',
    timeline: [
      { label: 'Submitted', state: 'done' },
      { label: 'Agent assigned', state: 'current' },
      { label: 'Options shared', state: 'upcoming' },
      { label: 'Viewing', state: 'upcoming' },
      { label: 'Move-in', state: 'upcoming' },
    ],
  },
]

export const DEFAULT_HOME_REQUEST_TIMELINE: ApplicationTimelineStep[] = [
  { label: 'Submitted', state: 'current' },
  { label: 'Agent assigned', state: 'upcoming' },
  { label: 'Options shared', state: 'upcoming' },
  { label: 'Viewing', state: 'upcoming' },
  { label: 'Move-in', state: 'upcoming' },
]
