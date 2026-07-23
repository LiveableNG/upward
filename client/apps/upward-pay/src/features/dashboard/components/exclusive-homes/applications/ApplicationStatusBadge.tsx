import {
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
} from '@/features/dashboard/constants/exclusiveHomeApplications'

const STATUS_MODIFIER: Record<ApplicationStatus, string> = {
  submitted: 'submitted',
  under_review: 'review',
  docs_needed: 'docs',
  viewing_scheduled: 'viewing',
  approved: 'approved',
  declined: 'declined',
}

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={`home-app__status home-app__status--${STATUS_MODIFIER[status]}`}>
      {APPLICATION_STATUS_LABELS[status]}
    </span>
  )
}
