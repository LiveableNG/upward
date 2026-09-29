'use client'

import React from 'react'
import Link from 'next/link'
import {
  Building2,
  Home,
  Globe,
  Link as LinkIcon,
  AlertCircle,
  Eye,
  Edit,
  Send,
  EyeOff,
  Archive,
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
              padding: '4px 8px',
              borderRadius: '12px',
              background: 'rgba(22, 101, 52, 0.1)',
              color: 'var(--forest)',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            Published
          </span>
        )
      case 'UNPUBLISHED':
        return (
          <span
            style={{
              padding: '4px 8px',
              borderRadius: '12px',
              background: 'rgba(234, 179, 8, 0.1)',
              color: '#854d0e',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            Unpublished
          </span>
        )
      case 'ARCHIVED':
        return (
          <span
            style={{
              padding: '4px 8px',
              borderRadius: '12px',
              background: 'rgba(100, 116, 139, 0.1)',
              color: 'var(--text-muted)',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
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
              padding: '4px 8px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.1)',
              color: '#1d4ed8',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            Draft
          </span>
        )
    }
  }

  return (
    <div
      className="card"
      style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '16px',
        transition: 'all 0.2s ease',
      }}
    >
      <div>
        {/* Header Badges */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
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
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'var(--bg)',
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
                background: 'var(--bg)',
                color: 'var(--text-secondary)',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              {listing.sourceType === 'LINKED_INVENTORY' ? <LinkIcon size={12} /> : <Globe size={12} />}
              {listing.sourceType === 'LINKED_INVENTORY' ? 'Linked Inventory' : 'Independent'}
            </span>
          </div>

          <div>{getStatusBadge()}</div>
        </div>

        {/* Title & Price */}
        <Link
          href={`/alliance/listings/${listing.uuid}`}
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <h3
            style={{
              margin: '0 0 6px 0',
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--text)',
              lineHeight: 1.4,
            }}
          >
            {listing.title}
          </h3>
        </Link>

        <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--forest)', marginBottom: '8px' }}>
          {formatPrice(listing.price, listing.currency)}
        </div>

        {/* Source Context Info */}
        {listing.sourceType === 'LINKED_INVENTORY' && (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
            <strong>Source: </strong>
            {listing.targetProperty && listing.targetProperty.name}
            {listing.targetUnit && `${listing.targetUnit.unitName} (${listing.targetUnit.property?.name || 'Property'})`}
          </div>
        )}

        {/* Location Info */}
        {(listing.city || listing.state) && (
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {[listing.address, listing.city, listing.state, listing.country].filter(Boolean).join(', ')}
          </div>
        )}

        {/* Stale source alert */}
        {listing.isSourceDeleted && (
          <div
            style={{
              marginTop: '8px',
              padding: '6px 10px',
              borderRadius: '6px',
              background: '#fee2e2',
              color: '#dc2626',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertCircle size={14} />
            Original canonical inventory was deleted. Requires review.
          </div>
        )}
      </div>

      {/* Footer & Actions */}
      <div
        style={{
          borderTop: '1px solid var(--border)',
          paddingTop: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {listing.publishedAt
            ? `Published ${new Date(listing.publishedAt).toLocaleDateString()}`
            : `Created ${new Date(listing.createdAt).toLocaleDateString()}`}
        </span>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <Link
            href={`/alliance/listings/${listing.uuid}`}
            className="btn btn--secondary"
            style={{ padding: '6px 10px', height: '32px', fontSize: '12px', gap: '4px' }}
          >
            <Eye size={13} /> View
          </Link>

          {listing.status !== 'ARCHIVED' && (
            <Link
              href={`/alliance/listings/${listing.uuid}/edit`}
              className="btn btn--secondary"
              style={{ padding: '6px 10px', height: '32px', fontSize: '12px', gap: '4px' }}
            >
              <Edit size={13} /> Edit
            </Link>
          )}

          {(listing.status === 'DRAFT' || listing.status === 'UNPUBLISHED') && onPublish && (
            <button
              type="button"
              onClick={() => onPublish(listing.uuid)}
              disabled={isActionPending}
              className="btn btn--primary"
              style={{ padding: '6px 10px', height: '32px', fontSize: '12px', gap: '4px' }}
            >
              <Send size={13} /> {isPublishing ? 'Publishing...' : 'Publish'}
            </button>
          )}

          {listing.status === 'PUBLISHED' && onUnpublish && (
            <button
              type="button"
              onClick={() => onUnpublish(listing.uuid)}
              disabled={isActionPending}
              className="btn btn--secondary"
              style={{ padding: '6px 10px', height: '32px', fontSize: '12px', gap: '4px', color: '#b45309' }}
            >
              <EyeOff size={13} /> {isUnpublishing ? 'Unpublishing...' : 'Unpublish'}
            </button>
          )}

          {listing.status !== 'ARCHIVED' && onArchive && (
            <button
              type="button"
              onClick={() => onArchive(listing.uuid)}
              disabled={isActionPending}
              className="btn btn--secondary"
              style={{ padding: '6px 10px', height: '32px', fontSize: '12px', gap: '4px', color: 'var(--text-muted)' }}
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
