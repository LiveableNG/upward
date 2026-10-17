'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, WifiOff, RefreshCw, Home } from 'lucide-react'
import { haptics } from '@/lib/haptics'
import { networkMonitor } from '@/lib/network'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [isOffline, setIsOffline] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => {
    console.error('[GlobalError] Application error captured:', error)
    haptics.error()

    networkMonitor.init()
    const unsubscribe = networkMonitor.subscribe((state) => {
      const isNetworkError =
        !state.connected ||
        error?.message?.toLowerCase().includes('fetch failed') ||
        error?.message?.toLowerCase().includes('network') ||
        error?.message?.toLowerCase().includes('offline')
      setIsOffline(isNetworkError)
    })

    return () => unsubscribe()
  }, [error])

  const handleRetry = () => {
    haptics.medium()
    setIsRetrying(true)
    reset()
    setTimeout(() => setIsRetrying(false), 1000)
  }

  return (
    <div className="not-found-screen">
      <main className="not-found-screen__container" role="main">
        {/* Error icon badge */}
        <div
          className="not-found-screen__brand-mark"
          style={
            isOffline
              ? { background: '#fef3c7', borderColor: 'rgba(217, 119, 6, 0.2)', color: '#d97706' }
              : { background: '#fee2e2', borderColor: 'rgba(220, 38, 38, 0.2)', color: '#dc2626' }
          }
          aria-hidden="true"
        >
          {isOffline ? (
            <WifiOff size={32} strokeWidth={2.2} />
          ) : (
            <AlertCircle size={32} strokeWidth={2.2} />
          )}
        </div>

        <div
          className="not-found-screen__code"
          style={!isOffline ? { color: '#dc2626' } : { color: '#d97706' }}
          aria-hidden="true"
        >
          {isOffline ? 'Connection Issue' : 'System Error'}
        </div>

        <h1 className="not-found-screen__title">
          {isOffline ? 'Connection error' : 'Something went wrong'}
        </h1>

        <p className="not-found-screen__description">
          {isOffline
            ? "We're having trouble reaching Upward Pay. Please check your internet connection and try again."
            : 'An unexpected issue occurred while processing this request. Our team has been notified.'}
        </p>

        <div className="not-found-screen__actions">
          <button
            type="button"
            className="not-found-screen__btn-primary"
            onClick={handleRetry}
            disabled={isRetrying}
          >
            <RefreshCw size={17} className={isRetrying ? 'animate-spin' : ''} aria-hidden="true" />
            <span>{isRetrying ? 'Retrying...' : 'Try Again'}</span>
          </button>

          <Link
            href="/dashboard"
            className="not-found-screen__btn-secondary"
            onClick={() => haptics.light()}
          >
            <Home size={16} aria-hidden="true" />
            <span>Go to dashboard</span>
          </Link>
        </div>
      </main>
    </div>
  )
}
