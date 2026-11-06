import { useLocalSearchParams } from 'expo-router'
import { useEffect, useRef } from 'react'

import { useAuth } from '@/features/auth/AuthProvider'
import { useSetupDraft } from '@/features/setup/SetupDraftContext'
import { createEmptyDraft, draftFromProperty, type SetupMode } from '@/features/setup/setupDraft'

export function useSetupDraftFromRoute() {
  const params = useLocalSearchParams<{ mode?: string; property?: string; new?: string }>()
  const mode: SetupMode = params.mode === 'edit' ? 'edit' : 'onboarding'
  const propertyUuid = typeof params.property === 'string' ? params.property : undefined
  const isNewProperty = params.new === '1'
  const { user } = useAuth()
  const { loadDraft, resetDraft } = useSetupDraft()
  const hydratedKey = useRef<string | null>(null)

  useEffect(() => {
    const key = `${mode}:${propertyUuid ?? ''}:${isNewProperty ? 'new' : ''}:${user?.email ?? ''}`
    if (hydratedKey.current === key) return

    if (mode === 'edit' && isNewProperty) {
      resetDraft('edit')
      hydratedKey.current = key
      return
    }

    if (mode === 'edit' && propertyUuid && user?.properties?.length) {
      const prop = user.properties.find((p) => p.uuid === propertyUuid)
      if (prop) {
        loadDraft(draftFromProperty(user, prop, 'edit'))
        hydratedKey.current = key
        return
      }
    }

    if (mode === 'onboarding' && hydratedKey.current === null) {
      hydratedKey.current = key
      return
    }

    if (mode === 'edit' && !propertyUuid && !isNewProperty) {
      resetDraft('edit')
    }

    hydratedKey.current = key
  }, [mode, propertyUuid, isNewProperty, user, loadDraft, resetDraft])

  return {
    mode,
    isEdit: mode === 'edit',
    propertyUuid,
    isNewProperty,
  }
}
