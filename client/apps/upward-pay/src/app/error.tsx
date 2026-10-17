'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, WifiOff, RefreshCw, Home } from 'lucide-react'
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
    // Log error to monitoring
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
    <div className="not-found-page">
      <div className="not-found-page__backdrop-glow" aria-hidden="true" />

      <main className="not-found-page__card" role="main">
        {/* Dynamic Hero Badge */}
        {isOffline ? (
          <div className="not-found-page__hero not-found-page__hero--offline">
            <WifiOff size={46} strokeWidth={2.2} />
          </div>
        ) : (
          <div
            className="not-found-page__hero"
            style={{
              background: '#fee2e2',
              color: '#dc2626',
              boxShadow: '0 8px 24px -6px rgba(220, 38, 38, 0.25)',
            }}
          >
            <AlertTriangle size={46} strokeWidth={2.2} />
          </div>
        )}

        <div
          className={`not-found-page__badge ${
            isOffline ? 'not-found-page__badge--offline' : ''
          }`}
          style={
            !isOffline
              ? { background: '#fee2e2', color: '#991b1b' }
              : undefined
          }
        >
          <span
            className={`not-found-page__badge-dot ${
              isOffline ? 'not-found-page__badge-dot--offline' : ''
            }`}
            style={!isOffline ? { background: '#dc2626' } : undefined}
            aria-hidden="true"
          />
          <span>{isOffline ? 'Network Connection Lost' : 'Unexpected Error'}</span>
        </div>

        <h1 className="not-found-page__title">
          {isOffline ? 'Connection error' : 'Something went wrong'}
        </h1>

        <p className="not-found-page__desc">
          {isOffline
            ? "We're having trouble connecting to Upward. Please check your internet connection and try again."
            : 'An unexpected issue occurred while processing this request. Our team has been notified.'}
        </p>

        <div className="not-found-page__actions">
          <button
            type="button"
            className="not-found-page__btn-primary"
            onClick={handleRetry}
            disabled={isRetrying}
          >
            <RefreshCw size={18} className={isRetrying ? 'animate-spin' : ''} />
            <span>{isRetrying ? 'Retrying...' : 'Try Again'}</span>
          </button>

          <Link
            href="/dashboard"
            className="not-found-page__btn-secondary"
            onClick={() => haptics.light()}
          >
            <Home size={17} />
            <span>Go to Dashboard</span>
          </Link>
        </div>
      </main>
    </div>
  )
}
