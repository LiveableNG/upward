'use client'

import React, { useEffect, useState, useRef } from 'react'
import { WifiOff, Check } from 'lucide-react'
import { networkMonitor, NetworkState } from '@/lib/network'
import { haptics } from '@/lib/haptics'

export const OfflineBanner: React.FC = () => {
  const [networkState, setNetworkState] = useState<NetworkState>({
    connected: true,
    connectionType: 'unknown',
  })
  const [showReconnected, setShowReconnected] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const prevConnectedRef = useRef(true)

  useEffect(() => {
    networkMonitor.init()
    const unsubscribe = networkMonitor.subscribe((state) => {
      if (!state.connected && prevConnectedRef.current) {
        // Just went offline
        haptics.warning()
        setShowReconnected(false)
        setIsClosing(false)
      } else if (state.connected && !prevConnectedRef.current) {
        // Just came back online
        haptics.success()
        setShowReconnected(true)
        setIsClosing(false)
        setTimeout(() => {
          setIsClosing(true)
          setTimeout(() => {
            setShowReconnected(false)
            setIsClosing(false)
          }, 300)
        }, 2200)
      }
      prevConnectedRef.current = state.connected
      setNetworkState(state)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  if (networkState.connected && !showReconnected) {
    return null
  }

  const isOffline = !networkState.connected

  return (
    <div
      className={`offline-banner ${isClosing ? 'offline-banner--closing' : ''}`}
      role="status"
      aria-live="polite"
    >
      {isOffline ? (
        <div className="offline-banner__pill offline-banner__pill--offline">
          <span className="offline-banner__dot offline-banner__dot--offline" aria-hidden />
          <WifiOff size={14} aria-hidden />
          <span>You&apos;re offline — changes will sync once restored</span>
        </div>
      ) : (
        <div className="offline-banner__pill offline-banner__pill--online">
          <span className="offline-banner__dot offline-banner__dot--online" aria-hidden />
          <Check size={14} aria-hidden />
          <span>Back online — connection restored</span>
        </div>
      )}
    </div>
  )
}
