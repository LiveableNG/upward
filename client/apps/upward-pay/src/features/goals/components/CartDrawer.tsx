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
} from 'lucide-react'
import { useCart, type CartItem } from '../context/CartContext'
import { CommerceCheckoutModal } from './CommerceCheckoutModal'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import {
  getStoredDeliveryLocation,
  type UserDeliveryLocation,
} from '../utils/deliveryLocation'
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

  const activeLocation = propLocation || getStoredDeliveryLocation()

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
    if (items.length === 0) return
    setIsCheckoutOpen(true)
  }

  const handleCheckoutSuccess = () => {
    clearCart()
    setIsCheckoutOpen(false)
    closeCart()
  }

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

            {/* Delivery Destination Snippet */}
            <div className="cart-drawer__destination-bar">
              <Truck size={14} className="cart-drawer__destination-icon" />
              <div className="cart-drawer__destination-text">
                <span>Delivering to:</span>{' '}
                <strong>
                  {activeLocation.zoneName ||
                    activeLocation.address ||
                    'Abuja Metro / Lagos'}
                </strong>
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
                    Explore curated apartment bundles, moving packages, and
                    verified merchant perks. Customize packages by selecting
                    just the items you need.
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
                  {items.map((item) => (
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
                        </div>
                      </div>
                    </div>
                  ))}
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
                    Estimated Delivery
                  </span>
                  <span className="cart-drawer__summary-val">
                    Calculated at Checkout
                  </span>
                </div>

                <button
                  type="button"
                  className="cart-drawer__checkout-btn"
                  onClick={handleProceedToCheckout}
                >
                  <span>Proceed to Checkout</span>
                  <span className="cart-drawer__checkout-total">
                    {formatNgn(subtotal)}
                  </span>
                  <ArrowRight size={16} />
                </button>
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
          className="floating-cart-pill"
          onClick={openCart}
          aria-label={`View Cart with ${totalCount} items`}
        >
          <div className="floating-cart-pill__icon-wrap">
            <ShoppingCart size={17} strokeWidth={2.4} />
            <span className="floating-cart-pill__badge">{totalCount}</span>
          </div>
          <span className="floating-cart-pill__label">Cart</span>
          <span className="floating-cart-pill__divider" />
          <span className="floating-cart-pill__price">{formatNgn(subtotal)}</span>
        </button>
      )}

      {/* Multi-Item Checkout Modal */}
      {isCheckoutOpen && items.length > 0 && (
        <CommerceCheckoutModal
          cartItems={items}
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          onSuccess={handleCheckoutSuccess}
          deliveryLocation={activeLocation}
        />
      )}
    </>
  )
}
