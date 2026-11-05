'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ShieldCheck,
  Truck,
  Clock,
  CheckCircle2,
  Building2,
  Mail,
  Phone,
  Globe,
  Star,
  AlertCircle,
  Share2,
  Check,
} from 'lucide-react'
import { useGoalOfferingDetail, usePublicOfferings } from '../hooks/useGoals'
import {
  getGoalTitle,
  isVendorVerified,
  type GoalOffering,
} from '../types/goals.types'
import { formatOfferingPrice, getOfferingTypeIcon } from './OfferingCard'
import '../styles/goals.css'

interface OfferingDetailScreenProps {
  identifier: string
}

function getSafeExternalUrl(raw?: string | null): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`
    const parsed = new URL(withProtocol)
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString()
    }
    return null
  } catch {
    return null
  }
}

export const OfferingDetailScreen: React.FC<OfferingDetailScreenProps> = ({
  identifier,
}) => {
  const router = useRouter()
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({})
  const [copied, setCopied] = useState(false)

  const {
    data: detailOffering,
    isLoading: isDetailLoading,
    isError,
    refetch,
  } = useGoalOfferingDetail(identifier)

  const { data: cachedOfferings = [] } = usePublicOfferings()

  const fallbackOffering = React.useMemo(() => {
    return cachedOfferings.find(
      (o) =>
        o.uuid === identifier ||
        o.slug === identifier ||
        String(o.id) === identifier,
    )
  }, [cachedOfferings, identifier])

  const offering: GoalOffering | undefined = detailOffering || fallbackOffering
  const isLoading = isDetailLoading && !offering

  const handleBack = () => {
    router.push('/dashboard/lifestyle')
  }

  const handleShare = () => {
    if (typeof window !== 'undefined' && navigator?.clipboard) {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (isLoading) {
    return (
      <div className="offering-detail">
        <header className="offering-detail__header">
          <button
            type="button"
            className="offering-detail__back-btn"
            onClick={handleBack}
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
        </header>
        <div className="offering-detail__container">
          <div className="offering-detail__skeleton-media" />
          <div className="offering-detail__skeleton-block" />
          <div className="offering-detail__skeleton-block" />
        </div>
      </div>
    )
  }

  if ((isError && !offering) || !offering) {
    return (
      <div className="offering-detail">
        <header className="offering-detail__header">
          <button
            type="button"
            className="offering-detail__back-btn"
            onClick={handleBack}
          >
            <ArrowLeft size={18} />
            <span>Back to Lifestyle</span>
          </button>
        </header>
        <div className="offering-detail__container">
          <div className="lifestyle-discovery__error-card">
            <AlertCircle size={28} className="lifestyle-discovery__error-icon" />
            <h2 className="lifestyle-discovery__empty-title">
              Offering Unavailable
            </h2>
            <p className="lifestyle-discovery__empty-desc">
              This item could not be loaded or is no longer available.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="lifestyle-discovery__retry-btn"
                onClick={() => refetch()}
              >
                Try Again
              </button>
              <button
                type="button"
                className="lifestyle-discovery__empty-btn"
                onClick={handleBack}
              >
                Back to Catalog
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const TypeIcon = getOfferingTypeIcon(offering.type)
  const title = offering.title || offering.name || 'Untitled Offering'

  const images =
    offering.media && offering.media.length > 0
      ? offering.media.map((m) => m.mediaUrl)
      : offering.imageUrl
        ? [offering.imageUrl]
        : []

  const activeImage = images[selectedImageIndex] || null
  const showActiveImage =
    Boolean(activeImage) && !failedImages[selectedImageIndex]

  const packageItems = offering.packageItems || []
  const rawGoalLinks = offering.goalLinks || offering.goals || []
  const linkedGoals = rawGoalLinks
    .map((g) => getGoalTitle(g.goal))
    .filter(Boolean)

  const vendor = offering.vendor
  const vendorVerified = isVendorVerified(vendor)
  const vendorEmail = vendor?.email || vendor?.contactEmail || null
  const vendorPhone = vendor?.phone || vendor?.contactPhone || null
  const vendorWebsite = getSafeExternalUrl(vendor?.website)

  return (
    <div className="offering-detail">
      {/* Sticky Navigation Bar */}
      <header className="offering-detail__header">
        <div className="offering-detail__header-inner">
          <button
            type="button"
            className="offering-detail__back-btn"
            onClick={handleBack}
          >
            <ArrowLeft size={18} />
            <span>Lifestyle & Perks</span>
          </button>

          <button
            type="button"
            className="offering-detail__share-btn"
            onClick={handleShare}
          >
            {copied ? <Check size={15} /> : <Share2 size={15} />}
            <span>{copied ? 'Copied' : 'Share'}</span>
          </button>
        </div>
      </header>

      <main className="offering-detail__container">
        <div className="offering-detail__layout">
          {/* Left / Main Column */}
          <div className="offering-detail__main">
            {/* Media Gallery */}
            <div className="offering-detail__gallery">
              <div className="offering-detail__hero-media">
                {showActiveImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeImage!}
                    alt={title}
                    className="offering-detail__hero-img"
                    onError={() =>
                      setFailedImages((prev) => ({
                        ...prev,
                        [selectedImageIndex]: true,
                      }))
                    }
                  />
                ) : (
                  <div className="offering-detail__hero-placeholder">
                    <TypeIcon size={48} strokeWidth={1.5} />
                  </div>
                )}

                <span
                  className={`offering-card__type-badge offering-card__type-badge--${offering.type.toLowerCase()}`}
                >
                  <TypeIcon size={12} strokeWidth={2.3} />
                  <span>{offering.type}</span>
                </span>
              </div>

              {images.length > 1 && (
                <div className="offering-detail__thumbs">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`offering-detail__thumb ${
                        selectedImageIndex === idx
                          ? 'offering-detail__thumb--active'
                          : ''
                      }`}
                      onClick={() => setSelectedImageIndex(idx)}
                    >
                      {!failedImages[idx] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img}
                          alt={`${title} thumbnail ${idx + 1}`}
                          onError={() =>
                            setFailedImages((prev) => ({ ...prev, [idx]: true }))
                          }
                        />
                      ) : (
                        <TypeIcon size={16} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Title & Summary Card */}
            <section className="offering-detail__card">
              <div className="offering-detail__title-row">
                <h1 className="offering-detail__title">{title}</h1>
                {offering. subtitle && (
                  <p className="offering-detail__subtitle">{offering.subtitle}</p>
                )}
              </div>

              <div className="offering-detail__price-banner">
                <div>
                  <span className="offering-detail__price-label">Price</span>
                  <div className="offering-detail__price-value">
                    {formatOfferingPrice(offering)}
                  </div>
                </div>
                {offering.pricingModel && (
                  <span className="offering-detail__pricing-pill">
                    {offering.pricingModel.toLowerCase().replace('_', ' ')}
                  </span>
                )}
              </div>

              {offering.description && (
                <div className="offering-detail__description-block">
                  <h2 className="offering-detail__section-label">Overview</h2>
                  <p className="offering-detail__description">
                    {offering.description}
                  </p>
                </div>
              )}

              {linkedGoals.length > 0 && (
                <div className="offering-detail__goals-block">
                  <span className="offering-detail__section-label">
                    Relevant Goals
                  </span>
                  <div className="offering-detail__goal-chips">
                    {linkedGoals.map((goalName, idx) => (
                      <span key={idx} className="offering-detail__goal-chip">
                        {goalName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Package / Bundle Components */}
            {packageItems.length > 0 && (
              <section className="offering-detail__card">
                <h2 className="offering-detail__section-label">
                  Included in This {offering.type === 'BUNDLE' ? 'Bundle' : 'Package'} (
                  {packageItems.length})
                </h2>
                <div className="offering-detail__package-list">
                  {packageItems.map((pkgItem, idx) => {
                    const comp = pkgItem.component || pkgItem.itemOffering
                    const itemTitle =
                      comp?.title || comp?.name || `Component ${idx + 1}`
                    return (
                      <div
                        key={pkgItem.id || idx}
                        className="offering-detail__package-row"
                      >
                        <div className="offering-detail__package-left">
                          <CheckCircle2
                            size={16}
                            className="offering-detail__package-icon"
                          />
                          <div>
                            <div className="offering-detail__package-name">
                              {itemTitle}
                            </div>
                            {comp?.subtitle && (
                              <div className="offering-detail__package-sub">
                                {comp.subtitle}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="offering-detail__package-right">
                          <span className="offering-detail__package-qty">
                            ×{pkgItem.quantity}
                          </span>
                          {pkgItem.isOptional && (
                            <span className="offering-detail__package-opt">
                              Optional
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Fulfillment & Availability */}
            <section className="offering-detail__card">
              <h2 className="offering-detail__section-label">
                Fulfillment & Delivery
              </h2>
              <div className="offering-detail__perks-grid">
                <div className="offering-detail__perk-item">
                  <div className="offering-detail__perk-icon">
                    <Truck size={18} />
                  </div>
                  <div>
                    <div className="offering-detail__perk-title">
                      {offering.deliveryAvailable
                        ? 'Direct Home Delivery'
                        : 'Merchant Fulfillment'}
                    </div>
                    <div className="offering-detail__perk-desc">
                      {offering.deliveryAvailable
                        ? 'Delivered straight to your rental address'
                        : 'Scheduled directly with the provider'}
                    </div>
                  </div>
                </div>

                <div className="offering-detail__perk-item">
                  <div className="offering-detail__perk-icon">
                    <Clock size={18} />
                  </div>
                  <div>
                    <div className="offering-detail__perk-title">
                      {offering.leadTimeDays == null
                        ? 'Flexible Scheduling'
                        : offering.leadTimeDays === 0
                          ? 'Same-Day Turnaround'
                          : `${offering.leadTimeDays}-Day Lead Time`}
                    </div>
                    <div className="offering-detail__perk-desc">
                      Estimated fulfillment window
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right / Merchant & Action Column */}
          <aside className="offering-detail__aside">
            <section className="offering-detail__card offering-detail__vendor-card">
              <h2 className="offering-detail__section-label">
                Merchant & Provider
              </h2>

              {vendor ? (
                <>
                  <div className="offering-detail__vendor-header">
                    <div className="offering-detail__vendor-avatar">
                      <Building2 size={22} />
                    </div>
                    <div className="offering-detail__vendor-info">
                      <div className="offering-detail__vendor-name-row">
                        <span className="offering-detail__vendor-name">
                          {vendor.name}
                        </span>
                        {vendorVerified && (
                          <ShieldCheck
                            size={15}
                            className="offering-detail__vendor-verified"
                            aria-label="Verified Merchant"
                          />
                        )}
                      </div>
                      <div className="offering-detail__vendor-meta">
                        {vendorVerified && <span>Verified Upward Partner</span>}
                        {vendor.rating != null && (
                          <span className="offering-detail__vendor-rating">
                            <Star size={12} fill="currentColor" />
                            {vendor.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="offering-detail__vendor-contacts">
                    {vendorPhone && (
                      <a
                        href={`tel:${vendorPhone}`}
                        className="offering-detail__contact-row"
                      >
                        <Phone size={15} />
                        <span>{vendorPhone}</span>
                      </a>
                    )}
                    {vendorEmail && (
                      <a
                        href={`mailto:${vendorEmail}?subject=${encodeURIComponent(`Inquiry: ${title}`)}`}
                        className="offering-detail__contact-row"
                      >
                        <Mail size={15} />
                        <span>{vendorEmail}</span>
                      </a>
                    )}
                    {vendorWebsite && (
                      <a
                        href={vendorWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="offering-detail__contact-row"
                      >
                        <Globe size={15} />
                        <span>Visit Merchant Website</span>
                      </a>
                    )}
                  </div>

                  <div className="offering-detail__cta-stack">
                    {vendorPhone ? (
                      <a
                        href={`tel:${vendorPhone}`}
                        className="offering-detail__primary-cta"
                      >
                        <Phone size={16} />
                        <span>Call Merchant</span>
                      </a>
                    ) : vendorEmail ? (
                      <a
                        href={`mailto:${vendorEmail}?subject=${encodeURIComponent(`Upward Tenant Inquiry: ${title}`)}`}
                        className="offering-detail__primary-cta"
                      >
                        <Mail size={16} />
                        <span>Email Merchant</span>
                      </a>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="offering-detail__perk-desc">
                  Fulfilled by an Upward-verified partner merchant.
                </p>
              )}
            </section>
          </aside>
        </div>
      </main>
    </div>
  )
}
