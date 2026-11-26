'use client'

import React, { useState } from 'react'
import {
  Package,
  Layers,
  Wrench,
  ShoppingBag,
  Truck,
  ArrowUpRight,
  MapPinOff,
  ShoppingCart,
} from 'lucide-react'
import { useCart } from '../context/CartContext'
import {
  isVendorVerified,
  type GoalOffering,
  type CommerceVendor,
} from '../types/goals.types'
import {
  type UserDeliveryLocation,
  isOfferingDeliverableToLocation,
} from '../utils/deliveryLocation'
import type { RecommendedOfferingItem } from '../utils/recommendationEngine'

interface OfferingCardProps {
  item:
    | RecommendedOfferingItem
    | { offering: GoalOffering; reason?: string; isGoalMatch?: boolean }
  userLocation?: UserDeliveryLocation
  onClick?: (offering: GoalOffering) => void
  onVendorClick?: (vendor: CommerceVendor, e: React.MouseEvent) => void
}

export function formatOfferingPrice(offering: GoalOffering): string {
  if (offering.type === 'SERVICE' || offering.pricingModel === 'QUOTE_REQUIRED') {
    return 'Price on Request'
  }
  const currency = offering.currency || 'NGN'
  return formatCurrencyValue(offering.price, currency) || (offering.minPrice != null ? `From ${formatCurrencyValue(offering.minPrice, currency)}` : 'Price on Request')
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

export function getOfferingTypeDisplay(type: string): { label: string; icon: any } {
  switch (type) {
    case 'BUNDLE':
      return { label: 'Bundle Set', icon: Layers }
    case 'PACKAGE':
      return { label: 'Pack', icon: Package }
    case 'SERVICE':
      return { label: 'Service', icon: Wrench }
    case 'PRODUCT':
    default:
      return { label: 'Single Item', icon: ShoppingBag }
  }
}

export function getOfferingTypeIcon(type: string) {
  return getOfferingTypeDisplay(type).icon
}

export const OfferingCard: React.FC<OfferingCardProps> = ({
  item,
  userLocation,
  onClick,
}) => {
  const cart = useCart()
  const [imgError, setImgError] = useState(false)
  const offering = item.offering
  const isGoalMatch = item.isGoalMatch
  const laymanType = getOfferingTypeDisplay(offering.type)
  const TypeIcon = laymanType.icon

  const deliveryCheck = userLocation
    ? isOfferingDeliverableToLocation(offering, userLocation)
    : { isDeliverable: true }

  const primaryImage =
    offering.media?.find((m) => m.isPrimary)?.mediaUrl ||
    offering.media?.[0]?.mediaUrl ||
    offering.imageUrl

  const showImage = Boolean(primaryImage) && !imgError
  const title = offering.title || offering.name || 'Untitled Item'
  const vendor = offering.vendor
  const verified = isVendorVerified(vendor)
  const isQuoteService =
    offering.type === 'SERVICE' || offering.pricingModel === 'QUOTE_REQUIRED' || !offering.price
  const compareAtPrice = offering.compareAtPrice ?? (offering.pricingModel === 'FIXED' ? offering.maxPrice : null)
  const hasDiscount = compareAtPrice != null && offering.price != null && compareAtPrice > offering.price
  const discountPercent = hasDiscount ? Math.round(((compareAtPrice! - offering.price!) / compareAtPrice!) * 100) : 0

  return (
    <article
      className={`offering-card ${isGoalMatch ? 'offering-card--recommended' : ''} ${offering.isPromoted ? 'offering-card--promoted' : ''}`}
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

        {/* Layman Type Badge */}
        <span
          className={`offering-card__type-badge offering-card__type-badge--${offering.type.toLowerCase()}`}
        >
          <TypeIcon size={11} strokeWidth={2.3} />
          <span>{laymanType.label}</span>
        </span>
      </div>

      {/* Content Area */}
      <div className="offering-card__content">
        <div className="offering-card__meta-top">
          {vendor ? (
            <span className="offering-card__vendor-label">
              <span className="offering-card__vendor-name">{vendor.name}</span>
            </span>
          ) : (
            <span className="offering-card__vendor-label">Upward Partner</span>
          )}

          {offering.deliveryAvailable && (
            <span className="offering-card__delivery-chip" title="Delivery included">
              <Truck size={12} />
            </span>
          )}

          {!deliveryCheck.isDeliverable && (
            <span
              className="offering-card__undeliverable-badge"
              title="Unavailable in your current delivery zone"
            >
              <MapPinOff size={10} strokeWidth={2.2} />
              <span>Unavailable in your area</span>
            </span>
          )}
        </div>

        <h3 className="offering-card__title">{title}</h3>

        {offering.subtitle && (
          <p className="offering-card__subtitle">{offering.subtitle}</p>
        )}

        <div className={`offering-card__footer ${isQuoteService ? 'offering-card__footer--quote' : ''}`}>
          <div className={`offering-card__price-group ${isQuoteService ? 'offering-card__price-group--stacked' : ''}`}>
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
            {(offering.type === 'SERVICE' || (offering.pricingModel && offering.pricingModel !== 'FIXED')) && (
              <span className="offering-card__pricing-model">
                {offering.type === 'SERVICE' || offering.pricingModel === 'QUOTE_REQUIRED'
                  ? 'Based on your need'
                  : offering.pricingModel?.toLowerCase().replace('_', ' ')}
              </span>
            )}
          </div>

          <div className="offering-card__actions-wrap">
            <button
              type="button"
              className="offering-card__cart-btn"
              title={isQuoteService ? 'Request Price / Details' : 'Add to Cart'}
              onClick={(e) => {
                e.stopPropagation()
                if (isQuoteService) {
                  // Direct service booking / quotes to the detail page flow
                  onClick?.(offering)
                } else {
                  cart.addItem(offering, { quantity: 1 })
                  cart.openCart()
                }
              }}
            >
              {isQuoteService ? (
                <Wrench size={12} strokeWidth={2.4} />
              ) : (
                <ShoppingCart size={12} strokeWidth={2.4} />
              )}
              <span>{isQuoteService ? 'Request Price' : 'Add'}</span>
            </button>
            {!isQuoteService && (
              <span className="offering-card__action-btn" aria-hidden="true">
                <span>Details</span>
                <ArrowUpRight size={14} />
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
