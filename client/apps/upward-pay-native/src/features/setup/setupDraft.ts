import { countryApiIdToCode } from '@/features/setup/locationCountry'
import { toDateInputValue, type LeaseDurationUnit } from '@/features/setup/rentalDates'
import { type UserProfile, type UserProperty } from '@/features/auth/types'

export type SetupMode = 'onboarding' | 'edit'

export type TenancyStatus = 'NEW_CYCLE' | 'PAYING_BALANCE' | 'ALREADY_PAID'

export type RentalFormData = {
  uuid?: string
  pmName: string
  address: string
  area: string
  subarea: string
  state: string
  country: string
  rentAmount: string
  rentStartDate: string
  rentEndDate: string
  rentType: string
  leaseDuration?: string
  leaseUnit?: LeaseDurationUnit
  tenancyStatus: TenancyStatus
  amountAlreadyPaid: string
}

export type PaymentDraftDetails = {
  accountNumber: string
  bankCode: string
  accountName: string
  bankName: string
}

export type SetupDraft = {
  mode: SetupMode
  pmEmail: string
  pmType: string
  companyName: string
  pmFound: boolean
  isManagedProperty: boolean
  pmDetails: {
    name?: string
    businessName?: string
    companyUuid?: string
    managerUuid?: string
  } | null
  landlordSkipped: boolean
  paymentDetails: PaymentDraftDetails
  formData: RentalFormData
  phone: string
}

export const EMPTY_PAYMENT_DETAILS: PaymentDraftDetails = {
  accountNumber: '',
  bankCode: '',
  accountName: '',
  bankName: '',
}

export const EMPTY_RENTAL_FORM: RentalFormData = {
  pmName: '',
  address: '',
  area: '',
  subarea: '',
  state: 'Lagos',
  country: 'NG',
  rentAmount: '',
  rentStartDate: '',
  rentEndDate: '',
  rentType: 'Annually',
  leaseDuration: '1',
  leaseUnit: 'years',
  tenancyStatus: 'NEW_CYCLE',
  amountAlreadyPaid: '',
}

export function createEmptyDraft(mode: SetupMode = 'onboarding'): SetupDraft {
  return {
    mode,
    pmEmail: '',
    pmType: 'Property Manager',
    companyName: '',
    pmFound: false,
    isManagedProperty: false,
    pmDetails: null,
    landlordSkipped: false,
    paymentDetails: { ...EMPTY_PAYMENT_DETAILS },
    formData: { ...EMPTY_RENTAL_FORM },
    phone: '',
  }
}

function managerNameFromProperty(prop: UserProperty): string {
  return prop.managerName?.trim() || prop.companyName?.trim() || ''
}

export function draftFromProperty(
  user: Pick<UserProfile, 'phone' | 'properties'>,
  prop: UserProperty,
  mode: SetupMode = 'edit',
): SetupDraft {
  const draft = createEmptyDraft(mode)
  const managerName = managerNameFromProperty(prop)
  const loc = prop.location
  const countryRaw = loc?.country || 'NG'

  draft.formData = {
    ...EMPTY_RENTAL_FORM,
    uuid: prop.uuid,
    pmName: managerName,
    address: loc?.address || prop.address || '',
    area: loc?.area || '',
    subarea: loc?.subarea || '',
    state: loc?.state || 'Lagos',
    country: countryApiIdToCode(countryRaw),
    rentAmount: prop.rentAmount ? prop.rentAmount.toLocaleString('en-US') : '',
    rentStartDate: toDateInputValue(prop.rentStartDate),
    rentEndDate: toDateInputValue(prop.rentEndDate),
    rentType: prop.rentType || 'Annually',
    tenancyStatus: 'NEW_CYCLE',
    amountAlreadyPaid: '',
  }
  draft.phone = user.phone || ''
  draft.landlordSkipped = !managerName
  draft.companyName = prop.companyName || ''
  draft.pmFound = Boolean(prop.companyName || prop.managerName)
  if (draft.pmFound) {
    draft.pmDetails = {
      name: managerName || prop.companyName,
      businessName: prop.companyName || managerName,
    }
  }
  return draft
}
