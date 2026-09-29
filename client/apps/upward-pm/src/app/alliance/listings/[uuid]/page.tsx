'use client'

import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  Home,
  Link as LinkIcon,
  Globe,
  Edit,
  Send,
  EyeOff,
  Archive,
  AlertCircle,
  Award,
  CheckCircle2,
  Calendar,
} from 'lucide-react'
import {
  useAllianceListing,
  useAllianceProfile,
  usePublishAllianceListing,
  useUnpublishAllianceListing,
  useArchiveAllianceListing,
} from '@/features/alliance/hooks/useAlliance'
import { ListingReviewModal } from '@/features/alliance/components/ListingReviewModal'
import { ConfirmationModal } from '@/components/common/ConfirmationModal'
import { OccupancyWarning } from '@/features/alliance/components/OccupancyWarning'
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
      <div className="page-container" style={{ padding: '48px 20px', textAlign: 'center' }}>
        <div className="loader" style={{ margin: '0 auto 16px auto' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading listing details...</p>
      </div>
    )
  }

  if (listingError || !listing) {
    return (
      <div className="page-container" style={{ padding: '48px 20px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <AlertCircle size={40} color="var(--danger)" style={{ margin: '0 auto 16px auto' }} />
        <h2 style={{ color: 'var(--text)', marginBottom: '8px' }}>Listing Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          The requested Alliance listing could not be found or you do not have permission to view it.
        </p>
        <Link href="/alliance/listings" className="btn btn--secondary">
          <ArrowLeft size={16} /> Return to Listings
        </Link>
      </div>
    )
  }

  return (
    <div className="page-container" style={{ padding: '24px 20px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Back link */}
      <div style={{ marginBottom: '16px' }}>
        <Link
          href="/alliance/listings"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: 'var(--text-muted)',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={16} /> Back to Alliance Listings
        </Link>
      </div>

      {/* Main Card Header */}
      <div className="card" style={{ padding: '28px', marginBottom: '20px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '20px',
            marginBottom: '20px',
          }}
        >
          <div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
              <span
                style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: listing.intent === 'SALE' ? '#fee2e2' : '#f0fdf4',
                  color: listing.intent === 'SALE' ? '#dc2626' : 'var(--forest)',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                FOR {listing.intent}
              </span>
              <span
                style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background:
                    listing.status === 'PUBLISHED'
                      ? 'rgba(22, 101, 52, 0.1)'
                      : listing.status === 'UNPUBLISHED'
                        ? 'rgba(234, 179, 8, 0.1)'
                        : listing.status === 'ARCHIVED'
                          ? 'rgba(100, 116, 139, 0.1)'
                          : 'rgba(59, 130, 246, 0.1)',
                  color:
                    listing.status === 'PUBLISHED'
                      ? 'var(--forest)'
                      : listing.status === 'UNPUBLISHED'
                        ? '#854d0e'
                        : listing.status === 'ARCHIVED'
                          ? 'var(--text-muted)'
                          : '#1d4ed8',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                {listing.status}
              </span>
            </div>

            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', margin: '0 0 8px 0' }}>
              {listing.title}
            </h1>

            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--forest)' }}>
              {formatPrice(listing.price, listing.currency)}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {listing.status !== 'ARCHIVED' && (
              <Link
                href={`/alliance/listings/${listing.uuid}/edit`}
                className="btn btn--secondary"
                style={{ height: '38px', padding: '0 14px', gap: '6px', fontSize: '13px' }}
              >
                <Edit size={14} /> Edit Listing
              </Link>
            )}

            {(listing.status === 'DRAFT' || listing.status === 'UNPUBLISHED') && (
              <button
                type="button"
                onClick={() => setShowReviewModal(true)}
                disabled={isPending}
                className="btn btn--primary"
                style={{ height: '38px', padding: '0 16px', gap: '6px', fontSize: '13px', fontWeight: 700 }}
              >
                <Send size={14} /> {publishMutation.isPending ? 'Publishing...' : 'Publish Listing'}
              </button>
            )}

            {listing.status === 'PUBLISHED' && (
              <button
                type="button"
                onClick={() => setShowUnpublishModal(true)}
                disabled={isPending}
                className="btn btn--secondary"
                style={{ height: '38px', padding: '0 14px', gap: '6px', fontSize: '13px', color: '#b45309' }}
              >
                <EyeOff size={14} /> {unpublishMutation.isPending ? 'Unpublishing...' : 'Unpublish'}
              </button>
            )}

            {listing.status !== 'ARCHIVED' && (
              <button
                type="button"
                onClick={() => setShowArchiveModal(true)}
                disabled={isPending}
                className="btn btn--secondary"
                style={{ height: '38px', padding: '0 12px', color: 'var(--text-muted)' }}
                title="Archive Listing"
              >
                <Archive size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Stale Source Warning */}
        {listing.isSourceDeleted && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: '#fee2e2',
              color: '#dc2626',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              marginBottom: '20px',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Source Inventory Deleted:</strong> The canonical property/unit linked to this listing was removed from Upward PM inventory. This listing is preserved for history but cannot be republished until reassigned or recreated.
            </div>
          </div>
        )}

        {/* Grid of Key Properties */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
          <div style={{ padding: '12px 16px', background: 'var(--bg)', borderRadius: '10px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Target Scope</div>
            <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              {listing.targetType === 'PROPERTY' ? <Building2 size={16} color="var(--forest)" /> : <Home size={16} color="var(--forest)" />}
              {listing.targetType === 'PROPERTY' ? 'Entire Property' : 'Unit'}
            </div>
          </div>

          <div style={{ padding: '12px 16px', background: 'var(--bg)', borderRadius: '10px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Source Origin</div>
            <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              {listing.sourceType === 'LINKED_INVENTORY' ? <LinkIcon size={16} color="var(--forest)" /> : <Globe size={16} color="var(--forest)" />}
              {listing.sourceType === 'LINKED_INVENTORY' ? 'Linked Inventory' : 'Independent'}
            </div>
          </div>

          <div style={{ padding: '12px 16px', background: 'var(--bg)', borderRadius: '10px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Created Date</div>
            <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <Calendar size={16} color="var(--text-muted)" />
              {new Date(listing.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Linked Canonical Source Card (Read-only Reference) */}
        {listing.sourceType === 'LINKED_INVENTORY' && (
          <div
            style={{
              padding: '16px',
              borderRadius: '10px',
              background: 'rgba(22, 101, 52, 0.04)',
              border: '1px solid rgba(22, 101, 52, 0.2)',
              marginBottom: '20px',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--forest)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
              Canonical Inventory Reference
            </div>
            {listing.targetProperty && (
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                Property: {listing.targetProperty.name}
                {listing.targetProperty.address && (
                  <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {' '}
                    • {listing.targetProperty.address}
                  </span>
                )}
              </div>
            )}
            {listing.targetUnit && (
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                Unit: {listing.targetUnit.unitName}
                {listing.targetUnit.property?.name && (
                  <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {' '}
                    in {listing.targetUnit.property.name}
                  </span>
                )}
              </div>
            )}
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
              <em>This canonical inventory link provides verified asset backing. Marketing edits on this page do not alter canonical records.</em>
            </div>
          </div>
        )}

        {/* Independent Specs (If Independent) */}
        {listing.sourceType === 'INDEPENDENT' && (
          <div style={{ padding: '16px', borderRadius: '10px', background: 'var(--bg)', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
              Independent Asset Specifications
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', fontSize: '13px' }}>
              <div><strong>Type:</strong> {listing.propertyType || 'Not specified'}</div>
              <div><strong>Bedrooms:</strong> {listing.bedrooms ?? 'N/A'}</div>
              <div><strong>Bathrooms:</strong> {listing.bathrooms ?? 'N/A'}</div>
              <div><strong>Location:</strong> {[listing.address, listing.city, listing.state, listing.country].filter(Boolean).join(', ') || 'Not specified'}</div>
            </div>
          </div>
        )}

        {/* Description Section */}
        {listing.description && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text)' }}>
              Marketing Description
            </h3>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {listing.description}
            </p>
          </div>
        )}

        {/* PM Qualifications Badge Context */}
        {profile?.qualifications && profile.qualifications.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Award size={14} color="var(--forest)" /> Your Verified Alliance Qualifications
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {profile.qualifications.map((q) => (
                <span
                  key={q.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    background: 'rgba(22, 101, 52, 0.08)',
                    color: 'var(--forest)',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  <Award size={12} /> {q.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Listing Media Manager */}
      <ListingMediaManager
        listingUuid={uuid}
        isArchived={listing.status === 'ARCHIVED'}
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
  )
}
