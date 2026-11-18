'use client'

import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'

export interface FluidNavConfig {
  isFluidNav: boolean
  isIos: boolean
  isNative: boolean
  majorVersion?: number
}

export function useFluidNav(options?: { allowPreview?: boolean }): FluidNavConfig {
  const [config, setConfig] = useState<FluidNavConfig>({
    isFluidNav: false,
    isIos: false,
    isNative: false,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const isNative = Capacitor.isNativePlatform()
    const platform = Capacitor.getPlatform()
    const isIos = platform === 'ios'

    let majorVersion: number | undefined
    const match = navigator.userAgent.match(/OS (\d+)_/i)
    if (match && match[1]) {
      majorVersion = parseInt(match[1], 10)
    }

    let previewQuery = false
    try {
      const urlParams = new URLSearchParams(window.location.search)
      previewQuery = urlParams.get('fluidNav') === 'true'
    } catch {}

    if (options?.allowPreview || previewQuery) {
      setConfig({
        isFluidNav: true,
        isIos,
        isNative,
        majorVersion,
      })
      return
    }

    const isEligible = isNative && isIos && (majorVersion !== undefined ? majorVersion >= 18 : true)

    setConfig({
      isFluidNav: isEligible,
      isIos,
      isNative,
      majorVersion,
    })
  }, [options?.allowPreview])

  return config
}
