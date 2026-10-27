import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

import { calculateRentEndDate } from '@/features/setup/rentalDates'
import {
  createEmptyDraft,
  type RentalFormData,
  type SetupDraft,
  type SetupMode,
} from '@/features/setup/setupDraft'

function mergeSetupDraft(prev: SetupDraft, patch: Partial<SetupDraft>): SetupDraft {
  const next: SetupDraft = { ...prev, ...patch }

  if (patch.formData) {
    next.formData = { ...prev.formData, ...patch.formData }
  }
  if (patch.paymentDetails) {
    next.paymentDetails = { ...prev.paymentDetails, ...patch.paymentDetails }
  }
  if (patch.pmDetails !== undefined) {
    next.pmDetails =
      patch.pmDetails === null ? null : { ...(prev.pmDetails ?? {}), ...patch.pmDetails }
  }

  return next
}

type SetupDraftContextValue = {
  draft: SetupDraft
  updateDraft: (patch: Partial<SetupDraft>) => void
  loadDraft: (next: SetupDraft) => void
  patchFormData: (patch: Partial<RentalFormData>) => void
  resetDraft: (mode?: SetupMode) => void
}

const SetupDraftContext = createContext<SetupDraftContextValue | null>(null)

export function SetupDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<SetupDraft>(() => createEmptyDraft('onboarding'))

  const updateDraft = useCallback((patch: Partial<SetupDraft>) => {
    setDraft((prev) => mergeSetupDraft(prev, patch))
  }, [])

  const loadDraft = useCallback((next: SetupDraft) => {
    setDraft(next)
  }, [])

  const patchFormData = useCallback((patch: Partial<RentalFormData>) => {
    setDraft((prev) => {
      const nextForm: RentalFormData = { ...prev.formData, ...patch }
      const shouldAutoDue =
        ('rentStartDate' in patch || 'rentType' in patch) && Boolean(nextForm.rentStartDate)
      if (shouldAutoDue) {
        nextForm.rentEndDate = calculateRentEndDate(
          nextForm.rentStartDate,
          nextForm.rentType || 'Annually',
          nextForm.leaseDuration || '1',
          nextForm.leaseUnit || 'years',
        )
      }
      return mergeSetupDraft(prev, { formData: nextForm })
    })
  }, [])

  const resetDraft = useCallback((mode: SetupMode = 'onboarding') => {
    setDraft(createEmptyDraft(mode))
  }, [])

  const value = useMemo(
    () => ({
      draft,
      updateDraft,
      loadDraft,
      patchFormData,
      resetDraft,
    }),
    [draft, updateDraft, loadDraft, patchFormData, resetDraft],
  )

  return <SetupDraftContext.Provider value={value}>{children}</SetupDraftContext.Provider>
}

export function useSetupDraft() {
  const ctx = useContext(SetupDraftContext)
  if (!ctx) throw new Error('useSetupDraft must be used within SetupDraftProvider')
  return ctx
}
