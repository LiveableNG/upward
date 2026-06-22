import { type SetupDraft } from './setupDraft'

export function isInviteComplete(draft: SetupDraft): boolean {
  const trimmed = draft.pmEmail.trim()
  if (!trimmed) return false
  if (draft.pmFound) return !!draft.pmDetails
  return !!draft.formData.pmName.trim()
}

export function isPropertyDraftComplete(draft: SetupDraft): boolean {
  const { formData } = draft
  return !!(
    formData.address.trim() &&
    formData.area.trim() &&
    formData.rentAmount &&
    formData.rentStartDate &&
    formData.rentEndDate
  )
}
