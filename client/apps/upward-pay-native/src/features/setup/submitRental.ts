import { request } from '@/lib/api-client'
import { toDateInputValue } from '@/features/setup/rentalDates'
import { type SetupDraft } from '@/features/setup/setupDraft'

export async function submitRentalRequest(draft: SetupDraft) {
  const {
    formData,
    pmEmail,
    pmType,
    companyName,
    pmFound,
    pmDetails,
    landlordSkipped,
    paymentDetails,
  } = draft

  const initialPaidNum =
    formData.tenancyStatus === 'PAYING_BALANCE' && formData.amountAlreadyPaid
      ? parseFloat(formData.amountAlreadyPaid.replace(/,/g, '')) || 0
      : 0

  const unitDetails: Record<string, unknown> = {
    address: formData.address,
    area: formData.area,
    subarea: formData.subarea,
    state: formData.state,
    country: formData.country,
    rentAmount: parseFloat(formData.rentAmount.replace(/,/g, '')),
    rentStartDate: toDateInputValue(formData.rentStartDate),
    rentEndDate: toDateInputValue(formData.rentEndDate),
    rentType: formData.rentType || 'Annually',
    tenancyStatus: formData.tenancyStatus || 'NEW_CYCLE',
    initialAmountPaid: initialPaidNum,
  }

  if (formData.uuid) unitDetails.uuid = formData.uuid

  const hasPaymentDetails =
    !landlordSkipped &&
    Boolean(paymentDetails?.accountNumber?.trim() && paymentDetails?.bankCode?.trim())

  const payload: Record<string, unknown> = {
    unitDetails,
    paymentDetails: hasPaymentDetails
      ? {
          accountNumber: paymentDetails.accountNumber.trim(),
          bankCode: paymentDetails.bankCode.trim(),
          accountName: paymentDetails.accountName?.trim() || undefined,
          bankName: paymentDetails.bankName?.trim() || undefined,
        }
      : undefined,
  }

  if (!landlordSkipped && pmEmail.trim()) {
    payload.pmEmail = pmEmail.trim()
    payload.pmName = pmFound ? pmDetails?.name : formData.pmName
    if (pmDetails?.companyUuid) payload.companyUuid = pmDetails.companyUuid
    if (pmDetails?.managerUuid) payload.managerUuid = pmDetails.managerUuid
    if (!pmFound) {
      payload.pmType = pmType
      if (pmType === 'Property Manager' && companyName) {
        payload.companyName = companyName
      }
    }
  } else if (!landlordSkipped && formData.pmName.trim()) {
    payload.pmName = formData.pmName.trim()
    payload.pmType = pmType
  }

  await request('/user/pm-connection/add-unit-request', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
