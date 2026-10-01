'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Building2, Sparkles, AlertCircle, ChevronLeft, ChevronRight, LayoutDashboard } from 'lucide-react';
import { useAllianceMarketplace } from '@/features/alliance/hooks/useAllianceMarketplace';
import { AllianceListingCard } from '@/features/alliance/components/AllianceListingCard';
import { AllianceFilterBar } from '@/features/alliance/components/AllianceFilterBar';
import type { PublicAllianceMarketplaceQuery } from '@/features/alliance/types/alliance.types';

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
    <div className="pay-alliance" style={{ padding: '24px 20px 80px 20px' }}>
      {/* Header */}
      <div className="pay-alliance__header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div className="pay-alliance__badge">
            <Sparkles size={14} />
            <span>Upward Alliance Marketplace</span>
          </div>

          <Link
            href="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '12px',
              border: '1px solid var(--border-solid, #e2ddd7)',
              background: '#ffffff',
              fontSize: '12.5px',
              fontWeight: 600,
              color: 'var(--text)',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <LayoutDashboard size={15} />
            <span>Go to Dashboard</span>
          </Link>
        </div>

        <h1 className="pay-alliance__title">Discover Verified Homes & Properties</h1>
        <p className="pay-alliance__subtitle">
          Direct access to high-quality properties represented by certified professional managers across Nigeria.
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
        <div className="pay-alliance-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="pay-alliance-skeleton">
              <div className="pay-alliance-skeleton__media" />
              <div className="pay-alliance-skeleton__line" style={{ width: '70%' }} />
              <div className="pay-alliance-skeleton__line" style={{ width: '45%' }} />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <div className="pay-alliance-skeleton__line" style={{ width: '40%' }} />
                <div className="pay-alliance-skeleton__line" style={{ width: '20%' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && !isLoading && (
        <div className="pay-alliance-empty" style={{ borderColor: '#fca5a5' }}>
          <div className="pay-alliance-empty__icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
            <AlertCircle size={28} />
          </div>
          <h3 className="pay-alliance-empty__title" style={{ color: '#991b1b' }}>
            Unable to Load Listings
          </h3>
          <p className="pay-alliance-empty__desc">
            {(error as any)?.message || 'Something went wrong while fetching properties.'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="pay-alliance-empty__btn"
            style={{ background: '#dc2626' }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && items.length === 0 && (
        <div className="pay-alliance-empty">
          <div className="pay-alliance-empty__icon">
            <Building2 size={28} />
          </div>
          <h3 className="pay-alliance-empty__title">No Properties Found</h3>
          <p className="pay-alliance-empty__desc">
            Try adjusting your search criteria, property type, or clearing filters to see more listings.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="pay-alliance-empty__btn"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Grid */}
      {!isLoading && !isError && items.length > 0 && (
        <div className="pay-alliance-grid">
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
        <div className="pay-alliance-pagination">
          <span>
            Page {meta.page} of {meta.totalPages} ({meta.total} total listings)
          </span>
          <div className="pay-alliance-pagination__controls">
            <button
              type="button"
              disabled={meta.page <= 1}
              onClick={() => handleQueryChange({ page: meta.page - 1 })}
              className="pay-alliance-pagination__btn"
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>
            <button
              type="button"
              disabled={meta.page >= meta.totalPages}
              onClick={() => handleQueryChange({ page: meta.page + 1 })}
              className="pay-alliance-pagination__btn"
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
