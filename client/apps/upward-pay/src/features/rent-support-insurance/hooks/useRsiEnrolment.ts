'use client'

import { useCallback, useEffect, useState } from 'react'
import { getRsiEnrolments } from '../storage'
import type { RsiEnrolmentRecord } from '../types'

export function useRsiEnrolment() {
  const [enrolments, setEnrolments] = useState<RsiEnrolmentRecord[]>(() =>
    typeof window !== 'undefined' ? getRsiEnrolments() : [],
  )
  const [loaded] = useState(true)

  const refresh = useCallback(() => {
    setEnrolments(getRsiEnrolments())
  }, [])

  useEffect(() => {
    const handleStorage = () => setEnrolments(getRsiEnrolments())
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  return {
    enrolments,
    isEnrolled: enrolments.length > 0,
    loaded,
    refresh,
    setEnrolments,
  }
}
