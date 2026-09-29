'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Plus, Award, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
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
import { AllianceStatusBanner } from '@/features/alliance/components/AllianceStatusBanner'
import { AllianceNavTabs } from '@/features/alliance/components/AllianceNavTabs'
import { ListingFilters } from '@/features/alliance/components/ListingFilters'
import { ListingCard } from '@/features/alliance/components/ListingCard'
import { ListingReviewModal } from '@/features/alliance/components/ListingReviewModal'
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
  const [unpublishUuid, setUnpublishUuid] = useState<string | null>(null)
  const [archiveUuid, setArchiveUuid] = useState<string | null>(null)

  // Data fetching
  const { data: profile, isLoading: loadingProfile } = useAllianceProfile()
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
    <div className="page-container" style={{ padding: '24px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: 'var(--text)',
              margin: '0 0 4px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Award size={26} color="var(--forest)" /> Upward Alliance Listings
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            Manage and distribute your property marketing representations across the network.
          </p>
        </div>

        {profile?.isEnabled && (
          <Link
            href="/alliance/listings/new"
            className="btn btn--primary"
            style={{ height: '42px', padding: '0 18px', gap: '8px', fontWeight: 600 }}
          >
            <Plus size={18} /> Create Listing
          </Link>
        )}
      </div>

      {/* Alliance Navigation Tabs */}
      <AllianceNavTabs activeTab="my-listings" />

      {/* Alliance Status Banner (Enabled state + Qualifications or Disabled warning) */}
      <AllianceStatusBanner profile={profile} isLoading={loadingProfile} />

      {/* Filters */}
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

      {/* Listings List / Grid */}
      {loadingListings ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse" style={{ height: '220px' }} />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <AlertCircle size={28} />
          </div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
            No Alliance Listings Found
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', maxWidth: '400px' }}>
            {status
              ? `You do not have any listings with status "${status.toLowerCase()}".`
              : 'Create your first Alliance marketing listing to publish or distribute properties.'}
          </p>
          {profile?.isEnabled && (
            <Link href="/alliance/listings/new" className="btn btn--primary" style={{ marginTop: '8px' }}>
              <Plus size={16} /> Create New Listing
            </Link>
          )}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {listings.map((listing) => (
              <ListingCard
                key={listing.uuid}
                listing={listing}
                onPublish={handleOpenPublish}
                onUnpublish={(uuid) => setUnpublishUuid(uuid)}
                onArchive={(uuid) => setArchiveUuid(uuid)}
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
                gap: '16px',
                marginTop: '32px',
              }}
            >
              <button
                type="button"
                className="btn btn--secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                style={{ padding: '8px 14px', gap: '4px' }}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Page <strong>{meta.page}</strong> of <strong>{meta.totalPages}</strong> ({meta.total} total)
              </span>
              <button
                type="button"
                className="btn btn--secondary"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, meta.totalPages))}
                style={{ padding: '8px 14px', gap: '4px' }}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

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
