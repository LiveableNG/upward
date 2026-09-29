'use client'

import React from 'react'
import Link from 'next/link'
import {
  Building2,
  Home,
  MapPin,
  Bed,
  Bath,
  ImageIcon,
  ShieldCheck,
  Bookmark,
  BookmarkCheck,
  Share2,
} from 'lucide-react'
import { AllianceDiscoveredListingSummary } from '../types/alliance.types'
import { useTrackAllianceListing, useUntrackAllianceListing } from '../hooks/useAlliance'
import { useToast } from '@/components/common/Toast'

import { getAllianceListingImage } from '../utils/allianceImages'

interface DiscoveryCardProps {
  listing: AllianceDiscoveredListingSummary
}

export function DiscoveryCard({ listing }: DiscoveryCardProps) {
  const toast = useToast()
  const trackMutation = useTrackAllianceListing()
  const untrackMutation = useUntrackAllianceListing()

  const isTracked = Boolean(listing.isTrackedByCurrentPm)
  const isPending = trackMutation.isPending || untrackMutation.isPending

  const handleToggleTrack = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isPending) return

    try {
      if (isTracked) {
        await untrackMutation.mutateAsync(listing.uuid)
        toast.success('Listing removed from your tracked opportunities')
      } else {
        await trackMutation.mutateAsync(listing.uuid)
        toast.success('Listing added to your tracked opportunities')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update tracking state')
    }
  }

  const formatPrice = (amount: number, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency === 'NGN' ? 'NGN' : currency,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const primaryImage = getAllianceListingImage(listing)
  const mediaCount = listing.mediaCount ?? (listing.media ? listing.media.length : 0)

  const locationText = [listing.address, listing.city, listing.state]
    .filter(Boolean)
    .join(', ') || 'Nigeria'

  const ownerName = listing.pm?.companyName || listing.pm?.name || 'Alliance Property Manager'
  const ownerTitle = listing.pm?.allianceProfile?.pmTitle
  const activeQualifications =
    listing.pm?.qualifications
      ?.map((q) => q.qualification)
      ?.filter((q) => q.isActive) || []

  return (
    <div className="alliance-discovery-card">
      {/* Media Cover Image */}
      <div className="alliance-discovery-card__media">
        <img
          src={primaryImage}
          alt={listing.title}
          className="alliance-discovery-card__img"
        />

        {/* Intent Badge */}
        <div className="alliance-discovery-card__badge-row">
          <span
            className={`alliance-discovery-card__pill ${
              listing.intent === 'SALE'
                ? 'alliance-discovery-card__pill--sale'
                : 'alliance-discovery-card__pill--rent'
            }`}
          >
            {listing.intent === 'SALE' ? 'FOR SALE' : 'FOR RENT'}
          </span>

          <span className="alliance-discovery-card__pill alliance-discovery-card__pill--target">
            {listing.targetType === 'PROPERTY' ? <Building2 size={11} /> : <Home size={11} />}
            {listing.targetType === 'PROPERTY' ? 'Property' : 'Unit'}
          </span>
        </div>

        {/* Track Bookmark Button */}
        <button
          type="button"
          onClick={handleToggleTrack}
          disabled={isPending}
          className={`alliance-discovery-card__bookmark-btn ${
            isTracked ? 'alliance-discovery-card__bookmark-btn--active' : ''
          }`}
          title={isTracked ? 'Tracking (Click to untrack)' : 'Track opportunity'}
        >
          {isTracked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
        </button>

        {/* Media count badge */}
        {mediaCount > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: '8px',
              right: '8px',
              padding: '2px 7px',
              borderRadius: '9999px',
              background: 'rgba(0, 0, 0, 0.65)',
              color: '#ffffff',
              fontSize: '10.5px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backdropFilter: 'blur(4px)',
            }}
          >
            <ImageIcon size={11} />
            {mediaCount} {mediaCount === 1 ? 'photo' : 'photos'}
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="alliance-discovery-card__body">
        {/* Price & Property Type */}
        <div className="alliance-discovery-card__price-row">
          <div className="alliance-discovery-card__price">
            {formatPrice(listing.price, listing.currency)}
            {listing.intent === 'RENT' && (
              <span className="alliance-discovery-card__period">/ year</span>
            )}
          </div>
          {listing.propertyType && (
            <span className="alliance-discovery-card__property-type">
              {listing.propertyType}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="alliance-discovery-card__title" title={listing.title}>
          {listing.title}
        </h3>

        {/* Location */}
        <div className="alliance-discovery-card__location" title={locationText}>
          <MapPin size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <span>{locationText}</span>
        </div>

        {/* Bedrooms / Bathrooms Specs */}
        {(listing.bedrooms !== null || listing.bathrooms !== null) && (
          <div className="alliance-discovery-card__specs">
            {listing.bedrooms !== null && (
              <div className="alliance-discovery-card__spec-item">
                <Bed size={13} color="var(--text-muted)" />
                <span>{listing.bedrooms} Beds</span>
              </div>
            )}
            {listing.bathrooms !== null && (
              <div className="alliance-discovery-card__spec-item">
                <Bath size={13} color="var(--text-muted)" />
                <span>{listing.bathrooms} Baths</span>
              </div>
            )}
          </div>
        )}

        {/* Owner PM Identity Box */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'rgba(22, 101, 52, 0.08)',
                color: 'var(--forest)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {ownerName.substring(0, 2).toUpperCase()}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {ownerName}
              </div>
              {ownerTitle && (
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {ownerTitle}
                </div>
              )}
            </div>
          </div>

          {/* Active Qualifications Badges */}
          {activeQualifications.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
              {activeQualifications.slice(0, 2).map((qual) => (
                <span
                  key={qual.id}
                  className="alliance-chip"
                  style={{ fontSize: '10px', padding: '1px 6px' }}
                  title={qual.name}
                >
                  <ShieldCheck size={10} />
                  {qual.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Button Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '6px', marginTop: '8px' }}>
          <Link
            href={`/alliance/discover/${listing.uuid}`}
            className="btn btn--secondary"
            style={{
              height: '34px',
              fontSize: '12.5px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              padding: '0 12px',
            }}
          >
            View Details
          </Link>
          <Link
            href={`/alliance/discover/${listing.uuid}?action=refer`}
            className="btn btn--secondary"
            style={{
              height: '34px',
              padding: '0 10px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: 'var(--forest)',
              textDecoration: 'none',
            }}
            title="Refer Client / Share Listing"
          >
            <Share2 size={13} />
            <span>Refer</span>
          </Link>
          <button
            type="button"
            onClick={handleToggleTrack}
            disabled={isPending}
            className={`btn ${isTracked ? 'btn--primary' : 'btn--secondary'}`}
            style={{
              height: '34px',
              padding: '0 10px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title={isTracked ? 'Untrack Opportunity' : 'Track Opportunity'}
          >
            {isTracked ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
            <span>{isTracked ? 'Tracked' : 'Track'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
