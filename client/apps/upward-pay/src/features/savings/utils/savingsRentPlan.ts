const PLAN_KEY = 'upward_savings_rent_plan'
const DRAFT_KEY = 'upward_setup_draft'
const PURGE_FLAG = 'upward_legacy_rent_defaults_purged_v1'
const LEGACY_DEFAULT_RENT = 2_400_000

export interface SavingsRentPlan {
  userId?: number | string
  source?: 'user'
  rentAmount?: number | string
  dueDate?: string
  address?: string
  cadence?: string
  productOption?: string
  planPattern?: string
  initialDeposit?: number
  stepStartNaira?: number
  stepIncrementNaira?: number
}

/**
 * Earlier builds persisted a placeholder rent (₦2,400,000) before the user had
 * entered anything. Remove those leftovers once so they never surface as if the
 * user had typed them.
 */
function purgeLegacyRentDefaults() {
  if (typeof window === 'undefined') return
  try {
    if (localStorage.getItem(PURGE_FLAG)) return
    localStorage.setItem(PURGE_FLAG, '1')

    const rawPlan = localStorage.getItem(PLAN_KEY)
    if (rawPlan && JSON.parse(rawPlan)?.source !== 'user') {
      localStorage.removeItem(PLAN_KEY)
    }

    const rawDraft = localStorage.getItem(DRAFT_KEY)
    if (rawDraft) {
      const draft = JSON.parse(rawDraft)
      const digits = String(draft?.formData?.rentAmount ?? '').replace(/\D/g, '')
      if (Number(digits) === LEGACY_DEFAULT_RENT) {
        draft.formData.rentAmount = ''
        draft.formData.rentEndDate = ''
        draft.formData.rentStartDate = ''
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
      }
    }
  } catch {}
}

/** Returns the rent plan only if the user actually entered it (and matches currentUserId when provided). */
export function readSavingsRentPlan(currentUserId?: number | string | null): SavingsRentPlan | null {
  if (typeof window === 'undefined') return null
  purgeLegacyRentDefaults()
  try {
    const raw = localStorage.getItem(PLAN_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavingsRentPlan
    if (parsed?.source !== 'user') return null
    if (
      currentUserId !== undefined &&
      currentUserId !== null &&
      parsed.userId !== undefined &&
      parsed.userId !== null &&
      String(parsed.userId) !== String(currentUserId)
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}
