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
  Star,
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

export default function AllianceListingDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

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
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-6 w-32 rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="aspect-[16/9] w-full rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-8 w-2/3 rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-4 w-1/3 rounded bg-neutral-200 dark:bg-neutral-800" />
        </div>
      </div>
    );
  }

  if (isError || !listing) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h2 className="mt-4 text-lg font-bold text-neutral-900 dark:text-white">
          Listing Unavailable
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          {(error as any)?.message ||
            'This Alliance listing is not available or has been removed.'}
        </p>
        <Link
          href="/alliance"
          className="mt-6 inline-flex rounded-xl bg-neutral-900 px-5 py-2.5 text-xs font-semibold text-white dark:bg-white dark:text-neutral-900"
        >
          Back to Marketplace
        </Link>
      </div>
    );
  }

  const referringPm = referralContext?.referringPm;

  return (
    <div className="min-h-screen bg-neutral-50/50 pb-20 dark:bg-neutral-950">
      {/* Top Breadcrumb & Action Bar */}
      <div className="border-b border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>{copiedLink ? 'Copied Link!' : 'Share'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Detail Container */}
      <main className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        {/* Referral Banner (if referred) */}
        {referringPm && (
          <div className="mb-6">
            <AllianceReferralBanner
              referringPm={referringPm}
              clientName={referralContext?.clientName}
            />
          </div>
        )}

        {/* Gallery */}
        <AllianceGallery media={listing.media} title={listing.title} />

        {/* Content Layout */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left 2 Cols: Details & Description */}
          <div className="space-y-6 lg:col-span-2">
            {/* Header info */}
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

              <h1 className="mt-3 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl dark:text-white">
                {listing.title}
              </h1>

              <div className="mt-2 flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                <MapPin className="h-4 w-4 shrink-0 text-neutral-400" />
                <span>
                  {[listing.address, listing.city, listing.state, listing.country]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </div>
            </div>

            {/* Key Features Chips */}
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
                    <span className="block text-[11px] text-neutral-400">Inventory Type</span>
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
                    <span className="block text-[11px] text-neutral-400">Published</span>
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">
                      {new Date(listing.publishedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {listing.description && (
              <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  About This Property
                </h3>
                <p className="mt-3 whitespace-pre-line text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {listing.description}
                </p>
              </div>
            )}

            {/* Referring PM Card (if applicable) */}
            {referringPm && (
              <AlliancePmProfileCard
                pm={referringPm}
                ratingSummary={referralContext?.listing?.ratingSummary}
                roleLabel="Your Referring Property Manager"
              />
            )}

            {/* Listing Owner PM Card */}
            <AlliancePmProfileCard
              pm={listing.pm}
              ratingSummary={listing.ratingSummary}
              roleLabel="Listing Property Manager"
            />
          </div>

          {/* Right Col: Price & Action Box */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-md dark:border-neutral-800 dark:bg-neutral-900">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                {listing.intent === 'SALE' ? 'Total Price' : 'Annual Rent'}
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-neutral-900 dark:text-white">
                  {formatPrice(listing.price, listing.currency)}
                </span>
                {listing.intent === 'RENT' && (
                  <span className="text-xs text-neutral-500">/ yr</span>
                )}
              </div>

              {/* Inquiry CTA */}
              <button
                type="button"
                onClick={() => setIsInquiryModalOpen(true)}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 py-3.5 text-xs font-bold text-white shadow-sm transition-transform hover:scale-[1.02] dark:bg-white dark:text-neutral-900"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Contact Property Manager</span>
              </button>

              {/* Verified Badge */}
              <div className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-neutral-400">
                <span>Verified Upward Alliance Listing</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Inquiry Modal */}
      <AllianceInquiryModal
        isOpen={isInquiryModalOpen}
        onClose={() => setIsInquiryModalOpen(false)}
        listingUuid={listing.uuid}
        listingTitle={listing.title}
        referralToken={refToken}
        referringPm={referringPm}
        initialClientName={referralContext?.clientName || ''}
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
