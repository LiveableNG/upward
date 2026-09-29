'use client';

import React, { useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin,
  Bed,
  Bath,
  Building,
  ArrowLeft,
  MessageSquare,
  Share2,
  Calendar,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import {
  useAllianceListingDetail,
  useAllianceReferral,
} from '@/features/alliance/hooks/useAllianceMarketplace';
import { AllianceGallery } from '@/features/alliance/components/AllianceGallery';
import { AlliancePmProfileCard } from '@/features/alliance/components/AlliancePmProfileCard';
import { AllianceInquiryModal } from '@/features/alliance/components/AllianceInquiryModal';
import { AllianceRatingModal } from '@/features/alliance/components/AllianceRatingModal';
import { AllianceReferralBanner } from '@/features/alliance/components/AllianceReferralBanner';
import { useAuth } from '@/features/auth/AuthContext';

export default function DashboardAllianceDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const uuid = params?.uuid as string;
  const refToken = searchParams?.get('ref') || undefined;

  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const { data: listing, isLoading, isError, error } = useAllianceListingDetail(uuid);
  const { data: referralContext } = useAllianceReferral(refToken);

  const handleShare = () => {
    if (navigator?.clipboard && typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const formatPrice = (amount?: number | null, currency = 'NGN') => {
    if (amount === undefined || amount === null) return 'Price on Request';
    const symbol = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '₦';
    return `${symbol}${amount.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <div className="pay-alliance-detail" style={{ paddingTop: '20px' }}>
        <div className="pay-alliance-skeleton__line" style={{ width: '140px', height: '24px' }} />
        <div className="pay-alliance-skeleton__media" style={{ height: '360px' }} />
        <div className="pay-alliance-skeleton__line" style={{ width: '60%', height: '32px' }} />
      </div>
    );
  }

  if (isError || !listing) {
    return (
      <div className="pay-alliance-empty" style={{ margin: '40px auto', maxWidth: '500px' }}>
        <div className="pay-alliance-empty__icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
          <AlertCircle size={32} />
        </div>
        <h3 className="pay-alliance-empty__title">Listing Unavailable</h3>
        <p className="pay-alliance-empty__desc">
          {(error as any)?.message || 'This property listing is no longer active or could not be found.'}
        </p>
        <Link href="/dashboard/alliance" className="pay-alliance-empty__btn">
          Back to Listings
        </Link>
      </div>
    );
  }

  const referringPm = referralContext?.referringPm;
  const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';

  return (
    <div className="pay-alliance-detail">
      {/* Top Bar Navigation */}
      <div className="pay-alliance-detail__top-bar">
        <button
          type="button"
          onClick={() => router.back()}
          className="pay-alliance-detail__back-btn"
        >
          <ArrowLeft size={16} />
          <span>Back to Marketplace</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="pay-alliance-detail__share-btn"
        >
          <Share2 size={15} />
          <span>{copiedLink ? 'Copied Link!' : 'Share'}</span>
        </button>
      </div>

      {/* Referral Banner (if referred) */}
      {referringPm && (
        <AllianceReferralBanner
          referringPm={referringPm}
          clientName={referralContext?.clientName}
        />
      )}

      {/* Gallery */}
      <AllianceGallery media={listing.media} title={listing.title} uuid={listing.uuid} />

      {/* 2-Column Detail Grid */}
      <div className="pay-alliance-detail__grid">
        {/* Main Column */}
        <div className="pay-alliance-detail__main-col">
          {/* Header Card */}
          <div className="pay-alliance-detail__card">
            <div className="pay-alliance-detail__badges-row">
              <span className="pay-alliance-detail__tag pay-alliance-detail__tag--intent">
                {listing.intent === 'SALE' ? 'For Sale' : 'For Rent'}
              </span>
              {listing.propertyType && (
                <span className="pay-alliance-detail__tag pay-alliance-detail__tag--type">
                  {listing.propertyType}
                </span>
              )}
            </div>

            <h1 className="pay-alliance-detail__property-title">{listing.title}</h1>

            <div className="pay-alliance-detail__location">
              <MapPin size={16} style={{ color: 'var(--clay)', flexShrink: 0 }} />
              <span>
                {[listing.address, listing.city, listing.state, listing.country]
                  .filter(Boolean)
                  .join(', ') || 'Location details available upon inquiry'}
              </span>
            </div>
          </div>

          {/* Features Grid */}
          <div className="pay-alliance-features">
            {listing.bedrooms !== null && listing.bedrooms !== undefined && (
              <div className="pay-alliance-features__box">
                <Bed size={22} className="pay-alliance-features__box-icon" />
                <div>
                  <span className="pay-alliance-features__box-label">Bedrooms</span>
                  <span className="pay-alliance-features__box-val">{listing.bedrooms} Beds</span>
                </div>
              </div>
            )}

            {listing.bathrooms !== null && listing.bathrooms !== undefined && (
              <div className="pay-alliance-features__box">
                <Bath size={22} className="pay-alliance-features__box-icon" />
                <div>
                  <span className="pay-alliance-features__box-label">Bathrooms</span>
                  <span className="pay-alliance-features__box-val">{listing.bathrooms} Baths</span>
                </div>
              </div>
            )}

            {listing.targetType && (
              <div className="pay-alliance-features__box">
                <Building size={22} className="pay-alliance-features__box-icon" />
                <div>
                  <span className="pay-alliance-features__box-label">Type</span>
                  <span className="pay-alliance-features__box-val">{listing.targetType}</span>
                </div>
              </div>
            )}

            {listing.publishedAt && (
              <div className="pay-alliance-features__box">
                <Calendar size={22} className="pay-alliance-features__box-icon" />
                <div>
                  <span className="pay-alliance-features__box-label">Listed</span>
                  <span className="pay-alliance-features__box-val">
                    {new Date(listing.publishedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {listing.description && (
            <div className="pay-alliance-detail__card">
              <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>
                Property Overview
              </h3>
              <p
                style={{
                  fontSize: '13.5px',
                  lineHeight: '1.65',
                  color: 'var(--text-secondary)',
                  whiteSpace: 'pre-line',
                  margin: 0,
                }}
              >
                {listing.description}
              </p>
            </div>
          )}

          {/* Referring PM Card */}
          {referringPm && (
            <AlliancePmProfileCard
              pm={referringPm}
              ratingSummary={referralContext?.listing?.ratingSummary}
              roleLabel="Your Referring Partner"
            />
          )}

          {/* Listing PM Card */}
          <AlliancePmProfileCard
            pm={listing.pm}
            ratingSummary={listing.ratingSummary}
            roleLabel="Listing Property Manager"
          />
        </div>

        {/* Right Sticky Card */}
        <div>
          <div className="pay-alliance-sticky-card">
            <span className="pay-alliance-sticky-card__label">
              {listing.intent === 'SALE' ? 'Purchase Price' : 'Annual Rental'}
            </span>

            <div>
              <span className="pay-alliance-sticky-card__price">
                {formatPrice(listing.price, listing.currency)}
              </span>
              {listing.intent === 'RENT' && (
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {' '}
                  / yr
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsInquiryModalOpen(true)}
              className="pay-alliance-sticky-card__cta"
            >
              <MessageSquare size={17} />
              <span>Contact Property Manager</span>
            </button>

            <div className="pay-alliance-sticky-card__footer">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <ShieldCheck size={14} style={{ color: 'var(--clay)' }} />
                <span>Upward Alliance Protection Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inquiry Modal */}
      <AllianceInquiryModal
        isOpen={isInquiryModalOpen}
        onClose={() => setIsInquiryModalOpen(false)}
        listingUuid={listing.uuid}
        listingTitle={listing.title}
        referralToken={refToken}
        referringPm={referringPm}
        initialClientName={userName || referralContext?.clientName || ''}
        initialClientEmail={user?.email || ''}
      />

      {/* Rating Modal */}
      {referralContext && (
        <AllianceRatingModal
          isOpen={isRatingModalOpen}
          onClose={() => setIsRatingModalOpen(false)}
          referralUuid={referralContext.referralUuid}
          pmName={referringPm?.displayName || listing.pm.displayName}
        />
      )}
    </div>
  );
}
