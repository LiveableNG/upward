'use client'

import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  Home,
  MapPin,
  Bed,
  Bath,
  ShieldCheck,
  ImageIcon,
  Calendar,
  AlertTriangle,
  Layers,
  ChevronLeft,
  ChevronRight,
  Info,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react'
import {
  useDiscoveredAllianceListing,
  useTrackAllianceListing,
  useUntrackAllianceListing,
} from '@/features/alliance/hooks/useAlliance'
import { useToast } from '@/components/common/Toast'

export default function DiscoveredListingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const uuid = params?.uuid as string

  const { data: listing, isLoading, isError, error } = useDiscoveredAllianceListing(uuid)
  const trackMutation = useTrackAllianceListing()
  const untrackMutation = useUntrackAllianceListing()

  const [activeMediaIndex, setActiveMediaIndex] = useState(0)

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

  const mediaList = listing?.media || []
  const activeMedia = mediaList[activeMediaIndex] || (listing?.primaryMedia ? { publicUrl: listing.primaryMedia.publicUrl || listing.primaryMedia.fileUrl } : null)

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
      <div className="page-container" style={{ padding: '24px 20px', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ height: '40px', width: '200px', background: 'var(--dark)', borderRadius: '8px', marginBottom: '20px' }} />
        <div style={{ height: '400px', background: 'var(--dark)', borderRadius: '16px', marginBottom: '20px' }} />
      </div>
    )
  }

  if (isError || !listing) {
    return (
      <div className="page-container" style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <div
          style={{
            padding: '48px 24px',
            background: 'var(--dark)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
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
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
            Listing No Longer Available
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '440px', margin: 0 }}>
            {(error as any)?.message ||
              'This Alliance listing is no longer discoverable. It may have been unpublished, marked private, or the owner’s network access may have changed.'}
          </p>
          <Link href="/alliance/discover" className="btn btn--primary" style={{ marginTop: '8px', height: '38px' }}>
            Back to Network Discovery
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container" style={{ padding: '24px 20px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Back Button */}
      <div style={{ marginBottom: '16px' }}>
        <button
          type="button"
          onClick={() => router.push('/alliance/discover')}
          className="btn btn--text"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 0',
            fontSize: '13px',
            color: 'var(--text-secondary)',
          }}
        >
          <ArrowLeft size={16} /> Back to Network Discovery
        </button>
      </div>

      {/* Main Grid: Left Column Media & Details, Right Column PM Profile & Context */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)', gap: '24px' }}>
        {/* Left Column: Media & Marketing Information */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Media Viewer */}
          <div
            style={{
              background: 'var(--dark)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              overflow: 'hidden',
            }}
          >
            {/* Featured Image */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '380px',
                background: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {activeMedia?.publicUrl ? (
                <img
                  src={activeMedia.publicUrl}
                  alt={listing.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
                  <ImageIcon size={48} />
                  <span style={{ fontSize: '13px' }}>No media uploaded</span>
                </div>
              )}

              {/* Navigation arrows if multiple images */}
              {mediaList.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveMediaIndex((prev) => (prev > 0 ? prev - 1 : mediaList.length - 1))
                    }
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'rgba(0, 0, 0, 0.65)',
                      color: '#fff',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveMediaIndex((prev) => (prev < mediaList.length - 1 ? prev + 1 : 0))
                    }
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'rgba(0, 0, 0, 0.65)',
                      color: '#fff',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails Row */}
            {mediaList.length > 1 && (
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  padding: '12px',
                  overflowX: 'auto',
                  background: 'var(--dark)',
                }}
              >
                {mediaList.map((m, idx) => (
                  <button
                    key={m.uuid}
                    type="button"
                    onClick={() => setActiveMediaIndex(idx)}
                    style={{
                      position: 'relative',
                      width: '64px',
                      height: '50px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: activeMediaIndex === idx ? '2px solid var(--forest)' : '2px solid transparent',
                      padding: 0,
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <img src={m.publicUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Marketing Presentation Details */}
          <div
            style={{
              padding: '24px',
              background: 'var(--dark)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* Header info */}
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    background: listing.intent === 'SALE' ? 'rgba(217, 119, 6, 0.12)' : 'rgba(22, 101, 52, 0.12)',
                    color: listing.intent === 'SALE' ? '#b45309' : 'var(--forest)',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  {listing.intent === 'SALE' ? 'FOR SALE' : 'FOR RENT'}
                </span>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    background: 'var(--bg)',
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {listing.targetType === 'PROPERTY' ? <Building2 size={13} /> : <Home size={13} />}
                  {listing.targetType === 'PROPERTY' ? 'Property Level' : 'Unit Level'}
                </span>
              </div>

              <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', margin: '0 0 8px 0' }}>
                {listing.title}
              </h1>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <MapPin size={15} color="var(--text-muted)" />
                <span>{locationText || 'Location not specified'}</span>
              </div>
            </div>

            {/* Price section */}
            <div
              style={{
                padding: '16px',
                background: 'var(--bg)',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                  {listing.intent === 'SALE' ? 'Asking Price' : 'Annual Rent'}
                </span>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)' }}>
                  {formatPrice(listing.price, listing.currency)}
                </div>
              </div>

              {listing.publishedAt && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={13} />
                  Published {new Date(listing.publishedAt).toLocaleDateString()}
                </div>
              )}
            </div>

            {/* Features / Specs */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '12px',
                padding: '12px 0',
                borderTop: '1px solid var(--border)',
                borderBottom: '1px solid var(--border)',
              }}
            >
              {listing.propertyType && (
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Type</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{listing.propertyType}</div>
                </div>
              )}
              {listing.bedrooms !== null && (
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Bedrooms</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{listing.bedrooms} Beds</div>
                </div>
              )}
              {listing.bathrooms !== null && (
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Bathrooms</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{listing.bathrooms} Baths</div>
                </div>
              )}
            </div>

            {/* Description */}
            {listing.description && (
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
                  About this Listing
                </h3>
                <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {listing.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Listing Owner PM & Canonical Context */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Tracking Action Card */}
          <div
            style={{
              padding: '20px',
              background: 'var(--dark)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bookmark size={17} color={isTracked ? 'var(--forest)' : 'var(--text-muted)'} />
                <h2 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                  Opportunity Tracking
                </h2>
              </div>
              {isTracked && (
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'rgba(22, 101, 52, 0.1)',
                    color: 'var(--forest)',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  TRACKED
                </span>
              )}
            </div>

            <p style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--text-secondary)', margin: 0 }}>
              {isTracked
                ? 'You are currently tracking this listing. It is saved in your Alliance pipeline for rapid reference and client matching.'
                : 'Track this listing to save it to your Alliance pipeline. The listing owner receives aggregated interest metrics without exposing your personal or business identity.'}
            </p>

            <button
              type="button"
              onClick={handleToggleTrack}
              disabled={isPending}
              className={`btn ${isTracked ? 'btn--secondary' : 'btn--primary'}`}
              style={{
                width: '100%',
                height: '40px',
                fontSize: '13px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '4px',
              }}
            >
              {isTracked ? (
                <>
                  <BookmarkCheck size={16} color="var(--forest)" />
                  <span>Remove from Tracked</span>
                </>
              ) : (
                <>
                  <Bookmark size={16} />
                  <span>Track This Opportunity</span>
                </>
              )}
            </button>
          </div>

          {/* Listing Owner PM Card */}
          <div
            style={{
              padding: '24px',
              background: 'var(--dark)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="var(--forest)" />
              <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                Alliance Listing Owner
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(59, 130, 246, 0.12)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {ownerName.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                  {ownerName}
                </div>
                {ownerTitle && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {ownerTitle}
                  </div>
                )}
              </div>
            </div>

            {ownerBio && (
              <p style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--text-secondary)', margin: 0 }}>
                "{ownerBio}"
              </p>
            )}

            {/* Active Qualifications */}
            {activeQualifications.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Verified Qualifications
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeQualifications.map((qual) => (
                    <div
                      key={qual.id}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        background: 'var(--bg)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                      }}
                    >
                      <ShieldCheck size={16} color="var(--forest)" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>
                          {qual.name}
                        </div>
                        {qual.description && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {qual.description}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Canonical Inventory Context (Read-only status info) */}
          {listing.sourceType === 'LINKED_INVENTORY' && (
            <div
              style={{
                padding: '20px',
                background: 'var(--dark)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} color="var(--text-muted)" />
                <h3 style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                  Canonical Inventory Context
                </h3>
              </div>

              <div style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                {listing.targetProperty && (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Linked Property: </span>
                    <strong>{listing.targetProperty.name}</strong>
                  </div>
                )}
                {listing.targetUnit && (
                  <div style={{ marginTop: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Linked Unit: </span>
                    <strong>{listing.targetUnit.unitName}</strong>
                    {listing.targetUnit.status && (
                      <span
                        style={{
                          marginLeft: '8px',
                          padding: '2px 6px',
                          borderRadius: '6px',
                          background: listing.targetUnit.status === 'OCCUPIED' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(22, 101, 52, 0.1)',
                          color: listing.targetUnit.status === 'OCCUPIED' ? '#854d0e' : 'var(--forest)',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        Unit Status: {listing.targetUnit.status}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  borderTop: '1px solid var(--border)',
                  paddingTop: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Info size={13} />
                <em>Display only. Canonical inventory is managed independently by the owner.</em>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
