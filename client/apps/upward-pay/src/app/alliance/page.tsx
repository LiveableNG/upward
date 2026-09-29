'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Building2, Sparkles, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAllianceMarketplace } from '@/features/alliance/hooks/useAllianceMarketplace';
import { AllianceListingCard } from '@/features/alliance/components/AllianceListingCard';
import { AllianceFilterBar } from '@/features/alliance/components/AllianceFilterBar';
import { PublicAllianceMarketplaceQuery } from '@/features/alliance/types/alliance.types';

export default function AllianceMarketplacePage() {
  const [query, setQuery] = useState<PublicAllianceMarketplaceQuery>({
    page: 1,
    limit: 12,
    sortBy: 'newest',
  });

  const { data, isLoading, isError, error, refetch } = useAllianceMarketplace(query);

  const handleQueryChange = (updated: Partial<PublicAllianceMarketplaceQuery>) => {
    setQuery((prev) => ({ ...prev, ...updated }));
  };

  const handleResetFilters = () => {
    setQuery({ page: 1, limit: 12, sortBy: 'newest' });
  };

  const items = data?.data || [];
  const meta = data?.meta || { page: 1, limit: 12, total: 0, totalPages: 1 };

  return (
    <div className="min-h-screen bg-neutral-50/50 pb-16 dark:bg-neutral-950">
      {/* Hero Header */}
      <header className="border-b border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Upward Alliance Marketplace</span>
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl dark:text-white">
                Discover Verified Homes & Opportunities
              </h1>
              <p className="mt-1 text-xs text-neutral-500 sm:text-sm dark:text-neutral-400">
                Direct access to high-quality properties represented by certified professional managers.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="mt-6">
            <AllianceFilterBar
              query={query}
              onChange={handleQueryChange}
              onReset={handleResetFilters}
            />
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        {/* Results Header */}
        <div className="mb-6 flex items-center justify-between text-xs font-medium text-neutral-500">
          <span>
            {isLoading ? 'Searching...' : `Showing ${items.length} of ${meta.total} properties`}
          </span>
        </div>

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex animate-pulse flex-col rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="aspect-[16/10] w-full rounded-xl bg-neutral-200 dark:bg-neutral-800" />
                <div className="mt-4 h-5 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
                <div className="mt-2 h-4 w-1/2 rounded bg-neutral-200 dark:bg-neutral-800" />
                <div className="mt-6 flex justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
                  <div className="h-4 w-24 rounded bg-neutral-200 dark:bg-neutral-800" />
                  <div className="h-4 w-12 rounded bg-neutral-200 dark:bg-neutral-800" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && !isLoading && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/50 p-12 text-center dark:border-red-900/40 dark:bg-red-950/20">
            <AlertCircle className="h-10 w-10 text-red-500" />
            <h3 className="mt-3 text-base font-bold text-red-900 dark:text-red-300">
              Unable to load listings
            </h3>
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {(error as any)?.message || 'Something went wrong while fetching properties.'}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && items.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800">
              <Building2 className="h-7 w-7 stroke-[1.5]" />
            </div>
            <h3 className="mt-4 text-base font-bold text-neutral-900 dark:text-white">
              No matching properties found
            </h3>
            <p className="mt-1 max-w-sm text-xs text-neutral-500">
              Try adjusting your search criteria, property type, or clearing filters to see more listings.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-5 rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* Listing Grid */}
        {!isLoading && !isError && items.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((listing) => (
              <AllianceListingCard
                key={listing.uuid}
                listing={listing}
                baseHref="/alliance"
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && !isError && meta.totalPages > 1 && (
          <div className="mt-10 flex items-center justify-between border-t border-neutral-200/80 pt-6 text-xs dark:border-neutral-800">
            <span className="text-neutral-500">
              Page {meta.page} of {meta.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={meta.page <= 1}
                onClick={() => handleQueryChange({ page: meta.page - 1 })}
                className="flex items-center gap-1 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>
              <button
                type="button"
                disabled={meta.page >= meta.totalPages}
                onClick={() => handleQueryChange({ page: meta.page + 1 })}
                className="flex items-center gap-1 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
