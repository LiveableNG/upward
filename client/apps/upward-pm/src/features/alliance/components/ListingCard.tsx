'use client'

import React from 'react'
import Link from 'next/link'
import {
  Building2,
  Home,
  Globe,
  Link2,
  AlertCircle,
  Eye,
  Edit,
  Send,
  EyeOff,
  Archive,
  Bookmark,
  MapPin,
  Image as ImageIcon,
} from 'lucide-react'
import { AllianceListing } from '../types/alliance.types'

interface ListingCardProps {
  listing: AllianceListing
  onPublish?: (uuid: string) => void
  onUnpublish?: (uuid: string) => void
  onArchive?: (uuid: string) => void
  isPublishing?: boolean
  isUnpublishing?: boolean
  isArchiving?: boolean
}

export function ListingCard({
  listing,
  onPublish,
  onUnpublish,
  onArchive,
  isPublishing,
  isUnpublishing,
  isArchiving,
}: ListingCardProps) {
  const isActionPending = isPublishing || isUnpublishing || isArchiving

  const formatPrice = (amount: number, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency === 'NGN' ? 'NGN' : currency,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusBadge = () => {
    switch (listing.status) {
      case 'PUBLISHED':
        return (
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '9999px',
              background: 'rgba(22, 101, 52, 0.1)',
              color: 'var(--forest)',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
            }}
          >
            Published
          </span>
        )
      case 'UNPUBLISHED':
        return (
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '9999px',
              background: 'rgba(234, 179, 8, 0.12)',
              color: '#854d0e',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
            }}
          >
            Unpublished
          </span>
        )
      case 'ARCHIVED':
        return (
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '9999px',
              background: 'rgba(100, 116, 139, 0.12)',
              color: 'var(--text-muted)',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
            }}
          >
            Archived
          </span>
        )
      case 'DRAFT':
      default:
        return (
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '9999px',
              background: 'rgba(59, 130, 246, 0.12)',
              color: '#1d4ed8',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
            }}
          >
            Draft
          </span>
        )
    }
  }

  const hasMedia = listing.media && listing.media.length > 0 && listing.media[0]?.publicUrl

  return (
    <div className="alliance-listing-card">
      <div>
        {/* Header Badges */}
        <div className="alliance-listing-card__header" style={{ marginBottom: '12px' }}>
          <div className="alliance-listing-card__badges">
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
              {listing.targetType === 'PROPERTY' ? 'Property' : 'Unit'}
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
              {listing.sourceType === 'LINKED_INVENTORY' ? <Link2 size={12} /> : <Globe size={12} />}
              {listing.sourceType === 'LINKED_INVENTORY' ? 'Linked' : 'Independent'}
            </span>
          </div>

          <div>{getStatusBadge()}</div>
        </div>

        {/* Cover Image Preview or Clean Minimal Placeholder */}
        <Link href={`/alliance/listings/${listing.uuid}`}>
          <div className="alliance-listing-card__media-preview">
            {hasMedia ? (
              <img
                src={listing.media![0].publicUrl}
                alt={listing.title}
                className="alliance-listing-card__media-img"
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  color: 'var(--text-muted)',
                  background: 'linear-gradient(135deg, var(--ivory-dim) 0%, rgba(22, 101, 52, 0.04) 100%)',
                }}
              >
                {listing.targetType === 'PROPERTY' ? (
                  <Building2 size={32} strokeWidth={1.5} style={{ opacity: 0.5 }} />
                ) : (
                  <Home size={32} strokeWidth={1.5} style={{ opacity: 0.5 }} />
                )}
                <span style={{ fontSize: '11px', fontWeight: 600, opacity: 0.7 }}>No photo uploaded</span>
              </div>
            )}
          </div>
        </Link>

        {/* Price & Title */}
        <div style={{ marginTop: '12px', marginBottom: '6px' }}>
          <div className="alliance-listing-card__price">
            {formatPrice(listing.price, listing.currency)}
            {listing.intent === 'RENT' && (
              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}> /yr</span>
            )}
          </div>
        </div>

        <Link
          href={`/alliance/listings/${listing.uuid}`}
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <h3 className="alliance-listing-card__title" title={listing.title}>
            {listing.title}
          </h3>
        </Link>

        {/* Location & Specs Row */}
        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {(listing.address || listing.city || listing.state) && (
            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              <MapPin size={12} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {[listing.address, listing.city, listing.state].filter(Boolean).join(', ')}
              </span>
            </div>
          )}

          {listing.sourceType === 'LINKED_INVENTORY' && (
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Linked: {listing.targetProperty ? listing.targetProperty.name : listing.targetUnit?.unitName}
            </div>
          )}
        </div>

        {/* Stale Source Warning */}
        {listing.isSourceDeleted && (
          <div
            style={{
              marginTop: '10px',
              padding: '6px 10px',
              borderRadius: '6px',
              background: 'var(--error-bg)',
              color: 'var(--error)',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertCircle size={14} />
            Original canonical inventory was deleted.
          </div>
        )}
      </div>

      {/* Footer & Actions */}
      <div className="alliance-listing-card__footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {new Date(listing.createdAt).toLocaleDateString()}
          </span>

          {(listing.trackerCount ?? 0) > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '11px',
                color: 'var(--forest)',
                fontWeight: 700,
              }}
            >
              <Bookmark size={11} /> {listing.trackerCount} tracking
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <Link
            href={`/alliance/listings/${listing.uuid}`}
            className="alliance-btn alliance-btn--secondary"
            style={{ padding: '0 12px', height: '32px', fontSize: '12px' }}
          >
            <Eye size={13} /> View
          </Link>

          {listing.status !== 'ARCHIVED' && (
            <Link
              href={`/alliance/listings/${listing.uuid}/edit`}
              className="alliance-btn alliance-btn--secondary"
              style={{ padding: '0 12px', height: '32px', fontSize: '12px' }}
            >
              <Edit size={13} /> Edit
            </Link>
          )}

          {(listing.status === 'DRAFT' || listing.status === 'UNPUBLISHED') && onPublish && (
            <button
              type="button"
              onClick={() => onPublish(listing.uuid)}
              disabled={isActionPending}
              className="alliance-btn alliance-btn--primary"
              style={{ padding: '0 14px', height: '32px', fontSize: '12px' }}
            >
              <Send size={13} /> {isPublishing ? 'Publishing...' : 'Publish'}
            </button>
          )}

          {listing.status === 'PUBLISHED' && onUnpublish && (
            <button
              type="button"
              onClick={() => onUnpublish(listing.uuid)}
              disabled={isActionPending}
              className="alliance-btn alliance-btn--secondary"
              style={{ padding: '0 12px', height: '32px', fontSize: '12px', color: '#b45309' }}
            >
              <EyeOff size={13} /> {isUnpublishing ? 'Unpublishing...' : 'Unpublish'}
            </button>
          )}

          {listing.status !== 'ARCHIVED' && onArchive && (
            <button
              type="button"
              onClick={() => onArchive(listing.uuid)}
              disabled={isActionPending}
              className="alliance-btn alliance-btn--secondary"
              style={{ padding: '0 10px', height: '32px', fontSize: '12px', color: 'var(--text-muted)' }}
              title="Archive Listing"
            >
              <Archive size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
