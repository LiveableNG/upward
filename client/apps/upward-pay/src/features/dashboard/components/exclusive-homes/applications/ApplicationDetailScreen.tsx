'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, MapPin, Phone, User } from 'lucide-react'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import { ApplicationChecklist } from '@/features/dashboard/components/exclusive-homes/applications/ApplicationChecklist'
import { ApplicationListingSummary } from '@/features/dashboard/components/exclusive-homes/applications/ApplicationListingSummary'
import { ApplicationStatusBadge } from '@/features/dashboard/components/exclusive-homes/applications/ApplicationStatusBadge'
import { ApplicationTimeline } from '@/features/dashboard/components/exclusive-homes/applications/ApplicationTimeline'
import type { ExclusiveHomeApplication } from '@/features/dashboard/constants/exclusiveHomeApplications'
import { getExclusiveHomeApplicationById } from '@/features/dashboard/utils/exclusiveHomeApplications'
import { getApplicationStepHref } from '@/features/dashboard/utils/exclusiveHomeApplicationRoutes'
import { getExclusiveHomeById } from '@/features/dashboard/utils/exclusiveHomes'
import { formatDate } from '@/lib/utils'
import FallbackSuspense from '@/components/FallbackSuspense'

export function ApplicationDetailScreen({ applicationId }: { applicationId: string }) {
  const router = useRouter()
  const viewingRef = useRef<HTMLDivElement>(null)
  const [application, setApplication] = useState<ExclusiveHomeApplication | undefined>()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setApplication(getExclusiveHomeApplicationById(applicationId))
    setReady(true)
  }, [applicationId])

  const home = application ? getExclusiveHomeById(application.listingId) : undefined

  if (!ready) {
    return (
      <PayPageShell title="Application" showBack onBack={() => router.push('/dashboard/exclusive-homes/applications')}>
        <FallbackSuspense message="Loading application…" />
      </PayPageShell>
    )
  }

  if (!application || !home) {
    return (
      <PayPageShell
        title="Application"
        showBack
        onBack={() => router.push('/dashboard/exclusive-homes/applications')}
      >
        <div className="exclusive-homes__empty">
          <h3 className="exclusive-homes__empty-title">Application not found</h3>
          <p className="exclusive-homes__empty-text">This application may have been removed.</p>
          <button
            type="button"
            className="exclusive-homes__secondary-btn"
            onClick={() => router.push('/dashboard/exclusive-homes/applications')}
          >
            Back to my applications
          </button>
        </div>
      </PayPageShell>
    )
  }

  const incomplete = application.checklist.filter((step) => !step.completed).length
  const checklistSteps = application.checklist.map((step) => ({
    ...step,
    href: getApplicationStepHref(application.id, step.id, step.href),
  }))
  const bannerText =
    application.status === 'viewing_scheduled' && application.viewing
      ? `Your viewing is scheduled for ${application.viewing.dateLabel}. Complete any remaining steps before you go.`
      : incomplete > 0
        ? `Complete ${incomplete} step${incomplete === 1 ? '' : 's'} so landlords can review your Upward profile.`
        : 'You are ready. We will notify you when there is an update on this home.'

  const scrollToViewing = () => {
    viewingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <PayPageShell
      title="Application"
      subtitle={formatDate(application.submittedAt)}
      showBack
      onBack={() => router.push('/dashboard/exclusive-homes/applications')}
    >
      <div className="home-app__detail-head">
        <ApplicationStatusBadge status={application.status} />
      </div>

      <ApplicationListingSummary
        home={home}
        compact
        onClick={() => router.push(`/dashboard/exclusive-homes/${home.id}`)}
      />

      <div className="exclusive-homes__banner home-app__banner">
        <span className="exclusive-homes__banner-star" aria-hidden>
          ✦
        </span>
        <p className="exclusive-homes__banner-text">{bannerText}</p>
      </div>

      <section className="home-app__section">
        <h2 className="home-app__section-title">Progress</h2>
        <ApplicationTimeline steps={application.timeline} />
      </section>

      {application.viewing ? (
        <section ref={viewingRef} id="viewing" className="home-app__section">
          <h2 className="home-app__section-title">Viewing details</h2>
          <div className="home-app__viewing-card">
            <div className="home-app__viewing-row">
              <Calendar size={16} aria-hidden />
              <div>
                <span className="home-app__viewing-label">When</span>
                <span className="home-app__viewing-value">
                  {application.viewing.dateLabel} · {application.viewing.timeLabel}
                </span>
              </div>
            </div>
            <div className="home-app__viewing-row">
              <MapPin size={16} aria-hidden />
              <div>
                <span className="home-app__viewing-label">Where</span>
                <span className="home-app__viewing-value">{application.viewing.address}</span>
              </div>
            </div>
            <div className="home-app__viewing-row">
              <User size={16} aria-hidden />
              <div>
                <span className="home-app__viewing-label">Contact</span>
                <span className="home-app__viewing-value">{application.viewing.contactName}</span>
              </div>
            </div>
            <div className="home-app__viewing-row">
              <Phone size={16} aria-hidden />
              <div>
                <span className="home-app__viewing-label">Phone</span>
                <span className="home-app__viewing-value">{application.viewing.contactPhone}</span>
              </div>
            </div>
            <p className="home-app__viewing-notes">{application.viewing.notes}</p>
          </div>
        </section>
      ) : null}

      <section className="home-app__section">
        <h2 className="home-app__section-title">Prepare for this home</h2>
        <ApplicationChecklist steps={checklistSteps} onViewingConfirm={scrollToViewing} />
      </section>

      <button
        type="button"
        className="exclusive-homes__secondary-btn exclusive-homes__secondary-btn--full"
        onClick={() => router.push('/dashboard/help')}
      >
        Message support about this application
      </button>
    </PayPageShell>
  )
}
