import { useCallback, useEffect, useState } from 'react'

import { getRsiEnrolments } from '@/features/rent-support-insurance/storage'
import type { RsiEnrolmentRecord } from '@/features/rent-support-insurance/types'

export function useRsiEnrolment() {
  const [enrolments, setEnrolments] = useState<RsiEnrolmentRecord[]>([])
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    setEnrolments(await getRsiEnrolments())
    setLoaded(true)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    enrolments,
    isEnrolled: enrolments.length > 0,
    loaded,
    refresh,
    setEnrolments,
  }
}
