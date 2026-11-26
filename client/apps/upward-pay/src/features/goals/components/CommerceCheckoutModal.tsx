'use client'

import React, { useState, useEffect, useMemo } from 'react'
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
  ShoppingBag,
  ChevronDown,
  ChevronRight,
  Check,
  Search,
  Ticket,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/common/Toast'
import { sessionTracker } from '@/lib/sessionTracker'
import {
  useCreateCommerceOrder,
  useInitializeCommercePayment,
  useVerifyCommercePayment,
  usePreviewCommerceOrder,
  useUserVoucher,
} from '../hooks/useCommerceOrders'
import type { GoalOffering } from '../types/goals.types'
import type { CartItem } from '../context/CartContext'
import {
  getStoredDeliveryLocation,
  saveStoredDeliveryLocation,
  type UserDeliveryLocation,
  type DeliveryZoneItem,
  isZoneSupportedByOffering,
  isItemDeliverableToZone,
  parseKoboToNgn,
} from '../utils/deliveryLocation'
import { fetchDeliveryZones } from '../services/goalsService'
import { BottomSheetModal } from '@/components/common/BottomSheetModal'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import '../styles/goals.css'
import '../styles/checkout.css'
import '../styles/voucher.css'

interface CommerceCheckoutModalProps {
  offering?: GoalOffering
  cartItems?: CartItem[]
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  deliveryLocation?: UserDeliveryLocation
  onLocationChange?: (loc: UserDeliveryLocation) => void
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

import { openPaystackInline } from '../utils/paystackInline'

export function CommerceCheckoutModal({
  offering,
  cartItems,
  isOpen,
  onClose,
  onSuccess,
  deliveryLocation,
  onLocationChange,
}: CommerceCheckoutModalProps) {
  const router = useRouter()
  const { user } = useAuth()
  const toast = useToast()
  const [mounted, setMounted] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Configured delivery zones & user selected zone
  const [availableZones, setAvailableZones] = useState<DeliveryZoneItem[]>([])
  const [selectedLocation, setSelectedLocation] = useState<UserDeliveryLocation>(() =>
    deliveryLocation || getStoredDeliveryLocation(),
  )
  const [isZonePickerOpen, setIsZonePickerOpen] = useState(false)
  const [zoneSearch, setZoneSearch] = useState('')

  const createOrder = useCreateCommerceOrder()
  const initializePayment = useInitializeCommercePayment()
  const verifyPayment = useVerifyCommercePayment()
  const previewOrder = usePreviewCommerceOrder()
  const { data: voucherSummary } = useUserVoucher(isOpen)
  const [applyVoucher, setApplyVoucher] = useState(false)
  const [serverVoucherMeta, setServerVoucherMeta] = useState<{
    availableNaira: number
    eligibleSubtotalNaira: number
  } | null>(null)

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

  // Filter available zones by search query
  const filteredZones = useMemo(() => {
    let result = availableZones
    if (zoneSearch.trim()) {
      const q = zoneSearch.toLowerCase().trim()
      result = result.filter(
        (z) =>
          z.name.toLowerCase().includes(q) ||
          z.areasCovered?.toLowerCase().includes(q) ||
          z.state?.toLowerCase().includes(q),
      )
    }
    return result
  }, [availableZones, zoneSearch])

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

            // Default to the first delivery location configured in the system
            const first = remote[0]
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
              onLocationChange?.(updated)
              return updated
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
  }, [onLocationChange])

  // Robust cross-platform body scroll lock & Escape listener
  useBodyScrollLock(isOpen)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
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

  const isMultiItem = Boolean(cartItems && cartItems.length > 0)
  const effectiveItems: CartItem[] = isMultiItem && cartItems
    ? cartItems
    : offering
      ? [
          {
            offeringId: offering.id,
            offeringUuid: offering.uuid || String(offering.id),
            title: offering.title || offering.name || 'Commerce Offering',
            subtitle: offering.subtitle,
            imageUrl:
              offering.imageUrl ||
              offering.media?.find((m) => m.isPrimary)?.mediaUrl ||
              offering.media?.[0]?.mediaUrl ||
              null,
            price: offering.price ? Number(offering.price) : 0,
            currency: offering.currency || 'NGN',
            quantity,
            vendorName: offering.vendor?.name || 'Upward Partner',
            vendorVerified: offering.vendor?.isVerified ?? false,
            type: (offering.type as CartItem['type']) || 'PRODUCT',
            voucherEligible: Boolean(offering.voucherEligible),
          },
        ]
      : []

  const itemsKey = effectiveItems
    .map((it) => `${it.offeringUuid || it.offeringId}:${it.quantity}`)
    .join('|')

  // Reset voucher toggle when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setApplyVoucher(false)
      setServerVoucherMeta(null)
    }
  }, [isOpen])

  // Authoritative server-side preview for voucher eligibility & balance
  useEffect(() => {
    if (!isOpen || effectiveItems.length === 0) return
    let cancelled = false
    previewOrder
      .mutateAsync({
        items: effectiveItems.map((it) => ({
          offeringUuid: it.offeringUuid,
          offeringId: it.offeringId,
          quantity: it.quantity,
        })),
        deliveryZoneTag: selectedLocation?.zoneTag,
        applyVoucher,
      })
      .then((res) => {
        if (cancelled) return
        setServerVoucherMeta({
          availableNaira: Number(res.availableVoucherKobo || 0) / 100,
          eligibleSubtotalNaira: Number(res.voucherEligibleSubtotalKobo || 0) / 100,
        })
      })
      .catch(() => {
        // Fallback to local wallet & item flags
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, itemsKey, selectedLocation?.zoneTag])

  const itemsSubtotal = effectiveItems.reduce(
    (acc, it) => acc + it.price * it.quantity,
    0,
  )
  const localEligibleSubtotal = effectiveItems.reduce(
    (acc, it) => acc + (it.voucherEligible ? it.price * it.quantity : 0),
    0,
  )
  const availableVoucherNaira =
    serverVoucherMeta?.availableNaira ??
    voucherSummary?.wallet?.availableBalanceNaira ??
    0
  const voucherEligibleSubtotal =
    serverVoucherMeta?.eligibleSubtotalNaira ?? localEligibleSubtotal
  const canApplyVoucher = availableVoucherNaira > 0 && voucherEligibleSubtotal > 0
  const voucherDiscount =
    canApplyVoucher && applyVoucher
      ? Math.min(availableVoucherNaira, voucherEligibleSubtotal)
      : 0

  const allServices = effectiveItems.length > 0 && effectiveItems.every((it) => it.type === 'SERVICE')
  const deliveryFee = allServices
    ? 0
    : parseKoboToNgn(selectedLocation?.deliveryFeeKobo)
  const grandTotal = Math.max(0, itemsSubtotal - voucherDiscount + deliveryFee)

  const offeringTitle = offering?.title || offering?.name || 'Commerce Offering'
  const vendorName = offering?.vendor?.name || 'Upward Partner'
  const primaryImage =
    offering?.imageUrl ||
    offering?.media?.find((m) => m.isPrimary)?.mediaUrl ||
    offering?.media?.[0]?.mediaUrl
  const isService = (offering?.type === 'SERVICE') || allServices

  // Validate which items in the order can be delivered / serviced in the selected zone
  const undeliverableItems = useMemo(() => {
    if (
      !selectedLocation?.zoneTag ||
      selectedLocation.zoneTag === 'UNCONFIGURED' ||
      selectedLocation.zoneTag === 'UNCOVERED'
    ) {
      return effectiveItems
    }
    return effectiveItems.filter((item) => {
      if (offering && item.offeringId === offering.id) {
        return !isItemDeliverableToZone(offering, selectedLocation.zoneTag)
      }
      return !isItemDeliverableToZone(item, selectedLocation.zoneTag)
    })
  }, [effectiveItems, offering, selectedLocation?.zoneTag])

  const isAllItemsDeliverable = undeliverableItems.length === 0

  const undeliverableSummary = useMemo(() => {
    if (undeliverableItems.length === 0) return null
    if (undeliverableItems.length === 1) {
      const item = undeliverableItems[0]
      return `"${item.title}" cannot be fulfilled in ${selectedLocation?.zoneName || selectedLocation?.address} (${item.vendorName || 'Vendor'} does not service this zone)`
    }
    return `${undeliverableItems.length} items in your order cannot be fulfilled in ${selectedLocation?.zoneName || selectedLocation?.address}`
  }, [undeliverableItems, selectedLocation])

  const isZoneDeliverable = Boolean(
    selectedLocation?.isDelivering &&
      isAllItemsDeliverable &&
      selectedLocation?.zoneTag &&
      selectedLocation.zoneTag !== 'UNCONFIGURED' &&
      selectedLocation.zoneTag !== 'UNCOVERED',
  )

  const onSubmit = async (data: CheckoutFormData) => {
    if (!isZoneDeliverable) {
      setErrorMessage(
        undeliverableSummary ||
          (isService
            ? 'Service coverage is not currently supported for this zone. Please select a supported location to proceed.'
            : 'Delivery is not currently supported for this zone. Please select a supported delivery zone to proceed.'),
      )
      return
    }

    if (itemsSubtotal <= 0) {
      setErrorMessage(
        'Services requiring custom quotes cannot be checked out with ₦0. Please submit a Quote Request instead.',
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
        applyVoucher: canApplyVoucher && applyVoucher,
        items: effectiveItems.map((it) => ({
          offeringUuid: it.offeringUuid,
          offeringId: it.offeringId,
          quantity: it.quantity,
        })),
      }

      const orderResult = await createOrder.mutateAsync(orderPayload)
      const createdOrder = orderResult.order

      if (!createdOrder?.uuid) {
        throw new Error('Order could not be created. Please try again.')
      }

      // 1b. If 100% covered by Upward Voucher, order is already confirmed & PAID
      if (orderResult.paymentRequired === false) {
        toast.success('Order confirmed and paid with your Upward voucher!')
        onSuccess?.()
        onClose()
        router.push(`/dashboard/lifestyle/orders?uuid=${createdOrder.uuid}`)
        return
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
          onSuccess?.()
          onClose()
          router.push(`/dashboard/lifestyle/orders?uuid=${createdOrder.uuid}`)
        } catch (popupErr: any) {
          if (popupErr?.message === 'Payment cancelled') {
            toast.info('Payment was cancelled. You can resume at any time from My Orders.')
            onSuccess?.()
            onClose()
            router.push(`/dashboard/lifestyle/orders?uuid=${createdOrder.uuid}`)
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
        onSuccess?.()
        onClose()
        router.push(`/dashboard/lifestyle/orders?uuid=${createdOrder.uuid}`)
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

  if (!isOpen || !mounted) return null

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
            <h3 className="checkout-sheet__title">
              {isService ? 'Secure Booking' : 'Secure Checkout'}
            </h3>
            <p className="checkout-sheet__subtitle">
              {isService
                ? 'Verify your service location & schedule securely.'
                : 'Verify your delivery address & checkout securely.'}
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

          {/* Item Summary Card */}
          {isMultiItem ? (
            <div className="checkout-sheet__items-multi">
              <div className="checkout-sheet__items-multi-header">
                <span className="checkout-sheet__items-multi-count">
                  Order Items ({effectiveItems.reduce((acc, ci) => acc + ci.quantity, 0)})
                </span>
                <span className="checkout-sheet__items-multi-subtotal">
                  {formatNgn(itemsSubtotal)}
                </span>
              </div>
              <div className="checkout-sheet__items-multi-list">
                {effectiveItems.map((item) => (
                  <div key={item.offeringId} className="checkout-sheet__item-row">
                    <div className="checkout-sheet__item-row-left">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="checkout-sheet__item-row-thumb"
                        />
                      ) : (
                        <div className="checkout-sheet__item-row-thumb-placeholder">
                          <ShoppingBag size={14} />
                        </div>
                      )}
                      <div className="checkout-sheet__item-row-info">
                        <div className="checkout-sheet__item-row-title">
                          {item.title}
                        </div>
                        <div className="checkout-sheet__item-row-meta">
                          <span>Qty: {item.quantity}</span>
                          <span>•</span>
                          <span>{item.vendorName || 'Upward Partner'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="checkout-sheet__item-row-price">
                      {formatNgn(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
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
                  {formatNgn(itemsSubtotal / Math.max(1, quantity))}
                  {offering?.pricingModel === 'STARTING_AT' && (
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
          )}

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

          {/* Delivery / Service Coverage Zone Section */}
          <div className="checkout-sheet__section">
            <div className="checkout-sheet__section-header">
              <h4 className="checkout-sheet__section-title">
                {isService ? 'Service Location' : 'Delivery Destination'}{' '}
                <span style={{ color: 'var(--clay)' }}>*</span>
              </h4>
            </div>

            {/* Clean Single Location Field */}
            <div
              className={`checkout-sheet__location-field ${
                !isZoneDeliverable ? 'checkout-sheet__location-field--error' : ''
              }`}
              onClick={() => setIsZonePickerOpen(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setIsZonePickerOpen(true)
                }
              }}
            >
              <div
                className={`checkout-sheet__location-field-icon ${
                  !isZoneDeliverable ? 'checkout-sheet__location-field-icon--warn' : ''
                }`}
              >
                <MapPin size={16} />
              </div>

              <div className="checkout-sheet__location-field-body">
                <div className="checkout-sheet__location-field-name">
                  {selectedLocation.zoneName || selectedLocation.address}
                </div>
                <div className="checkout-sheet__location-field-sub">
                  {isZoneDeliverable ? (
                    <span>
                      {selectedLocation.state || 'Selected Zone'} •{' '}
                      {allServices
                        ? 'On-site service'
                        : selectedLocation.deliveryFeeKobo
                          ? `Delivery: ${formatNgn(parseKoboToNgn(selectedLocation.deliveryFeeKobo))}`
                          : 'Free Delivery'}
                    </span>
                  ) : (
                    <span className="checkout-sheet__location-field-error-msg">
                      {undeliverableSummary ||
                        selectedLocation.pauseReason ||
                        'Currently outside active coverage area'}
                    </span>
                  )}
                </div>
              </div>

              <div className="checkout-sheet__location-field-action">
                <span>Change</span>
                <ChevronRight size={13} />
              </div>
            </div>

            <div className="checkout-sheet__field">
              <label className="checkout-sheet__label" htmlFor="streetAddress">
                {isService
                  ? 'Service Address & House / Apartment Number'
                  : 'Specific Street Address & House / Unit Number'}{' '}
                <span style={{ color: 'var(--clay)' }}>*</span>
              </label>
              <div className="checkout-sheet__input-with-icon">
                <MapPin size={16} className="checkout-sheet__input-icon" />
                <input
                  id="streetAddress"
                  type="text"
                  className={`checkout-sheet__input checkout-sheet__input--icon ${
                    errors.streetAddress ? 'checkout-sheet__input--error' : ''
                  }`}
                  placeholder={
                    isService
                      ? 'e.g. 14 Adeleke Street, Block B Flat 4'
                      : 'e.g. 14 Adeleke Street, Block B Flat 4'
                  }
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

            {/* Nearest Landmark & Driver/Specialist Notes */}
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
                  {isService
                    ? 'Gate Code / Specialist Notes (Optional)'
                    : 'Gate Code / Driver Notes (Optional)'}
                </label>
                <input
                  id="deliveryNotes"
                  type="text"
                  className="checkout-sheet__input"
                  placeholder={
                    isService
                      ? 'e.g. Call at the main gate, apartment floor or specialist access notes'
                      : 'e.g. Call at the main gate'
                  }
                  disabled={isProcessing}
                  {...register('deliveryNotes')}
                />
              </div>
            </div>
          </div>

          {/* Opt-in Upward Voucher Card (only shown when user has balance & item is eligible) */}
          {canApplyVoucher && (
            <button
              type="button"
              className={`voucher-apply-card ${applyVoucher ? 'voucher-apply-card--active' : ''}`}
              onClick={() => setApplyVoucher((prev) => !prev)}
              disabled={isProcessing}
              role="switch"
              aria-checked={applyVoucher}
            >
              <div className="voucher-apply-card__left">
                <span className="voucher-apply-card__icon" aria-hidden="true">
                  <Ticket size={16} />
                </span>
                <div className="voucher-apply-card__copy">
                  <span className="voucher-apply-card__title">Apply Upward Voucher</span>
                  <span
                    className={`voucher-apply-card__sub ${
                      applyVoucher ? 'voucher-apply-card__sub--saving' : ''
                    }`}
                  >
                    {applyVoucher
                      ? `Saving ${formatNgn(voucherDiscount)} on this order`
                      : `${formatNgn(availableVoucherNaira)} available`}
                  </span>
                </div>
              </div>
              <span
                className={`voucher-apply-card__switch ${
                  applyVoucher ? 'voucher-apply-card__switch--on' : ''
                }`}
                aria-hidden="true"
              >
                <span className="voucher-apply-card__knob" />
              </span>
            </button>
          )}

          {/* Ledger Breakdown */}
          <div className="checkout-sheet__ledger">
            <div className="checkout-sheet__ledger-row">
              <span className="checkout-sheet__ledger-label">
                Subtotal ({effectiveItems.reduce((sum, it) => sum + it.quantity, 0)}{' '}
                {effectiveItems.reduce((sum, it) => sum + it.quantity, 0) === 1 ? 'item' : 'items'})
              </span>
              <span className="checkout-sheet__ledger-val">
                {formatNgn(itemsSubtotal)}
              </span>
            </div>

            {voucherDiscount > 0 && (
              <div className="checkout-sheet__ledger-row">
                <span className="checkout-sheet__ledger-label">Upward Voucher</span>
                <span className="checkout-sheet__ledger-val voucher-ledger-discount">
                  -{formatNgn(voucherDiscount)}
                </span>
              </div>
            )}

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
            {!isZoneDeliverable ? (
              <button
                type="button"
                className="checkout-sheet__pay-btn"
                onClick={() => setIsZonePickerOpen(true)}
              >
                <MapPin size={16} />
                <span>Select Eligible Zone to Continue</span>
              </button>
            ) : (
              <button
                type="submit"
                className="checkout-sheet__pay-btn"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>{grandTotal === 0 ? 'Confirming Order...' : 'Connecting to Paystack...'}</span>
                  </>
                ) : grandTotal === 0 ? (
                  <>
                    <Ticket size={16} />
                    <span>Confirm Order with Voucher (₦0)</span>
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    <span>
                      {isService ? 'Book & Pay' : 'Pay'} {formatNgn(grandTotal)} with Paystack
                    </span>
                  </>
                )}
              </button>
            )}
            <p className="checkout-sheet__security-note">
              {grandTotal === 0
                ? 'Fully covered by your Upward voucher balance.'
                : 'Payments are processed securely via Paystack.'}
            </p>
          </div>
        </form>
      </div>

      {/* Zone Chooser Modal for In-Checkout Selection */}
      <BottomSheetModal
        isOpen={isZonePickerOpen}
        onClose={() => {
          setIsZonePickerOpen(false)
          setZoneSearch('')
        }}
        title={isService ? 'Choose Service Coverage Zone' : 'Choose Delivery Coverage Zone'}
        subtitle="Select a covered region to update delivery fees and proceed with checkout."
        maxWidth="500px"
      >
        <div className="delivery-sheet__search-box">
          <Search size={16} className="delivery-sheet__search-icon" />
          <input
            type="text"
            placeholder="Search zones by city, state, or area..."
            value={zoneSearch}
            onChange={(e) => setZoneSearch(e.target.value)}
            className="delivery-sheet__search-input"
            autoFocus
          />
          {zoneSearch && (
            <button
              type="button"
              onClick={() => setZoneSearch('')}
              className="delivery-sheet__search-clear"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="delivery-sheet__content" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
          {filteredZones.length === 0 ? (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                background: 'var(--surface)',
                borderRadius: '16px',
                border: '1px solid var(--shell-border, #f0e9df)',
              }}
            >
              <h4 style={{ margin: '0 0 6px', fontSize: '14.5px', fontWeight: 700, color: 'var(--text)' }}>
                No Matching Zones
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                We could not find any active coverage zone matching &quot;{zoneSearch}&quot;.
              </p>
            </div>
          ) : (
            filteredZones.map((zone) => {
              const isSupported = effectiveItems.every((item) => {
                if (offering && item.offeringId === offering.id) {
                  return isItemDeliverableToZone(offering, zone.tag)
                }
                return isItemDeliverableToZone(item, zone.tag)
              })
              const isSelected = selectedLocation.zoneTag === zone.tag
              return (
                <button
                  key={zone.tag}
                  type="button"
                  className={`delivery-sheet__option ${
                    isSelected ? 'delivery-sheet__option--selected' : ''
                  }`}
                  onClick={() => {
                    const updated: UserDeliveryLocation = {
                      address: zone.areasCovered?.split(',')?.[0]?.trim() || zone.name,
                      label: zone.name,
                      zoneTag: zone.tag,
                      zoneName: zone.name,
                      state: zone.state,
                      isDelivering: isSupported && zone.isDelivering,
                      pauseReason: zone.pauseReason,
                      deliveryFeeKobo: zone.deliveryFeeKobo,
                    }
                    setSelectedLocation(updated)
                    saveStoredDeliveryLocation(updated)
                    onLocationChange?.(updated)
                    setIsZonePickerOpen(false)
                    setZoneSearch('')
                  }}
                >
                  <div className="delivery-sheet__option-icon">
                    <MapPin size={16} />
                  </div>
                  <div className="delivery-sheet__option-details">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span className="delivery-sheet__option-title">{zone.name}</span>
                      {isSupported && zone.isDelivering ? (
                        <span className="delivery-sheet__tag delivery-sheet__tag--active">
                          Covered
                        </span>
                      ) : (
                        <span className="delivery-sheet__tag delivery-sheet__tag--unsupported">
                          Unavailable
                        </span>
                      )}
                    </div>
                    {zone.areasCovered && (
                      <span className="delivery-sheet__option-areas">{zone.areasCovered}</span>
                    )}
                    <span className="delivery-sheet__option-fee">
                      {allServices
                        ? 'Service Area'
                        : zone.deliveryFeeKobo
                          ? `Fee: ${formatNgn(parseKoboToNgn(zone.deliveryFeeKobo))}`
                          : 'Free Delivery'}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="delivery-sheet__check">
                      <Check size={14} strokeWidth={2.5} />
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>
      </BottomSheetModal>
    </div>,
    document.body,
  )
}
