'use client'

import React, { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'

interface CapacitorGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function CapacitorGuard({ children, fallback = null }: CapacitorGuardProps) {
  const [isNative, setIsNative] = useState(false)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform())
    setIsReady(true)
  }, [])

  if (!isReady) return null
  
  if (!isNative) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
