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
  Truck,
  Wrench,
  Lock,
  Plus,
  Minus,
  Loader2,
  AlertCircle,
  Building,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/common/Toast'
import { sessionTracker } from '@/lib/sessionTracker'
import {
  useCreateCommerceOrder,
  useInitializeCommercePayment,
} from '../hooks/useCommerceOrders'
import type { GoalOffering } from '../types/goals.types'
import { getStoredDeliveryLocation } from '../utils/deliveryLocation'
import '../styles/goals.css'

interface CommerceCheckoutModalProps {
  offering: GoalOffering
  isOpen: boolean
  onClose: () => void
}

const checkoutSchema = z.object({
  recipientName: z.string().trim().min(2, 'Please enter your full name'),
  recipientPhone: z.string().trim().min(8, 'Please enter a valid phone number'),
  deliveryAddress: z.string().trim().min(5, 'Delivery address is required'),
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
}: CommerceCheckoutModalProps) {
  const router = useRouter()
  const { user } = useAuth()
  const toast = useToast()
  const [mounted, setMounted] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const createOrder = useCreateCommerceOrder()
  const initializePayment = useInitializeCommercePayment()

  useEffect(() => {
    setMounted(true)
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
  const storedLoc = getStoredDeliveryLocation()
  const initialAddress =
    storedLoc?.address ||
    user?.properties?.[0]?.address ||
    user?.address ||
    ''

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
      deliveryAddress: initialAddress,
      deliveryNotes: '',
    },
  })

  // Synchronize prefill when user or stored location changes
  useEffect(() => {
    if (initialName) setValue('recipientName', initialName)
    if (initialPhone) setValue('recipientPhone', initialPhone)
    if (initialAddress) setValue('deliveryAddress', initialAddress)
  }, [initialName, initialPhone, initialAddress, setValue])

  if (!isOpen || !mounted) return null

  const unitPrice = offering.price ? Number(offering.price) : 0
  const itemsSubtotal = unitPrice * quantity
  const isService = offering.type === 'SERVICE'
  // Delivery is free for Upward lifestyle orders or included in pricing
  const deliveryFee = 0
  const grandTotal = itemsSubtotal + deliveryFee

  const offeringTitle = offering.title || offering.name || 'Commerce Offering'
  const vendorName = offering.vendor?.name || 'Upward Partner'
  const primaryImage =
    offering.imageUrl ||
    offering.media?.find((m) => m.isPrimary)?.mediaUrl ||
    offering.media?.[0]?.mediaUrl

  const onSubmit = async (data: CheckoutFormData) => {
    try {
      setIsProcessing(true)
      setErrorMessage(null)

      // 1. Create order on the backend (using offering UUID)
      const orderPayload = {
        recipientName: data.recipientName,
        recipientPhone: data.recipientPhone,
        deliveryAddress: data.deliveryAddress,
        deliveryNotes: data.deliveryNotes || undefined,
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
          await openPaystackInline(paymentInit.accessCode, grandTotal)
          toast.success('Payment confirmed! Your order has been placed.')
          onClose()
          router.push(`/dashboard/lifestyle/orders/${createdOrder.uuid}`)
        } catch (popupErr: any) {
          if (popupErr?.message === 'Payment cancelled') {
            toast.info('Payment was cancelled. You can resume at any time from My Orders.')
            onClose()
            router.push(`/dashboard/lifestyle/orders/${createdOrder.uuid}`)
          } else if (paymentInit.authorizationUrl) {
            // Fallback to full-page redirect if inline popup fails
            window.location.href = paymentInit.authorizationUrl
          } else {
            throw popupErr
          }
        }
      } else if (paymentInit.authorizationUrl) {
        window.location.href = paymentInit.authorizationUrl
      } else {
        throw new Error('Payment gateway access code could not be resolved.')
      }
    } catch (err: any) {
      console.error('Checkout failed:', err)
      const msg =
        err?.message ||
        err?.response?.data?.message ||
        'Unable to process order. Please check your connection and try again.'
      setErrorMessage(msg)
      toast.error(msg, 'Order Failed')
    } finally {
      setIsProcessing(false)
    }
  }

  return createPortal(
    <div
      className="checkout-sheet__backdrop"
      onClick={() => {
        if (!isProcessing) onClose()
      }}
      role="presentation"
    >
      <div
        className="checkout-sheet__panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Secure Checkout"
      >
        <div className="checkout-sheet__handle" aria-hidden="true" />

        {/* Header */}
        <div className="checkout-sheet__header">
          <div className="checkout-sheet__title-wrap">
            <h3 className="checkout-sheet__title">
              {isService ? 'Confirm Booking' : 'Review & Checkout'}
            </h3>
            <span className="checkout-sheet__badge">
              <Lock size={12} />
              <span>256-Bit Encrypted</span>
            </span>
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

        {/* Content Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="checkout-sheet__body">
          {errorMessage && (
            <div className="checkout-sheet__alert" role="alert">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Item Summary Card */}
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
                {isService ? <Wrench size={24} /> : <Truck size={24} />}
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
            <h4 className="checkout-sheet__section-title">Recipient & Contact</h4>

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

          {/* Delivery Destination */}
          <div className="checkout-sheet__section">
            <div className="checkout-sheet__section-header">
              <h4 className="checkout-sheet__section-title">
                {isService ? 'Service Location' : 'Delivery Address'}
              </h4>
              {user?.properties?.[0]?.address && (
                <button
                  type="button"
                  className="checkout-sheet__use-rental-btn"
                  onClick={() =>
                    setValue(
                      'deliveryAddress',
                      user.properties![0].address,
                      { shouldValidate: true },
                    )
                  }
                  disabled={isProcessing}
                >
                  <Building size={12} />
                  <span>Use Rental Unit</span>
                </button>
              )}
            </div>

            <div className="checkout-sheet__field">
              <div className="checkout-sheet__input-with-icon">
                <MapPin size={16} className="checkout-sheet__input-icon" />
                <input
                  id="deliveryAddress"
                  type="text"
                  className={`checkout-sheet__input checkout-sheet__input--icon ${
                    errors.deliveryAddress ? 'checkout-sheet__input--error' : ''
                  }`}
                  placeholder="Street, building/apartment unit, city"
                  disabled={isProcessing}
                  {...register('deliveryAddress')}
                />
              </div>
              {errors.deliveryAddress && (
                <span className="checkout-sheet__field-error">
                  {errors.deliveryAddress.message}
                </span>
              )}
            </div>

            <div className="checkout-sheet__field" style={{ marginTop: '8px' }}>
              <input
                id="deliveryNotes"
                type="text"
                className="checkout-sheet__input checkout-sheet__input--subtle"
                placeholder="Gate code, landmark, or special delivery notes (optional)"
                disabled={isProcessing}
                {...register('deliveryNotes')}
              />
            </div>
          </div>

          {/* Price Ledger Breakdown */}
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
                {isService ? 'Service Callout' : 'Standard Delivery'}
              </span>
              <span className="checkout-sheet__ledger-val checkout-sheet__ledger-val--free">
                Free
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

          {/* Submit Action */}
          <div className="checkout-sheet__footer">
            <button
              type="submit"
              className="checkout-sheet__pay-btn"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Connecting to Paystack...</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>Pay {formatNgn(grandTotal)} with Paystack</span>
                </>
              )}
            </button>
            <p className="checkout-sheet__security-note">
              Funds are held securely by Upward Escrow until delivery is confirmed.
            </p>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
