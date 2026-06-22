'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/features/auth/AuthContext'
import { STATES } from '@/lib/location-data'
import {
  type SetupDraft,
  type SetupMode,
  createEmptyDraft,
  loadSetupDraft,
  saveSetupDraft,
  clearSetupDraft,
} from './setupDraft'

type SetupDraftContextValue = {
  draft: SetupDraft
  setDraft: React.Dispatch<React.SetStateAction<SetupDraft>>
  updateDraft: (patch: Partial<SetupDraft>) => void
  resetDraft: (mode?: SetupMode) => void
  clearDraft: () => void
}

const SetupDraftContext = createContext<SetupDraftContextValue | null>(null)

function draftFromUserProperty(user: NonNullable<ReturnType<typeof useAuth>['user']>): SetupDraft {
  const prop = user.properties?.[0]
  const draft = createEmptyDraft('edit')

  if (!prop) return draft

  draft.formData = {
    uuid: prop.uuid,
    pmName: prop.managerName || '',
    address: prop.location?.address || '',
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
  draft.pmFound = !!(prop.companyName || prop.managerName)

  return draft
}

export function SetupDraftProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const mode = (searchParams.get('mode') === 'edit' ? 'edit' : 'onboarding') as SetupMode
  const hydratedFromUser = useRef(false)

  const [draft, setDraftState] = useState<SetupDraft>(() => {
    const stored = loadSetupDraft()
    if (stored) return { ...stored, mode: stored.mode || mode }
    return createEmptyDraft(mode)
  })

  useEffect(() => {
    if (mode === 'edit' && user?.properties?.[0] && !hydratedFromUser.current) {
      const fromUser = draftFromUserProperty(user)
      hydratedFromUser.current = true
      setDraftState(fromUser)
      saveSetupDraft(fromUser)
      return
    }

    setDraftState((prev) => {
      if (prev.mode === mode) return prev
      const next = { ...prev, mode }
      saveSetupDraft(next)
      return next
    })
  }, [mode, user])

  const setDraft = useCallback((updater: React.SetStateAction<SetupDraft>) => {
    setDraftState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      saveSetupDraft(next)
      return next
    })
  }, [])

  const updateDraft = useCallback((patch: Partial<SetupDraft>) => {
    setDraftState((prev) => {
      const next = { ...prev, ...patch }
      saveSetupDraft(next)
      return next
    })
  }, [])

  const resetDraft = useCallback((nextMode: SetupMode = 'onboarding') => {
    const empty = createEmptyDraft(nextMode)
    saveSetupDraft(empty)
    setDraftState(empty)
    hydratedFromUser.current = false
  }, [])

  const clearDraftFn = useCallback(() => {
    clearSetupDraft()
    hydratedFromUser.current = false
    setDraftState(createEmptyDraft(mode))
  }, [mode])

  const value = useMemo(
    () => ({
      draft,
      setDraft,
      updateDraft,
      resetDraft,
      clearDraft: clearDraftFn,
    }),
    [draft, setDraft, updateDraft, resetDraft, clearDraftFn],
  )

  return <SetupDraftContext.Provider value={value}>{children}</SetupDraftContext.Provider>
}

export function useSetupDraft() {
  const ctx = useContext(SetupDraftContext)
  if (!ctx) throw new Error('useSetupDraft must be used within SetupDraftProvider')
  return ctx
}
