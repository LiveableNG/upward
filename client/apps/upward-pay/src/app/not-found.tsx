'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { haptics } from '@/lib/haptics'

export default function NotFound() {
  const router = useRouter()

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
    <div className="not-found-screen">
      <main className="not-found-screen__container" role="main">
        {/* Authentic Upward Pay Brand Mark */}
        <div className="not-found-screen__brand-mark" aria-hidden="true">
          <UpwardLogo size={34} color="var(--clay, #c2501f)" />
        </div>

        {/* Subdued Status Code */}
        <div className="not-found-screen__code" aria-hidden="true">
          404 — Not Found
        </div>

        {/* Clear, Editorial Heading */}
        <h1 className="not-found-screen__title">We couldn&apos;t find that page</h1>

        {/* Calm, Supporting Copy */}
        <p className="not-found-screen__description">
          The page may have moved, the link may be incorrect, or the address may have expired.
        </p>

        {/* Clear Action Hierarchy */}
        <div className="not-found-screen__actions">
          <Link
            href="/dashboard"
            className="not-found-screen__btn-primary"
            onClick={handleDashboard}
          >
            <span>Go to dashboard</span>
            <ArrowRight size={17} aria-hidden="true" />
          </Link>

          <button type="button" className="not-found-screen__btn-secondary" onClick={handleBack}>
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Go back</span>
          </button>
        </div>

        {/* Discreet Contextual Support */}
        <p className="not-found-screen__support">
          Need help?{' '}
          <Link
            href="/dashboard/help"
            className="not-found-screen__support-link"
            onClick={() => haptics.light()}
          >
            Contact support
          </Link>
        </p>
      </main>
    </div>
  )
}
