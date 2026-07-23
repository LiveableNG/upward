'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight, Check, Share2 } from 'lucide-react'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import {
  APPLICATION_KYC_COPY,
  MOCK_RENT_PASSPORT,
} from '@/features/dashboard/constants/exclusiveHomeApplicationKyc'
import { getExclusiveHomeById } from '@/features/dashboard/utils/exclusiveHomes'
import { getExclusiveHomeApplicationById } from '@/features/dashboard/utils/exclusiveHomeApplications'

export function ApplicationRentPassportScreen({ applicationId }: { applicationId: string }) {
  const router = useRouter()
  const application = getExclusiveHomeApplicationById(applicationId)
  const home = application ? getExclusiveHomeById(application.listingId) : undefined
  const passport = MOCK_RENT_PASSPORT

  if (!application || !home) {
    return (
      <PayPageShell
        title={APPLICATION_KYC_COPY.profileTitle}
        showBack
        onBack={() => router.push('/dashboard/exclusive-homes/applications')}
      >
        <div className="exclusive-homes__empty">
          <h3 className="exclusive-homes__empty-title">Application not found</h3>
        </div>
      </PayPageShell>
    )
  }

  const backHref = `/dashboard/exclusive-homes/applications/${applicationId}`
  const submittedHref = `/dashboard/exclusive-homes/applications/submitted?applicationId=${applicationId}&listing=${home.id}&type=${application.type}`

  return (
    <PayPageShell
      title={APPLICATION_KYC_COPY.profileTitle}
      subtitle={APPLICATION_KYC_COPY.profileSubtitle}
      showBack
      onBack={() => router.push(backHref)}
      footer={
        <div className="exclusive-homes__detail-actions">
          {application.type === 'apply' ? (
            <button
              type="button"
              className="exclusive-homes__primary-btn"
              onClick={() => router.push(submittedHref)}
            >
              Submit application
              <ArrowRight size={17} aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            className="exclusive-homes__secondary-btn exclusive-homes__secondary-btn--full"
            onClick={() => router.push(backHref)}
          >
            Back to application
          </button>
        </div>
      }
    >
      <div className="rent-passport">
        <div className="rent-passport__card">
          <div className="rent-passport__card-top">
            <div>
              <p className="rent-passport__eyebrow">Rent Passport</p>
              <span className="rent-passport__verified">
                <Check size={12} strokeWidth={3} aria-hidden />
                Verified
              </span>
            </div>
            <span className="rent-passport__band">{passport.band}</span>
          </div>

          <h2 className="rent-passport__name">{passport.name}</h2>
          <p className="rent-passport__address">{passport.address}</p>

          <div className="rent-passport__score-row">
            <div className="rent-passport__score">
              <strong>{passport.score}</strong>
              <span>/ {passport.maxScore} Upward Score</span>
            </div>
          </div>

          <div className="rent-passport__stats">
            <div>
              <strong>{passport.onTimeRate}</strong>
              <span>On-time rate</span>
            </div>
            <div>
              <strong>{passport.memberSince}</strong>
              <span>Member since</span>
            </div>
          </div>
        </div>

        <p className="rent-passport__intro">{APPLICATION_KYC_COPY.profileIntro}</p>

        <div className="rent-passport__metrics">
          <div className="rent-passport__metric">
            <strong>{passport.totalPaid}</strong>
            <span>Total paid</span>
          </div>
          <div className="rent-passport__metric">
            <strong>{passport.onTimeCycles}</strong>
            <span>On time</span>
          </div>
          <div className="rent-passport__metric rent-passport__metric--verified">
            <strong>Verified</strong>
            <span>Identity</span>
          </div>
        </div>

        <section className="rent-passport__section">
          <h3 className="rent-passport__section-title">
            {APPLICATION_KYC_COPY.profileLandlordHeading}
          </h3>
          <div className="exclusive-homes__benefits-card">
            {passport.landlordSees.map((item, index) => (
              <div
                key={item}
                className={`exclusive-homes__benefit-row${
                  index < passport.landlordSees.length - 1 ? ' exclusive-homes__benefit-row--bordered' : ''
                }`}
              >
                <span className="exclusive-homes__benefit-icon" aria-hidden>
                  <Check size={12} strokeWidth={3} />
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="rent-passport__actions">
          <button type="button" className="exclusive-homes__primary-btn" disabled>
            <Share2 size={16} aria-hidden />
            Share profile page
          </button>
          <button type="button" className="exclusive-homes__secondary-btn exclusive-homes__secondary-btn--full" disabled>
            Download PDF report
          </button>
          <p className="rent-passport__mock-note">Sharing is disabled on this prototype preview.</p>
        </div>

        {home ? (
          <div className="rent-passport__listing-context">
            <p className="rent-passport__listing-label">Applying for</p>
            <p className="rent-passport__listing-name">{home.name}</p>
            <p className="rent-passport__listing-area">{home.area}</p>
          </div>
        ) : null}
      </div>
    </PayPageShell>
  )
}
