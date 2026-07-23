'use client'

import { MapPin } from 'lucide-react'
import { type ExclusiveHome } from '@/features/dashboard/constants/exclusiveHomes'
import { formatCurrency } from '@/lib/utils'

type ExclusiveHomeListingCardProps = {
  home: ExclusiveHome
  onClick: () => void
}

export function ExclusiveHomeListingCard({ home, onClick }: ExclusiveHomeListingCardProps) {
  return (
    <button type="button" className="exclusive-homes__card" onClick={onClick}>
      <div className="exclusive-homes__card-media">
        <span className="exclusive-homes__card-badge">✦ UPWARD EXCLUSIVE</span>
        <span className="exclusive-homes__card-photo-label">apartment photo</span>
      </div>

      <div className="exclusive-homes__card-body">
        <div className="exclusive-homes__card-price-row">
          <span className="exclusive-homes__card-price-value">
            {formatCurrency(home.annualRent)}
          </span>
          <span className="exclusive-homes__card-price-suffix">/ year</span>
        </div>

        <h3 className="exclusive-homes__card-title">{home.name}</h3>

        <p className="exclusive-homes__card-area">
          <MapPin size={13} aria-hidden />
          <span>{home.area}</span>
        </p>

        <div className="exclusive-homes__card-chips">
          <span className="exclusive-homes__chip-pill">{home.beds} bed</span>
          <span className="exclusive-homes__chip-pill">{home.baths} bath</span>
          <span className="exclusive-homes__chip-pill">{home.sqm} m²</span>
          <span className="exclusive-homes__chip-pill exclusive-homes__chip-pill--accent">
            {home.tag}
          </span>
        </div>
      </div>
    </button>
  )
}
