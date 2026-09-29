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
  CreditCard,
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
      <div className="animate-pulse space-y-6 py-6">
        <div className="h-6 w-32 rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="aspect-[16/9] w-full rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-8 w-2/3 rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>
    );
  }

  if (isError || !listing) {
    return (
      <div className="py-16 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h2 className="mt-4 text-base font-bold text-neutral-900 dark:text-white">
          Listing Unavailable
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          {(error as any)?.message || 'This property listing is no longer active.'}
        </p>
        <Link
          href="/dashboard/alliance"
          className="mt-5 inline-flex rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white dark:bg-white dark:text-neutral-900"
        >
          Back to Listings
        </Link>
      </div>
    );
  }

  const referringPm = referralContext?.referringPm;

  const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';

  return (
    <div className="space-y-6 pb-20">
      {/* Top Breadcrumb & Share */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Marketplace</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span>{copiedLink ? 'Copied!' : 'Share'}</span>
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
      <AllianceGallery media={listing.media} title={listing.title} />

      {/* Grid Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 Cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Main Info */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  listing.intent === 'SALE'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                }`}
              >
                {listing.intent === 'SALE' ? 'For Sale' : 'For Rent'}
              </span>
              {listing.propertyType && (
                <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                  {listing.propertyType}
                </span>
              )}
            </div>

            <h1 className="mt-3 text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {listing.title}
            </h1>

            <div className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              <MapPin className="h-4 w-4 shrink-0 text-neutral-400" />
              <span>
                {[listing.address, listing.city, listing.state, listing.country]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {listing.bedrooms !== null && listing.bedrooms !== undefined && (
              <div className="flex items-center gap-2.5 rounded-xl border border-neutral-200/80 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
                <Bed className="h-5 w-5 text-neutral-500" />
                <div>
                  <span className="block text-[11px] text-neutral-400">Bedrooms</span>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">
                    {listing.bedrooms} Beds
                  </span>
                </div>
              </div>
            )}

            {listing.bathrooms !== null && listing.bathrooms !== undefined && (
              <div className="flex items-center gap-2.5 rounded-xl border border-neutral-200/80 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
                <Bath className="h-5 w-5 text-neutral-500" />
                <div>
                  <span className="block text-[11px] text-neutral-400">Bathrooms</span>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">
                    {listing.bathrooms} Baths
                  </span>
                </div>
              </div>
            )}

            {listing.targetType && (
              <div className="flex items-center gap-2.5 rounded-xl border border-neutral-200/80 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
                <Building className="h-5 w-5 text-neutral-500" />
                <div>
                  <span className="block text-[11px] text-neutral-400">Inventory</span>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">
                    {listing.targetType}
                  </span>
                </div>
              </div>
            )}

            {listing.publishedAt && (
              <div className="flex items-center gap-2.5 rounded-xl border border-neutral-200/80 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
                <Calendar className="h-5 w-5 text-neutral-500" />
                <div>
                  <span className="block text-[11px] text-neutral-400">Listed</span>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">
                    {new Date(listing.publishedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {listing.description && (
            <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                Property Overview
              </h3>
              <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
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
        <div className="lg:col-span-1">
          <div className="sticky top-6 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              {listing.intent === 'SALE' ? 'Purchase Price' : 'Annual Rent'}
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-neutral-900 dark:text-white">
                {formatPrice(listing.price, listing.currency)}
              </span>
              {listing.intent === 'RENT' && (
                <span className="text-xs text-neutral-500">/ yr</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsInquiryModalOpen(true)}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 py-3 text-xs font-bold text-white shadow-sm transition-transform hover:scale-[1.02] dark:bg-white dark:text-neutral-900"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Contact Manager</span>
            </button>

            <div className="mt-4 border-t border-neutral-100 pt-4 text-center dark:border-neutral-800">
              <span className="text-[11px] text-neutral-400">
                Upward Pay Verified Protection Active
              </span>
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
