'use client'

import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  Home,
  Globe,
  Link2,
  Edit,
  Send,
  EyeOff,
  Archive,
  AlertCircle,
  Award,
  Calendar,
  Bookmark,
  MapPin,
  CheckCircle2,
  Image as ImageIcon,
  Info,
  Share2,
} from 'lucide-react'
import {
  useAllianceListing,
  useAllianceProfile,
  usePublishAllianceListing,
  useUnpublishAllianceListing,
  useArchiveAllianceListing,
} from '@/features/alliance/hooks/useAlliance'
import { ListingReviewModal } from '@/features/alliance/components/ListingReviewModal'
import { ShareReferralModal } from '@/features/alliance/components/ShareReferralModal'
import { ConfirmationModal } from '@/components/common/ConfirmationModal'
import { ListingMediaManager } from '@/features/alliance/components/ListingMediaManager'
import { useToast } from '@/components/common/Toast'

export default function AllianceListingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const uuid = params?.uuid as string

  const { data: listing, isLoading: loadingListing, error: listingError } = useAllianceListing(uuid)
  const { data: profile } = useAllianceProfile()

  const publishMutation = usePublishAllianceListing()
  const unpublishMutation = useUnpublishAllianceListing()
  const archiveMutation = useArchiveAllianceListing()

  const [showShareModal, setShowShareModal] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showUnpublishModal, setShowUnpublishModal] = useState(false)
  const [showArchiveModal, setShowArchiveModal] = useState(false)

  const isPending =
    publishMutation.isPending || unpublishMutation.isPending || archiveMutation.isPending

  const formatPrice = (amount: number, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency === 'NGN' ? 'NGN' : currency,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const handleConfirmPublish = async () => {
    if (!uuid) return
    try {
      await publishMutation.mutateAsync(uuid)
      toast.success('Listing published successfully to the Alliance network!')
      setShowReviewModal(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish listing')
    }
  }

  const handleConfirmUnpublish = async () => {
    if (!uuid) return
    try {
      await unpublishMutation.mutateAsync(uuid)
      toast.success('Listing unpublished')
      setShowUnpublishModal(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to unpublish listing')
    }
  }

  const handleConfirmArchive = async () => {
    if (!uuid) return
    try {
      await archiveMutation.mutateAsync(uuid)
      toast.success('Listing archived')
      setShowArchiveModal(false)
      router.push('/alliance/listings')
    } catch (err: any) {
      toast.error(err.message || 'Failed to archive listing')
    }
  }

  if (loadingListing) {
    return (
      <div className="alliance-page-shell" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div className="loader" style={{ margin: '0 auto 16px auto' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading listing details...</p>
      </div>
    )
  }

  if (listingError || !listing) {
    return (
      <div className="alliance-page-shell">
        <div className="alliance-gate-card">
          <div className="alliance-gate-card__icon-wrap" style={{ background: 'var(--error-bg)', color: 'var(--error)' }}>
            <AlertCircle size={28} />
          </div>
          <h2 className="alliance-gate-card__title">Listing Not Found</h2>
          <p className="alliance-gate-card__desc">
            The requested Alliance listing could not be found or has been removed.
          </p>
          <Link href="/alliance/listings" className="alliance-btn alliance-btn--secondary" style={{ marginTop: '12px' }}>
            <ArrowLeft size={16} /> Return to Listings
          </Link>
        </div>
      </div>
    )
  }

  const isDraft = listing.status === 'DRAFT'
  const isPublished = listing.status === 'PUBLISHED'
  const isUnpublished = listing.status === 'UNPUBLISHED'
  const isArchived = listing.status === 'ARCHIVED'

  return (
    <div className="alliance-page-shell">
      <div className="alliance-detail-container">
        {/* Top Back Link */}
        <div style={{ marginBottom: '14px' }}>
          <Link
            href="/alliance/listings"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: 'var(--text-muted)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={15} /> Back to Alliance Listings
          </Link>
        </div>

        {/* Stale Source Alert */}
        {listing.isSourceDeleted && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--error-bg)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--error)',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '16px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>
              <strong>Source Inventory Deleted:</strong> The canonical PM record linked to this listing was removed from inventory.
            </span>
          </div>
        )}

        {/* Main 2-Column Detail Grid */}
        <div className="alliance-detail-grid">
          {/* Left Column: Primary Showcase Card */}
          <div className="alliance-detail-card" style={{ padding: '24px' }}>
            {/* Header: Badges & Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: listing.intent === 'SALE' ? 'rgba(217, 119, 87, 0.15)' : 'rgba(22, 101, 52, 0.1)',
                    color: listing.intent === 'SALE' ? '#c2501f' : 'var(--forest)',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  FOR {listing.intent}
                </span>

                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: '9999px',
                    background: isPublished
                      ? 'rgba(22, 101, 52, 0.12)'
                      : isUnpublished
                      ? 'rgba(234, 179, 8, 0.15)'
                      : isArchived
                      ? 'rgba(100, 116, 139, 0.15)'
                      : 'rgba(59, 130, 246, 0.15)',
                    color: isPublished
                      ? 'var(--forest)'
                      : isUnpublished
                      ? '#854d0e'
                      : isArchived
                      ? 'var(--text-muted)'
                      : '#1d4ed8',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                  }}
                >
                  {listing.status}
                </span>

                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'var(--ivory-dim)',
                    color: 'var(--text-secondary)',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  {listing.targetType === 'PROPERTY' ? <Building2 size={12} /> : <Home size={12} />}
                  {listing.targetType === 'PROPERTY' ? 'Entire Property' : 'Unit'}
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {isPublished && (
                  <button
                    type="button"
                    onClick={() => setShowShareModal(true)}
                    className="alliance-btn alliance-btn--secondary"
                    style={{ height: '34px', padding: '0 12px', fontSize: '12px', color: 'var(--forest)', fontWeight: 600 }}
                  >
                    <Share2 size={13} /> Refer Client
                  </button>
                )}

                {!isArchived && (
                  <Link
                    href={`/alliance/listings/${listing.uuid}/edit`}
                    className="alliance-btn alliance-btn--secondary"
                    style={{ height: '34px', padding: '0 12px', fontSize: '12px' }}
                  >
                    <Edit size={13} /> Edit
                  </Link>
                )}

                {(isDraft || isUnpublished) && (
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(true)}
                    disabled={isPending}
                    className="alliance-btn alliance-btn--primary"
                    style={{ height: '34px', padding: '0 14px', fontSize: '12px' }}
                  >
                    <Send size={13} /> {publishMutation.isPending ? 'Publishing...' : 'Publish'}
                  </button>
                )}

                {isPublished && (
                  <button
                    type="button"
                    onClick={() => setShowUnpublishModal(true)}
                    disabled={isPending}
                    className="alliance-btn alliance-btn--secondary"
                    style={{ height: '34px', padding: '0 12px', fontSize: '12px', color: '#b45309' }}
                  >
                    <EyeOff size={13} /> {unpublishMutation.isPending ? 'Unpublishing...' : 'Unpublish'}
                  </button>
                )}

                {!isArchived && (
                  <button
                    type="button"
                    onClick={() => setShowArchiveModal(true)}
                    disabled={isPending}
                    className="alliance-btn alliance-btn--secondary"
                    style={{ height: '34px', padding: '0 10px', color: 'var(--text-muted)' }}
                    title="Archive Listing"
                  >
                    <Archive size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Title & Price */}
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--dark)', margin: '0 0 4px 0', letterSpacing: '-0.3px' }}>
                {listing.title}
              </h1>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--forest)' }}>
                {formatPrice(listing.price, listing.currency)}
                {listing.intent === 'RENT' && (
                  <span style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--text-muted)' }}> /yr</span>
                )}
              </div>
            </div>

            {/* Property Photography */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                  Property Photography
                </span>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  {listing.media?.length || 0} / 15 Photos
                </span>
              </div>

              <ListingMediaManager
                listingUuid={uuid}
                isArchived={isArchived}
              />
            </div>

            {/* Marketing Description */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
                Marketing Description
              </div>
              {listing.description ? (
                <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {listing.description}
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No marketing description provided. Click "Edit" to add highlights, amenities, and terms.
                </p>
              )}
            </div>
          </div>

          {/* Right Column: Asset Intelligence & Side Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Quick Publication Callout if Draft */}
            {isDraft && (
              <div className="alliance-callout" style={{ flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <Info size={15} color="var(--forest)" />
                  <strong style={{ fontSize: '12.5px', color: 'var(--text)' }}>Draft Status</strong>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  This listing is currently private. Publish to distribute across the verified Upward Alliance network.
                </p>
                <button
                  type="button"
                  onClick={() => setShowReviewModal(true)}
                  disabled={isPending}
                  className="alliance-btn alliance-btn--primary"
                  style={{ width: '100%', height: '36px', fontSize: '12.5px', marginTop: '2px' }}
                >
                  <Send size={13} /> Publish Listing
                </button>
              </div>
            )}

            {/* Specifications Card */}
            <div className="alliance-detail-card" style={{ padding: '20px' }}>
              <div className="alliance-detail-card__header" style={{ paddingBottom: '10px' }}>
                <h2 className="alliance-detail-card__title" style={{ fontSize: '13.5px' }}>
                  Asset Specifications
                </h2>
              </div>

              <div className="alliance-meta-list">
                <div className="alliance-meta-item">
                  <span className="alliance-meta-item__label">
                    <Building2 size={13} /> Scope
                  </span>
                  <span className="alliance-meta-item__value">
                    {listing.targetType === 'PROPERTY' ? 'Entire Property' : 'Individual Unit'}
                  </span>
                </div>

                <div className="alliance-meta-item">
                  <span className="alliance-meta-item__label">
                    <Link2 size={13} /> Origin
                  </span>
                  <span className="alliance-meta-item__value">
                    {listing.sourceType === 'LINKED_INVENTORY' ? 'Linked Inventory' : 'Independent'}
                  </span>
                </div>

                {listing.propertyType && (
                  <div className="alliance-meta-item">
                    <span className="alliance-meta-item__label">Asset Type</span>
                    <span className="alliance-meta-item__value">{listing.propertyType}</span>
                  </div>
                )}

                {(listing.bedrooms !== undefined || listing.bathrooms !== undefined) && (
                  <div className="alliance-meta-item">
                    <span className="alliance-meta-item__label">Rooms</span>
                    <span className="alliance-meta-item__value">
                      {[
                        listing.bedrooms !== undefined ? `${listing.bedrooms} Beds` : null,
                        listing.bathrooms !== undefined ? `${listing.bathrooms} Baths` : null,
                      ].filter(Boolean).join(' • ')}
                    </span>
                  </div>
                )}

                {(listing.address || listing.city || listing.state) && (
                  <div className="alliance-meta-item" style={{ alignItems: 'flex-start' }}>
                    <span className="alliance-meta-item__label" style={{ marginTop: '2px' }}>
                      <MapPin size={13} /> Location
                    </span>
                    <span className="alliance-meta-item__value" style={{ maxWidth: '180px', lineHeight: 1.4, fontSize: '12px' }}>
                      {[listing.address, listing.city, listing.state, listing.country].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}

                <div className="alliance-meta-item">
                  <span className="alliance-meta-item__label">
                    <Calendar size={13} /> Created
                  </span>
                  <span className="alliance-meta-item__value">
                    {new Date(listing.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="alliance-meta-item">
                  <span className="alliance-meta-item__label">
                    <Bookmark size={13} /> Interest
                  </span>
                  <span className="alliance-meta-item__value" style={{ color: (listing.trackerCount ?? 0) > 0 ? 'var(--forest)' : 'inherit' }}>
                    {listing.trackerCount ?? 0} PMs Tracking
                  </span>
                </div>
              </div>
            </div>

            {/* Canonical Reference Card (If Linked) */}
            {listing.sourceType === 'LINKED_INVENTORY' && (
              <div className="alliance-detail-card" style={{ padding: '16px', background: 'rgba(22, 101, 52, 0.03)', borderColor: 'rgba(22, 101, 52, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: 'var(--forest)', marginBottom: '6px' }}>
                  <CheckCircle2 size={15} /> Canonical Inventory Link
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text)', lineHeight: 1.4 }}>
                  {listing.targetProperty && <div><strong>Property:</strong> {listing.targetProperty.name}</div>}
                  {listing.targetUnit && <div><strong>Unit:</strong> {listing.targetUnit.unitName}</div>}
                </div>
              </div>
            )}

            {/* Verified Partner Qualifications */}
            {profile?.qualifications && profile.qualifications.length > 0 && (
              <div className="alliance-detail-card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
                  <Award size={14} color="var(--forest)" /> Verified Partner Credentials
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {profile.qualifications.map((q) => (
                    <span key={q.id} className="alliance-chip">
                      <Award size={11} /> {q.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Share / Refer Client Modal */}
        <ShareReferralModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          listingUuid={listing.uuid}
          listingTitle={listing.title}
          listingPrice={listing.price}
          listingCurrency={listing.currency}
          listingLocation={[listing.address, listing.city, listing.state].filter(Boolean).join(', ')}
        />

        {/* Review & Publish Modal */}
        <ListingReviewModal
          isOpen={showReviewModal}
          listing={listing}
          onClose={() => setShowReviewModal(false)}
          onConfirmPublish={handleConfirmPublish}
          isPublishing={publishMutation.isPending}
        />

        {/* Unpublish Confirmation Modal */}
        <ConfirmationModal
          isOpen={showUnpublishModal}
          title="Unpublish Alliance Listing"
          message="Are you sure you want to unpublish this listing? It will no longer be visible on the Alliance distribution network, but you can publish it again at any time."
          confirmLabel="Unpublish"
          confirmVariant="danger"
          onConfirm={handleConfirmUnpublish}
          onClose={() => setShowUnpublishModal(false)}
          isLoading={unpublishMutation.isPending}
        />

        {/* Archive Confirmation Modal */}
        <ConfirmationModal
          isOpen={showArchiveModal}
          title="Archive Alliance Listing"
          message="Are you sure you want to archive this listing? Archiving permanently removes it from active management while preserving historical records."
          confirmLabel="Archive"
          confirmVariant="danger"
          onConfirm={handleConfirmArchive}
          onClose={() => setShowArchiveModal(false)}
          isLoading={archiveMutation.isPending}
        />
      </div>
    </div>
  )
}
