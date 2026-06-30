import { STATES } from '@/lib/location-data'
import { toDateInputValue } from './rentalDates'

export type SetupMode = 'onboarding' | 'edit'

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
  pmInviteEmail: string
  pmType: string
  companyName: string
  pmFound: boolean
  pmDetails: { id?: number; name?: string; businessName?: string } | null
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

const STORAGE_KEY = 'upward_setup_draft'

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
}

export function createEmptyDraft(mode: SetupMode = 'onboarding'): SetupDraft {
  return {
    mode,
    pmEmail: '',
    pmInviteEmail: '',
    pmType: 'Property Manager',
    companyName: '',
    pmFound: false,
    pmDetails: null,
    landlordSkipped: false,
    paymentDetails: { ...EMPTY_PAYMENT_DETAILS },
    formData: { ...EMPTY_RENTAL_FORM },
    phone: '',
  }
}

export function loadSetupDraft(): SetupDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SetupDraft>
    const formData = parsed.formData
      ? {
          ...EMPTY_RENTAL_FORM,
          ...parsed.formData,
          rentStartDate: toDateInputValue(parsed.formData.rentStartDate),
          rentEndDate: toDateInputValue(parsed.formData.rentEndDate),
        }
      : { ...EMPTY_RENTAL_FORM }
    return {
      ...createEmptyDraft(parsed.mode || 'onboarding'),
      ...parsed,
      formData,
      paymentDetails: {
        ...EMPTY_PAYMENT_DETAILS,
        ...(parsed.paymentDetails || {}),
      },
      landlordSkipped: parsed.landlordSkipped ?? false,
    }
  } catch {
    return null
  }
}

export function saveSetupDraft(draft: SetupDraft) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
}

export function patchSetupDraft(patch: Partial<SetupDraft>) {
  const current = loadSetupDraft() || createEmptyDraft()
  saveSetupDraft({ ...current, ...patch })
}

export function clearSetupDraft() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(STORAGE_KEY)
}

export type DraftUserProperty = {
  uuid?: string
  address?: string
  rentStartDate?: string
  rentEndDate: string
  rentAmount?: number
  rentType?: string
  isManaged?: boolean
  isPlatformLinked?: boolean
  managerName?: string
  managerEmail?: string
  companyName?: string
  manager?: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
  }
  company?: {
    name?: string
    email?: string
    phone?: string
  }
  subaccount?: {
    accountNumber?: string
    bankCode?: string
    businessName?: string
  }
  dedicatedAccount?: {
    accountNumber?: string
    bankCode?: string
    accountName?: string
    bankName?: string
  }
  location?: {
    area?: string
    subarea?: string
    address?: string
    state?: string
    country?: string
  }
}

function managerNameFromProperty(prop: DraftUserProperty): string {
  if (prop.managerName?.trim()) return prop.managerName.trim()
  if (prop.manager?.firstName) {
    return [prop.manager.firstName, prop.manager.lastName].filter(Boolean).join(' ')
  }
  return ''
}

function managerEmailFromProperty(prop: DraftUserProperty): string {
  return (
    prop.managerEmail?.trim() ||
    prop.manager?.email?.trim() ||
    prop.company?.email?.trim() ||
    ''
  )
}

function companyNameFromProperty(prop: DraftUserProperty): string {
  return prop.companyName?.trim() || prop.company?.name?.trim() || ''
}

function paymentDetailsFromProperty(prop: DraftUserProperty): PaymentDraftDetails {
  const accountNumber =
    prop.subaccount?.accountNumber || prop.dedicatedAccount?.accountNumber || ''
  const bankCode = prop.subaccount?.bankCode || prop.dedicatedAccount?.bankCode || ''

  if (!accountNumber || !bankCode) {
    return { ...EMPTY_PAYMENT_DETAILS }
  }

  return {
    accountNumber,
    bankCode,
    accountName:
      prop.subaccount?.businessName || prop.dedicatedAccount?.accountName || '',
    bankName: prop.dedicatedAccount?.bankName || '',
  }
}

export type UserProfileSlice = {
  phone?: string | null
  properties?: DraftUserProperty[]
}

export function draftFromProperty(
  user: UserProfileSlice,
  prop: DraftUserProperty,
  mode: SetupMode = 'edit',
): SetupDraft {
  const draft = createEmptyDraft(mode)
  const managerName = managerNameFromProperty(prop)
  const managerEmail = managerEmailFromProperty(prop)
  const companyName = companyNameFromProperty(prop)

  draft.formData = {
    uuid: prop.uuid,
    pmName: managerName,
    address: prop.location?.address || prop.address || '',
    area: prop.location?.area || '',
    subarea: prop.location?.subarea || '',
    state: prop.location?.state || STATES['NG']?.[24] || 'Lagos',
    country: prop.location?.country || 'NG',
    rentAmount: prop.rentAmount ? prop.rentAmount.toLocaleString() : '',
    rentStartDate: toDateInputValue(prop.rentStartDate),
    rentEndDate: toDateInputValue(prop.rentEndDate),
    rentType: prop.rentType || 'Annually',
  }
  draft.pmEmail = managerEmail
  draft.phone = user.phone || ''
  draft.landlordSkipped = !managerEmail && !managerName && !companyName
  draft.paymentDetails = paymentDetailsFromProperty(prop)
  draft.companyName = companyName
  draft.pmFound = !!(prop.isManaged || prop.isPlatformLinked)
  if (draft.pmFound) {
    draft.pmDetails = {
      name: managerName || companyName,
      businessName: companyName || managerName,
    }
  } else if (companyName) {
    draft.pmDetails = {
      name: managerName || companyName,
      businessName: companyName,
    }
  } else if (managerName) {
    draft.pmDetails = {
      name: managerName,
      businessName: managerName,
    }
  }

  return draft
}
