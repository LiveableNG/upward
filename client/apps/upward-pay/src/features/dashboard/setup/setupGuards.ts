'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSetupDraft } from './SetupDraftContext'
import { isInviteComplete, isPropertyDraftComplete } from './rentalDraft'
import { setupPath, SETUP_PATHS, useSetupMode } from './setupPaths'

export function useRequireRentalDraft() {
  const router = useRouter()
  const { draft } = useSetupDraft()
  const { isEdit } = useSetupMode()

  useEffect(() => {
    if (!isInviteComplete(draft) || !isPropertyDraftComplete(draft)) {
      router.replace(isEdit ? setupPath(SETUP_PATHS.rental, { mode: 'edit' }) : SETUP_PATHS.rental)
    }
  }, [draft, router, isEdit])
}
