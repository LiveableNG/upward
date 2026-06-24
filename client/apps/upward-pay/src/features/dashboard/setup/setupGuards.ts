'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSetupDraft } from './SetupDraftContext'
import { isInviteComplete, isPropertyDraftComplete } from './rentalDraft'
import { SETUP_PATHS, useSetupMode } from './setupPaths'

export function useRequireRentalDraft() {
  const router = useRouter()
  const { draft } = useSetupDraft()
  const { withMode } = useSetupMode()

  useEffect(() => {
    if (!isInviteComplete(draft) || !isPropertyDraftComplete(draft)) {
      router.replace(withMode(SETUP_PATHS.rental))
    }
  }, [draft, router, withMode])
}
