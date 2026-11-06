'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Send,
  MapPin,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { useGoalOfferingDetail, usePublicOfferings } from '../hooks/useGoals'
import { useCreateCommerceInquiry } from '../hooks/useCommerceOrders'
import {
  getGoalTitle,
  isVendorVerified,
  type GoalOffering,
} from '../types/goals.types'
import {
  OfferingCard,
  formatOfferingPrice,
  formatCurrencyValue,
  getOfferingTypeIcon,
} from './OfferingCard'
import {
  getStoredDeliveryLocation,
  isOfferingDeliverableToLocation,
  formatShortLocation,
  type UserDeliveryLocation,
} from '../utils/deliveryLocation'
import { DeliveryLocationBar } from './DeliveryLocationBar'
import { CommerceCheckoutModal } from './CommerceCheckoutModal'
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
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({})
  const [copied, setCopied] = useState(false)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [deliveryLocation, setDeliveryLocation] = useState<UserDeliveryLocation>(() =>
    getStoredDeliveryLocation(user?.properties?.[0]?.address),
  )
  const [isInquiryOpen, setIsInquiryOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [inquiryCategory, setInquiryCategory] = useState('GENERAL')
  const [inquiryMessage, setInquiryMessage] = useState('')
  const [inquirySent, setInquirySent] = useState(false)
  const createInquiryMutation = useCreateCommerceInquiry()

  useEffect(() => {
    if (user?.properties?.[0]?.address) {
      setDeliveryLocation(getStoredDeliveryLocation(user.properties[0].address))
    }
  }, [user])

  useEffect(() => {
    setMounted(true)
  }, [])

  const {
    data: detailOffering,
    isLoading: isDetailLoading,
    isError,
    refetch,
  } = useGoalOfferingDetail(identifier)

  const { data: cachedOfferings = [], isLoading: isOfferingsLoading } =
    usePublicOfferings()

  const carouselRef = React.useRef<HTMLDivElement>(null)

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

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

  const deliveryCheck = React.useMemo(() => {
    if (!offering) return { isDeliverable: true }
    return isOfferingDeliverableToLocation(offering, deliveryLocation)
  }, [offering, deliveryLocation])

  const images = React.useMemo(() => {
    if (!offering) return []
    if (offering.media && offering.media.length > 0) {
      return offering.media.map((m) => m.mediaUrl)
    }
    if (offering.imageUrl) {
      return [offering.imageUrl]
    }
    return []
  }, [offering])

  // Similar & Recommended Products / Packages
  const similarItems = React.useMemo(() => {
    if (!offering || !cachedOfferings || cachedOfferings.length === 0) return []

    // Filter out current item
    const candidates = cachedOfferings.filter((item) => {
      if (offering.id && item.id === offering.id) return false
      if (offering.uuid && item.uuid === offering.uuid) return false
      if (offering.slug && item.slug === offering.slug) return false
      return true
    })

    // Score by relevance (same type, shared goals, or featured)
    const scored = candidates.map((item) => {
      let score = 0
      if (item.type === offering.type) score += 3
      const sharesGoal =
        item.goalLinks?.some((gl) =>
          offering.goalLinks?.some((og) => og.goalId === gl.goalId),
        ) ||
        item.goals?.some((g) =>
          offering.goals?.some((og) => og.goalId === g.goalId),
        )
      if (sharesGoal) score += 4
      if (item.vendor?.id && offering.vendor?.id && item.vendor.id === offering.vendor.id) {
        score += 1
      }
      if (item.isFeatured) score += 1
      return { item, score }
    })

    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, 6).map((s) => s.item)
  }, [offering, cachedOfferings])

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

  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inquiryMessage.trim() || createInquiryMutation.isPending) return
    try {
      const targetUuid = offering?.uuid || String(offering?.id || identifier)
      await createInquiryMutation.mutateAsync({
        offeringUuid: targetUuid,
        category: inquiryCategory,
        message: inquiryMessage.trim(),
      })
      setInquirySent(true)
    } catch (err) {
      console.error('Failed to submit commerce inquiry:', err)
    }
  }

  useEffect(() => {
    if (isLightboxOpen) {
      const original = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsLightboxOpen(false)
        if (e.key === 'ArrowRight' && images.length > 1) {
          setSelectedImageIndex((prev) =>
            prev < images.length - 1 ? prev + 1 : 0,
          )
        }
        if (e.key === 'ArrowLeft' && images.length > 1) {
          setSelectedImageIndex((prev) =>
            prev > 0 ? prev - 1 : images.length - 1,
          )
        }
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => {
        document.body.style.overflow = original
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [isLightboxOpen, images.length])

  useEffect(() => {
    if (isInquiryOpen) {
      const original = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsInquiryOpen(false)
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => {
        document.body.style.overflow = original
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [isInquiryOpen])

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
              Item Unavailable
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
                Back to Explore
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const TypeIcon = getOfferingTypeIcon(offering.type)
  const title = offering.title || offering.name || 'Untitled Item'

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

  const compareAtPrice =
    offering.compareAtPrice ??
    (offering.pricingModel === 'FIXED' ? offering.maxPrice : null)
  const hasDiscount =
    compareAtPrice != null &&
    offering.price != null &&
    compareAtPrice > offering.price
  const discountPercent = hasDiscount
    ? Math.round(((compareAtPrice! - offering.price!) / compareAtPrice!) * 100)
    : 0
  const savingsAmount = hasDiscount
    ? compareAtPrice! - offering.price!
    : 0

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
              <div
                className={`offering-detail__hero-media ${showActiveImage ? 'offering-detail__hero-media--clickable' : ''}`}
                onClick={() => {
                  if (showActiveImage) setIsLightboxOpen(true)
                }}
                tabIndex={showActiveImage ? 0 : undefined}
                role={showActiveImage ? 'button' : undefined}
                aria-label={showActiveImage ? 'Click to enlarge and pan image' : undefined}
                onKeyDown={(e) => {
                  if (showActiveImage && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    setIsLightboxOpen(true)
                  }
                }}
              >
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

                {showActiveImage && (
                  <button
                    type="button"
                    className="offering-detail__expand-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsLightboxOpen(true)
                    }}
                    aria-label="View full photo"
                  >
                    <Maximize2 size={13} />
                    <span>View full</span>
                  </button>
                )}
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
                {offering.subtitle && (
                  <p className="offering-detail__subtitle">{offering.subtitle}</p>
                )}
              </div>

              <div className="offering-detail__price-banner">
                <div className="offering-detail__price-col">
                  <span className="offering-detail__price-label">Price</span>
                  <div className="offering-detail__price-row">
                    <span className="offering-detail__price-value">
                      {formatOfferingPrice(offering)}
                    </span>
                    {hasDiscount && (
                      <span className="offering-detail__compare-price">
                        {formatCurrencyValue(compareAtPrice, offering.currency)}
                      </span>
                    )}
                    {hasDiscount && (
                      <span className="offering-detail__discount-badge">
                        {discountPercent}% OFF
                      </span>
                    )}
                  </div>
                  {hasDiscount && (
                    <span className="offering-detail__savings-text">
                      You save {formatCurrencyValue(savingsAmount, offering.currency)}
                    </span>
                  )}
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

            {/* Delivery & Fulfillment */}
            <section className="offering-detail__card">
              <div className="offering-detail__section-header-row">
                <h2 className="offering-detail__section-label">
                  Delivery & Fulfillment
                </h2>
                {deliveryCheck.isDeliverable ? (
                  <span className="offering-detail__delivery-badge">
                    <CheckCircle2 size={12} />
                    <span>Eligible for {formatShortLocation(deliveryLocation)}</span>
                  </span>
                ) : (
                  <span className="offering-detail__delivery-badge offering-detail__delivery-badge--warn">
                    <AlertCircle size={12} />
                    <span>Coverage Notice</span>
                  </span>
                )}
              </div>

              <div className="offering-detail__fulfillment-box">
                {/* Method */}
                <div className="offering-detail__fulfillment-row">
                  <div className="offering-detail__fulfillment-icon">
                    <Truck size={17} />
                  </div>
                  <div className="offering-detail__fulfillment-content">
                    <div className="offering-detail__fulfillment-title">
                      <span>
                        {offering.deliveryAvailable
                          ? 'Direct Home Delivery'
                          : 'Merchant Fulfillment'}
                      </span>
                    </div>
                    <div className="offering-detail__fulfillment-sub">
                      {offering.deliveryAvailable
                        ? 'Delivered straight to your rental address'
                        : 'Scheduled directly with verified provider'}
                    </div>
                  </div>
                </div>

                {/* Turnaround Window */}
                <div className="offering-detail__fulfillment-row">
                  <div className="offering-detail__fulfillment-icon">
                    <Clock size={17} />
                  </div>
                  <div className="offering-detail__fulfillment-content">
                    <div className="offering-detail__fulfillment-title">
                      <span>
                        {offering.leadTimeDays == null
                          ? 'Flexible Scheduling'
                          : offering.leadTimeDays === 0
                            ? 'Same-Day Turnaround'
                            : `${offering.leadTimeDays}-Day Delivery Turnaround`}
                      </span>
                    </div>
                    <div className="offering-detail__fulfillment-sub">
                      Estimated fulfillment window upon order confirmation
                    </div>
                  </div>
                </div>

                {/* Destination Context with Integrated Location Bar */}
                <div className="offering-detail__fulfillment-row">
                  <div className="offering-detail__fulfillment-icon">
                    <MapPin size={17} />
                  </div>
                  <div className="offering-detail__fulfillment-content">
                    <div className="offering-detail__fulfillment-title">
                      <span>Destination</span>
                      <DeliveryLocationBar
                        location={deliveryLocation}
                        onLocationChange={(loc) => setDeliveryLocation(loc)}
                      />
                    </div>
                    <div className="offering-detail__fulfillment-sub">
                      {deliveryCheck.isDeliverable
                        ? 'Eligible for direct dispatch to your address'
                        : 'Delivery currently unavailable to this area'}
                    </div>
                  </div>
                </div>
              </div>

              {!deliveryCheck.isDeliverable && (
                <div className="offering-detail__delivery-warning" style={{ marginTop: 12 }}>
                  <AlertCircle size={16} />
                  <div>
                    <span className="offering-detail__delivery-warning-title">
                      Delivery unavailable to {formatShortLocation(deliveryLocation)}
                    </span>
                    <p className="offering-detail__delivery-warning-desc">
                      {deliveryCheck.reason ||
                        'This item can only be delivered to specific coverage areas.'}
                    </p>
                  </div>
                </div>
              )}
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

                  <div className="offering-detail__cta-stack">
                    {deliveryCheck.isDeliverable ? (
                      <button
                        type="button"
                        className="offering-detail__primary-cta"
                        onClick={() => setIsCheckoutOpen(true)}
                      >
                        <span>
                          {offering.type === 'SERVICE'
                            ? 'Book Service'
                            : 'Order Now'}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="offering-detail__primary-cta offering-detail__primary-cta--disabled"
                        disabled
                      >
                        <span>Delivery Unavailable in Your Area</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="offering-detail__secondary-cta"
                      onClick={() => {
                        setIsInquiryOpen(true)
                        setInquirySent(false)
                      }}
                    >
                      <MessageSquare size={16} />
                      <span>Ask Upward Support</span>
                    </button>
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

        {/* Similar / Recommended Packages & Products — Horizontal Carousel */}
        {(similarItems.length > 0 || isOfferingsLoading) && (
          <section className="offering-detail__similar-section">
            <div className="offering-detail__similar-header-row">
              <div>
                <h2 className="offering-detail__similar-title">
                  Similar Products & Packages
                </h2>
                <p className="offering-detail__similar-desc">
                  Curated alternatives and bundles tailored for your living space
                </p>
              </div>

              {similarItems.length > 1 && (
                <div className="offering-detail__carousel-nav">
                  <button
                    type="button"
                    className="offering-detail__carousel-arrow"
                    onClick={() => scrollCarousel('left')}
                    aria-label="Previous items"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    className="offering-detail__carousel-arrow"
                    onClick={() => scrollCarousel('right')}
                    aria-label="Next items"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="offering-detail__carousel-track" ref={carouselRef}>
              {isOfferingsLoading && similarItems.length === 0 ? (
                [1, 2, 3].map((n) => (
                  <div key={n} className="offering-detail__carousel-item">
                    <div className="offering-card offering-card--skeleton">
                      <div className="offering-card__media-skeleton" />
                      <div className="offering-card__body-skeleton" />
                    </div>
                  </div>
                ))
              ) : (
                similarItems.map((item) => (
                  <div key={item.id} className="offering-detail__carousel-item">
                    <OfferingCard
                      item={{ offering: item, isGoalMatch: true }}
                      userLocation={deliveryLocation}
                      onClick={(clicked) => {
                        const nextId =
                          clicked.uuid || clicked.slug || String(clicked.id)
                        router.push(`/dashboard/lifestyle/${nextId}`)
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                    />
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </main>

      {/* Fullscreen Fluid Image Lightbox */}
      {mounted &&
        isLightboxOpen &&
        showActiveImage &&
        createPortal(
          <div
            className="offering-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="Full-size image view"
            onClick={() => setIsLightboxOpen(false)}
          >
            <div className="offering-lightbox__backdrop" />

            <header
              className="offering-lightbox__header"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="offering-lightbox__info">
                <span className="offering-lightbox__title">{title}</span>
                {images.length > 1 && (
                  <span className="offering-lightbox__counter">
                    {selectedImageIndex + 1} of {images.length}
                  </span>
                )}
              </div>

              <button
                type="button"
                className="offering-lightbox__close-btn"
                onClick={() => setIsLightboxOpen(false)}
                aria-label="Close photo view"
              >
                <X size={20} />
              </button>
            </header>

            <div
              className="offering-lightbox__body"
              onClick={() => setIsLightboxOpen(false)}
            >
              {images.length > 1 && (
                <button
                  type="button"
                  className="offering-lightbox__arrow offering-lightbox__arrow--prev"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedImageIndex((prev) =>
                      prev > 0 ? prev - 1 : images.length - 1,
                    )
                  }}
                  aria-label="Previous image"
                >
                  <ChevronLeft size={24} />
                </button>
              )}

              <div
                className="offering-lightbox__content"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="offering-lightbox__scrollable">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeImage!}
                    alt={title}
                    className="offering-lightbox__full-img"
                  />
                </div>
                <div className="offering-lightbox__hint">
                  <span>Pan or scroll to view whole photo</span>
                  <span className="offering-lightbox__hint-dot">•</span>
                  <span>Tap outside to close</span>
                </div>
              </div>

              {images.length > 1 && (
                <button
                  type="button"
                  className="offering-lightbox__arrow offering-lightbox__arrow--next"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedImageIndex((prev) =>
                      prev < images.length - 1 ? prev + 1 : 0,
                    )
                  }}
                  aria-label="Next image"
                >
                  <ChevronRight size={24} />
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}

      {/* Upward Support & Concierge Inquiry Modal */}
      {mounted &&
        isInquiryOpen &&
        createPortal(
          <div
            className="inquiry-sheet__backdrop"
            onClick={() => setIsInquiryOpen(false)}
            role="presentation"
          >
            <div
              className="inquiry-sheet__panel"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Contact Upward Support"
            >
              <div className="inquiry-sheet__handle" aria-hidden="true" />

              <div className="inquiry-sheet__header">
                <div>
                  <h3 className="inquiry-sheet__title">Ask Upward Support</h3>
                  <p className="inquiry-sheet__subtitle">
                    Inquiry regarding {title}
                  </p>
                </div>
                <button
                  type="button"
                  className="inquiry-sheet__close"
                  onClick={() => setIsInquiryOpen(false)}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="inquiry-sheet__body">
                {inquirySent ? (
                  <div className="inquiry-sheet__success">
                    <div className="inquiry-sheet__success-icon">
                      <Check size={24} strokeWidth={2.5} />
                    </div>
                    <h4 className="inquiry-sheet__success-title">
                      Inquiry Received
                    </h4>
                    <p className="inquiry-sheet__success-desc">
                      We’ve logged your request with the Upward Concierge desk and sent
                      a confirmation email. We will update you via email and app notification.
                    </p>
                    <button
                      type="button"
                      className="inquiry-form__btn inquiry-form__btn--submit"
                      style={{ width: '100%' }}
                      onClick={() => setIsInquiryOpen(false)}
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={handleSubmitInquiry}
                    className="inquiry-form"
                  >
                    {createInquiryMutation.isError && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-md)',
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          color: '#dc2626',
                          fontSize: '12.5px',
                        }}
                      >
                        <AlertCircle size={15} style={{ flexShrink: 0 }} />
                        <span>
                          {createInquiryMutation.error?.message ||
                            'Failed to submit inquiry. Please try again.'}
                        </span>
                      </div>
                    )}

                    <div className="inquiry-form__field">
                      <label className="inquiry-form__label">Inquiry Topic</label>
                      <select
                        value={inquiryCategory}
                        onChange={(e) => setInquiryCategory(e.target.value)}
                        className="inquiry-form__select"
                      >
                        <option value="GENERAL">General Product / Service Question</option>
                        <option value="DELIVERY">Delivery Area & Scheduling Inquiry</option>
                        <option value="CUSTOMIZATION">Customization / Special Request</option>
                        <option value="PRICING">Pricing & Corporate Volume Quote</option>
                      </select>
                    </div>

                    <div className="inquiry-form__field">
                      <label className="inquiry-form__label">Your Message</label>
                      <textarea
                        placeholder="Ask any question about this item, specifications, or delivery..."
                        value={inquiryMessage}
                        onChange={(e) => setInquiryMessage(e.target.value)}
                        className="inquiry-form__textarea"
                        rows={4}
                        required
                        autoFocus
                      />
                    </div>

                    <div className="inquiry-form__notice">
                      <ShieldCheck size={16} className="inquiry-form__notice-icon" />
                      <span>
                        Upward coordinates directly with the merchant partner and replies to your registered account email.
                      </span>
                    </div>

                    <div className="inquiry-form__actions">
                      <button
                        type="button"
                        className="inquiry-form__btn inquiry-form__btn--cancel"
                        onClick={() => setIsInquiryOpen(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="inquiry-form__btn inquiry-form__btn--submit"
                        disabled={
                          !inquiryMessage.trim() || createInquiryMutation.isPending
                        }
                      >
                        {createInquiryMutation.isPending ? (
                          <span>Sending...</span>
                        ) : (
                          <>
                            <Send size={14} />
                            <span>Send Inquiry</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Commerce Checkout & Paystack Modal */}
      {offering && (
        <CommerceCheckoutModal
          offering={offering}
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
        />
      )}
    </div>
  )
}
