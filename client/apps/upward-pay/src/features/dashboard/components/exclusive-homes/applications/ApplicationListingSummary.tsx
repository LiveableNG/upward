import { MapPin } from 'lucide-react'
import { type ExclusiveHome } from '@/features/dashboard/constants/exclusiveHomes'
import { formatCurrency } from '@/lib/utils'

type ApplicationListingSummaryProps = {
  home: ExclusiveHome
  compact?: boolean
  onClick?: () => void
}

export function ApplicationListingSummary({
  home,
  compact = false,
  onClick,
}: ApplicationListingSummaryProps) {
  const content = (
    <>
      <div className="home-app__listing-media">
        <span className="exclusive-homes__card-badge">✦ UPWARD EXCLUSIVE</span>
        <span className="exclusive-homes__card-photo-label">apartment photo</span>
      </div>
      <div className="home-app__listing-body">
        <div className="home-app__listing-price">
          <strong>{formatCurrency(home.annualRent)}</strong>
          <span>/ year</span>
        </div>
        <h3 className="home-app__listing-title">{home.name}</h3>
        <p className="home-app__listing-area">
          <MapPin size={13} aria-hidden />
          <span>{home.area}</span>
        </p>
        {!compact ? (
          <div className="exclusive-homes__card-chips">
            <span className="exclusive-homes__chip-pill">{home.beds} bed</span>
            <span className="exclusive-homes__chip-pill">{home.baths} bath</span>
            <span className="exclusive-homes__chip-pill exclusive-homes__chip-pill--accent">
              {home.tag}
            </span>
          </div>
        ) : null}
      </div>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        className={`home-app__listing${compact ? ' home-app__listing--compact' : ''}`}
        onClick={onClick}
      >
        {content}
      </button>
    )
  }

  return (
    <div className={`home-app__listing${compact ? ' home-app__listing--compact' : ''}`}>
      {content}
    </div>
  )
}
