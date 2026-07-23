'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Building2,
  Car,
  Check,
  Droplets,
  Lock,
  MapPin,
  ShowerHead,
  Zap,
} from 'lucide-react'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import {
  createExclusiveHomeApplication,
  saveExclusiveHomeApplication,
} from '@/features/dashboard/utils/exclusiveHomeApplications'
import { getExclusiveHomeById } from '@/features/dashboard/utils/exclusiveHomes'
import { formatCurrency } from '@/lib/utils'

const AMENITY_ICONS: Record<string, typeof Zap> = {
  Ensuite: ShowerHead,
  '24/7 Power': Zap,
  Parking: Car,
  Gated: Lock,
  Water: Droplets,
}

type RequestType = 'viewing' | 'apply'

export function ExclusiveHomeDetailScreen({ homeId }: { homeId: string }) {
  const router = useRouter()
  const home = useMemo(() => getExclusiveHomeById(homeId), [homeId])

  if (!home) {
    return (
      <PayPageShell
        title="Listing"
        showBack
        onBack={() => router.push('/dashboard/exclusive-homes')}
      >
        <div className="exclusive-homes__empty">
          <h3 className="exclusive-homes__empty-title">Home not found</h3>
          <p className="exclusive-homes__empty-text">This listing may have been removed.</p>
          <button
            type="button"
            className="exclusive-homes__secondary-btn"
            onClick={() => router.push('/dashboard/exclusive-homes')}
          >
            Back to listings
          </button>
        </div>
      </PayPageShell>
    )
  }

  const startApplication = (type: RequestType) => {
    const application = createExclusiveHomeApplication(homeId, type)
    saveExclusiveHomeApplication(application)

    if (type === 'apply') {
      router.push(`/dashboard/exclusive-homes/applications/${application.id}/schedule`)
      return
    }

    router.push(
      `/dashboard/exclusive-homes/applications/submitted?applicationId=${application.id}&listing=${homeId}&type=${type}`,
    )
  }

  return (
    <PayPageShell
      title="Listing"
      showBack
      onBack={() => router.push('/dashboard/exclusive-homes')}
      footer={
        <div className="exclusive-homes__detail-actions">
          <button
            type="button"
            className="exclusive-homes__primary-btn"
            onClick={() => startApplication('apply')}
          >
            Apply with Upward profile
            <ArrowRight size={17} aria-hidden />
          </button>
          <button
            type="button"
            className="exclusive-homes__secondary-btn exclusive-homes__secondary-btn--full"
            onClick={() => startApplication('viewing')}
          >
            Request a viewing
          </button>
        </div>
      }
    >
      <article className="exclusive-homes__detail">
        <div className="exclusive-homes__detail-media">
          <span className="exclusive-homes__card-badge">✦ UPWARD EXCLUSIVE</span>
          <span className="exclusive-homes__card-photo-label">apartment photo</span>
        </div>

        <div className="exclusive-homes__detail-price">
          <strong>{formatCurrency(home.annualRent)}</strong>
          <span>/ year</span>
        </div>

        <h2 className="exclusive-homes__detail-title">{home.name}</h2>
        <p className="exclusive-homes__detail-area">
          <MapPin size={14} aria-hidden />
          <span>{home.area}</span>
        </p>

        <div className="exclusive-homes__detail-stats">
          <div className="exclusive-homes__detail-stat">
            <div className="exclusive-homes__detail-stat-value">{home.beds}</div>
            <div className="exclusive-homes__detail-stat-label">Beds</div>
          </div>
          <div className="exclusive-homes__detail-stat">
            <div className="exclusive-homes__detail-stat-value">{home.baths}</div>
            <div className="exclusive-homes__detail-stat-label">Baths</div>
          </div>
          <div className="exclusive-homes__detail-stat">
            <div className="exclusive-homes__detail-stat-value">{home.sqm}</div>
            <div className="exclusive-homes__detail-stat-label">m²</div>
          </div>
        </div>

        <h3 className="exclusive-homes__detail-heading">Why it&apos;s on Upward</h3>
        <div className="exclusive-homes__benefits-card">
          {home.benefits.map((benefit, index) => (
            <div
              key={benefit}
              className={`exclusive-homes__benefit-row${
                index < home.benefits.length - 1 ? ' exclusive-homes__benefit-row--bordered' : ''
              }`}
            >
              <span className="exclusive-homes__benefit-icon" aria-hidden>
                <Check size={12} strokeWidth={3} />
              </span>
              <span>{benefit}</span>
            </div>
          ))}
        </div>

        <h3 className="exclusive-homes__detail-heading">Amenities</h3>
        <div className="exclusive-homes__amenities">
          {home.amenities.map((amenity) => {
            const Icon = AMENITY_ICONS[amenity] ?? Building2
            return (
              <span key={amenity} className="exclusive-homes__amenity">
                <Icon size={14} aria-hidden />
                {amenity}
              </span>
            )
          })}
        </div>
      </article>
    </PayPageShell>
  )
}
