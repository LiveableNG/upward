'use client'

import React from 'react'
import {
  Sparkles,
  ShieldCheck,
  Package,
  Layers,
  Wrench,
  ShoppingBag,
  Truck,
  CheckCircle2,
} from 'lucide-react'
import type { GoalOffering, CommerceVendor } from '../types/goals.types'
import type { RecommendedOfferingItem } from '../utils/recommendationEngine'

interface OfferingCardProps {
  item: RecommendedOfferingItem | { offering: GoalOffering; reason?: string; isGoalMatch?: boolean }
  onClick?: (offering: GoalOffering) => void
  onVendorClick?: (vendor: CommerceVendor, e: React.MouseEvent) => void
}

function formatPrice(offering: GoalOffering): string {
  const currency = offering.currency || 'USD'
  const fmt = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(val)
  }

  if (offering.pricingModel === 'QUOTE_REQUIRED') {
    return 'Custom Quote'
  }

  if (offering.pricingModel === 'RANGE' && offering.minPrice != null && offering.maxPrice != null) {
    return `${fmt(offering.minPrice)} – ${fmt(offering.maxPrice)}`
  }

  if (offering.pricingModel === 'STARTING_AT' && offering.minPrice != null) {
    return `From ${fmt(offering.minPrice)}`
  }

  if (offering.price != null) {
    return fmt(offering.price)
  }

  if (offering.minPrice != null) {
    return `From ${fmt(offering.minPrice)}`
  }

  return 'Inquire for pricing'
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'BUNDLE':
      return Layers
    case 'PACKAGE':
      return Package
    case 'SERVICE':
      return Wrench
    case 'PRODUCT':
    default:
      return ShoppingBag
  }
}

export const OfferingCard: React.FC<OfferingCardProps> = ({
  item,
  onClick,
  onVendorClick,
}) => {
  const offering = item.offering
  const reason = item.reason
  const isGoalMatch = item.isGoalMatch
  const TypeIcon = getTypeIcon(offering.type)

  const primaryImage =
    offering.media?.find((m) => m.isPrimary)?.mediaUrl ||
    offering.media?.[0]?.mediaUrl ||
    offering.imageUrl

  const title = offering.title || offering.name || 'Untitled Offering'
  const vendor = offering.vendor

  return (
    <article
      className={`offering-card ${isGoalMatch ? 'offering-card--recommended' : ''}`}
      onClick={() => onClick?.(offering)}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.(offering)
        }
      }}
    >
      {/* Thumbnail area */}
      <div className="offering-card__media">
        {primaryImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={primaryImage}
            alt={title}
            className="offering-card__image"
            loading="lazy"
          />
        ) : (
          <div className="offering-card__placeholder">
            <TypeIcon size={36} strokeWidth={1.5} />
          </div>
        )}

        {/* Type Badge */}
        <span className={`offering-card__type-badge offering-card__type-badge--${offering.type.toLowerCase()}`}>
          <TypeIcon size={12} strokeWidth={2.4} />
          <span>{offering.type}</span>
        </span>

        {/* Recommendation Reason Pill */}
        {reason && (
          <span className="offering-card__reason-pill">
            <Sparkles size={11} strokeWidth={2.5} />
            <span className="offering-card__reason-text">{reason}</span>
          </span>
        )}
      </div>

      {/* Content Area */}
      <div className="offering-card__content">
        {vendor && (
          <div className="offering-card__vendor-row">
            <button
              type="button"
              className="offering-card__vendor-btn"
              onClick={(e) => {
                e.stopPropagation()
                onVendorClick?.(vendor, e)
              }}
              title="View verified vendor profile"
            >
              <span className="offering-card__vendor-name">{vendor.name}</span>
              {vendor.isVerified && (
                <ShieldCheck
                  size={14}
                  className="offering-card__verified-icon"
                  aria-label="Verified vendor"
                />
              )}
            </button>
            {offering.deliveryAvailable && (
              <span className="offering-card__delivery-chip" title="Delivery available">
                <Truck size={12} />
              </span>
            )}
          </div>
        )}

        <h3 className="offering-card__title">{title}</h3>

        {offering.subtitle && (
          <p className="offering-card__subtitle">{offering.subtitle}</p>
        )}

        <div className="offering-card__footer">
          <div className="offering-card__price-group">
            <span className="offering-card__price">{formatPrice(offering)}</span>
            {offering.pricingModel && (
              <span className="offering-card__pricing-model">
                {offering.pricingModel.toLowerCase().replace('_', ' ')}
              </span>
            )}
          </div>

          <span className="offering-card__action-btn" aria-hidden="true">
            View Details
          </span>
        </div>
      </div>
    </article>
  )
}
