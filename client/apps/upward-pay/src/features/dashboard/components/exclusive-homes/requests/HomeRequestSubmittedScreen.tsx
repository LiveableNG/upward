'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import { ApplicationTimeline } from '@/features/dashboard/components/exclusive-homes/applications/ApplicationTimeline'
import { HOME_REQUEST_PAGE_COPY } from '@/features/dashboard/constants/exclusiveHomeRequests'
import type { HomeRequest } from '@/features/dashboard/constants/exclusiveHomeRequests'
import {
  formatBudgetRange,
  formatHomeRequestPropertyType,
  formatHomeRequestSummary,
  getHomeRequestById,
} from '@/features/dashboard/utils/exclusiveHomeRequests'
import { formatHomeRequestLocations } from '@/features/dashboard/utils/homeRequestLocations'
import { HomeRequestLocationsList } from './HomeRequestLocationsList'
import { formatDate } from '@/lib/utils'
import FallbackSuspense from '@/components/FallbackSuspense'

export function HomeRequestSubmittedScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestId = searchParams.get('requestId') ?? ''
  const [request, setRequest] = useState<HomeRequest | undefined>()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (requestId) {
      setRequest(getHomeRequestById(requestId))
    }
    setReady(true)
  }, [requestId])

  if (!ready) {
    return (
      <PayPageShell title={HOME_REQUEST_PAGE_COPY.submittedTitle} showBack onBack={() => router.push('/dashboard')}>
        <FallbackSuspense message="Loading request…" />
      </PayPageShell>
    )
  }

  if (!request) {
    return (
      <PayPageShell title={HOME_REQUEST_PAGE_COPY.submittedTitle} showBack onBack={() => router.push('/dashboard')}>
        <div className="exclusive-homes__empty">
          <h3 className="exclusive-homes__empty-title">Request not found</h3>
          <p className="exclusive-homes__empty-text">Try submitting a new request.</p>
          <button
            type="button"
            className="exclusive-homes__primary-btn home-app__empty-cta"
            onClick={() => router.push('/dashboard/exclusive-homes/request')}
          >
            Request a home
          </button>
        </div>
      </PayPageShell>
    )
  }

  return (
    <PayPageShell
      title={HOME_REQUEST_PAGE_COPY.submittedTitle}
      showBack
      onBack={() => router.push('/dashboard')}
      footer={
        <div className="exclusive-homes__detail-actions">
          <button
            type="button"
            className="exclusive-homes__primary-btn"
            onClick={() => router.push(`/dashboard/exclusive-homes/requests/${request.id}`)}
          >
            View my request
          </button>
          <button
            type="button"
            className="exclusive-homes__secondary-btn exclusive-homes__secondary-btn--full"
            onClick={() => router.push('/dashboard/exclusive-homes/applications')}
          >
            All requests & applications
          </button>
        </div>
      }
    >
      <div className="home-app__success">
        <div className="home-app__success-icon" aria-hidden>
          <CheckCircle2 size={34} />
        </div>
        <h2 className="home-app__success-title">{HOME_REQUEST_PAGE_COPY.submittedHeadline}</h2>
        <p className="home-app__success-text">{HOME_REQUEST_PAGE_COPY.submittedText}</p>
      </div>

      <section className="home-req__summary-card">
        <span className="home-req__summary-badge">Home request</span>
        <h3 className="home-req__summary-title">{formatHomeRequestSummary(request)}</h3>
        <p className="home-req__summary-meta">
          {formatHomeRequestPropertyType(request.propertyType)} ·{' '}
          {formatBudgetRange(request.budgetMin, request.budgetMax)} · Move-in{' '}
          {formatDate(request.moveInDate)}
        </p>
        <p className="home-req__summary-locations">{formatHomeRequestLocations(request.locations)}</p>
        <HomeRequestLocationsList locations={request.locations} />
        {request.notes ? <p className="home-req__summary-notes">{request.notes}</p> : null}
      </section>

      <section className="home-app__section">
        <h2 className="home-app__section-title">{HOME_REQUEST_PAGE_COPY.submittedNextTitle}</h2>
        <ApplicationTimeline steps={request.timeline} />
      </section>

      <div className="exclusive-homes__banner home-app__banner">
        <span className="exclusive-homes__banner-star" aria-hidden>
          ✦
        </span>
        <p className="exclusive-homes__banner-text">{HOME_REQUEST_PAGE_COPY.trustBanner}</p>
      </div>
    </PayPageShell>
  )
}
