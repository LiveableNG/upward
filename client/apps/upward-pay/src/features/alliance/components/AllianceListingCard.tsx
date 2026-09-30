'use client';

import React from 'react';
import Link from 'next/link';
import {
  MapPin,
  Bed,
  Bath,
  ShieldCheck,
  Star,
  Image as ImageIcon,
  ArrowUpRight,
} from 'lucide-react';
import type { PublicAllianceListingCard } from '../types/alliance.types';
import { getAllianceListingImage, ALLIANCE_REAL_ESTATE_PLACEHOLDERS } from '../utils/allianceImages';

interface AllianceListingCardProps {
  listing: PublicAllianceListingCard;
  referralToken?: string;
  baseHref?: string;
}

export const AllianceListingCard: React.FC<AllianceListingCardProps> = ({
  listing,
  referralToken,
  baseHref = '/dashboard/alliance',
}) => {
  const detailUrl = referralToken
    ? `${baseHref}/${listing.uuid}?ref=${encodeURIComponent(referralToken)}`
    : `${baseHref}/${listing.uuid}`;

  const formatPrice = (amount?: number | null, currency = 'NGN') => {
    if (amount === undefined || amount === null) return 'Price on Request';
    const symbol = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '₦';
    return `${symbol}${amount.toLocaleString()}`;
  };

  const hasQualifications = (listing.pm.qualifications || []).length > 0;
  const ratingScore = listing.ratingSummary?.averageScore;
  const totalRatings = listing.ratingSummary?.totalRatings || 0;

  return (
    <Link href={detailUrl} className="pay-alliance-card">
      {/* Media / Image Container */}
      <div className="pay-alliance-card__media">
        <img
          src={getAllianceListingImage(listing)}
          alt={listing.title}
          className="pay-alliance-card__img"
          loading="lazy"
          onError={(e) => {
            const target = e.currentTarget;
            target.onerror = null;
            target.src = ALLIANCE_REAL_ESTATE_PLACEHOLDERS[0];
          }}
        />

        {/* Intent Badge */}
        <span
          className={`pay-alliance-card__intent-badge ${
            listing.intent === 'SALE'
              ? 'pay-alliance-card__intent-badge--sale'
              : 'pay-alliance-card__intent-badge--rent'
          }`}
        >
          {listing.intent === 'SALE' ? 'For Sale' : 'For Rent'}
        </span>

        {/* Media count pill */}
        {listing.mediaCount > 1 && (
          <div className="pay-alliance-card__media-count">
            <ImageIcon size={12} />
            <span>{listing.mediaCount}</span>
          </div>
        )}
      </div>

      {/* Body Content */}
      <div className="pay-alliance-card__body">
        {/* Price & Action */}
        <div className="pay-alliance-card__price-row">
          <div>
            <span className="pay-alliance-card__price">
              {formatPrice(listing.price, listing.currency)}
            </span>
            {listing.intent === 'RENT' && (
              <span className="pay-alliance-card__price-period"> / yr</span>
            )}
          </div>
          <div className="pay-alliance-card__arrow">
            <ArrowUpRight size={16} />
          </div>
        </div>

        {/* Title */}
        <h3 className="pay-alliance-card__title" title={listing.title}>
          {listing.title}
        </h3>

        {/* Location */}
        <div className="pay-alliance-card__location">
          <MapPin size={13} style={{ flexShrink: 0 }} />
          <span>
            {[listing.address, listing.city, listing.state].filter(Boolean).join(', ') ||
              'Location Available on Request'}
          </span>
        </div>

        {/* Specs: Beds / Baths / Type */}
        <div className="pay-alliance-card__specs">
          {listing.bedrooms !== null && listing.bedrooms !== undefined && (
            <div className="pay-alliance-card__spec-item">
              <Bed size={14} />
              <span>{listing.bedrooms} Beds</span>
            </div>
          )}
          {listing.bathrooms !== null && listing.bathrooms !== undefined && (
            <div className="pay-alliance-card__spec-item">
              <Bath size={14} />
              <span>{listing.bathrooms} Baths</span>
            </div>
          )}
          {listing.propertyType && (
            <span className="pay-alliance-card__property-type">
              {listing.propertyType}
            </span>
          )}
        </div>

        {/* Footer: PM profile & ratings */}
        <div className="pay-alliance-card__footer">
          <div className="pay-alliance-card__pm">
            <span>{listing.pm.displayName}</span>
            {hasQualifications && (
              <ShieldCheck size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
            )}
          </div>

          {totalRatings > 0 && ratingScore ? (
            <div className="pay-alliance-card__rating">
              <Star size={13} style={{ fill: '#eab308', color: '#eab308' }} />
              <span>{ratingScore.toFixed(1)}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                ({totalRatings})
              </span>
            </div>
          ) : (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Verified PM
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};
