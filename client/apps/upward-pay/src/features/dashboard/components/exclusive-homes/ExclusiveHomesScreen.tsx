'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList, Search } from 'lucide-react'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import { ExclusiveHomesInfoBanner } from '@/features/dashboard/components/exclusive-homes/ExclusiveHomesInfoBanner'
import { ExclusiveHomeListingCard } from '@/features/dashboard/components/exclusive-homes/ExclusiveHomeListingCard'
// Hidden for now — leave Find a home / request flow intact
// import { HomeRequestPromoCard } from '@/features/dashboard/components/exclusive-homes/requests/HomeRequestPromoCard'
import {
  EXCLUSIVE_HOMES_PAGE_COPY,
  type ExclusiveHomeBedFilter,
  type ExclusiveHomeCityFilter,
} from '@/features/dashboard/constants/exclusiveHomes'
import {
  filterExclusiveHomes,
  formatHomesCountLabel,
} from '@/features/dashboard/utils/exclusiveHomes'

const CITY_FILTERS: Array<{ value: ExclusiveHomeCityFilter; label: string }> = [
  { value: 'all', label: 'All cities' },
  { value: 'Lagos', label: 'Lagos' },
  { value: 'Abuja', label: 'Abuja' },
]

const BED_FILTERS: Array<{ value: ExclusiveHomeBedFilter; label: string }> = [
  { value: 'any', label: 'Any beds' },
  { value: '1', label: '1 bed' },
  { value: '2', label: '2 bed' },
  { value: '3', label: '3+ bed' },
]

export function ExclusiveHomesScreen() {
  const router = useRouter()
  const [cityFilter, setCityFilter] = useState<ExclusiveHomeCityFilter>('all')
  const [bedFilter, setBedFilter] = useState<ExclusiveHomeBedFilter>('any')

  const listings = useMemo(
    () => filterExclusiveHomes(cityFilter, bedFilter),
    [cityFilter, bedFilter],
  )

  return (
    <PayPageShell
      title={EXCLUSIVE_HOMES_PAGE_COPY.title}
      subtitle={EXCLUSIVE_HOMES_PAGE_COPY.subtitle}
      showBack
      onBack={() => router.push('/dashboard')}
      rightElement={
        <button
          type="button"
          className="home-app__header-link"
          onClick={() => router.push('/dashboard/exclusive-homes/applications')}
          aria-label="My applications"
        >
          <ClipboardList size={16} />
        </button>
      }
    >
      <ExclusiveHomesInfoBanner />

      {/* Hidden for now — leave Find a home / request flow intact
      <HomeRequestPromoCard />
      */}

      <div
        className="exclusive-homes__filters exclusive-homes__filters--city"
        role="group"
        aria-label="City filters"
      >
        {CITY_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={`exclusive-homes__filter-chip${
              cityFilter === filter.value ? ' exclusive-homes__filter-chip--active' : ''
            }`}
            onClick={() => setCityFilter(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div
        className="exclusive-homes__filters exclusive-homes__filters--beds"
        role="group"
        aria-label="Bedroom filters"
      >
        {BED_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={`exclusive-homes__filter-chip${
              bedFilter === filter.value ? ' exclusive-homes__filter-chip--active' : ''
            }`}
            onClick={() => setBedFilter(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <p className="exclusive-homes__count">{formatHomesCountLabel(listings.length)}</p>

      {listings.length === 0 ? (
        <div className="exclusive-homes__empty">
          <div className="exclusive-homes__empty-icon">
            <Search size={30} strokeWidth={1.75} />
          </div>
          <h3 className="exclusive-homes__empty-title">{EXCLUSIVE_HOMES_PAGE_COPY.emptyTitle}</h3>
          <p className="exclusive-homes__empty-text">{EXCLUSIVE_HOMES_PAGE_COPY.emptyText}</p>
          {/* Hidden for now — leave Find a home / request flow intact
          <button
            type="button"
            className="exclusive-homes__primary-btn home-app__empty-cta"
            onClick={() => router.push('/dashboard/exclusive-homes/request')}
          >
            Request a home
          </button>
          */}
        </div>
      ) : (
        <div className="exclusive-homes__list">
          {listings.map((home) => (
            <ExclusiveHomeListingCard
              key={home.id}
              home={home}
              onClick={() => router.push(`/dashboard/exclusive-homes/${home.id}`)}
            />
          ))}
        </div>
      )}

      {/* Hidden for now — leave Find a home / request flow intact
      {listings.length > 0 ? <HomeRequestPromoCard compact /> : null}
      */}
    </PayPageShell>
  )
}
