import { api } from '@/lib/api'
import { type SetupDraft } from './setupDraft'
import { toDateInputValue } from './rentalDates'

export async function submitRentalRequest(draft: SetupDraft) {
  const {
    formData,
    pmEmail,
    pmInviteEmail,
    pmType,
    companyName,
    pmFound,
    pmDetails,
    landlordSkipped,
    paymentDetails,
  } = draft

  const unitDetails: {
    uuid?: string
    address: string
    area: string
    subarea: string
    state: string
    country: string
    rentAmount: number
    rentStartDate: string
    rentEndDate: string
  } = {
    address: formData.address,
    area: formData.area,
    subarea: formData.subarea,
    state: formData.state,
    country: formData.country,
    rentAmount: parseFloat(formData.rentAmount.replace(/,/g, '')),
    rentStartDate: toDateInputValue(formData.rentStartDate),
    rentEndDate: toDateInputValue(formData.rentEndDate),
  }

  if (formData.uuid) unitDetails.uuid = formData.uuid

  const payload: Record<string, unknown> = {
    unitDetails,
    paymentDetails: {
      accountNumber: paymentDetails.accountNumber,
      bankCode: paymentDetails.bankCode,
      accountName: paymentDetails.accountName,
      bankName: paymentDetails.bankName,
    },
  }

  if (!landlordSkipped && pmEmail.trim()) {
    const trimmedPm = pmEmail.trim()
    const targetEmail = pmFound
      ? trimmedPm
      : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedPm)
        ? trimmedPm
        : pmInviteEmail

    payload.pmEmail = targetEmail
    payload.pmName = pmFound ? pmDetails?.name : formData.pmName
    if (!pmFound) {
      payload.pmType = pmType
      if (pmType === 'Property Manager' && companyName) {
        payload.companyName = companyName
      }
    }
  }

  await api.post('/user/pm-connection/add-unit-request', payload)
}

export async function submitContactDetails(phone: string, dateOfBirth: string) {
  await api.updateProfile({ phone, dateOfBirth })
}

export async function submitPhone(phone: string) {
  await api.updateProfile({ phone })
}
