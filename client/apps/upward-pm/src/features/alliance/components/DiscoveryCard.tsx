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
  UserCheck,
  Layers,
  Award,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react'
import { AllianceDiscoveredListingSummary } from '../types/alliance.types'
import { useTrackAllianceListing, useUntrackAllianceListing } from '../hooks/useAlliance'
import { useToast } from '@/components/common/Toast'

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

  const primaryImage =
    listing.primaryMedia?.publicUrl ||
    listing.primaryMedia?.fileUrl ||
    (listing.media && listing.media.length > 0 ? listing.media[0].publicUrl : null)

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
    <div
      style={{
        background: 'var(--dark)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      {/* Media Cover Image */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '200px',
          background: 'linear-gradient(135deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.9) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={listing.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--text-muted)',
            }}
          >
            <ImageIcon size={32} />
            <span style={{ fontSize: '12px' }}>No media uploaded</span>
          </div>
        )}

        {/* Intent Badge */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            display: 'flex',
            gap: '6px',
            zIndex: 2,
          }}
        >
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              background: listing.intent === 'SALE' ? 'rgba(217, 119, 6, 0.9)' : 'rgba(22, 101, 52, 0.9)',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.5px',
              backdropFilter: 'blur(4px)',
            }}
          >
            {listing.intent === 'SALE' ? 'FOR SALE' : 'FOR RENT'}
          </span>

          <span
            style={{
              padding: '4px 8px',
              borderRadius: '20px',
              background: 'rgba(0, 0, 0, 0.65)',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backdropFilter: 'blur(4px)',
            }}
          >
            {listing.targetType === 'PROPERTY' ? <Building2 size={12} /> : <Home size={12} />}
            {listing.targetType === 'PROPERTY' ? 'Property' : 'Unit'}
          </span>
        </div>

        {/* Track Bookmark Button (Top Right) */}
        <button
          type="button"
          onClick={handleToggleTrack}
          disabled={isPending}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 3,
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: isTracked ? 'var(--forest)' : 'rgba(0, 0, 0, 0.65)',
            color: '#ffffff',
            border: isTracked ? '2px solid rgba(255,255,255,0.8)' : '1px solid rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isPending ? 'not-allowed' : 'pointer',
            backdropFilter: 'blur(6px)',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
          title={isTracked ? 'Tracking (Click to untrack)' : 'Track opportunity'}
        >
          {isTracked ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
        </button>

        {/* Media count badge */}
        {mediaCount > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              right: '12px',
              padding: '3px 8px',
              borderRadius: '12px',
              background: 'rgba(0, 0, 0, 0.7)',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backdropFilter: 'blur(4px)',
            }}
          >
            <ImageIcon size={12} />
            {mediaCount} {mediaCount === 1 ? 'photo' : 'photos'}
          </div>
        )}
      </div>

      {/* Card Body */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, gap: '12px' }}>
        {/* Price & Property Type */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>
              {formatPrice(listing.price, listing.currency)}
              {listing.intent === 'RENT' && (
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '4px' }}>
                  / year
                </span>
              )}
            </div>
            {listing.propertyType && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {listing.propertyType}
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--text)',
            margin: 0,
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
          title={listing.title}
        >
          {listing.title}
        </h3>

        {/* Location */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
          }}
        >
          <MapPin size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <span
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {locationText}
          </span>
        </div>

        {/* Bedrooms / Bathrooms Specs */}
        {(listing.bedrooms !== null || listing.bathrooms !== null) && (
          <div
            style={{
              display: 'flex',
              gap: '12px',
              padding: '8px 0',
              borderTop: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
              fontSize: '12px',
              color: 'var(--text-secondary)',
            }}
          >
            {listing.bedrooms !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Bed size={14} color="var(--text-muted)" />
                <span>{listing.bedrooms} Beds</span>
              </div>
            )}
            {listing.bathrooms !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Bath size={14} color="var(--text-muted)" />
                <span>{listing.bathrooms} Baths</span>
              </div>
            )}
          </div>
        )}

        {/* Owner PM Identity Box */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(59, 130, 246, 0.12)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
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
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    background: 'rgba(22, 101, 52, 0.08)',
                    color: 'var(--forest)',
                    fontSize: '10px',
                    fontWeight: 700,
                  }}
                  title={qual.name}
                >
                  <ShieldCheck size={11} />
                  {qual.name}
                </span>
              ))}
              {activeQualifications.length > 2 && (
                <span
                  style={{
                    padding: '2px 4px',
                    borderRadius: '6px',
                    background: 'var(--bg)',
                    color: 'var(--text-muted)',
                    fontSize: '10px',
                    fontWeight: 600,
                  }}
                >
                  +{activeQualifications.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action Button Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', marginTop: '8px' }}>
          <Link
            href={`/alliance/discover/${listing.uuid}`}
            className="btn btn--secondary"
            style={{
              height: '36px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
            }}
          >
            View Listing
          </Link>
          <button
            type="button"
            onClick={handleToggleTrack}
            disabled={isPending}
            className={`btn ${isTracked ? 'btn--primary' : 'btn--secondary'}`}
            style={{
              height: '36px',
              padding: '0 12px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title={isTracked ? 'Untrack Opportunity' : 'Track Opportunity'}
          >
            {isTracked ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
            <span>{isTracked ? 'Tracking' : 'Track'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
