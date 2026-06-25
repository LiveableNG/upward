'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSetupDraft } from './SetupDraftContext'
import { isPropertyDraftComplete, isPaymentDraftComplete } from './rentalDraft'
import { SETUP_PATHS, useSetupMode } from './setupPaths'

export function useRequireRentalDraft() {
  const router = useRouter()
  const { draft } = useSetupDraft()
  const { withMode } = useSetupMode()

  useEffect(() => {
    if (!isPropertyDraftComplete(draft) || !isPaymentDraftComplete(draft)) {
      router.replace(withMode(SETUP_PATHS.rental))
    }
  }, [draft, router, withMode])
}
