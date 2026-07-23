'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ClipboardList, Search } from 'lucide-react'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import { ApplicationStatusBadge } from '@/features/dashboard/components/exclusive-homes/applications/ApplicationStatusBadge'
import { APPLICATIONS_PAGE_COPY } from '@/features/dashboard/constants/exclusiveHomeApplications'
import type { ExclusiveHomeApplication } from '@/features/dashboard/constants/exclusiveHomeApplications'
import {
  HOME_REQUEST_PAGE_COPY,
  HOME_REQUEST_STATUS_LABELS,
} from '@/features/dashboard/constants/exclusiveHomeRequests'
import type { HomeRequest } from '@/features/dashboard/constants/exclusiveHomeRequests'
import {
  countIncompleteChecklistSteps,
  formatApplicationTypeLabel,
  getAllExclusiveHomeApplications,
} from '@/features/dashboard/utils/exclusiveHomeApplications'
import {
  formatBudgetRange,
  formatHomeRequestPropertyType,
  formatHomeRequestSummary,
  getAllHomeRequests,
} from '@/features/dashboard/utils/exclusiveHomeRequests'
import { getExclusiveHomeById } from '@/features/dashboard/utils/exclusiveHomes'
import { formatCurrency } from '@/lib/utils'
import FallbackSuspense from '@/components/FallbackSuspense'

type ActivityTab = 'requests' | 'applications'

export function MyApplicationsScreen() {
  const router = useRouter()
  const [tab, setTab] = useState<ActivityTab>('requests')
  const [applications, setApplications] = useState<ExclusiveHomeApplication[]>([])
  const [requests, setRequests] = useState<HomeRequest[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setApplications(getAllExclusiveHomeApplications())
    setRequests(getAllHomeRequests())
    setReady(true)
  }, [])

  const applicationRows = useMemo(
    () =>
      applications
        .map((application) => {
          const home = getExclusiveHomeById(application.listingId)
          if (!home) return null
          return { application, home }
        })
        .filter(Boolean) as Array<{
        application: (typeof applications)[number]
        home: NonNullable<ReturnType<typeof getExclusiveHomeById>>
      }>,
    [applications],
  )

  return (
    <PayPageShell
      title={HOME_REQUEST_PAGE_COPY.listTitle}
      subtitle={HOME_REQUEST_PAGE_COPY.listSubtitle}
      showBack
      onBack={() => router.push('/dashboard')}
    >
      <div className="home-req__tabs" role="tablist" aria-label="Requests and applications">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'requests'}
          className={`home-req__tab${tab === 'requests' ? ' home-req__tab--active' : ''}`}
          onClick={() => setTab('requests')}
        >
          {HOME_REQUEST_PAGE_COPY.requestsTab}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'applications'}
          className={`home-req__tab${tab === 'applications' ? ' home-req__tab--active' : ''}`}
          onClick={() => setTab('applications')}
        >
          {HOME_REQUEST_PAGE_COPY.applicationsTab}
        </button>
      </div>

      {!ready ? (
        <FallbackSuspense message="Loading…" />
      ) : tab === 'requests' ? (
        requests.length === 0 ? (
          <div className="exclusive-homes__empty">
            <div className="exclusive-homes__empty-icon">
              <Search size={30} strokeWidth={1.75} />
            </div>
            <h3 className="exclusive-homes__empty-title">{HOME_REQUEST_PAGE_COPY.requestsEmptyTitle}</h3>
            <p className="exclusive-homes__empty-text">{HOME_REQUEST_PAGE_COPY.requestsEmptyText}</p>
            <button
              type="button"
              className="exclusive-homes__primary-btn home-app__empty-cta"
              onClick={() => router.push('/dashboard/exclusive-homes/request')}
            >
              {HOME_REQUEST_PAGE_COPY.requestsEmptyCta}
            </button>
          </div>
        ) : (
          <div className="home-app__list">
            {requests.map((request) => (
              <button
                key={request.id}
                type="button"
                className="home-app__card"
                onClick={() => router.push(`/dashboard/exclusive-homes/requests/${request.id}`)}
              >
                <div className="home-app__card-top">
                  <div className="home-app__card-copy">
                    <span className="home-app__card-type">Home request</span>
                    <h3 className="home-app__card-title">{formatHomeRequestSummary(request)}</h3>
                    <p className="home-app__card-meta">
                      {formatHomeRequestPropertyType(request.propertyType)} ·{' '}
                      {formatBudgetRange(request.budgetMin, request.budgetMax)}
                    </p>
                  </div>
                  <span className={`home-req__status home-req__status--${request.status}`}>
                    {HOME_REQUEST_STATUS_LABELS[request.status]}
                  </span>
                </div>

                <div className="home-app__card-foot">
                  <span className="home-app__card-hint">Tap to view progress</span>
                  <ChevronRight size={16} aria-hidden />
                </div>
              </button>
            ))}
          </div>
        )
      ) : applicationRows.length === 0 ? (
        <div className="exclusive-homes__empty">
          <div className="exclusive-homes__empty-icon">
            <ClipboardList size={30} strokeWidth={1.75} />
          </div>
          <h3 className="exclusive-homes__empty-title">{APPLICATIONS_PAGE_COPY.emptyTitle}</h3>
          <p className="exclusive-homes__empty-text">{APPLICATIONS_PAGE_COPY.emptyText}</p>
          <button
            type="button"
            className="exclusive-homes__primary-btn home-app__empty-cta"
            onClick={() => router.push('/dashboard/exclusive-homes')}
          >
            Browse Exclusive Homes
          </button>
        </div>
      ) : (
        <div className="home-app__list">
          {applicationRows.map(({ application, home }) => {
            const incomplete = countIncompleteChecklistSteps(application)

            return (
              <button
                key={application.id}
                type="button"
                className="home-app__card"
                onClick={() => router.push(`/dashboard/exclusive-homes/applications/${application.id}`)}
              >
                <div className="home-app__card-top">
                  <div className="home-app__card-copy">
                    <span className="home-app__card-type">
                      {formatApplicationTypeLabel(application.type)}
                    </span>
                    <h3 className="home-app__card-title">{home.name}</h3>
                    <p className="home-app__card-meta">
                      {home.area} · {formatCurrency(home.annualRent)}/year
                    </p>
                  </div>
                  <ApplicationStatusBadge status={application.status} />
                </div>

                <div className="home-app__card-foot">
                  <span className="home-app__card-hint">
                    {incomplete > 0
                      ? `${incomplete} step${incomplete === 1 ? '' : 's'} left to prepare`
                      : 'All prep steps complete'}
                  </span>
                  <ChevronRight size={16} aria-hidden />
                </div>
              </button>
            )
          })}
        </div>
      )}
    </PayPageShell>
  )
}
