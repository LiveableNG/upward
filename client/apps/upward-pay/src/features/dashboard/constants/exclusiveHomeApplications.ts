import type { LucideIcon } from 'lucide-react'
import {
  FileText,
  Fingerprint,
  Share2,
  UserRound,
  CalendarCheck,
} from 'lucide-react'

export type ApplicationType = 'apply' | 'viewing'

export type ApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'docs_needed'
  | 'viewing_scheduled'
  | 'approved'
  | 'declined'

export type ApplicationChecklistStepId =
  | 'identity'
  | 'profile'
  | 'credibility'
  | 'documents'
  | 'viewing_confirm'

export type ApplicationTimelineState = 'done' | 'current' | 'upcoming'

export type ApplicationTimelineStep = {
  label: string
  state: ApplicationTimelineState
}

export type ApplicationChecklistStep = {
  id: ApplicationChecklistStepId
  title: string
  description: string
  href: string
  completed: boolean
  icon?: LucideIcon
}

export type StoredApplicationChecklistStep = {
  id: ApplicationChecklistStepId
  completed: boolean
  href?: string
}

export type ViewingDetails = {
  dateLabel: string
  timeLabel: string
  address: string
  contactName: string
  contactPhone: string
  notes: string
}

export type InspectionWeekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export type InspectionTimeSlot = {
  day: InspectionWeekday
  start: string
  end: string
}

export type InspectionSettings = {
  inspectionTimes: {
    days: InspectionWeekday[]
    timeSlots: InspectionTimeSlot[]
  }
  flexibleScheduling: boolean
}

export type ExclusiveHomeApplication = {
  id: string
  listingId: string
  type: ApplicationType
  status: ApplicationStatus
  submittedAt: string
  viewing: ViewingDetails | null
  inspectionSettings: InspectionSettings
  checklist: ApplicationChecklistStep[]
  timeline: ApplicationTimelineStep[]
}

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under review',
  docs_needed: 'Docs needed',
  viewing_scheduled: 'Viewing scheduled',
  approved: 'Approved',
  declined: 'Declined',
}

export const APPLICATION_STORAGE_KEY = 'upward-exclusive-home-applications'

export const DEFAULT_INSPECTION_SETTINGS: InspectionSettings = {
  inspectionTimes: {
    days: ['tuesday', 'thursday', 'saturday'],
    timeSlots: [
      { day: 'tuesday', start: '10:00', end: '13:00' },
      { day: 'thursday', start: '08:00', end: '10:00' },
      { day: 'saturday', start: '14:00', end: '17:00' },
    ],
  },
  flexibleScheduling: false,
}

export const CHECKLIST_STEP_ICONS: Record<ApplicationChecklistStepId, LucideIcon> = {
  identity: Fingerprint,
  profile: UserRound,
  credibility: Share2,
  documents: FileText,
  viewing_confirm: CalendarCheck,
}

export const DEFAULT_CHECKLIST_TEMPLATE: Omit<ApplicationChecklistStep, 'completed'>[] = [
  {
    id: 'identity',
    title: 'Verify identity',
    description: 'Confirm your BVN to unlock priority viewing',
    href: '/dashboard/verify-identity',
  },
  {
    id: 'profile',
    title: 'Complete your profile',
    description: 'Add rental and contact details landlords can review',
    href: '/dashboard/setup',
  },
  {
    id: 'credibility',
    title: 'Share Upward profile',
    description: 'Preview what landlords see when you apply',
    href: '/dashboard/kyc',
  },
  {
    id: 'documents',
    title: 'Upload documents',
    description: 'ID, proof of income, or employer letter if requested',
    href: '/dashboard/documents',
  },
  {
    id: 'viewing_confirm',
    title: 'Confirm viewing details',
    description: 'Review date, time, and location before you visit',
    href: '#viewing',
  },
]

/** Seed data — merged with any applications saved in localStorage. */
export const MOCK_EXCLUSIVE_HOME_APPLICATIONS: ExclusiveHomeApplication[] = [
  {
    id: 'app-lekki-2bed',
    listingId: 'lekki-2bed',
    type: 'apply',
    status: 'docs_needed',
    submittedAt: '2026-06-28T10:30:00.000Z',
    viewing: null,
    inspectionSettings: DEFAULT_INSPECTION_SETTINGS,
    timeline: [
      { label: 'Submitted', state: 'done' },
      { label: 'Review', state: 'done' },
      { label: 'Prepare', state: 'current' },
      { label: 'Viewing', state: 'upcoming' },
      { label: 'Decision', state: 'upcoming' },
    ],
    checklist: DEFAULT_CHECKLIST_TEMPLATE.map((step) => ({
      ...step,
      completed: step.id === 'identity' || step.id === 'profile',
    })),
  },
  {
    id: 'app-maitama-studio',
    listingId: 'maitama-studio',
    type: 'viewing',
    status: 'viewing_scheduled',
    submittedAt: '2026-06-25T14:00:00.000Z',
    viewing: {
      dateLabel: 'Saturday, 12 July 2026',
      timeLabel: '11:00 AM – 11:45 AM',
      address: '12 Aguiyi Ironsi St, Maitama, Abuja',
      contactName: 'Adeyemi Bello',
      contactPhone: '0803 000 1234',
      notes: 'Bring a valid ID. Meet at the main gate — security will direct you.',
    },
    inspectionSettings: DEFAULT_INSPECTION_SETTINGS,
    timeline: [
      { label: 'Submitted', state: 'done' },
      { label: 'Review', state: 'done' },
      { label: 'Prepare', state: 'done' },
      { label: 'Viewing', state: 'current' },
      { label: 'Decision', state: 'upcoming' },
    ],
    checklist: DEFAULT_CHECKLIST_TEMPLATE.map((step) => ({
      ...step,
      completed: step.id !== 'documents',
    })),
  },
  {
    id: 'app-yaba-terrace',
    listingId: 'yaba-terrace',
    type: 'apply',
    status: 'under_review',
    submittedAt: '2026-07-01T09:15:00.000Z',
    viewing: null,
    inspectionSettings: DEFAULT_INSPECTION_SETTINGS,
    timeline: [
      { label: 'Submitted', state: 'done' },
      { label: 'Review', state: 'current' },
      { label: 'Prepare', state: 'upcoming' },
      { label: 'Viewing', state: 'upcoming' },
      { label: 'Decision', state: 'upcoming' },
    ],
    checklist: DEFAULT_CHECKLIST_TEMPLATE.map((step) => ({
      ...step,
      completed: step.id === 'identity',
    })),
  },
]

export const APPLICATIONS_PAGE_COPY = {
  listTitle: 'My applications',
  listSubtitle: 'Track interest, prep, and viewing status for Exclusive Homes',
  emptyTitle: 'No applications yet',
  emptyText: 'Browse Exclusive Homes and apply or request a viewing to get started.',
  submittedTitle: 'Application received',
  submittedApply: 'We received your application. Complete the steps below so landlords can review your Upward profile.',
  submittedViewing: 'Your viewing request is in. Complete the checklist so we can confirm your slot.',
}
