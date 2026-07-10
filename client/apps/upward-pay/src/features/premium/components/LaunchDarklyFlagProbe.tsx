'use client'

import { useEffect } from 'react'
import { useFlags, useInitializationStatus } from '@launchdarkly/react-sdk'

export function LaunchDarklyFlagProbe() {
  const { checkoutExperience } = useFlags()
  const initStatus = useInitializationStatus()

  useEffect(() => {
    console.log('[LaunchDarkly] init status:', initStatus.status)
    if (initStatus.status === 'failed') {
      console.log('[LaunchDarkly] init error:', initStatus.error?.message)
    }
    console.log('checkoutExperience', checkoutExperience)
  }, [checkoutExperience, initStatus.status])

  return null
}
