'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import { ApplicationListingSummary } from '@/features/dashboard/components/exclusive-homes/applications/ApplicationListingSummary'
import { ApplicationTimeline } from '@/features/dashboard/components/exclusive-homes/applications/ApplicationTimeline'
import {
  APPLICATIONS_PAGE_COPY,
  type ApplicationType,
  type ExclusiveHomeApplication,
} from '@/features/dashboard/constants/exclusiveHomeApplications'
import {
  formatApplicationTypeLabel,
  getExclusiveHomeApplicationById,
} from '@/features/dashboard/utils/exclusiveHomeApplications'
import { getExclusiveHomeById } from '@/features/dashboard/utils/exclusiveHomes'
import FallbackSuspense from '@/components/FallbackSuspense'

export function ApplicationSubmittedScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const listingId = searchParams.get('listing') ?? ''
  const type = (searchParams.get('type') === 'viewing' ? 'viewing' : 'apply') as ApplicationType
  const applicationId = searchParams.get('applicationId') ?? ''

  const [application, setApplication] = useState<ExclusiveHomeApplication | undefined>()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (applicationId) {
      setApplication(getExclusiveHomeApplicationById(applicationId))
    }
    setReady(true)
  }, [applicationId])

  const home = getExclusiveHomeById(listingId || application?.listingId || '')

  if (!ready) {
    return (
      <PayPageShell title="Application" showBack onBack={() => router.push('/dashboard/exclusive-homes')}>
        <FallbackSuspense message="Loading application…" />
      </PayPageShell>
    )
  }

  if (!home || !application) {
    return (
      <PayPageShell
        title="Application"
        showBack
        onBack={() => router.push('/dashboard/exclusive-homes')}
      >
        <div className="exclusive-homes__empty">
          <h3 className="exclusive-homes__empty-title">Application not found</h3>
          <p className="exclusive-homes__empty-text">Return to Exclusive Homes and try again.</p>
        </div>
      </PayPageShell>
    )
  }

  return (
    <PayPageShell
      title={APPLICATIONS_PAGE_COPY.submittedTitle}
      subtitle={formatApplicationTypeLabel(type)}
      showBack
      onBack={() => router.push(`/dashboard/exclusive-homes/${home.id}`)}
      footer={
        <div className="exclusive-homes__detail-actions">
          <button
            type="button"
            className="exclusive-homes__primary-btn"
            onClick={() => router.push(`/dashboard/exclusive-homes/applications/${application.id}`)}
          >
            View my application
          </button>
          <button
            type="button"
            className="exclusive-homes__secondary-btn exclusive-homes__secondary-btn--full"
            onClick={() => router.push('/dashboard/exclusive-homes/applications')}
          >
            All applications
          </button>
        </div>
      }
    >
      <div className="home-app__success">
        <div className="home-app__success-icon" aria-hidden>
          <CheckCircle2 size={34} />
        </div>
        <h2 className="home-app__success-title">
          {type === 'apply' ? 'Application submitted' : 'Viewing request sent'}
        </h2>
        <p className="home-app__success-text">
          {type === 'apply'
            ? APPLICATIONS_PAGE_COPY.submittedApply
            : APPLICATIONS_PAGE_COPY.submittedViewing}
        </p>
      </div>

      <ApplicationListingSummary home={home} />

      <section className="home-app__section">
        <h2 className="home-app__section-title">What happens next</h2>
        <ApplicationTimeline steps={application.timeline} />
      </section>

      <div className="exclusive-homes__banner home-app__banner">
        <span className="exclusive-homes__banner-star" aria-hidden>
          ✦
        </span>
        <p className="exclusive-homes__banner-text">
          Complete your prep checklist so landlords can review your verified Upward profile faster.
        </p>
      </div>
    </PayPageShell>
  )
}
