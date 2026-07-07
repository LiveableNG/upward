'use client'

import { useEffect } from 'react'
import { getUtmFromSearchParams, persistFirstTouchUtm } from '@/lib/utm'

export function BlogUtmCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const utm = getUtmFromSearchParams(params)
    persistFirstTouchUtm(utm)
  }, [])

  return null
}
