'use client'

import React, { useState } from 'react'
import { useDiscoverAllianceListings } from '@/features/alliance/hooks/useAlliance'
import { DiscoverAllianceListingsParams } from '@/features/alliance/types/alliance.types'
import { DiscoveryCard } from '@/features/alliance/components/DiscoveryCard'
import { DiscoveryFilters } from '@/features/alliance/components/DiscoveryFilters'
import { ChevronLeft, ChevronRight, SearchX, AlertCircle } from 'lucide-react'

export default function AllianceDiscoverPage() {
  const [filters, setFilters] = useState<DiscoverAllianceListingsParams>({
    page: 1,
    limit: 12,
    sortBy: 'newest',
  })

  const {
    data: discoveryData,
    isLoading: loadingListings,
    isError,
    error,
  } = useDiscoverAllianceListings(filters)

  const listings = discoveryData?.items || []
  const meta = discoveryData?.meta || { page: 1, total: 0, totalPages: 1 }

  return (
    <div>
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
              className="card animate-pulse"
              style={{ height: '360px', borderRadius: '16px' }}
            />
          ))}
        </div>
      ) : isError ? (
        <div
          className="card"
          style={{
            padding: '36px 20px',
            textAlign: 'center',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={20} />
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
            {(error as any)?.message || 'Failed to load Alliance listings'}
          </p>
        </div>
      ) : listings.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '56px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'var(--bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <SearchX size={26} />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--dark)' }}>
            No discoverable listings found
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '440px', margin: 0, lineHeight: 1.5 }}>
            {filters.search || filters.intent || filters.targetType
              ? 'Try adjusting your search criteria or clearing active filters to see more results.'
              : 'There are currently no published listings from partner Property Managers on the Alliance network.'}
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
                style={{ height: '36px', padding: '0 14px', gap: '4px', fontSize: '13px' }}
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
                style={{ height: '36px', padding: '0 14px', gap: '4px', fontSize: '13px' }}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
