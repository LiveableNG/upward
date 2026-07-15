'use client'

import { useCallback, useEffect, useState } from 'react'
import { getRsiEnrolments } from '../storage'
import type { RsiEnrolmentRecord } from '../types'

export function useRsiEnrolment() {
  const [enrolments, setEnrolments] = useState<RsiEnrolmentRecord[]>([])
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(() => {
    setEnrolments(getRsiEnrolments())
    setLoaded(true)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    enrolments,
    isEnrolled: enrolments.length > 0,
    loaded,
    refresh,
    setEnrolments,
  }
}
