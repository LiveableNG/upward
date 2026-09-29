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

interface AllianceListingCardProps {
  listing: PublicAllianceListingCard;
  referralToken?: string;
  baseHref?: string;
}

export const AllianceListingCard: React.FC<AllianceListingCardProps> = ({
  listing,
  referralToken,
  baseHref = '/alliance',
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
    <Link
      href={detailUrl}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white transition-all duration-200 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
    >
      {/* Media / Image Container */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
        {listing.primaryMedia ? (
          <img
            src={listing.primaryMedia.publicUrl}
            alt={listing.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-400">
            <ImageIcon className="h-10 w-10 stroke-[1.5]" />
          </div>
        )}

        {/* Intent Badge */}
        <div className="absolute left-3 top-3">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur-md ${
              listing.intent === 'SALE'
                ? 'bg-emerald-600/90 text-white'
                : 'bg-neutral-900/80 text-white'
            }`}
          >
            {listing.intent === 'SALE' ? 'For Sale' : 'For Rent'}
          </span>
        </div>

        {/* Media count pill */}
        {listing.mediaCount > 1 && (
          <div className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md bg-neutral-900/70 px-2 py-0.5 text-xs text-white backdrop-blur-md">
            <ImageIcon className="h-3 w-3" />
            <span>{listing.mediaCount}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Price & Action */}
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <span className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {formatPrice(listing.price, listing.currency)}
            </span>
            {listing.intent === 'RENT' && (
              <span className="ml-1 text-xs font-medium text-neutral-500">/ yr</span>
            )}
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition-colors group-hover:bg-neutral-900 group-hover:text-white dark:bg-neutral-800 dark:text-neutral-300 dark:group-hover:bg-white dark:group-hover:text-neutral-900">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>

        {/* Title */}
        <h3 className="mt-2 line-clamp-1 text-base font-semibold text-neutral-900 dark:text-white">
          {listing.title}
        </h3>

        {/* Location */}
        <div className="mt-1.5 flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
          <span className="truncate">
            {[listing.address, listing.city, listing.state].filter(Boolean).join(', ') ||
              'Location Available on Request'}
          </span>
        </div>

        {/* Specs: Beds / Baths / Type */}
        <div className="mt-3 flex items-center gap-3 text-xs font-medium text-neutral-600 dark:text-neutral-300">
          {listing.bedrooms !== null && listing.bedrooms !== undefined && (
            <div className="flex items-center gap-1">
              <Bed className="h-3.5 w-3.5 text-neutral-400" />
              <span>{listing.bedrooms} Beds</span>
            </div>
          )}
          {listing.bathrooms !== null && listing.bathrooms !== undefined && (
            <div className="flex items-center gap-1">
              <Bath className="h-3.5 w-3.5 text-neutral-400" />
              <span>{listing.bathrooms} Baths</span>
            </div>
          )}
          {listing.propertyType && (
            <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
              {listing.propertyType}
            </span>
          )}
        </div>

        {/* Footer: PM profile & ratings */}
        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
            <div className="flex items-center gap-1.5 truncate">
              <span className="truncate text-xs font-medium text-neutral-700 dark:text-neutral-300">
                {listing.pm.displayName}
              </span>
              {hasQualifications && (
                <span title="Verified Professional PM" className="inline-flex items-center">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                </span>
              )}
            </div>

            {totalRatings > 0 && ratingScore ? (
              <div className="flex items-center gap-1 text-xs font-semibold text-neutral-900 dark:text-white">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span>{ratingScore.toFixed(1)}</span>
                <span className="text-[10px] text-neutral-400">({totalRatings})</span>
              </div>
            ) : (
              <span className="text-[11px] text-neutral-400">Verified PM</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};
