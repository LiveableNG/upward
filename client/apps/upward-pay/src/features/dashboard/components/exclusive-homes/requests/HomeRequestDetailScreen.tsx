'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ApplicationTimeline } from '@/features/dashboard/components/exclusive-homes/applications/ApplicationTimeline'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import {
  HOME_REQUEST_PAGE_COPY,
  HOME_REQUEST_STATUS_LABELS,
  type HomeRequest,
} from '@/features/dashboard/constants/exclusiveHomeRequests'
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

export function HomeRequestDetailScreen({ requestId }: { requestId: string }) {
  const router = useRouter()
  const [request, setRequest] = useState<HomeRequest | undefined>()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setRequest(getHomeRequestById(requestId))
    setReady(true)
  }, [requestId])

  if (!ready) {
    return (
      <PayPageShell title={HOME_REQUEST_PAGE_COPY.detailTitle} showBack onBack={() => router.back()}>
        <FallbackSuspense message="Loading request…" />
      </PayPageShell>
    )
  }

  if (!request) {
    return (
      <PayPageShell
        title={HOME_REQUEST_PAGE_COPY.detailTitle}
        showBack
        onBack={() => router.push('/dashboard/exclusive-homes/applications')}
      >
        <div className="exclusive-homes__empty">
          <h3 className="exclusive-homes__empty-title">Request not found</h3>
          <p className="exclusive-homes__empty-text">This request may have been removed.</p>
          <button
            type="button"
            className="exclusive-homes__secondary-btn"
            onClick={() => router.push('/dashboard/exclusive-homes/request')}
          >
            Submit a new request
          </button>
        </div>
      </PayPageShell>
    )
  }

  return (
    <PayPageShell
      title={HOME_REQUEST_PAGE_COPY.detailTitle}
      showBack
      onBack={() => router.push('/dashboard/exclusive-homes/applications')}
    >
      <div className="home-app__detail-head">
        <span className={`home-req__status home-req__status--${request.status}`}>
          {HOME_REQUEST_STATUS_LABELS[request.status]}
        </span>
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
        <h2 className="home-app__section-title">Progress</h2>
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
