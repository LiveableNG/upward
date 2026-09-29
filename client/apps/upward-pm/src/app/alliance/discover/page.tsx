'use client'

import React, { useState } from 'react'
import {
  useAllianceProfile,
  useDiscoverAllianceListings,
} from '@/features/alliance/hooks/useAlliance'
import {
  DiscoverAllianceListingsParams,
} from '@/features/alliance/types/alliance.types'
import { AllianceStatusBanner } from '@/features/alliance/components/AllianceStatusBanner'
import { AllianceNavTabs } from '@/features/alliance/components/AllianceNavTabs'
import { DiscoveryCard } from '@/features/alliance/components/DiscoveryCard'
import { DiscoveryFilters } from '@/features/alliance/components/DiscoveryFilters'
import { Compass, ChevronLeft, ChevronRight, SearchX, ShieldAlert } from 'lucide-react'

export default function AllianceDiscoverPage() {
  const [filters, setFilters] = useState<DiscoverAllianceListingsParams>({
    page: 1,
    limit: 12,
    sortBy: 'newest',
  })

  const { data: profile, isLoading: loadingProfile } = useAllianceProfile()
  const isAllianceEnabled = profile?.isEnabled === true

  const {
    data: discoveryData,
    isLoading: loadingListings,
    isError,
    error,
  } = useDiscoverAllianceListings(isAllianceEnabled ? filters : undefined)

  const listings = discoveryData?.items || []
  const meta = discoveryData?.meta || { page: 1, total: 0, totalPages: 1 }

  return (
    <div className="page-container" style={{ padding: '24px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 800,
            color: 'var(--text)',
            margin: '0 0 4px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Compass size={26} color="var(--forest)" /> Upward Alliance Network Discovery
        </h1>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
          Discover available published listings from verified property managers across the Upward Alliance network.
        </p>
      </div>

      {/* Alliance Navigation Tabs */}
      <AllianceNavTabs activeTab="discover" />

      {/* Status Banner */}
      <AllianceStatusBanner profile={profile} isLoading={loadingProfile} />

      {!loadingProfile && !isAllianceEnabled ? (
        <div
          style={{
            marginTop: '32px',
            padding: '40px 24px',
            borderRadius: '16px',
            background: 'var(--dark)',
            border: '1px solid var(--border)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(234, 179, 8, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#854d0e',
            }}
          >
            <ShieldAlert size={28} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
            Alliance Discovery Access Required
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '480px', margin: 0 }}>
            Alliance network browsing is exclusively available to enabled Property Managers. Contact platform administration to request Upward Alliance enablement.
          </p>
        </div>
      ) : (
        <>
          {/* Discovery Filters Bar */}
          <DiscoveryFilters filters={filters} onFiltersChange={setFilters} />

          {/* Listings Feed */}
          {loadingListings ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '20px',
              }}
            >
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div
                  key={idx}
                  style={{
                    height: '380px',
                    borderRadius: '16px',
                    background: 'var(--dark)',
                    border: '1px solid var(--border)',
                    animation: 'pulse 1.5s infinite',
                  }}
                />
              ))}
            </div>
          ) : isError ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                background: 'var(--dark)',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                color: 'var(--danger)',
              }}
            >
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
                {(error as any)?.message || 'Failed to load Alliance listings'}
              </p>
            </div>
          ) : listings.length === 0 ? (
            <div
              style={{
                padding: '60px 20px',
                textAlign: 'center',
                background: 'var(--dark)',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <SearchX size={44} color="var(--text-muted)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                No discoverable listings found
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '420px', margin: 0 }}>
                {filters.search || filters.intent || filters.targetType
                  ? 'Try adjusting your search criteria or clearing active filters to see more results.'
                  : 'There are currently no active published listings from other Property Managers on the Alliance network.'}
              </p>
              {(filters.search || filters.intent || filters.targetType) && (
                <button
                  type="button"
                  onClick={() => setFilters({ page: 1, limit: 12, sortBy: 'newest' })}
                  className="btn btn--secondary"
                  style={{ marginTop: '8px', height: '36px', fontSize: '13px' }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Listings Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: '20px',
                }}
              >
                {listings.map((item) => (
                  <DiscoveryCard key={item.uuid} listing={item} />
                ))}
              </div>

              {/* Pagination */}
              {meta.totalPages > 1 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '12px',
                    marginTop: '36px',
                  }}
                >
                  <button
                    type="button"
                    disabled={meta.page <= 1}
                    onClick={() => setFilters({ ...filters, page: meta.page - 1 })}
                    className="btn btn--secondary"
                    style={{ height: '36px', padding: '0 12px', gap: '4px', fontSize: '13px' }}
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>

                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Page {meta.page} of {meta.totalPages} ({meta.total} listings)
                  </span>

                  <button
                    type="button"
                    disabled={meta.page >= meta.totalPages}
                    onClick={() => setFilters({ ...filters, page: meta.page + 1 })}
                    className="btn btn--secondary"
                    style={{ height: '36px', padding: '0 12px', gap: '4px', fontSize: '13px' }}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
