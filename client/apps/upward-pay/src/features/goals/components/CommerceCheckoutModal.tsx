'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  X,
  ShieldCheck,
  MapPin,
  Lock,
  Plus,
  Minus,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/common/Toast'
import { sessionTracker } from '@/lib/sessionTracker'
import {
  useCreateCommerceOrder,
  useInitializeCommercePayment,
  useVerifyCommercePayment,
} from '../hooks/useCommerceOrders'
import type { GoalOffering } from '../types/goals.types'
import {
  getStoredDeliveryLocation,
  saveStoredDeliveryLocation,
  type UserDeliveryLocation,
  type DeliveryZoneItem,
  PRESET_DELIVERY_ZONES,
} from '../utils/deliveryLocation'
import { fetchDeliveryZones } from '../services/goalsService'
import '../styles/goals.css'

interface CommerceCheckoutModalProps {
  offering: GoalOffering
  isOpen: boolean
  onClose: () => void
  deliveryLocation?: UserDeliveryLocation
}

const checkoutSchema = z.object({
  recipientName: z.string().trim().min(2, 'Please enter your full name'),
  recipientPhone: z.string().trim().min(8, 'Please enter a valid phone number'),
  streetAddress: z.string().trim().min(3, 'Specific street address and house/flat number is required'),
  landmark: z.string().trim().optional(),
  deliveryNotes: z.string().trim().optional(),
})

type CheckoutFormData = z.infer<typeof checkoutSchema>

function formatNgn(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function openPaystackInline(accessCode: string, amount: number) {
  return new Promise<string>((resolve, reject) => {
    const scriptId = 'paystack-inline-js'
    let script = document.getElementById(scriptId) as HTMLScriptElement | null

    const launch = () => {
      try {
        sessionTracker.trackEvent(
          'INITIATE_PAYSTACK',
          { accessCode, amount, flow: 'COMMERCE_ORDER' },
          'PAYSTACK_POPUP',
        )
        const popup = new (window as any).PaystackPop()
        popup.resumeTransaction(accessCode, {
          onSuccess: (transaction: any) => {
            sessionTracker.trackEvent(
              'PAYMENT_SUCCESS',
              {
                reference: transaction.reference,
                amount,
                flow: 'COMMERCE_ORDER',
              },
              'PAYMENT_COMPLETE',
            )
            resolve(transaction.reference)
          },
          onCancel: () => {
            sessionTracker.trackEvent(
              'PAYSTACK_CLOSED_UNPAID',
              { accessCode, amount, flow: 'COMMERCE_ORDER' },
              'PAYSTACK_CANCELLED',
            )
            reject(new Error('Payment cancelled'))
          },
        })
      } catch (err: any) {
        sessionTracker.trackEvent(
          'PAYMENT_ERROR',
          { error: err?.message, flow: 'COMMERCE_ORDER' },
          'PAYMENT_ERROR',
        )
        reject(err)
      }
    }

    if (!script) {
      script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://js.paystack.co/v2/inline.js'
      script.async = true
      script.onload = launch
      script.onerror = () => {
        sessionTracker.trackEvent(
          'PAYMENT_ERROR',
          { error: 'Failed to load Paystack script', flow: 'COMMERCE_ORDER' },
          'PAYMENT_ERROR',
        )
        reject(new Error('Failed to load Paystack payment gateway'))
      }
      document.body.appendChild(script)
      return
    }

    if ((window as any).PaystackPop) launch()
    else script.addEventListener('load', launch)
  })
}

export function CommerceCheckoutModal({
  offering,
  isOpen,
  onClose,
  deliveryLocation,
}: CommerceCheckoutModalProps) {
  const router = useRouter()
  const { user } = useAuth()
  const toast = useToast()
  const [mounted, setMounted] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Configured delivery zones & user selected zone
  const [availableZones, setAvailableZones] = useState<DeliveryZoneItem[]>(PRESET_DELIVERY_ZONES)
  const [selectedLocation, setSelectedLocation] = useState<UserDeliveryLocation>(() =>
    deliveryLocation || getStoredDeliveryLocation(),
  )

  const createOrder = useCreateCommerceOrder()
  const initializePayment = useInitializeCommercePayment()
  const verifyPayment = useVerifyCommercePayment()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Sync selectedLocation whenever modal opens or deliveryLocation prop changes
  useEffect(() => {
    if (isOpen) {
      const loc = deliveryLocation || getStoredDeliveryLocation()
      setSelectedLocation(loc)
    }
  }, [isOpen, deliveryLocation])

  // Fetch available zones from API to ensure freshest data
  useEffect(() => {
    let isSubscribed = true
    const load = async () => {
      try {
        const remote = await fetchDeliveryZones()
        if (isSubscribed && remote && remote.length > 0) {
          setAvailableZones(remote)
          setSelectedLocation((prev) => {
            const matched = remote.find((z) => z.tag === prev.zoneTag)
            if (matched) {
              return {
                ...prev,
                zoneName: matched.name,
                isDelivering: matched.isDelivering,
                pauseReason: matched.pauseReason,
                deliveryFeeKobo: matched.deliveryFeeKobo,
              }
            }
            return prev
          })
        }
      } catch (e) {
        // use preset
      }
    }
    load()
    return () => {
      isSubscribed = false
    }
  }, [])

  // Lock body scroll and listen for Escape key
  useEffect(() => {
    if (isOpen) {
      const orig = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isProcessing) onClose()
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => {
        document.body.style.overflow = orig
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [isOpen, isProcessing, onClose])

  const initialName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
    : ''
  const initialPhone = user?.phone || ''

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      recipientName: initialName,
      recipientPhone: initialPhone,
      streetAddress: '',
      landmark: '',
      deliveryNotes: '',
    },
  })

  // Synchronize initial recipient defaults
  useEffect(() => {
    if (initialName) setValue('recipientName', initialName)
    if (initialPhone) setValue('recipientPhone', initialPhone)
  }, [initialName, initialPhone, setValue])

  if (!isOpen || !mounted) return null

  const unitPrice = offering.price ? Number(offering.price) : 0
  const itemsSubtotal = unitPrice * quantity
  const isService = offering.type === 'SERVICE'
  const deliveryFee = isService
    ? 0
    : selectedLocation?.deliveryFeeKobo
      ? Number(BigInt(selectedLocation.deliveryFeeKobo) / BigInt(100))
      : 0
  const grandTotal = itemsSubtotal + deliveryFee

  const offeringTitle = offering.title || offering.name || 'Commerce Offering'
  const vendorName = offering.vendor?.name || 'Upward Partner'
  const primaryImage =
    offering.imageUrl ||
    offering.media?.find((m) => m.isPrimary)?.mediaUrl ||
    offering.media?.[0]?.mediaUrl

  const isZoneDeliverable = Boolean(
    selectedLocation.isDelivering &&
      selectedLocation.zoneTag &&
      selectedLocation.zoneTag !== 'UNCONFIGURED' &&
      selectedLocation.zoneTag !== 'UNCOVERED',
  )

  const onSubmit = async (data: CheckoutFormData) => {
    if (!isZoneDeliverable) {
      setErrorMessage(
        'Delivery is not currently supported for this zone. Please select a supported delivery zone to proceed.',
      )
      return
    }

    try {
      setIsProcessing(true)
      setErrorMessage(null)

      const fullDeliveryAddress = `${data.streetAddress.trim()}, ${selectedLocation.zoneName || selectedLocation.address}${data.landmark?.trim() ? ` (Near ${data.landmark.trim()})` : ''}`

      // 1. Create order on the backend
      const orderPayload = {
        recipientName: data.recipientName,
        recipientPhone: data.recipientPhone,
        deliveryAddress: fullDeliveryAddress,
        deliveryZoneTag: selectedLocation.zoneTag,
        deliveryNotes: data.deliveryNotes ? data.deliveryNotes.trim() : undefined,
        items: [
          {
            offeringUuid: offering.uuid,
            offeringId: offering.id,
            quantity,
          },
        ],
      }

      const orderResult = await createOrder.mutateAsync(orderPayload)
      const createdOrder = orderResult.order

      if (!createdOrder?.uuid) {
        throw new Error('Order could not be created. Please try again.')
      }

      // 2. Initialize Paystack payment for this order
      const paymentInit = await initializePayment.mutateAsync(createdOrder.uuid)

      // 3. Open Paystack Inline Checkout popup
      if (paymentInit.accessCode) {
        try {
          const paidReference = await openPaystackInline(paymentInit.accessCode, grandTotal)

          // Authoritatively verify with backend so order transitions to PAID in DB
          try {
            await verifyPayment.mutateAsync({
              orderUuid: createdOrder.uuid,
              reference: paidReference || paymentInit.reference,
            })
          } catch (verifyErr) {
            console.warn('Payment direct verification note:', verifyErr)
          }

          toast.success('Payment confirmed! Your order has been placed.')
          onClose()
          router.push(`/dashboard/lifestyle/orders/${createdOrder.uuid}`)
        } catch (popupErr: any) {
          if (popupErr?.message === 'Payment cancelled') {
            toast.info('Payment was cancelled. You can resume at any time from My Orders.')
            onClose()
            router.push(`/dashboard/lifestyle/orders/${createdOrder.uuid}`)
          } else if (paymentInit.authorizationUrl) {
            window.location.href = paymentInit.authorizationUrl
          } else {
            throw popupErr
          }
        }
      } else if (paymentInit.authorizationUrl) {
        window.location.href = paymentInit.authorizationUrl
      } else {
        toast.success('Order placed successfully!')
        onClose()
        router.push(`/dashboard/lifestyle/orders/${createdOrder.uuid}`)
      }
    } catch (err: any) {
      console.error('Order creation failed:', err)
      setErrorMessage(
        err?.message || 'Could not initiate checkout. Please try again or contact support.',
      )
    } finally {
      setIsProcessing(false)
    }
  }

  return createPortal(
    <div
      className="checkout-sheet__backdrop"
      onClick={() => !isProcessing && onClose()}
      role="presentation"
    >
      <div
        className="checkout-sheet__panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Secure Commerce Checkout"
      >
        {/* Drag handle pill */}
        <div className="checkout-sheet__handle" aria-hidden="true" />

        {/* Modal Header */}
        <div className="checkout-sheet__header">
          <div>
            <h3 className="checkout-sheet__title">Secure Checkout</h3>
            <p className="checkout-sheet__subtitle">
              Verify your delivery address &amp; checkout securely.
            </p>
          </div>
          <button
            type="button"
            className="checkout-sheet__close"
            onClick={onClose}
            disabled={isProcessing}
            aria-label="Close checkout"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="checkout-sheet__body">
          {errorMessage && (
            <div className="checkout-sheet__alert" role="alert">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Item Summary Card (Restored exact 58px thumb styling) */}
          <div className="checkout-sheet__item-card">
            {primaryImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={primaryImage}
                alt={offeringTitle}
                className="checkout-sheet__item-thumb"
              />
            ) : (
              <div className="checkout-sheet__item-thumb-placeholder">
                <MapPin size={24} />
              </div>
            )}
            <div className="checkout-sheet__item-details">
              <div className="checkout-sheet__item-title">{offeringTitle}</div>
              <div className="checkout-sheet__item-merchant">
                <span>By {vendorName}</span>
                <ShieldCheck size={13} className="checkout-sheet__verified-icon" />
              </div>
              <div className="checkout-sheet__item-price">
                {formatNgn(unitPrice)}
                {offering.pricingModel === 'STARTING_AT' && (
                  <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>
                    {' '}starting
                  </span>
                )}
              </div>
            </div>

            {/* Quantity Stepper (for goods/bundles) */}
            {!isService && (
              <div className="checkout-sheet__stepper">
                <button
                  type="button"
                  className="checkout-sheet__stepper-btn"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || isProcessing}
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} />
                </button>
                <span className="checkout-sheet__stepper-value">{quantity}</span>
                <button
                  type="button"
                  className="checkout-sheet__stepper-btn"
                  onClick={() => setQuantity((q) => q + 1)}
                  disabled={isProcessing}
                  aria-label="Increase quantity"
                >
                  <Plus size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Recipient & Contact Details */}
          <div className="checkout-sheet__section">
            <h4 className="checkout-sheet__section-title">Recipient &amp; Contact</h4>
            <div className="checkout-sheet__grid">
              <div className="checkout-sheet__field">
                <label className="checkout-sheet__label" htmlFor="recipientName">
                  Full Name
                </label>
                <input
                  id="recipientName"
                  type="text"
                  className={`checkout-sheet__input ${
                    errors.recipientName ? 'checkout-sheet__input--error' : ''
                  }`}
                  placeholder="e.g. Samuel Adeleke"
                  disabled={isProcessing}
                  {...register('recipientName')}
                />
                {errors.recipientName && (
                  <span className="checkout-sheet__field-error">
                    {errors.recipientName.message}
                  </span>
                )}
              </div>

              <div className="checkout-sheet__field">
                <label className="checkout-sheet__label" htmlFor="recipientPhone">
                  Phone Number
                </label>
                <input
                  id="recipientPhone"
                  type="tel"
                  className={`checkout-sheet__input ${
                    errors.recipientPhone ? 'checkout-sheet__input--error' : ''
                  }`}
                  placeholder="e.g. 08012345678"
                  disabled={isProcessing}
                  {...register('recipientPhone')}
                />
                {errors.recipientPhone && (
                  <span className="checkout-sheet__field-error">
                    {errors.recipientPhone.message}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Delivery Coverage Zone Section */}
          <div className="checkout-sheet__section">
            <div className="checkout-sheet__section-header">
              <h4 className="checkout-sheet__section-title">
                Delivery Coverage Zone <span style={{ color: 'var(--clay)' }}>*</span>
              </h4>
            </div>

            {/* Prefilled Locked Zone Card */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md, 12px)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: isZoneDeliverable
                    ? 'var(--success-bg, rgba(34, 197, 94, 0.08))'
                    : 'var(--surface2)',
                  color: isZoneDeliverable
                    ? 'var(--success, #22c55e)'
                    : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <MapPin size={18} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>

                {/* Zone Full Name with clean line-height & wrapping */}
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '13.5px',
                    color: 'var(--text)',
                    lineHeight: 1.35,
                    wordBreak: 'break-word',
                  }}
                >
                  {selectedLocation.zoneName || selectedLocation.address}
                </div>

                {selectedLocation.state && (
                  <div
                    style={{
                      fontSize: '11.5px',
                      color: 'var(--text-secondary)',
                      marginTop: '2px',
                    }}
                  >
                    {selectedLocation.state}
                  </div>
                )}
              </div>
            </div>

            {/* Unsupported / Paused Zone Notice Banner */}
            {!isZoneDeliverable && (
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md, 10px)',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  marginTop: '8px',
                }}
              >
                <AlertCircle
                  size={16}
                  style={{
                    color: 'var(--clay)',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                />
                <div
                  style={{
                    fontSize: '12.5px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.4,
                  }}
                >
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                    {selectedLocation.pauseReason ||
                      'We are working towards expanding our delivery coverage to other locations soon!'}
                  </span>
                  <br />
                  Delivery to this zone is currently paused or pending rollout. You cannot place orders to this location at this time.
                </div>
              </div>
            )}

            {/* Specific Address Input */}
            <div className="checkout-sheet__field">
              <label className="checkout-sheet__label" htmlFor="streetAddress">
                Specific Street Address &amp; House / Unit Number <span style={{ color: 'var(--clay)' }}>*</span>
              </label>
              <div className="checkout-sheet__input-with-icon">
                <MapPin size={16} className="checkout-sheet__input-icon" />
                <input
                  id="streetAddress"
                  type="text"
                  className={`checkout-sheet__input checkout-sheet__input--icon ${
                    errors.streetAddress ? 'checkout-sheet__input--error' : ''
                  }`}
                  placeholder="e.g. 14 Adeleke Street, Block B Flat 4"
                  disabled={isProcessing}
                  {...register('streetAddress')}
                />
              </div>
              {errors.streetAddress && (
                <span className="checkout-sheet__field-error">
                  {errors.streetAddress.message}
                </span>
              )}
            </div>

            {/* Nearest Landmark & Driver Notes */}
            <div className="checkout-sheet__grid">
              <div className="checkout-sheet__field">
                <label className="checkout-sheet__label" htmlFor="landmark">
                  Nearest Landmark (Optional)
                </label>
                <input
                  id="landmark"
                  type="text"
                  className="checkout-sheet__input"
                  placeholder="e.g. Opposite Ebeano Supermarket"
                  disabled={isProcessing}
                  {...register('landmark')}
                />
              </div>

              <div className="checkout-sheet__field">
                <label className="checkout-sheet__label" htmlFor="deliveryNotes">
                  Gate Code / Driver Notes (Optional)
                </label>
                <input
                  id="deliveryNotes"
                  type="text"
                  className="checkout-sheet__input"
                  placeholder="e.g. Call at the main gate"
                  disabled={isProcessing}
                  {...register('deliveryNotes')}
                />
              </div>
            </div>
          </div>

          {/* Ledger Breakdown */}
          <div className="checkout-sheet__ledger">
            <div className="checkout-sheet__ledger-row">
              <span className="checkout-sheet__ledger-label">
                Subtotal ({quantity} {quantity === 1 ? 'item' : 'items'})
              </span>
              <span className="checkout-sheet__ledger-val">
                {formatNgn(itemsSubtotal)}
              </span>
            </div>

            <div className="checkout-sheet__ledger-row">
              <span className="checkout-sheet__ledger-label">
                {isService ? 'Service Callout' : 'Delivery Fee'}
              </span>
              <span
                className={`checkout-sheet__ledger-val ${
                  deliveryFee === 0 ? 'checkout-sheet__ledger-val--free' : ''
                }`}
              >
                {deliveryFee === 0 ? 'Free' : formatNgn(deliveryFee)}
              </span>
            </div>

            <div className="checkout-sheet__ledger-divider" />

            <div className="checkout-sheet__ledger-row checkout-sheet__ledger-row--total">
              <span className="checkout-sheet__ledger-label-total">Total Due</span>
              <span className="checkout-sheet__ledger-val-total">
                {formatNgn(grandTotal)}
              </span>
            </div>
          </div>

          {/* Checkout CTA */}
          <div className="checkout-sheet__footer">
            <button
              type="submit"
              className="checkout-sheet__pay-btn"
              disabled={isProcessing || !isZoneDeliverable}
              style={{
                opacity: !isZoneDeliverable ? 0.5 : 1,
                cursor: !isZoneDeliverable ? 'not-allowed' : 'pointer',
                background: !isZoneDeliverable ? 'var(--surface2)' : undefined,
                color: !isZoneDeliverable ? 'var(--text-muted)' : undefined,
                border: !isZoneDeliverable ? '1px solid var(--border)' : undefined,
              }}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Connecting to Paystack...</span>
                </>
              ) : !isZoneDeliverable ? (
                <>
                  <MapPin size={16} />
                  <span>Location Not Supported Yet</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>Pay {formatNgn(grandTotal)} with Paystack</span>
                </>
              )}
            </button>
            <p className="checkout-sheet__security-note">
              Payments are processed securely via Paystack.
            </p>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
