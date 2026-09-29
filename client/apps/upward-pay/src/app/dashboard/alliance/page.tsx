'use client';

import React, { useState } from 'react';
import {
  Building2,
  Sparkles,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Compass,
  Briefcase,
} from 'lucide-react';
import {
  useAllianceMarketplace,
  useUserAllianceJourneys,
} from '@/features/alliance/hooks/useAllianceMarketplace';
import { AllianceListingCard } from '@/features/alliance/components/AllianceListingCard';
import { AllianceFilterBar } from '@/features/alliance/components/AllianceFilterBar';
import { UserAllianceJourneysList } from '@/features/alliance/components/UserAllianceJourneysList';
import type { PublicAllianceMarketplaceQuery } from '@/features/alliance/types/alliance.types';

export default function DashboardAlliancePage() {
  const [activeTab, setActiveTab] = useState<'explore' | 'journeys'>('explore');

  const [query, setQuery] = useState<PublicAllianceMarketplaceQuery>({
    page: 1,
    limit: 12,
    sortBy: 'newest',
  });

  const { data, isLoading, isError, error, refetch } = useAllianceMarketplace(query);
  const { data: journeys } = useUserAllianceJourneys();

  const handleQueryChange = (updated: Partial<PublicAllianceMarketplaceQuery>) => {
    setQuery((prev) => ({ ...prev, ...updated }));
  };

  const handleResetFilters = () => {
    setQuery({ page: 1, limit: 12, sortBy: 'newest' });
  };

  const items = data?.data || [];
  const meta = data?.meta || { page: 1, limit: 12, total: 0, totalPages: 1 };
  const journeyCount = (journeys || []).length;

  return (
    <div className="pay-alliance">
      {/* Header */}
      <div className="pay-alliance__header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div className="pay-alliance__badge">
            <Sparkles size={14} />
            <span>Alliance Network</span>
          </div>

          {/* Navigation Segmented Control */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#f1ede8',
              padding: '4px',
              borderRadius: '16px',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              gap: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('explore')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: activeTab === 'explore' ? 700 : 600,
                border: 'none',
                background: activeTab === 'explore' ? '#ffffff' : 'transparent',
                color: activeTab === 'explore' ? '#0a0a0f' : '#64748b',
                cursor: 'pointer',
                boxShadow: activeTab === 'explore' ? '0 2px 8px rgba(0, 0, 0, 0.08)' : 'none',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <Compass size={15} style={{ color: activeTab === 'explore' ? 'var(--clay)' : 'inherit' }} />
              <span>Explore Properties</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('journeys')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: activeTab === 'journeys' ? 700 : 600,
                border: 'none',
                background: activeTab === 'journeys' ? '#ffffff' : 'transparent',
                color: activeTab === 'journeys' ? '#0a0a0f' : '#64748b',
                cursor: 'pointer',
                boxShadow: activeTab === 'journeys' ? '0 2px 8px rgba(0, 0, 0, 0.08)' : 'none',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <Briefcase size={15} style={{ color: activeTab === 'journeys' ? 'var(--clay)' : 'inherit' }} />
              <span>My Recommendations & Deals</span>
              {journeyCount > 0 && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '20px',
                    height: '20px',
                    padding: '0 6px',
                    borderRadius: '9999px',
                    background: 'var(--clay)',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 800,
                  }}
                >
                  {journeyCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <h1 className="pay-alliance__title">
          {activeTab === 'explore'
            ? 'Explore Verified Properties'
            : 'Your Property Recommendations & Deal Pipeline'}
        </h1>
        <p className="pay-alliance__subtitle">
          {activeTab === 'explore'
            ? 'Browse vetted homes and exclusive listings across the Upward Alliance network.'
            : 'Track real-time viewing schedules, inspection updates, and stage progressions shared by your property manager.'}
        </p>
      </div>

      {/* View Mode: My Recommendations & Deals Pipeline */}
      {activeTab === 'journeys' && (
        <UserAllianceJourneysList onExploreClick={() => setActiveTab('explore')} />
      )}

      {/* View Mode: Explore Properties */}
      {activeTab === 'explore' && (
        <>
          {/* Filter Bar */}
          <AllianceFilterBar
            query={query}
            onChange={handleQueryChange}
            onReset={handleResetFilters}
          />

          {/* Loading Skeleton */}
          {isLoading && (
            <div className="pay-alliance-grid">
              {Array.from({ length: 6 }).map((_, i) => (
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
                Failed to Load Properties
              </h3>
              <p className="pay-alliance-empty__desc">
                {(error as any)?.message || 'Something went wrong while fetching listings.'}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="pay-alliance-empty__btn"
                style={{ background: '#dc2626' }}
              >
                Retry
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
                Try adjusting your search criteria or resetting filters to see available listings.
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
                  baseHref="/dashboard/alliance"
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
        </>
      )}
    </div>
  );
}
