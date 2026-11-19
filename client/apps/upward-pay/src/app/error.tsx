'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { WifiOff, RefreshCw, Home, AlertCircle } from 'lucide-react'
import { UpwardLogo } from '@/components/PoweredByUpward'
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
    <div className="error-screen">
      <main className="error-screen__container" role="main">
        {/* Brand Mark or Connection Indicator */}
        <div
          className={`error-screen__brand-mark ${isOffline ? 'error-screen__brand-mark--offline' : ''}`}
          aria-hidden="true"
        >
          {isOffline ? (
            <WifiOff size={28} strokeWidth={2.2} />
          ) : (
            <UpwardLogo size={32} color="var(--clay, #c2501f)" />
          )}
        </div>

        {/* Polished Status Tag */}
        <div
          className={`error-screen__badge ${isOffline ? 'error-screen__badge--offline' : ''}`}
          aria-hidden="true"
        >
          {isOffline ? (
            <>
              <WifiOff size={13} strokeWidth={2} />
              <span>Connection Interrupted</span>
            </>
          ) : (
            <>
              <AlertCircle size={13} strokeWidth={2} />
              <span>Temporary Notice</span>
            </>
          )}
        </div>

        {/* Clear, Human Headline */}
        <h1 className="error-screen__title">
          {isOffline ? 'Unable to reach Upward' : 'Something didn’t go as planned'}
        </h1>

        {/* Reassuring, Customer-first Description */}
        <p className="error-screen__description">
          {isOffline
            ? "We're having trouble connecting to the network. Please check your internet or mobile connection and try again."
            : 'We ran into an unexpected hiccup loading this screen. Don’t worry — your funds, account, and active transactions remain completely secure.'}
        </p>

        {/* Actions */}
        <div className="error-screen__actions">
          <button
            type="button"
            className="error-screen__btn-primary"
            onClick={handleRetry}
            disabled={isRetrying}
          >
            <RefreshCw size={17} className={isRetrying ? 'animate-spin' : ''} aria-hidden="true" />
            <span>{isRetrying ? 'Refreshing...' : 'Try again'}</span>
          </button>

          <Link
            href="/dashboard"
            className="error-screen__btn-secondary"
            onClick={() => haptics.light()}
          >
            <Home size={16} aria-hidden="true" />
            <span>Go to dashboard</span>
          </Link>
        </div>

        {error?.digest && (
          <div className="error-screen__digest">
            Reference: {error.digest.slice(0, 8)}
          </div>
        )}

        <p className="error-screen__support">
          Need assistance?{' '}
          <Link
            href="/dashboard/help"
            className="error-screen__support-link"
            onClick={() => haptics.light()}
          >
            Contact support
          </Link>
        </p>
      </main>
    </div>
  )
}
