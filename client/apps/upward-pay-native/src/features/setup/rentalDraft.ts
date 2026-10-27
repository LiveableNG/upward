import { type SetupDraft } from '@/features/setup/setupDraft'
import { isRentDateRangeValid } from '@/features/setup/rentalDates'

export function isPaymentDraftComplete(draft: SetupDraft): boolean {
  if (draft.landlordSkipped) return true
  if (draft.isManagedProperty) return true
  const hasEnteredPayment = Boolean(
    draft.paymentDetails?.accountNumber?.trim() ||
    draft.paymentDetails?.bankCode?.trim() ||
    draft.paymentDetails?.accountName?.trim(),
  )
  if (!hasEnteredPayment) return true
  return Boolean(draft.paymentDetails.accountNumber.trim() && draft.paymentDetails.bankCode.trim())
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
