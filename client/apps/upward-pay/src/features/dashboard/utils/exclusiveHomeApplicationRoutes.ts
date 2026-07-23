import type { ApplicationChecklistStepId } from '../constants/exclusiveHomeApplications'

export function getApplicationStepHref(
  applicationId: string,
  stepId: ApplicationChecklistStepId,
  fallback: string,
): string {
  if (stepId === 'viewing_confirm') {
    return `/dashboard/exclusive-homes/applications/${applicationId}/schedule`
  }
  if (stepId === 'credibility') {
    return `/dashboard/exclusive-homes/applications/${applicationId}/profile`
  }
  if (stepId === 'identity') {
    return `/dashboard/exclusive-homes/applications/${applicationId}/kyc`
  }
  return fallback
}
