'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import {
  ArrowLeft,
  MapPin,
  ShieldCheck,
  ImageIcon,
  Calendar,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Share2,
  Bookmark,
  Check,
  X,
  Layers,
  Info,
} from 'lucide-react'
import {
  useDiscoveredAllianceListing,
  useTrackAllianceListing,
  useUntrackAllianceListing,
} from '@/features/alliance/hooks/useAlliance'
import { useToast } from '@/components/common/Toast'
import { ShareReferralModal } from '@/features/alliance/components/ShareReferralModal'
import { getAllianceListingMediaList } from '@/features/alliance/utils/allianceImages'

export default function DiscoveredListingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const uuid = params?.uuid as string

  const { data: listing, isLoading, isError, error } = useDiscoveredAllianceListing(uuid)
  const trackMutation = useTrackAllianceListing()
  const untrackMutation = useUntrackAllianceListing()

  const [activeMediaIndex, setActiveMediaIndex] = useState(0)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (searchParams?.get('action') === 'refer') {
      setIsShareModalOpen(true)
    }
  }, [searchParams])

  const isTracked = Boolean(listing?.isTrackedByCurrentPm)
  const isPending = trackMutation.isPending || untrackMutation.isPending

  const handleToggleTrack = async () => {
    if (!uuid || isPending) return

    try {
      if (isTracked) {
        await untrackMutation.mutateAsync(uuid)
        toast.success('Listing removed from your tracked opportunities')
      } else {
        await trackMutation.mutateAsync(uuid)
        toast.success('Listing added to your tracked opportunities')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update tracking state')
    }
  }

  const formatPrice = (amount?: number, currency: string = 'NGN') => {
    if (amount === undefined || amount === null) return 'N/A'
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency === 'NGN' ? 'NGN' : currency,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPublishedDate = (dateStr?: string) => {
    if (!dateStr) return null
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return null
    }
  }

  const mediaList = listing ? getAllianceListingMediaList(listing) : []
  const hasMultipleMedia = mediaList.length > 1
  const activeMedia = mediaList[activeMediaIndex] || mediaList[0]

  const ownerName = listing?.pm?.companyName || listing?.pm?.name || 'Alliance Property Manager'
  const ownerTitle = listing?.pm?.allianceProfile?.pmTitle
  const ownerBio = listing?.pm?.allianceProfile?.bio
  const activeQualifications =
    listing?.pm?.qualifications
      ?.map((q) => q.qualification)
      ?.filter((q) => q.isActive) || []

  const locationText = [listing?.address, listing?.city, listing?.state, listing?.country]
    .filter(Boolean)
    .join(', ')

  if (isLoading) {
    return (
      <div className="alliance-marketplace-detail">
        <div style={{ height: '32px', width: '180px', background: 'var(--border)', borderRadius: '8px', marginBottom: '24px' }} />
        <div style={{ height: '440px', width: '100%', background: 'var(--border)', borderRadius: '16px', marginBottom: '36px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: '48px' }}>
          <div>
            <div style={{ height: '36px', width: '60%', background: 'var(--border)', borderRadius: '8px', marginBottom: '16px' }} />
            <div style={{ height: '24px', width: '40%', background: 'var(--border)', borderRadius: '6px', marginBottom: '28px' }} />
            <div style={{ height: '80px', width: '100%', background: 'var(--border)', borderRadius: '12px', marginBottom: '32px' }} />
          </div>
          <div style={{ height: '280px', background: 'var(--border)', borderRadius: '14px' }} />
        </div>
      </div>
    )
  }

  if (isError || !listing) {
    return (
      <div className="alliance-marketplace-detail" style={{ textAlign: 'center', paddingTop: '60px' }}>
        <div
          style={{
            background: '#ffffff',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            borderRadius: '16px',
            padding: '48px 24px',
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: '520px',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AlertTriangle size={28} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#171717' }}>
            Listing No Longer Available
          </h2>
          <p style={{ fontSize: '13.5px', color: '#6b6b6b', margin: 0, lineHeight: 1.5 }}>
            {(error as any)?.message ||
              'This Alliance listing is no longer discoverable. It may have been unpublished, marked private, or the owner’s network access may have changed.'}
          </p>
          <Link href="/alliance/discover" className="btn btn--primary" style={{ marginTop: '8px', height: '40px', padding: '0 20px' }}>
            Back to Network Discovery
          </Link>
        </div>
      </div>
    )
  }

  const secondaryPhotos = mediaList.slice(1, 5)

  return (
    <div className="alliance-marketplace-detail">
      {/* Navigation */}
      <div className="alliance-marketplace-nav">
        <button
          type="button"
          onClick={() => router.push('/alliance/discover')}
          className="alliance-marketplace-back-btn"
        >
          <ArrowLeft size={16} /> Back to Network Discovery
        </button>
      </div>

      {/* Full-Width Immersive Media Gallery */}
      <div
        className={`alliance-marketplace-gallery ${
          secondaryPhotos.length > 0 ? 'alliance-marketplace-gallery--split' : ''
        }`}
      >
        {/* Primary Image */}
        <div
          className="alliance-marketplace-gallery__primary"
          onClick={() => setIsLightboxOpen(true)}
        >
          {activeMedia?.publicUrl ? (
            <img src={activeMedia.publicUrl} alt={listing.title} />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: '#94a3b8',
                background: '#1e293b',
              }}
            >
              <ImageIcon size={48} />
              <span style={{ fontSize: '13px' }}>No media uploaded</span>
            </div>
          )}

          {/* Previous / Next Controls on Primary Image */}
          {hasMultipleMedia && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveMediaIndex((prev) =>
                    prev > 0 ? prev - 1 : mediaList.length - 1,
                  )
                }}
                className="alliance-gallery-nav-btn alliance-gallery-nav-btn--prev"
                title="Previous photo"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveMediaIndex((prev) =>
                    prev < mediaList.length - 1 ? prev + 1 : 0,
                  )
                }}
                className="alliance-gallery-nav-btn alliance-gallery-nav-btn--next"
                title="Next photo"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}

          {/* Photo Count Badge */}
          {mediaList.length > 0 && (
            <div
              className="alliance-gallery-count-badge"
              onClick={(e) => {
                e.stopPropagation()
                setIsLightboxOpen(true)
              }}
            >
              <ImageIcon size={14} />
              <span>
                {mediaList.length} {mediaList.length === 1 ? 'photo' : 'photos'}
              </span>
            </div>
          )}
        </div>

        {/* Supporting Secondary Grid (up to 4 images) */}
        {secondaryPhotos.length > 0 && (
          <div className="alliance-marketplace-gallery__grid">
            {secondaryPhotos.map((photo, index) => {
              const actualIndex = index + 1
              return (
                <div
                  key={photo.uuid || index}
                  className="alliance-marketplace-gallery__grid-item"
                  onClick={() => {
                    setActiveMediaIndex(actualIndex)
                    setIsLightboxOpen(true)
                  }}
                >
                  <img src={photo.publicUrl} alt={`${listing.title} ${actualIndex + 1}`} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 2-Column Marketplace Content Layout */}
      <div className="alliance-marketplace-layout">
        {/* Left Main Column: Property Identity & Information */}
        <div className="alliance-marketplace-main">
          {/* Tag row */}
          <div className="alliance-marketplace-tag-row">
            <span>{listing.intent === 'SALE' ? 'FOR SALE' : 'FOR RENT'}</span>
            <span className="tag-divider">·</span>
            <span className="tag-secondary">
              {listing.targetType === 'PROPERTY' ? 'PROPERTY LEVEL' : 'UNIT LEVEL'}
            </span>
          </div>

          {/* Title */}
          <h1 className="alliance-marketplace-title">{listing.title}</h1>

          {/* Location */}
          <div className="alliance-marketplace-location">
            <MapPin size={15} color="#8a8a8a" style={{ flexShrink: 0 }} />
            <span>{locationText || 'Location not specified'}</span>
          </div>

          {/* Price & Published date row */}
          <div className="alliance-marketplace-price-box">
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span className="alliance-marketplace-price">
                {formatPrice(listing.price, listing.currency)}
              </span>
              {listing.intent === 'RENT' && (
                <span className="alliance-marketplace-price-period">per year</span>
              )}
            </div>

            {listing.publishedAt && (
              <div className="alliance-marketplace-published">
                <Calendar size={13} />
                <span>Published {formatPublishedDate(listing.publishedAt)}</span>
              </div>
            )}
          </div>

          {/* Property Facts / Specs Row */}
          <div className="alliance-marketplace-facts">
            {listing.propertyType && (
              <div className="alliance-marketplace-fact-item">
                <span className="alliance-marketplace-fact-label">Property type</span>
                <span className="alliance-marketplace-fact-value">{listing.propertyType}</span>
              </div>
            )}

            {listing.bedrooms !== null && (
              <div className="alliance-marketplace-fact-item">
                <span className="alliance-marketplace-fact-label">Bedrooms</span>
                <span className="alliance-marketplace-fact-value">{listing.bedrooms} bedrooms</span>
              </div>
            )}

            {listing.bathrooms !== null && (
              <div className="alliance-marketplace-fact-item">
                <span className="alliance-marketplace-fact-label">Bathrooms</span>
                <span className="alliance-marketplace-fact-value">{listing.bathrooms} bathrooms</span>
              </div>
            )}

            <div className="alliance-marketplace-fact-item">
              <span className="alliance-marketplace-fact-label">Inventory level</span>
              <span className="alliance-marketplace-fact-value">
                {listing.targetType === 'PROPERTY' ? 'Property' : 'Unit'}
              </span>
            </div>
          </div>

          {/* About this listing */}
          {listing.description ? (
            <div>
              <h2 className="alliance-marketplace-section-heading">About this listing</h2>
              <p className="alliance-marketplace-description">{listing.description}</p>
            </div>
          ) : (
            <div>
              <h2 className="alliance-marketplace-section-heading">About this listing</h2>
              <p className="alliance-marketplace-description" style={{ color: '#8a8a8a', fontStyle: 'italic' }}>
                No additional description provided for this listing.
              </p>
            </div>
          )}
        </div>

        {/* Right Sticky Action & Context Rail */}
        <div className="alliance-marketplace-rail">
          {/* 1. Refer a client Action Card */}
          <div className="alliance-action-card">
            <div className="alliance-action-card__header">
              <Share2 size={18} color="var(--forest)" />
              <h2 className="alliance-action-card__title">Refer a client</h2>
            </div>

            <p className="alliance-action-card__text">
              Share this listing with a client and create a referral relationship for this opportunity.
            </p>

            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="alliance-action-card__cta"
            >
              <Share2 size={16} />
              <span>Share listing</span>
            </button>
          </div>

          {/* 2. Opportunity Tracking State Card */}
          <div className="alliance-tracking-card">
            {isTracked ? (
              <div>
                <div className="alliance-tracking-card__status">
                  <div className="alliance-tracking-card__badge">
                    <Check size={15} />
                    <span>Saved to opportunities</span>
                  </div>
                </div>
                <p className="alliance-tracking-card__desc">
                  This listing is in your tracked opportunities.
                </p>
                <button
                  type="button"
                  onClick={handleToggleTrack}
                  disabled={isPending}
                  className="alliance-tracking-card__remove-btn"
                >
                  {isPending ? 'Updating...' : 'Remove from tracked'}
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#171717', marginBottom: '2px' }}>
                  Save opportunity
                </div>
                <p className="alliance-tracking-card__desc">
                  Bookmark for quick access in your Alliance pipeline.
                </p>
                <button
                  type="button"
                  onClick={handleToggleTrack}
                  disabled={isPending}
                  className="btn btn--secondary"
                  style={{
                    width: '100%',
                    height: '38px',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Bookmark size={14} />
                  <span>{isPending ? 'Saving...' : 'Track listing'}</span>
                </button>
              </div>
            )}
          </div>

          {/* 3. Listing Owner Section */}
          <div className="alliance-owner-card">
            <div className="alliance-owner-card__label">Listing Owner</div>

            <div className="alliance-owner-card__profile">
              <div className="alliance-owner-card__avatar">
                {ownerName.substring(0, 2).toUpperCase()}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="alliance-owner-card__name">{ownerName}</div>
                {ownerTitle && (
                  <div className="alliance-owner-card__title">{ownerTitle}</div>
                )}
              </div>
            </div>

            {ownerBio && <p className="alliance-owner-card__bio">"{ownerBio}"</p>}

            {/* Verified Qualifications */}
            {activeQualifications.length > 0 && (
              <div className="alliance-owner-card__qual-section">
                <div className="alliance-owner-card__qual-label">Verified qualifications</div>
                {activeQualifications.map((qual) => (
                  <div key={qual.id} className="alliance-owner-card__qual-item">
                    <ShieldCheck size={14} color="var(--forest)" style={{ flexShrink: 0 }} />
                    <span style={{ fontWeight: 600 }}>{qual.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Canonical Inventory Context (Quiet Footnote) */}
          {listing.sourceType === 'LINKED_INVENTORY' && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '12px',
                background: '#ffffff',
                border: '1px solid rgba(0, 0, 0, 0.06)',
                fontSize: '12px',
                color: '#6b6b6b',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#171717' }}>
                <Layers size={13} color="#8a8a8a" />
                <span>Canonical Inventory</span>
              </div>
              {listing.targetProperty && (
                <div>Property: <strong>{listing.targetProperty.name}</strong></div>
              )}
              {listing.targetUnit && (
                <div>Unit: <strong>{listing.targetUnit.unitName}</strong></div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Share / Refer Client Modal */}
      <ShareReferralModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        listingUuid={listing.uuid}
        listingTitle={listing.title}
        listingPrice={listing.price}
        listingCurrency={listing.currency}
        listingLocation={locationText}
      />

      {/* Fullscreen Photo Lightbox Modal */}
      {isLightboxOpen &&
        mounted &&
        mediaList.length > 0 &&
        createPortal(
          <div
            className="alliance-lightbox-overlay"
            onClick={() => setIsLightboxOpen(false)}
          >
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="alliance-lightbox-close"
              title="Close gallery"
            >
              <X size={20} />
            </button>

            {hasMultipleMedia && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveMediaIndex((prev) =>
                      prev > 0 ? prev - 1 : mediaList.length - 1,
                    )
                  }}
                  className="alliance-gallery-nav-btn alliance-gallery-nav-btn--prev"
                  style={{ left: '24px', width: '44px', height: '44px' }}
                >
                  <ChevronLeft size={22} />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveMediaIndex((prev) =>
                      prev < mediaList.length - 1 ? prev + 1 : 0,
                    )
                  }}
                  className="alliance-gallery-nav-btn alliance-gallery-nav-btn--next"
                  style={{ right: '24px', width: '44px', height: '44px' }}
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}

            <img
              src={mediaList[activeMediaIndex]?.publicUrl}
              alt={`${listing.title} photo`}
              className="alliance-lightbox-img"
              onClick={(e) => e.stopPropagation()}
            />

            <div
              style={{
                position: 'absolute',
                bottom: '24px',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                background: 'rgba(0, 0, 0, 0.6)',
                padding: '6px 14px',
                borderRadius: '20px',
                backdropFilter: 'blur(4px)',
              }}
            >
              {activeMediaIndex + 1} / {mediaList.length}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
