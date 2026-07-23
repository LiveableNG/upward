import {
  APPLICATION_STORAGE_KEY,
  CHECKLIST_STEP_ICONS,
  DEFAULT_INSPECTION_SETTINGS,
  DEFAULT_CHECKLIST_TEMPLATE,
  MOCK_EXCLUSIVE_HOME_APPLICATIONS,
  type ApplicationChecklistStep,
  type ApplicationChecklistStepId,
  type ApplicationType,
  type ExclusiveHomeApplication,
  type StoredApplicationChecklistStep,
} from '../constants/exclusiveHomeApplications'

type StoredExclusiveHomeApplication = Omit<ExclusiveHomeApplication, 'checklist'> & {
  checklist: StoredApplicationChecklistStep[]
}

export function getChecklistIcon(stepId: ApplicationChecklistStepId) {
  return CHECKLIST_STEP_ICONS[stepId]
}

function hydrateChecklistStep(
  step: StoredApplicationChecklistStep,
): ApplicationChecklistStep {
  const template = DEFAULT_CHECKLIST_TEMPLATE.find((item) => item.id === step.id)

  return {
    id: step.id,
    completed: step.completed,
    title: template?.title ?? step.id,
    description: template?.description ?? '',
    href: step.href ?? template?.href ?? '#',
    icon: getChecklistIcon(step.id),
  }
}

export function hydrateExclusiveHomeApplication(
  application: StoredExclusiveHomeApplication | ExclusiveHomeApplication,
): ExclusiveHomeApplication {
  return {
    ...application,
    checklist: application.checklist.map((step) => hydrateChecklistStep(step)),
  }
}

function serializeExclusiveHomeApplication(
  application: ExclusiveHomeApplication,
): StoredExclusiveHomeApplication {
  return {
    ...application,
    checklist: application.checklist.map(({ id, completed, href }) => ({
      id,
      completed,
      href,
    })),
  }
}

function readStoredApplications(): ExclusiveHomeApplication[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(APPLICATION_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredExclusiveHomeApplication[]
    if (!Array.isArray(parsed)) return []
    return parsed.map(hydrateExclusiveHomeApplication)
  } catch {
    return []
  }
}

export function getAllExclusiveHomeApplications(): ExclusiveHomeApplication[] {
  const stored = readStoredApplications()
  const mockIds = new Set(MOCK_EXCLUSIVE_HOME_APPLICATIONS.map((app) => app.id))
  const merged = [
    ...stored.filter((app) => !mockIds.has(app.id)),
    ...MOCK_EXCLUSIVE_HOME_APPLICATIONS.map(hydrateExclusiveHomeApplication),
  ]

  return merged.sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  )
}

export function getExclusiveHomeApplicationById(
  id: string,
): ExclusiveHomeApplication | undefined {
  return getAllExclusiveHomeApplications().find((app) => app.id === id)
}

export function saveExclusiveHomeApplication(application: ExclusiveHomeApplication): void {
  if (typeof window === 'undefined') return

  const mockIds = new Set(MOCK_EXCLUSIVE_HOME_APPLICATIONS.map((app) => app.id))
  const stored = readStoredApplications().filter((app) => !mockIds.has(app.id))
  const withoutDuplicate = stored.filter((app) => app.id !== application.id)

  window.localStorage.setItem(
    APPLICATION_STORAGE_KEY,
    JSON.stringify([
      serializeExclusiveHomeApplication(application),
      ...withoutDuplicate.map(serializeExclusiveHomeApplication),
    ]),
  )
}

export function updateExclusiveHomeApplication(
  applicationId: string,
  updates: Partial<ExclusiveHomeApplication>,
): ExclusiveHomeApplication | undefined {
  const application = getExclusiveHomeApplicationById(applicationId)
  if (!application) return undefined

  const updatedApplication = hydrateExclusiveHomeApplication({
    ...application,
    ...updates,
    id: application.id,
  })

  saveExclusiveHomeApplication(updatedApplication)
  return updatedApplication
}

export function createExclusiveHomeApplication(
  listingId: string,
  type: ApplicationType,
): ExclusiveHomeApplication {
  const id = `app-${listingId}-${Date.now()}`
  const isViewing = type === 'viewing'

  return hydrateExclusiveHomeApplication({
    id,
    listingId,
    type,
    status: 'submitted',
    submittedAt: new Date().toISOString(),
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
      id: step.id,
      completed: false,
      href: isViewing && step.id === 'viewing_confirm' ? '#viewing' : step.href,
    })),
  })
}

export function formatApplicationTypeLabel(type: ApplicationType): string {
  return type === 'apply' ? 'Application' : 'Viewing request'
}

export function countIncompleteChecklistSteps(application: ExclusiveHomeApplication): number {
  return application.checklist.filter((step) => !step.completed).length
}
