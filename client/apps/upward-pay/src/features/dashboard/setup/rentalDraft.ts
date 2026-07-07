import { type SetupDraft } from './setupDraft'
import { isPaymentAccountResolved } from '../components/payment/PaymentAccountForm'
import { isRentDateRangeValid } from './rentalDates'

export function isPaymentDraftComplete(draft: SetupDraft): boolean {
  if (draft.isManagedProperty) return true
  return isPaymentAccountResolved(draft.paymentDetails)
}

export function isInviteComplete(draft: SetupDraft): boolean {
  if (draft.landlordSkipped) return true
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
    formData.rentEndDate &&
    isRentDateRangeValid(formData.rentStartDate, formData.rentEndDate)
  )
}

export function isRentalDraftReadyForConfirm(draft: SetupDraft): boolean {
  return isPropertyDraftComplete(draft) && isPaymentDraftComplete(draft)
}
