'use client'

import React, { useState } from 'react'
import {
  ShieldCheck,
  Package,
  Layers,
  Wrench,
  ShoppingBag,
  Truck,
  ArrowUpRight,
} from 'lucide-react'
import {
  isVendorVerified,
  type GoalOffering,
  type CommerceVendor,
} from '../types/goals.types'
import type { RecommendedOfferingItem } from '../utils/recommendationEngine'

interface OfferingCardProps {
  item:
    | RecommendedOfferingItem
    | { offering: GoalOffering; reason?: string; isGoalMatch?: boolean }
  onClick?: (offering: GoalOffering) => void
  onVendorClick?: (vendor: CommerceVendor, e: React.MouseEvent) => void
}

export function formatOfferingPrice(offering: GoalOffering): string {
  const currency = offering.currency || 'NGN'
  return formatCurrencyValue(offering.price, currency) || (offering.minPrice != null ? `From ${formatCurrencyValue(offering.minPrice, currency)}` : 'Inquire for price')
}

export function formatCurrencyValue(val?: number | null, currency = 'NGN'): string {
  if (val == null) return ''
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(val)
  } catch {
    return `${currency} ${val.toLocaleString()}`
  }
}

export function getOfferingTypeIcon(type: string) {
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
}) => {
  const [imgError, setImgError] = useState(false)
  const offering = item.offering
  const rawReason = item.reason
  const reason =
    rawReason && !rawReason.toLowerCase().includes('matched to')
      ? rawReason
      : null
  const isGoalMatch = item.isGoalMatch
  const TypeIcon = getOfferingTypeIcon(offering.type)

  const primaryImage =
    offering.media?.find((m) => m.isPrimary)?.mediaUrl ||
    offering.media?.[0]?.mediaUrl ||
    offering.imageUrl

  const showImage = Boolean(primaryImage) && !imgError
  const title = offering.title || offering.name || 'Untitled Offering'
  const vendor = offering.vendor
  const verified = isVendorVerified(vendor)
  const compareAtPrice = offering.compareAtPrice ?? (offering.pricingModel === 'FIXED' ? offering.maxPrice : null)
  const hasDiscount = compareAtPrice != null && offering.price != null && compareAtPrice > offering.price
  const discountPercent = hasDiscount ? Math.round(((compareAtPrice! - offering.price!) / compareAtPrice!) * 100) : 0

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
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={primaryImage!}
            alt={title}
            className="offering-card__image"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="offering-card__placeholder">
            <TypeIcon size={32} strokeWidth={1.6} />
          </div>
        )}

        {/* Type Badge */}
        <span
          className={`offering-card__type-badge offering-card__type-badge--${offering.type.toLowerCase()}`}
        >
          <TypeIcon size={11} strokeWidth={2.3} />
          <span>{offering.type}</span>
        </span>
      </div>

      {/* Content Area */}
      <div className="offering-card__content">
        <div className="offering-card__meta-top">
          {vendor ? (
            <span className="offering-card__vendor-label">
              <span className="offering-card__vendor-name">{vendor.name}</span>
              {verified && (
                <ShieldCheck
                  size={13}
                  className="offering-card__verified-icon"
                  aria-label="Verified merchant"
                />
              )}
            </span>
          ) : (
            <span className="offering-card__vendor-label">Upward Partner</span>
          )}

          {offering.deliveryAvailable && (
            <span className="offering-card__delivery-chip" title="Delivery included">
              <Truck size={12} />
            </span>
          )}
        </div>

        <h3 className="offering-card__title">{title}</h3>

        {offering.subtitle && (
          <p className="offering-card__subtitle">{offering.subtitle}</p>
        )}

        {reason && (
          <div className="offering-card__match-tag">
            <span>{reason}</span>
          </div>
        )}

        <div className="offering-card__footer">
          <div className="offering-card__price-group">
            <span className="offering-card__price">
              {formatOfferingPrice(offering)}
            </span>
            {hasDiscount && (
              <>
                <span className="offering-card__compare-price">
                  {formatCurrencyValue(compareAtPrice, offering.currency)}
                </span>
                <span className="offering-card__discount-badge">
                  -{discountPercent}%
                </span>
              </>
            )}
            {offering.pricingModel && offering.pricingModel !== 'FIXED' && (
              <span className="offering-card__pricing-model">
                {offering.pricingModel.toLowerCase().replace('_', ' ')}
              </span>
            )}
          </div>

          <span className="offering-card__action-btn" aria-hidden="true">
            <span>Details</span>
            <ArrowUpRight size={14} />
          </span>
        </div>
      </div>
    </article>
  )
}
