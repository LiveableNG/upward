'use client'

import { useEffect, useState } from 'react'
import { Info, Loader2 } from 'lucide-react'
import type { RequestHomeLocation } from '@/lib/request-home-locations'

type LocationGuidance = {
  state: string
  area: string
  subArea?: string
  matchLevel: string | null
  minPrice: number | null
  maxPrice: number | null
  sampleSize: number | null
}

type BudgetGuidanceResult = {
  suggestedMinBudget: number | null
  suggestedMaxBudget: number | null
  locations: LocationGuidance[]
}

type BudgetGuidanceProps = {
  locations: RequestHomeLocation[]
  bedrooms: number
  onApplyRange: (min: number, max: number) => void
}

const amountFormatter = new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 })

export function BudgetGuidance({ locations, bedrooms, onApplyRange }: BudgetGuidanceProps) {
  const [result, setResult] = useState<BudgetGuidanceResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (locations.length === 0 || !bedrooms) {
      setResult(null)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    const timer = setTimeout(async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'
        const response = await fetch(`${apiUrl}/public/home-requests/budget-guidance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locations: locations.map(({ state, area, subArea }) => ({ state, area, subArea })),
            bedrooms,
          }),
        })
        if (!response.ok) throw new Error('Failed to fetch budget guidance')
        const { data } = await response.json()
        if (!cancelled) {
          setResult(data)
          setIsLoading(false)
        }
      } catch {
        if (!cancelled) {
          setResult(null)
          setIsLoading(false)
        }
      }
    }, 350)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [locations, bedrooms])

  if (isLoading) {
    return (
      <div className="rah-guidance rah-guidance--loading">
        <Loader2 size={15} className="rah-guidance__spinner" aria-hidden />
        <p className="rah-guidance__text">Checking typical prices for your selection…</p>
      </div>
    )
  }

  if (!result) return null

  const labelFor = (loc: LocationGuidance) => [loc.subArea, loc.area].filter(Boolean).join(', ')
  const matched = result.locations.filter((loc) => loc.minPrice != null)
  const unmatched = result.locations.filter((loc) => loc.minPrice == null)

  if (matched.length === 0) {
    return (
      <div className="rah-guidance rah-guidance--muted">
        <Info size={15} aria-hidden />
        <p className="rah-guidance__text">
          We don&apos;t have pricing data for your selected area
          {result.locations.length > 1 ? 's' : ''} yet. Property managers tend to ignore offers
          below market rate, so it&apos;s worth researching typical rents nearby before setting your
          budget.
        </p>
      </div>
    )
  }

  const formatted = amountFormatter.format(result.suggestedMinBudget!)
  const maxFormatted =
    result.suggestedMaxBudget != null ? amountFormatter.format(result.suggestedMaxBudget) : null
  const drivingLocation = matched.find((loc) => loc.minPrice === result.suggestedMinBudget)
  const rangeLabel = maxFormatted ? `₦${formatted}–₦${maxFormatted}` : `₦${formatted}`

  return (
    <div className="rah-guidance">
      <Info size={15} aria-hidden />
      <div className="rah-guidance__body">
        <p className="rah-guidance__text">
          {matched.length > 1 ? (
            <>
              Across your <strong>{matched.length} selected areas</strong>, typical {bedrooms}
              -bedroom rents run <strong>{rangeLabel}/year</strong>
              {drivingLocation && <> (set by {labelFor(drivingLocation)})</>}.
            </>
          ) : (
            <>
              Typical {bedrooms}-bedroom rents in{' '}
              <strong>{drivingLocation ? labelFor(drivingLocation) : 'your selected area'}</strong>{' '}
              run <strong>{rangeLabel}/year</strong>.
            </>
          )}{' '}
          Budgets below this range are often ignored by property managers.
        </p>
        {matched.length > 1 && (
          <ul className="rah-guidance__breakdown">
            {matched.map((loc) => (
              <li key={`${loc.state}-${loc.area}-${loc.subArea ?? ''}`}>
                {labelFor(loc)}: ₦{amountFormatter.format(loc.minPrice!)}
                {loc.maxPrice != null && `–₦${amountFormatter.format(loc.maxPrice)}`}/year
              </li>
            ))}
          </ul>
        )}
        {unmatched.length > 0 && (
          <p className="rah-guidance__note">
            No pricing data yet for {unmatched.map(labelFor).join(', ')} — the same principle
            applies: offers below market rate are often ignored.
          </p>
        )}
      </div>
      <button
        type="button"
        className="rah-guidance__apply"
        onClick={() =>
          onApplyRange(result.suggestedMinBudget!, result.suggestedMaxBudget ?? result.suggestedMinBudget!)
        }
      >
        Use {rangeLabel}
      </button>
    </div>
  )
}
