'use client';

import React, { useState } from 'react';
import { Building2, Sparkles, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAllianceMarketplace } from '@/features/alliance/hooks/useAllianceMarketplace';
import { AllianceListingCard } from '@/features/alliance/components/AllianceListingCard';
import { AllianceFilterBar } from '@/features/alliance/components/AllianceFilterBar';
import { PublicAllianceMarketplaceQuery } from '@/features/alliance/types/alliance.types';

export default function DashboardAlliancePage() {
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
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          <span>Alliance Network</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Explore Verified Properties
        </h1>
        <p className="text-xs text-neutral-500">
          Browse vetted homes and exclusive listings across the Upward Alliance network.
        </p>
      </div>

      {/* Filter Bar */}
      <AllianceFilterBar
        query={query}
        onChange={handleQueryChange}
        onReset={handleResetFilters}
      />

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
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
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/50 p-10 text-center dark:border-red-900/40 dark:bg-red-950/20">
          <AlertCircle className="h-9 w-9 text-red-500" />
          <h3 className="mt-3 text-sm font-bold text-red-900 dark:text-red-300">
            Failed to load properties
          </h3>
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            {(error as any)?.message || 'Something went wrong.'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <Building2 className="h-10 w-10 text-neutral-400" />
          <h3 className="mt-3 text-base font-bold text-neutral-900 dark:text-white">
            No properties found
          </h3>
          <p className="mt-1 text-xs text-neutral-500">
            Try adjusting your search criteria or resetting filters.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-4 rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white dark:bg-white dark:text-neutral-900"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Grid */}
      {!isLoading && !isError && items.length > 0 && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((listing) => (
            <AllianceListingCard
              key={listing.uuid}
              listing={listing}
              baseHref="/dashboard/alliance"
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !isError && meta.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-neutral-200/80 pt-4 text-xs dark:border-neutral-800">
          <span className="text-neutral-500">
            Page {meta.page} of {meta.totalPages} ({meta.total} total)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={meta.page <= 1}
              onClick={() => handleQueryChange({ page: meta.page - 1 })}
              className="flex items-center gap-1 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>
            <button
              type="button"
              disabled={meta.page >= meta.totalPages}
              onClick={() => handleQueryChange({ page: meta.page + 1 })}
              className="flex items-center gap-1 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
