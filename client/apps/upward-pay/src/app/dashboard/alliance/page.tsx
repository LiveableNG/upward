'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Compass,
  Briefcase,
  ArrowLeft,
} from 'lucide-react'
import {
  useAllianceMarketplace,
  useUserAllianceJourneys,
} from '@/features/alliance/hooks/useAllianceMarketplace'
import { AllianceListingCard } from '@/features/alliance/components/AllianceListingCard'
import { AllianceFilterBar } from '@/features/alliance/components/AllianceFilterBar'
import { UserAllianceJourneysList } from '@/features/alliance/components/UserAllianceJourneysList'
import type { PublicAllianceMarketplaceQuery } from '@/features/alliance/types/alliance.types'

export default function DashboardAlliancePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'explore' | 'journeys'>('explore')

  const [query, setQuery] = useState<PublicAllianceMarketplaceQuery>({
    page: 1,
    limit: 12,
    sortBy: 'newest',
  })

  const { data, isLoading, isError, error, refetch } = useAllianceMarketplace(query)
  const { data: journeys } = useUserAllianceJourneys()

  const handleQueryChange = (updated: Partial<PublicAllianceMarketplaceQuery>) => {
    setQuery((prev) => ({ ...prev, ...updated }))
  }

  const handleResetFilters = () => {
    setQuery({ page: 1, limit: 12, sortBy: 'newest' })
  }

  const items = data?.data || []
  const meta = data?.meta || { page: 1, limit: 12, total: 0, totalPages: 1 }
  const journeyCount = (journeys || []).length

  return (
    <div className="pay-alliance">
      {/* Header */}
      <div className="pay-alliance__header">
        <div className="pay-alliance__top-bar">
          <div className="pay-alliance__top-left">
            <button
              type="button"
              className="pay-alliance__back-btn"
              onClick={() => router.push('/dashboard')}
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="pay-alliance__title">Verified Homes</h1>
              <p className="pay-alliance__subtitle">
                {activeTab === 'explore'
                  ? 'Browse vetted properties across the Alliance network'
                  : 'Track your viewing schedules & deals'}
              </p>
            </div>
          </div>

          {/* Navigation Segmented Control */}
          <div className="pay-alliance__nav-tabs">
            <button
              type="button"
              onClick={() => setActiveTab('explore')}
              className={`pay-alliance__nav-tab ${
                activeTab === 'explore' ? 'pay-alliance__nav-tab--active' : ''
              }`}
            >
              <Compass size={14} />
              <span>Explore</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('journeys')}
              className={`pay-alliance__nav-tab ${
                activeTab === 'journeys' ? 'pay-alliance__nav-tab--active' : ''
              }`}
            >
              <Briefcase size={14} />
              <span>My Deals</span>
              {journeyCount > 0 && (
                <span className="pay-alliance__count-badge">{journeyCount}</span>
              )}
            </button>
          </div>
        </div>
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
              <div
                className="pay-alliance-empty__icon"
                style={{ background: '#fee2e2', color: '#dc2626' }}
              >
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
  )
}
