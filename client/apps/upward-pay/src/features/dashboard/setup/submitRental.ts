import { api } from '@/lib/api'
import { type SetupDraft } from './setupDraft'
import { toDateInputValue } from './rentalDates'
import { uploadProofOfPayment } from '@/features/payments/services/paymentService'

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

  const initialPaidNum = formData.amountAlreadyPaid
    ? parseFloat(formData.amountAlreadyPaid.replace(/,/g, '')) || 0
    : 0

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
    rentType: string
    tenancyStatus: string
    initialAmountPaid: number
  } = {
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

  const res = await api.post('/user/pm-connection/add-unit-request', payload)

  // Upload proof of payment if attached
  if (formData.proofFile) {
    const propUuid = (res as any)?.data?.userProperty?.uuid || formData.uuid
    await uploadProofOfPayment({
      userPropertyUuid: propUuid,
      amount: initialPaidNum || unitDetails.rentAmount,
      file: formData.proofFile,
    }).catch((e: any) => console.warn('Failed to upload proof during rental submit:', e))
  }
}

export async function submitContactDetails(phone: string, dateOfBirth: string) {
  await api.updateProfile({ phone, dateOfBirth })
}

export async function submitPhone(phone: string) {
  await api.updateProfile({ phone })
}
