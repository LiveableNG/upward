'use client'

import React, { useState, useEffect } from 'react'
import {
  X,
  ShieldCheck,
  Package,
  Layers,
  Wrench,
  ShoppingBag,
  Truck,
  Clock,
  CheckCircle2,
  Tag,
  Building2,
  ChevronRight,
  Info,
} from 'lucide-react'
import type { GoalOffering, CommerceVendor } from '../types/goals.types'

interface OfferingDetailModalProps {
  offering: GoalOffering | null
  isOpen: boolean
  onClose: () => void
  onVendorClick: (vendor: CommerceVendor) => void
}

function formatDetailPrice(offering: GoalOffering): string {
  const currency = offering.currency || 'USD'
  const fmt = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(val)
  }

  if (offering.pricingModel === 'QUOTE_REQUIRED') {
    return 'Custom Quote Required'
  }

  if (offering.pricingModel === 'RANGE' && offering.minPrice != null && offering.maxPrice != null) {
    return `${fmt(offering.minPrice)} – ${fmt(offering.maxPrice)}`
  }

  if (offering.pricingModel === 'STARTING_AT' && offering.minPrice != null) {
    return `Starting at ${fmt(offering.minPrice)}`
  }

  if (offering.price != null) {
    return fmt(offering.price)
  }

  if (offering.minPrice != null) {
    return `Starting at ${fmt(offering.minPrice)}`
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

export const OfferingDetailModal: React.FC<OfferingDetailModalProps> = ({
  offering,
  isOpen,
  onClose,
  onVendorClick,
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  useEffect(() => {
    if (!isOpen) return
    setSelectedImageIndex(0)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen || !offering) return null

  const TypeIcon = getTypeIcon(offering.type)
  const title = offering.title || offering.name || 'Untitled Item'
  const images = offering.media && offering.media.length > 0
    ? offering.media.map((m) => m.mediaUrl)
    : offering.imageUrl
    ? [offering.imageUrl]
    : []

  const activeImage = images[selectedImageIndex] || null
  const packageItems = offering.packageItems || []
  const linkedGoals = (offering.goals || []).map((g) => g.goal?.name).filter(Boolean)

  return (
    <div
      className="offering-modal__overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="offering-modal-title"
      onClick={onClose}
    >
      <div
        className="offering-modal__container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="offering-modal__header">
          <div className="offering-modal__header-badges">
            <span className={`offering-card__type-badge offering-card__type-badge--${offering.type.toLowerCase()}`}>
              <TypeIcon size={13} strokeWidth={2.4} />
              <span>{offering.type}</span>
            </span>

            {offering.isFeatured && (
              <span className="offering-modal__featured-badge">Featured Offering</span>
            )}
          </div>

          <button
            type="button"
            className="offering-modal__close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="offering-modal__body">
          {/* Gallery Area */}
          <div className="offering-modal__gallery">
            <div className="offering-modal__main-image-wrap">
              {activeImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeImage}
                  alt={title}
                  className="offering-modal__main-image"
                />
              ) : (
                <div className="offering-modal__placeholder-image">
                  <TypeIcon size={54} strokeWidth={1.5} />
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className="offering-modal__thumbnails-row">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`offering-modal__thumbnail-btn ${
                      selectedImageIndex === idx ? 'offering-modal__thumbnail-btn--active' : ''
                    }`}
                    onClick={() => setSelectedImageIndex(idx)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt={`Thumbnail ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title & Pricing Section */}
          <div className="offering-modal__info-section">
            <h2 id="offering-modal-title" className="offering-modal__title">
              {title}
            </h2>

            {offering.subtitle && (
              <p className="offering-modal__subtitle">{offering.subtitle}</p>
            )}

            <div className="offering-modal__pricing-box">
              <div>
                <span className="offering-modal__price-label">Price</span>
                <p className="offering-modal__price">{formatDetailPrice(offering)}</p>
              </div>

              {offering.pricingModel && (
                <span className="offering-modal__pricing-model-pill">
                  {offering.pricingModel.toLowerCase().replace('_', ' ')}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          {offering.description && (
            <div className="offering-modal__section">
              <h3 className="offering-modal__section-heading">About This Offering</h3>
              <p className="offering-modal__description">{offering.description}</p>
            </div>
          )}

          {/* Package / Bundle Items breakdown */}
          {packageItems.length > 0 && (
            <div className="offering-modal__section">
              <h3 className="offering-modal__section-heading">Package Components ({packageItems.length})</h3>
              <div className="offering-modal__package-items">
                {packageItems.map((pkgItem, idx) => {
                  const comp = pkgItem.component || pkgItem.itemOffering
                  const itemTitle = comp?.title || comp?.name || `Item ${idx + 1}`
                  return (
                    <div key={pkgItem.id || idx} className="offering-modal__package-item">
                      <div className="offering-modal__package-item-main">
                        <CheckCircle2 size={16} className="offering-modal__package-check" />
                        <div>
                          <p className="offering-modal__package-item-title">{itemTitle}</p>
                          {comp?.subtitle && (
                            <span className="offering-modal__package-item-sub">
                              {comp.subtitle}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="offering-modal__package-item-meta">
                        <span className="offering-modal__package-qty">Qty: {pkgItem.quantity}</span>
                        {pkgItem.isOptional && (
                          <span className="offering-modal__package-optional">Optional</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Delivery & Availability */}
          <div className="offering-modal__section">
            <h3 className="offering-modal__section-heading">Fulfillment & Availability</h3>
            <div className="offering-modal__perks-grid">
              <div className="offering-modal__perk-card">
                <Truck size={18} className="offering-modal__perk-icon" />
                <div>
                  <span className="offering-modal__perk-title">
                    {offering.deliveryAvailable ? 'Direct Delivery' : 'Standard Fulfillment'}
                  </span>
                  <span className="offering-modal__perk-desc">
                    {offering.deliveryAvailable
                      ? 'Delivered to your rental property'
                      : 'Merchant arranges delivery'}
                  </span>
                </div>
              </div>

              {offering.leadTimeDays != null && (
                <div className="offering-modal__perk-card">
                  <Clock size={18} className="offering-modal__perk-icon" />
                  <div>
                    <span className="offering-modal__perk-title">
                      {offering.leadTimeDays === 0
                        ? 'Same-Day Service'
                        : `${offering.leadTimeDays} Days Lead Time`}
                    </span>
                    <span className="offering-modal__perk-desc">Estimated turnaround</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Verified Vendor Card */}
          {offering.vendor && (
            <div className="offering-modal__section">
              <h3 className="offering-modal__section-heading">Merchant & Provider</h3>
              <div
                className="offering-modal__vendor-card"
                onClick={() => offering.vendor && onVendorClick(offering.vendor)}
                role="button"
                tabIndex={0}
              >
                <div className="offering-modal__vendor-left">
                  <div className="offering-modal__vendor-avatar">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <div className="offering-modal__vendor-title-row">
                      <span className="offering-modal__vendor-name">
                        {offering.vendor.name}
                      </span>
                      {offering.vendor.isVerified && (
                        <ShieldCheck
                          size={15}
                          className="offering-modal__vendor-verified"
                        />
                      )}
                    </div>
                    <span className="offering-modal__vendor-view-link">
                      View Verified Merchant Credentials
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="offering-modal__chevron" />
              </div>
            </div>
          )}

          {/* Linked Goals */}
          {linkedGoals.length > 0 && (
            <div className="offering-modal__section">
              <h3 className="offering-modal__section-heading">Connected Lifestyle Goals</h3>
              <div className="offering-modal__goals-list">
                {linkedGoals.map((gName, idx) => (
                  <span key={idx} className="offering-modal__goal-pill">
                    <Tag size={12} />
                    {gName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Informational Notice */}
          <div className="offering-modal__notice">
            <Info size={16} className="offering-modal__notice-icon" />
            <p className="offering-modal__notice-text">
              Direct ordering and booking for lifestyle products and services will be enabled in an upcoming release. In the meantime, you can connect directly with verified merchants.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="offering-modal__footer">
          {offering.vendor && (
            <button
              type="button"
              className="offering-modal__action-btn"
              onClick={() => offering.vendor && onVendorClick(offering.vendor)}
            >
              Contact Verified Merchant
            </button>
          )}
          <button
            type="button"
            className="offering-modal__dismiss-btn"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
