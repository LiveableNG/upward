import { STATES } from '@/lib/location-data'

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
    return {
      ...createEmptyDraft(parsed.mode || 'onboarding'),
      ...parsed,
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
  address: string
  rentStartDate?: string
  rentEndDate: string
  rentAmount?: number
  managerName?: string
  managerEmail?: string
  companyName?: string
  subaccount?: {
    accountNumber?: string
    bankCode?: string
    businessName?: string
  }
  location?: {
    area?: string
    subarea?: string
    address?: string
    state?: string
    country?: string
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

  draft.formData = {
    uuid: prop.uuid,
    pmName: prop.managerName || '',
    address: prop.location?.address || prop.address || '',
    area: prop.location?.area || '',
    subarea: prop.location?.subarea || '',
    state: prop.location?.state || STATES['NG']?.[24] || 'Lagos',
    country: prop.location?.country || 'NG',
    rentAmount: prop.rentAmount ? String(prop.rentAmount) : '',
    rentStartDate: prop.rentStartDate ? prop.rentStartDate.split('T')[0] : '',
    rentEndDate: prop.rentEndDate ? prop.rentEndDate.split('T')[0] : '',
  }
  draft.pmEmail = prop.managerEmail || ''
  draft.phone = user.phone || ''
  draft.landlordSkipped = !prop.managerEmail && !prop.managerName
  if (prop.subaccount?.accountNumber && prop.subaccount?.bankCode) {
    draft.paymentDetails = {
      accountNumber: prop.subaccount.accountNumber,
      bankCode: prop.subaccount.bankCode,
      accountName: prop.subaccount.businessName || '',
      bankName: '',
    }
  }
  draft.pmFound = !!(prop.companyName || prop.managerName)
  if (prop.companyName) {
    draft.pmDetails = {
      name: prop.managerName || prop.companyName,
      businessName: prop.companyName,
    }
  } else if (prop.managerName) {
    draft.pmDetails = {
      name: prop.managerName,
      businessName: prop.managerName,
    }
  }

  return draft
}
