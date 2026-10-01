'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Plus, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  useAllianceProfile,
  useAllianceListings,
  usePublishAllianceListing,
  useUnpublishAllianceListing,
  useArchiveAllianceListing,
} from '@/features/alliance/hooks/useAlliance'
import {
  AllianceListingStatus,
  AllianceTargetType,
  AllianceSourceType,
  AllianceListing,
} from '@/features/alliance/types/alliance.types'
import { ListingFilters } from '@/features/alliance/components/ListingFilters'
import { ListingCard } from '@/features/alliance/components/ListingCard'
import { ListingReviewModal } from '@/features/alliance/components/ListingReviewModal'
import { ShareReferralModal } from '@/features/alliance/components/ShareReferralModal'
import { ConfirmationModal } from '@/components/common/ConfirmationModal'
import { useToast } from '@/components/common/Toast'

export default function AllianceListingsPage() {
  const toast = useToast()

  // Filter & Pagination state
  const [status, setStatus] = useState<AllianceListingStatus | undefined>(undefined)
  const [targetType, setTargetType] = useState<AllianceTargetType | undefined>(undefined)
  const [sourceType, setSourceType] = useState<AllianceSourceType | undefined>(undefined)
  const [page, setPage] = useState<number>(1)

  // Active modals state
  const [reviewListing, setReviewListing] = useState<AllianceListing | null>(null)
  const [shareListing, setShareListing] = useState<AllianceListing | null>(null)
  const [unpublishUuid, setUnpublishUuid] = useState<string | null>(null)
  const [archiveUuid, setArchiveUuid] = useState<string | null>(null)

  // Data fetching
  const { data: profile } = useAllianceProfile()
  const { data: listingsData, isLoading: loadingListings } = useAllianceListings({
    status,
    targetType,
    sourceType,
    page,
    limit: 12,
  })

  // Mutations
  const publishMutation = usePublishAllianceListing()
  const unpublishMutation = useUnpublishAllianceListing()
  const archiveMutation = useArchiveAllianceListing()

  const handleOpenPublish = (uuid: string) => {
    const listing = listingsData?.items.find((l) => l.uuid === uuid)
    if (listing) {
      setReviewListing(listing)
    }
  }

  const handleConfirmPublish = async () => {
    if (!reviewListing) return
    try {
      await publishMutation.mutateAsync(reviewListing.uuid)
      toast.success('Listing published successfully to Upward Alliance!')
      setReviewListing(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish listing')
    }
  }

  const handleConfirmUnpublish = async () => {
    if (!unpublishUuid) return
    try {
      await unpublishMutation.mutateAsync(unpublishUuid)
      toast.success('Listing unpublished')
      setUnpublishUuid(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to unpublish listing')
    }
  }

  const handleConfirmArchive = async () => {
    if (!archiveUuid) return
    try {
      await archiveMutation.mutateAsync(archiveUuid)
      toast.success('Listing archived')
      setArchiveUuid(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to archive listing')
    }
  }

  const listings = listingsData?.items || []
  const meta = listingsData?.meta || { page: 1, total: 0, totalPages: 1 }

  return (
    <div>
      {/* Top Action Bar & Filters */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div style={{ flex: 1, minWidth: '280px' }}>
          <ListingFilters
            status={status}
            targetType={targetType}
            sourceType={sourceType}
            onStatusChange={(s) => {
              setStatus(s)
              setPage(1)
            }}
            onTargetTypeChange={(t) => {
              setTargetType(t)
              setPage(1)
            }}
            onSourceTypeChange={(src) => {
              setSourceType(src)
              setPage(1)
            }}
          />
        </div>

        {profile?.isEnabled && (
          <Link
            href="/alliance/listings/new"
            className="alliance-btn alliance-btn--primary"
            style={{ height: '44px', padding: '0 20px', flexShrink: 0, marginBottom: '20px' }}
          >
            <Plus size={16} /> Create Listing
          </Link>
        )}
      </div>

      {/* Listings List / Grid */}
      {loadingListings ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="alliance-listing-card animate-pulse" style={{ height: '360px', opacity: 0.6 }} />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="alliance-gate-card">
          <div className="alliance-gate-card__icon-wrap" style={{ background: 'var(--ivory-dim)', color: 'var(--text-muted)' }}>
            <AlertCircle size={26} />
          </div>
          <h3 className="alliance-gate-card__title">
            No Alliance Listings Found
          </h3>
          <p className="alliance-gate-card__desc">
            {status
              ? `You do not have any listings with status "${status.toLowerCase()}".`
              : 'Create your first Alliance marketing listing to publish and co-broker properties across the network.'}
          </p>
          {profile?.isEnabled && (
            <Link href="/alliance/listings/new" className="alliance-btn alliance-btn--primary" style={{ marginTop: '8px' }}>
              <Plus size={16} /> Create New Listing
            </Link>
          )}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
            {listings.map((listing) => (
              <ListingCard
                key={listing.uuid}
                listing={listing}
                onPublish={handleOpenPublish}
                onUnpublish={(uuid) => setUnpublishUuid(uuid)}
                onArchive={(uuid) => setArchiveUuid(uuid)}
                onShare={(l) => setShareListing(l)}
                isPublishing={publishMutation.isPending}
                isUnpublishing={unpublishMutation.isPending}
                isArchiving={archiveMutation.isPending}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {meta.totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '14px',
                marginTop: '36px',
              }}
            >
              <button
                type="button"
                className="alliance-btn alliance-btn--secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                style={{ height: '36px', padding: '0 14px', fontSize: '13px' }}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Page {meta.page} of {meta.totalPages} ({meta.total} listings)
              </span>
              <button
                type="button"
                className="alliance-btn alliance-btn--secondary"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, meta.totalPages))}
                style={{ height: '36px', padding: '0 14px', fontSize: '13px' }}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Share / Refer Client Modal */}
      <ShareReferralModal
        isOpen={Boolean(shareListing)}
        onClose={() => setShareListing(null)}
        listingUuid={shareListing?.uuid || ''}
        listingTitle={shareListing?.title || ''}
        listingPrice={shareListing?.price}
        listingCurrency={shareListing?.currency}
        listingLocation={[shareListing?.address, shareListing?.city, shareListing?.state].filter(Boolean).join(', ')}
      />

      {/* Review & Publish Modal */}
      <ListingReviewModal
        isOpen={Boolean(reviewListing)}
        listing={reviewListing}
        onClose={() => setReviewListing(null)}
        onConfirmPublish={handleConfirmPublish}
        isPublishing={publishMutation.isPending}
      />

      {/* Unpublish Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(unpublishUuid)}
        title="Unpublish Alliance Listing"
        message="Are you sure you want to unpublish this listing? It will no longer be visible on the Alliance distribution network, but you can publish it again at any time."
        confirmLabel="Unpublish"
        confirmVariant="danger"
        onConfirm={handleConfirmUnpublish}
        onClose={() => setUnpublishUuid(null)}
        isLoading={unpublishMutation.isPending}
      />

      {/* Archive Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(archiveUuid)}
        title="Archive Alliance Listing"
        message="Are you sure you want to archive this listing? Archiving permanently removes it from active management while preserving historical records."
        confirmLabel="Archive"
        confirmVariant="danger"
        onConfirm={handleConfirmArchive}
        onClose={() => setArchiveUuid(null)}
        isLoading={archiveMutation.isPending}
      />
    </div>
  )
}
