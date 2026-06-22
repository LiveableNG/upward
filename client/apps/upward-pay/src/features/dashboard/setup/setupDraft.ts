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

export type SetupDraft = {
  mode: SetupMode
  pmEmail: string
  pmInviteEmail: string
  pmType: string
  companyName: string
  pmFound: boolean
  pmDetails: { id?: number; name?: string; businessName?: string } | null
  formData: RentalFormData
  phone: string
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
    formData: { ...EMPTY_RENTAL_FORM },
    phone: '',
  }
}

export function loadSetupDraft(): SetupDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SetupDraft
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
