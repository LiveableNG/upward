import { api } from '@/lib/api'
import { type SetupDraft } from './setupDraft'

export async function submitRentalRequest(draft: SetupDraft) {
  const { formData, pmEmail, pmInviteEmail, pmType, companyName, pmFound, pmDetails } = draft

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
    rentStartDate: formData.rentStartDate,
    rentEndDate: formData.rentEndDate,
  }

  if (formData.uuid) unitDetails.uuid = formData.uuid

  const trimmedPm = pmEmail.trim()
  const targetEmail = pmFound
    ? trimmedPm
    : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedPm)
      ? trimmedPm
      : pmInviteEmail

  const payload = {
    pmEmail: targetEmail,
    pmName: pmFound ? pmDetails?.name : formData.pmName,
    pmType: pmFound ? undefined : pmType,
    companyName: pmFound || pmType !== 'Property Manager' ? undefined : companyName,
    unitDetails,
  }

  await api.post('/user/pm-connection/add-unit-request', payload)
}

export async function submitContactDetails(phone: string, dateOfBirth: string) {
  await api.updateProfile({ phone, dateOfBirth })
}

export async function submitPhone(phone: string) {
  await api.updateProfile({ phone })
}
