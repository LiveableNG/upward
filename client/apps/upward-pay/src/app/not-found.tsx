'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Home, ArrowLeft, Compass, WifiOff, RefreshCw } from 'lucide-react'
import { haptics } from '@/lib/haptics'
import { networkMonitor } from '@/lib/network'

export default function NotFound() {
  const router = useRouter()
  const [isOffline, setIsOffline] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => {
    networkMonitor.init()
    const unsubscribe = networkMonitor.subscribe((state) => {
      setIsOffline(!state.connected)
    })
    return () => unsubscribe()
  }, [])

  const handleRetry = () => {
    haptics.medium()
    setIsRetrying(true)
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  const handleBack = () => {
    haptics.light()
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/dashboard')
    }
  }

  const handleDashboard = () => {
    haptics.medium()
  }

  return (
    <div className="not-found-page">
      <div className="not-found-page__backdrop-glow" aria-hidden="true" />

      <main className="not-found-page__card" role="main">
        {/* Dynamic Hero Badge based on Network Detection */}
        {isOffline ? (
          <div className="not-found-page__hero not-found-page__hero--offline">
            <WifiOff size={46} strokeWidth={2.2} />
          </div>
        ) : (
          <div className="not-found-page__hero">
            <Compass size={46} strokeWidth={2.2} />
          </div>
        )}

        {isOffline ? (
          <div className="not-found-page__badge not-found-page__badge--offline">
            <span className="not-found-page__badge-dot not-found-page__badge-dot--offline" aria-hidden="true" />
            <span>Connection Lost</span>
          </div>
        ) : (
          <div className="not-found-page__badge">
            <span className="not-found-page__badge-dot" aria-hidden="true" />
            <span>Error 404</span>
          </div>
        )}

        <h1 className="not-found-page__title">
          {isOffline ? 'No internet connection' : 'Page not found'}
        </h1>

        <p className="not-found-page__desc">
          {isOffline
            ? "We couldn't load this page because your device is currently offline. Check your Wi-Fi or mobile data and try again."
            : "We couldn't find the page or payment link you're looking for. It may have expired or moved to a new address."}
        </p>

        <div className="not-found-page__actions">
          {isOffline ? (
            <button
              type="button"
              className="not-found-page__btn-primary"
              onClick={handleRetry}
              disabled={isRetrying}
            >
              <RefreshCw size={18} className={isRetrying ? 'animate-spin' : ''} />
              <span>{isRetrying ? 'Checking connection...' : 'Try Again'}</span>
            </button>
          ) : (
            <Link
              href="/dashboard"
              className="not-found-page__btn-primary"
              onClick={handleDashboard}
            >
              <Home size={18} />
              <span>Go to Dashboard</span>
            </Link>
          )}

          <button
            type="button"
            className="not-found-page__btn-secondary"
            onClick={handleBack}
          >
            <ArrowLeft size={17} />
            <span>Go Back</span>
          </button>
        </div>

        <div className="not-found-page__quick-links">
          <Link
            href="/dashboard/pay-rent"
            className="not-found-page__quick-link"
            onClick={() => haptics.light()}
          >
            Pay Rent
          </Link>
          <span>•</span>
          <Link
            href="/dashboard/help"
            className="not-found-page__quick-link"
            onClick={() => haptics.light()}
          >
            Need Help?
          </Link>
        </div>
      </main>
    </div>
  )
}
