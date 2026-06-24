'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/features/auth/AuthContext'
import {
  type SetupDraft,
  type SetupMode,
  createEmptyDraft,
  loadSetupDraft,
  saveSetupDraft,
  clearSetupDraft,
  draftFromProperty,
} from './setupDraft'

type SetupDraftContextValue = {
  draft: SetupDraft
  setDraft: React.Dispatch<React.SetStateAction<SetupDraft>>
  updateDraft: (patch: Partial<SetupDraft>) => void
  resetDraft: (mode?: SetupMode) => void
  clearDraft: () => void
}

const SetupDraftContext = createContext<SetupDraftContextValue | null>(null)

export function SetupDraftProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const mode = (searchParams.get('mode') === 'edit' ? 'edit' : 'onboarding') as SetupMode
  const propertyUuid = searchParams.get('property')
  const isNew = searchParams.get('new') === '1'
  const hydratedKey = useRef<string | null>(null)

  const [draft, setDraftState] = useState<SetupDraft>(() => {
    const stored = loadSetupDraft()
    if (stored) return { ...stored, mode: stored.mode || mode }
    return createEmptyDraft(mode)
  })

  useEffect(() => {
    const hydrationKey = `${mode}:${propertyUuid || ''}:${isNew ? 'new' : ''}`

    if (hydratedKey.current === hydrationKey) {
      setDraftState((prev) => {
        if (prev.mode === mode) return prev
        const next = { ...prev, mode }
        saveSetupDraft(next)
        return next
      })
      return
    }

    if (mode === 'edit' && isNew) {
      const empty = createEmptyDraft('edit')
      hydratedKey.current = hydrationKey
      setDraftState(empty)
      saveSetupDraft(empty)
      return
    }

    if (mode === 'edit' && propertyUuid && user?.properties) {
      const prop = user.properties.find((p) => p.uuid === propertyUuid)
      if (prop) {
        const fromUser = draftFromProperty(user, prop, 'edit')
        hydratedKey.current = hydrationKey
        setDraftState(fromUser)
        saveSetupDraft(fromUser)
        return
      }
    }

    hydratedKey.current = hydrationKey

    setDraftState((prev) => {
      if (prev.mode === mode) return prev
      const next = { ...prev, mode }
      saveSetupDraft(next)
      return next
    })
  }, [mode, user, propertyUuid, isNew])

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
    hydratedKey.current = null
  }, [])

  const clearDraftFn = useCallback(() => {
    clearSetupDraft()
    hydratedKey.current = null
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
