'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ClipboardList } from 'lucide-react'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import { ApplicationStatusBadge } from '@/features/dashboard/components/exclusive-homes/applications/ApplicationStatusBadge'
import { APPLICATIONS_PAGE_COPY } from '@/features/dashboard/constants/exclusiveHomeApplications'
import type { ExclusiveHomeApplication } from '@/features/dashboard/constants/exclusiveHomeApplications'
import {
  countIncompleteChecklistSteps,
  formatApplicationTypeLabel,
  getAllExclusiveHomeApplications,
} from '@/features/dashboard/utils/exclusiveHomeApplications'
import { getExclusiveHomeById } from '@/features/dashboard/utils/exclusiveHomes'
import { formatCurrency } from '@/lib/utils'
import FallbackSuspense from '@/components/FallbackSuspense'

export function MyApplicationsScreen() {
  const router = useRouter()
  const [applications, setApplications] = useState<ExclusiveHomeApplication[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setApplications(getAllExclusiveHomeApplications())
    setReady(true)
  }, [])

  const rows = useMemo(
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
      title={APPLICATIONS_PAGE_COPY.listTitle}
      subtitle={APPLICATIONS_PAGE_COPY.listSubtitle}
      showBack
      onBack={() => router.push('/dashboard/exclusive-homes')}
    >
      {rows.length === 0 ? (
        !ready ? (
          <FallbackSuspense message="Loading applications…" />
        ) : (
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
        )
      ) : (
        <div className="home-app__list">
          {rows.map(({ application, home }) => {
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
