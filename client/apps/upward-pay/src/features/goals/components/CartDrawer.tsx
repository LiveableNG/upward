'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  ArrowRight,
  Truck,
  Wrench,
  AlertCircle,
  MapPin,
  ChevronDown,
} from 'lucide-react'
import { useCart } from '../context/CartContext'
import { CommerceCheckoutModal } from './CommerceCheckoutModal'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import {
  getStoredDeliveryLocation,
  saveStoredDeliveryLocation,
  isItemDeliverableToZone,
  parseKoboToNgn,
  type UserDeliveryLocation,
  type DeliveryZoneItem,
} from '../utils/deliveryLocation'
import { fetchDeliveryZones } from '../services/goalsService'
import { useFluidNav } from '@/features/dashboard/hooks/useFluidNav'
import { haptics } from '@/lib/haptics'
import '../styles/goals.css'

interface CartDrawerProps {
  deliveryLocation?: UserDeliveryLocation
}

function formatNgn(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  deliveryLocation: propLocation,
}) => {
  const {
    items,
    isOpen,
    openCart,
    closeCart,
    removeItem,
    updateQuantity,
    clearCart,
    totalCount,
    subtotal,
  } = useCart()

  const [mounted, setMounted] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const { isFluidNav } = useFluidNav()
  const [availableZones, setAvailableZones] = useState<DeliveryZoneItem[]>([])

  const allServices = React.useMemo(() => {
    return items.length > 0 && items.every((i) => i.type === 'SERVICE')
  }, [items])

  const [currentLocation, setCurrentLocation] = useState<UserDeliveryLocation>(() =>
    propLocation || getStoredDeliveryLocation(),
  )

  useEffect(() => {
    if (propLocation) setCurrentLocation(propLocation)
  }, [propLocation])

  useEffect(() => {
    let active = true
    fetchDeliveryZones()
      .then((zones) => {
        if (!active || !zones || zones.length === 0) return
        setAvailableZones(zones)

        setCurrentLocation((prev) => {
          const matched = zones.find((z) => z.tag === prev.zoneTag)
          if (matched) {
            const updated: UserDeliveryLocation = {
              ...prev,
              zoneName: matched.name,
              isDelivering: matched.isDelivering,
              pauseReason: matched.pauseReason,
              deliveryFeeKobo: matched.deliveryFeeKobo,
            }
            saveStoredDeliveryLocation(updated)
            return updated
          }

          // Default to the first delivery location configured in the system
          const first = zones[0]
          if (first) {
            const updated: UserDeliveryLocation = {
              address: first.areasCovered?.split(',')?.[0]?.trim() || first.name,
              label: first.name,
              zoneTag: first.tag,
              zoneName: first.name,
              state: first.state,
              isDelivering: first.isDelivering,
              pauseReason: first.pauseReason,
              deliveryFeeKobo: first.deliveryFeeKobo,
            }
            saveStoredDeliveryLocation(updated)
            return updated
          }
          return prev
        })
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [])

  const activeLocation = currentLocation

  const handleZoneChange = (zoneTag: string) => {
    const matched = availableZones.find((z) => z.tag === zoneTag)
    if (matched) {
      const updated: UserDeliveryLocation = {
        address: matched.areasCovered?.split(',')?.[0]?.trim() || matched.name,
        label: matched.name,
        zoneTag: matched.tag,
        zoneName: matched.name,
        state: matched.state,
        isDelivering: matched.isDelivering,
        pauseReason: matched.pauseReason,
        deliveryFeeKobo: matched.deliveryFeeKobo,
      }
      setCurrentLocation(updated)
      saveStoredDeliveryLocation(updated)
      try {
        haptics.selection()
      } catch (_) {}
    }
  }

  // Pre-checkout Deliverability Verification
  const undeliverableItems = React.useMemo(() => {
    if (!activeLocation.zoneTag || activeLocation.zoneTag === 'UNCONFIGURED') {
      return []
    }
    return items.filter((item) => !isItemDeliverableToZone(item, activeLocation.zoneTag))
  }, [items, activeLocation.zoneTag])

  const hasUndeliverableItems = undeliverableItems.length > 0

  useEffect(() => {
    setMounted(true)
  }, [])

  // Robust cross-platform body scroll lock & Escape listener
  useBodyScrollLock(isOpen)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCart()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closeCart])

  if (!mounted) return null

  const handleProceedToCheckout = () => {
    if (items.length === 0 || hasUndeliverableItems) return
    setIsCheckoutOpen(true)
  }

  const handleCheckoutSuccess = () => {
    clearCart()
    setIsCheckoutOpen(false)
    closeCart()
  }

  const deliveryFee = allServices
    ? 0
    : parseKoboToNgn(activeLocation.deliveryFeeKobo)

  return (
    <>
      {createPortal(
        <div
          className={`cart-drawer__portal ${
            isOpen ? 'cart-drawer__portal--open' : ''
          }`}
          aria-hidden={!isOpen}
        >
          {/* Backdrop overlay */}
          <div
            className="cart-drawer__backdrop"
            onClick={closeCart}
            tabIndex={-1}
          />

          {/* Slide-out Panel */}
          <aside
            className="cart-drawer__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Shopping Cart"
          >
            {/* Drawer Header */}
            <header className="cart-drawer__header">
              <div className="cart-drawer__header-left">
                <div className="cart-drawer__header-icon-wrap">
                  <ShoppingCart size={18} strokeWidth={2.4} />
                </div>
                <div>
                  <h2 className="cart-drawer__title">Your Cart</h2>
                  <span className="cart-drawer__subtitle">
                    {totalCount} {totalCount === 1 ? 'item' : 'items'}
                  </span>
                </div>
              </div>

              <div className="cart-drawer__header-actions">
                {items.length > 0 && (
                  <button
                    type="button"
                    className="cart-drawer__clear-btn"
                    onClick={clearCart}
                    title="Remove all items"
                  >
                    Clear Cart
                  </button>
                )}
                <button
                  type="button"
                  className="cart-drawer__close-btn"
                  onClick={closeCart}
                  aria-label="Close cart drawer"
                >
                  <X size={18} />
                </button>
              </div>
            </header>

            {/* Delivery Destination Geographical Dropdown */}
            <div className="cart-drawer__destination-bar">
              <div className="cart-drawer__destination-left">
                {allServices ? (
                  <Wrench size={14} className="cart-drawer__destination-icon" />
                ) : (
                  <Truck size={14} className="cart-drawer__destination-icon" />
                )}
                <span>{allServices ? 'Service in:' : 'Deliver to:'}</span>
              </div>

              <div className="cart-drawer__zone-dropdown-box">
                <MapPin size={13} className="cart-drawer__zone-icon" />
                <select
                  className="cart-drawer__zone-select"
                  value={activeLocation.zoneTag}
                  onChange={(e) => handleZoneChange(e.target.value)}
                  aria-label="Select delivery area"
                >
                  {availableZones.map((zone) => (
                    <option key={zone.tag} value={zone.tag}>
                      {zone.name}
                    </option>
                  ))}
                  {availableZones.length === 0 && (
                    <option value={activeLocation.zoneTag}>
                      {activeLocation.zoneName || 'Select Area'}
                    </option>
                  )}
                </select>
                <ChevronDown size={13} className="cart-drawer__zone-chevron" />
              </div>
            </div>

            {/* Body: Items or Empty State */}
            <div className="cart-drawer__body">
              {items.length === 0 ? (
                <div className="cart-drawer__empty">
                  <div className="cart-drawer__empty-icon-wrap">
                    <ShoppingCart size={34} strokeWidth={1.8} />
                  </div>
                  <h3 className="cart-drawer__empty-title">Your cart is empty</h3>
                  <p className="cart-drawer__empty-desc">
                    Explore curated apartment packages, home refresh essentials, and
                    verified merchant perks.
                  </p>
                  <button
                    type="button"
                    className="cart-drawer__empty-cta"
                    onClick={closeCart}
                  >
                    <span>Browse Perks</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                <div className="cart-drawer__items-list">
                  {items.map((item) => {
                    const isUndeliverable = !isItemDeliverableToZone(
                      item,
                      activeLocation.zoneTag,
                    )

                    return (
                      <div key={item.offeringId} className="cart-item-card">
                        {/* Item Thumbnail */}
                        <div className="cart-item-card__media">
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="cart-item-card__img"
                            />
                          ) : (
                            <div className="cart-item-card__placeholder">
                              <ShoppingCart size={20} />
                            </div>
                          )}
                        </div>

                        {/* Item Info */}
                        <div className="cart-item-card__info">
                          <div className="cart-item-card__top">
                            <h4 className="cart-item-card__title">{item.title}</h4>
                            <button
                              type="button"
                              className="cart-item-card__delete-btn"
                              onClick={() => removeItem(item.offeringId)}
                              title="Remove item"
                              aria-label={`Remove ${item.title}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          {item.bundleParentTitle && (
                            <div className="cart-item-card__bundle-tag">
                              <span>Part of {item.bundleParentTitle}</span>
                            </div>
                          )}

                          {item.vendorName && (
                            <div className="cart-item-card__vendor-row">
                              <span className="cart-item-card__vendor-name">
                                {item.vendorName}
                              </span>
                            </div>
                          )}

                          {isUndeliverable && (
                            <div className="cart-item-card__error-badge">
                              <AlertCircle size={12} style={{ flexShrink: 0 }} />
                              <span>
                                Not deliverable to {activeLocation.zoneName || 'this zone'}. Please remove to proceed.
                              </span>
                            </div>
                          )}

                          {/* Price and Quantity Stepper */}
                          <div className="cart-item-card__bottom">
                            <div className="cart-item-card__price-group">
                              <span className="cart-item-card__price">
                                {formatNgn(item.price * item.quantity)}
                              </span>
                              {item.quantity > 1 && (
                                <span className="cart-item-card__unit-price">
                                  ({formatNgn(item.price)} each)
                                </span>
                              )}
                            </div>

                            {item.type === 'PACKAGE' ? (
                              <div className="cart-item-card__service-badge">
                                <span>1 Complete Package</span>
                              </div>
                            ) : item.type === 'SERVICE' ? (
                              <div className="cart-item-card__service-badge">
                                <span>1 Service Booking</span>
                              </div>
                            ) : (
                              <div className="cart-item-card__stepper">
                                <button
                                  type="button"
                                  className="cart-item-card__stepper-btn"
                                  onClick={() => updateQuantity(item.offeringId, -1)}
                                  aria-label="Decrease quantity"
                                >
                                  {item.quantity === 1 ? (
                                    <Trash2 size={12} />
                                  ) : (
                                    <Minus size={12} strokeWidth={2.5} />
                                  )}
                                </button>
                                <span className="cart-item-card__stepper-value">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  className="cart-item-card__stepper-btn"
                                  onClick={() => updateQuantity(item.offeringId, 1)}
                                  aria-label="Increase quantity"
                                >
                                  <Plus size={12} strokeWidth={2.5} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer / Summary & Checkout */}
            {items.length > 0 && (
              <footer className="cart-drawer__footer">
                <div className="cart-drawer__summary-row">
                  <span className="cart-drawer__summary-label">Subtotal</span>
                  <span className="cart-drawer__summary-val">
                    {formatNgn(subtotal)}
                  </span>
                </div>
                <div className="cart-drawer__summary-row cart-drawer__summary-row--muted">
                  <span className="cart-drawer__summary-label">
                    {allServices ? 'Service Callout' : 'Estimated Delivery'}
                  </span>
                  <span className="cart-drawer__summary-val">
                    {allServices
                      ? 'Free'
                      : deliveryFee > 0
                        ? formatNgn(deliveryFee)
                        : 'Free Delivery'}
                  </span>
                </div>

                {hasUndeliverableItems ? (
                  <div className="cart-drawer__blocked-notice">
                    <AlertCircle size={15} style={{ flexShrink: 0 }} />
                    <span>
                      Remove {undeliverableItems.length === 1 ? 'the unavailable item' : `${undeliverableItems.length} unavailable items`} above to proceed to checkout
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="cart-drawer__checkout-btn"
                    onClick={handleProceedToCheckout}
                  >
                    <span>{allServices ? 'Proceed to Book' : 'Proceed to Checkout'}</span>
                    <span className="cart-drawer__checkout-total">
                      {formatNgn(subtotal + deliveryFee)}
                    </span>
                    <ArrowRight size={16} />
                  </button>
                )}
              </footer>
            )}
          </aside>
        </div>,
        document.body,
      )}

      {/* Persistent Floating Cart Pill (Apple Fluid Pill) */}
      {totalCount > 0 && !isOpen && (
        <button
          type="button"
          className={`floating-cart-pill ${
            isFluidNav ? 'floating-cart-pill--ios' : ''
          }`}
          onClick={() => {
            try {
              haptics.selection()
            } catch (_) {}
            openCart()
          }}
          aria-label={`View cart with ${totalCount} items`}
        >
          <div className="floating-cart-pill__icon">
            <ShoppingCart size={17} strokeWidth={2.3} />
            <span className="floating-cart-pill__badge">{totalCount}</span>
          </div>
          <span className="floating-cart-pill__label">Cart</span>
          <span className="floating-cart-pill__divider" />
          <span className="floating-cart-pill__amount">
            {formatNgn(subtotal)}
          </span>
        </button>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <CommerceCheckoutModal
          cartItems={items}
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          onSuccess={handleCheckoutSuccess}
          deliveryLocation={activeLocation}
          onLocationChange={setCurrentLocation}
        />
      )}
    </>
  )
}
