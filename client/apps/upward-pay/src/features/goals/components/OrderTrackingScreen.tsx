'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft,
  Truck,
  Wrench,
  Package,
  Clock,
  Download,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  MessageSquare,
  HelpCircle,
  X,
  Loader2,
  MapPin,
  Calendar,
  User,
  Phone,
  PackageCheck,
  Star,
  CreditCard,
  Key,
} from 'lucide-react'
import { useToast } from '@/components/common/Toast'
import {
  useTenantOrderDetail,
  useDownloadCommerceReceipt,
  useConfirmSubOrderReceipt,
  useCreateCommerceDispute,
  useInitializeCommercePayment,
  useVerifyCommercePayment,
} from '../hooks/useCommerceOrders'
import { openPaystackInline } from '../utils/paystackInline'
import { BottomSheetModal } from '@/components/common/BottomSheetModal'
import '../styles/goals.css'
import type {
  CustomerFulfilmentStatus,
  TenantOrderDetailDto,
  TenantSubOrderDetailDto,
} from '../types/commerce.types'

function formatKoboToNgn(koboStr: string): string {
  const amount = Number(koboStr) / 100
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return 'N/A'
  try {
    return new Date(dateStr).toLocaleString('en-NG', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return dateStr
  }
}

const disputeSchema = z.object({
  reason: z.string().min(3, 'Please select or enter a reason'),
  explanation: z.string().min(10, 'Please provide at least 10 characters of explanation'),
})

type DisputeFormData = z.infer<typeof disputeSchema>

export function OrderTrackingScreen({ orderUuid }: { orderUuid: string }) {
  const router = useRouter()
  const toast = useToast()
  const { data: order, isLoading, error } = useTenantOrderDetail(orderUuid)
  const downloadReceipt = useDownloadCommerceReceipt()
  const confirmReceipt = useConfirmSubOrderReceipt()
  const createDispute = useCreateCommerceDispute()
  const initializePayment = useInitializeCommercePayment()
  const verifyPayment = useVerifyCommercePayment()

  const [activeDisputeSubOrder, setActiveDisputeSubOrder] = useState<TenantSubOrderDetailDto | null>(null)
  const [subOrderToConfirm, setSubOrderToConfirm] = useState<TenantSubOrderDetailDto | null>(null)
  const [rating, setRating] = useState<number>(5)
  const [feedback, setFeedback] = useState<string>('')
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isPaying, setIsPaying] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DisputeFormData>({
    resolver: zodResolver(disputeSchema),
    defaultValues: {
      reason: 'Damaged or incorrect item',
      explanation: '',
    },
  })

  if (isLoading) {
    return (
      <div className="order-tracking">
        <header className="order-tracking__header">
          <button
            type="button"
            className="order-tracking__back-btn"
            onClick={() => router.push('/dashboard/lifestyle/orders')}
          >
            <ArrowLeft size={16} />
          </button>
          <div className="order-tracking__title-skel animate-pulse" />
        </header>
        <div className="order-tracking__content">
          <div className="order-tracking__card-skel animate-pulse" />
          <div className="order-tracking__card-skel animate-pulse" />
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="order-tracking orders-hub__empty">
        <AlertTriangle size={40} color="#D97706" />
        <h2 className="orders-hub__empty-title">Order Not Found</h2>
        <p className="orders-hub__empty-desc">
          We could not locate this order or it belongs to a different session.
        </p>
        <button
          type="button"
          className="orders-hub__explore-btn"
          onClick={() => router.push('/dashboard/lifestyle/orders')}
        >
          <span>Back to My Orders</span>
        </button>
      </div>
    )
  }

  const handleDownloadReceipt = async () => {
    try {
      setIsDownloading(true)
      await downloadReceipt.mutateAsync({
        orderUuid: order.uuid,
        filename: `${order.orderNumber}-receipt.pdf`,
      })
    } catch (err: any) {
      toast.error(err?.message || 'Could not download receipt.')
    } finally {
      setIsDownloading(false)
    }
  }

  const executeConfirmReceipt = async () => {
    if (!subOrderToConfirm) return
    try {
      await confirmReceipt.mutateAsync({
        subOrderUuid: subOrderToConfirm.uuid,
        rating,
        feedback: feedback.trim() || undefined,
      })
      toast.success('Delivery receipt confirmed! Thank you for rating.')
      setSubOrderToConfirm(null)
      setRating(5)
      setFeedback('')
      setHoveredRating(null)
    } catch (err: any) {
      toast.error(err?.message || 'Could not confirm delivery.')
    }
  }

  const onSubmitDispute = async (formData: DisputeFormData) => {
    if (!activeDisputeSubOrder) return
    try {
      await createDispute.mutateAsync({
        subOrderUuid: activeDisputeSubOrder.uuid,
        reason: formData.reason,
        explanation: formData.explanation,
      })
      toast.success('Your inquiry has been logged. Upward Support is reviewing it.')
      setActiveDisputeSubOrder(null)
      reset()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit inquiry.')
    }
  }

  const handlePayNow = async () => {
    if (!order) return
    try {
      setIsPaying(true)
      const paymentInit = await initializePayment.mutateAsync(order.uuid)
      if (paymentInit.accessCode) {
        const grandTotal = Number(order.totalAmountKobo) / 100
        const paidRef = await openPaystackInline(paymentInit.accessCode, grandTotal)
        try {
          await verifyPayment.mutateAsync({
            orderUuid: order.uuid,
            reference: paidRef || paymentInit.reference,
          })
        } catch (verifyErr) {
          console.warn('Payment direct verification note:', verifyErr)
        }
        toast.success('Payment confirmed! Fulfilment has commenced.')
      } else if (paymentInit.authorizationUrl) {
        window.location.href = paymentInit.authorizationUrl
      }
    } catch (err: any) {
      if (err?.message === 'Payment cancelled') {
        toast.info('Payment cancelled. You can complete payment at any time.')
      } else {
        toast.error(err?.message || 'Could not launch payment gateway.')
      }
    } finally {
      setIsPaying(false)
    }
  }

  return (
    <div className="order-tracking">
      {/* Header */}
      <header className="order-tracking__header">
        <button
          type="button"
          className="order-tracking__back-btn"
          onClick={() => router.push('/dashboard/lifestyle/orders')}
          aria-label="Back to orders"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="order-tracking__header-meta">
          <div className="order-tracking__order-id">{order.orderNumber}</div>
          <div className="order-tracking__order-date">
            Placed on {formatDateTime(order.createdAt)} · {formatKoboToNgn(order.totalAmountKobo)}
          </div>
        </div>
        {order.paymentStatus === 'PAID' ? (
          <button
            type="button"
            className="order-tracking__receipt-cta"
            onClick={handleDownloadReceipt}
            disabled={isDownloading}
            title="Download official PDF receipt"
          >
            {isDownloading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Download size={15} />
            )}
            <span>Receipt</span>
          </button>
        ) : (
          <button
            type="button"
            className="order-tracking__header-pay-btn"
            onClick={handlePayNow}
            disabled={isPaying}
          >
            {isPaying ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CreditCard size={14} />
            )}
            <span>Pay Now</span>
          </button>
        )}
      </header>

      {/* Unpaid Order Alert & Immediate Pay Action */}
      {order.paymentStatus !== 'PAID' && (
        <div className="order-tracking__unpaid-banner">
          <div className="order-tracking__unpaid-icon">
            <AlertTriangle size={20} color="#D97706" />
          </div>
          <div className="order-tracking__unpaid-content">
            <div className="order-tracking__unpaid-head">
              <strong className="order-tracking__unpaid-title">
                Payment Pending · {formatKoboToNgn(order.totalAmountKobo)}
              </strong>
              <span className="order-tracking__unpaid-badge">Action Required</span>
            </div>
            <p className="order-tracking__unpaid-desc">
              Your order has been placed, but payment is not complete. Pay now with Paystack so the merchant can begin preparation and dispatch.
            </p>
            <button
              type="button"
              className="order-tracking__unpaid-pay-btn"
              onClick={handlePayNow}
              disabled={isPaying}
            >
              {isPaying ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Connecting to Paystack...</span>
                </>
              ) : (
                <>
                  <CreditCard size={15} />
                  <span>Pay {formatKoboToNgn(order.totalAmountKobo)} Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Destination Card */}
      <div className="order-tracking__destination-card">
        <div className="order-tracking__destination-icon">
          <MapPin size={18} color="var(--clay)" />
        </div>
        <div className="order-tracking__destination-info">
          <div className="order-tracking__destination-title">Fulfillment Destination</div>
          <div className="order-tracking__destination-address">{order.deliveryAddress}</div>
          <div className="order-tracking__destination-contact">
            Recipient: {order.recipientName} ({order.recipientPhone})
          </div>
        </div>
      </div>

      {/* Sub-Orders Section */}
      <div className="order-tracking__suborders">
        {order.subOrders.map((subOrder) => {
          const isService = subOrder.items.some((i) => i.offeringType === 'SERVICE')

          // Consolidated 3-step pipeline for physical goods
          const productSteps = [
            { key: 'CONFIRMED', label: 'Order Confirmed' },
            { key: 'DISPATCHED', label: 'Dispatched & En Route' },
            { key: 'DELIVERED', label: 'Delivered' },
          ]

          const serviceSteps = [
            { key: 'ORDER_CONFIRMED', label: 'Confirmed' },
            { key: 'SERVICE_SCHEDULED', label: 'Scheduled' },
            { key: 'TECHNICIAN_EN_ROUTE', label: 'En Route' },
            { key: 'SERVICE_COMPLETED', label: 'Completed' },
          ]

          const steps = isService ? serviceSteps : productSteps

          let activeStepIndex = 0
          if (isService) {
            if (['SERVICE_COMPLETED', 'RECEIVED_CONFIRMED'].includes(subOrder.customerStatus)) {
              activeStepIndex = 3
            } else if (subOrder.customerStatus === 'TECHNICIAN_EN_ROUTE') {
              activeStepIndex = 2
            } else if (subOrder.customerStatus === 'SERVICE_SCHEDULED' || subOrder.customerStatus === 'PROCESSING') {
              activeStepIndex = 1
            } else {
              activeStepIndex = 0
            }
          } else {
            if (['DELIVERED', 'RECEIVED_CONFIRMED'].includes(subOrder.customerStatus)) {
              activeStepIndex = 2
            } else if (['DISPATCHED', 'OUT_FOR_DELIVERY'].includes(subOrder.customerStatus)) {
              activeStepIndex = 1
            } else {
              activeStepIndex = 0
            }
          }

          const isDispatchedLive =
            (!isService && ['DISPATCHED', 'OUT_FOR_DELIVERY'].includes(subOrder.customerStatus)) ||
            (isService && subOrder.customerStatus === 'TECHNICIAN_EN_ROUTE')

          return (
            <div key={subOrder.uuid} className="order-tracking__suborder-card">
              {/* Suborder Header */}
              <div className="order-tracking__suborder-head">
                <div>
                  {order.subOrders.length > 1 && (
                    <div className="order-tracking__suborder-num">{subOrder.subOrderNumber}</div>
                  )}
                  <div className="order-tracking__vendor-tag">
                    <ShieldCheck size={14} color="var(--clay)" />
                    <span>Fulfilled by {subOrder.vendor?.name || subOrder.vendorName || 'Upward Merchant'}</span>
                  </div>
                </div>

                <div className="order-tracking__suborder-actions">
                  {['DELIVERED', 'SERVICE_COMPLETED'].includes(subOrder.customerStatus) && (
                    <button
                      type="button"
                      className="order-tracking__confirm-btn"
                      onClick={() => {
                        setSubOrderToConfirm(subOrder)
                        setRating(5)
                        setFeedback('')
                        setHoveredRating(null)
                      }}
                    >
                      <CheckCircle2 size={13} />
                      <span>Confirm Received</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="order-tracking__dispute-btn"
                    onClick={() => setActiveDisputeSubOrder(subOrder)}
                    title="Report issue or ask customer support"
                  >
                    <HelpCircle size={13} />
                    <span>Customer Support</span>
                  </button>
                </div>
              </div>

              {/* Operational Dispatch Message / Live Advisory */}
              {subOrder.adminOperationalNotes && (
                <div className="order-tracking__alert-banner order-tracking__alert-banner--dispatch">
                  <MessageSquare size={16} color="var(--clay)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div className="order-tracking__alert-text">
                    <strong>Dispatch Note:</strong> {subOrder.adminOperationalNotes}
                  </div>
                </div>
              )}

              {/* Stepper Progression */}
              <div className="order-tracking__stepper">
                <div className="order-tracking__stepper-track">
                  <div
                    className="order-tracking__stepper-fill"
                    style={{
                      width: ['DELIVERED', 'RECEIVED_CONFIRMED', 'SERVICE_COMPLETED'].includes(subOrder.customerStatus)
                        ? '100%'
                        : `${(activeStepIndex / (steps.length - 1)) * 100}%`,
                    }}
                  />
                </div>
                <div className="order-tracking__stepper-nodes">
                  {steps.map((step, idx) => {
                    const isFinalReached = ['DELIVERED', 'RECEIVED_CONFIRMED', 'SERVICE_COMPLETED'].includes(subOrder.customerStatus)
                    const isAllFinalized = ['RECEIVED_CONFIRMED', 'SERVICE_COMPLETED'].includes(subOrder.customerStatus)
                    const isDone = isFinalReached ? idx <= activeStepIndex : idx < activeStepIndex
                    const isCurrent = isFinalReached ? false : idx === activeStepIndex
                    const isBeamingStep = isCurrent && isDispatchedLive

                    return (
                      <div
                        key={step.key}
                        className={`order-tracking__node ${isDone
                          ? 'order-tracking__node--done'
                          : isCurrent
                            ? 'order-tracking__node--current'
                            : ''
                          }`}
                      >
                        <div
                          className={`order-tracking__node-dot ${isBeamingStep ? 'order-tracking__node-dot--beaming' : ''
                            }`}
                        >
                          {isBeamingStep ? (
                            <>
                              <span className="order-tracking__radar-ring" />
                              <Truck size={13} className="order-tracking__icon-moving" />
                            </>
                          ) : isDone ? (
                            <CheckCircle2 size={12} />
                          ) : (
                            idx + 1
                          )}
                        </div>
                        <div className="order-tracking__node-label">
                          <span>
                            {isAllFinalized && idx === steps.length - 1
                              ? (isService ? 'Service Confirmed' : 'Delivered & Confirmed')
                              : step.label}
                          </span>
                          {isBeamingStep && (
                            <span className="order-tracking__live-pill">
                              <span className="order-tracking__live-beacon" />
                              LIVE
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Carrier, Rider, or Appointment Info Box */}
              {(subOrder.carrierName ||
                subOrder.serviceScheduledAt ||
                subOrder.technicianName ||
                subOrder.technicianPhone) && (
                  <div className="order-tracking__dispatch-box">
                    {/* Delivery Rider (Physical goods delivery) */}
                    {!isService && (subOrder.technicianName || subOrder.technicianPhone) && (
                      <div className="order-tracking__dispatch-item order-tracking__dispatch-item--rider">
                        <Truck size={16} color="var(--clay)" />
                        <div className="order-tracking__dispatch-details">
                          <div className="order-tracking__dispatch-label">Delivery Rider</div>
                          <div className="order-tracking__dispatch-val">
                            {subOrder.technicianName || 'Assigned Rider'}
                            {subOrder.technicianPhone && (
                              <span className="order-tracking__dispatch-phone"> · {subOrder.technicianPhone}</span>
                            )}
                          </div>
                        </div>
                        {subOrder.technicianPhone && (
                          <a
                            href={`tel:${subOrder.technicianPhone.replace(/\s+/g, '')}`}
                            className="order-tracking__call-btn"
                            aria-label={`Call delivery rider at ${subOrder.technicianPhone}`}
                          >
                            <Phone size={13} />
                            <span>Call Rider</span>
                          </a>
                        )}
                      </div>
                    )}

                    {/* 3rd Party Carrier details if provided */}
                    {subOrder.carrierName && (
                      <div className="order-tracking__dispatch-item">
                        <Truck size={16} color="var(--clay)" />
                        <div>
                          <div className="order-tracking__dispatch-label">Carrier & Tracking</div>
                          <div className="order-tracking__dispatch-val">
                            {subOrder.carrierName}
                            {subOrder.trackingNumber && ` · #${subOrder.trackingNumber}`}
                          </div>
                          {subOrder.trackingUrl && (
                            <a
                              href={subOrder.trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="order-tracking__carrier-link"
                            >
                              <span>Carrier Tracking Portal</span>
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Service appointment */}
                    {subOrder.serviceScheduledAt && (
                      <div className="order-tracking__dispatch-item">
                        <Calendar size={16} color="var(--clay)" />
                        <div>
                          <div className="order-tracking__dispatch-label">Scheduled Appointment</div>
                          <div className="order-tracking__dispatch-val">
                            {formatDateTime(subOrder.serviceScheduledAt)}
                          </div>
                          {subOrder.serviceWindowNotes && (
                            <div className="order-tracking__dispatch-notes">
                              {subOrder.serviceWindowNotes}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Service specialist */}
                    {isService && subOrder.technicianName && (
                      <div className="order-tracking__dispatch-item order-tracking__dispatch-item--rider">
                        <User size={16} color="var(--clay)" />
                        <div className="order-tracking__dispatch-details">
                          <div className="order-tracking__dispatch-label">Assigned Specialist</div>
                          <div className="order-tracking__dispatch-val">
                            {subOrder.technicianName} (Upward Verified)
                            {subOrder.technicianPhone && (
                              <span className="order-tracking__dispatch-phone"> · {subOrder.technicianPhone}</span>
                            )}
                          </div>
                        </div>
                        {subOrder.technicianPhone && (
                          <a
                            href={`tel:${subOrder.technicianPhone.replace(/\s+/g, '')}`}
                            className="order-tracking__call-btn"
                            aria-label={`Call specialist at ${subOrder.technicianPhone}`}
                          >
                            <Phone size={13} />
                            <span>Call Specialist</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}

              {/* Items in this suborder */}
              <div className="order-tracking__items-section">
                <div className="order-tracking__items-heading">Items in Package</div>
                <div className="order-tracking__items-list">
                  {subOrder.items.map((item) => (
                    <div key={item.uuid} className="order-tracking__item-row">
                      <div className="order-tracking__item-thumb">
                        {item.thumbnailUrl ? (
                          <img src={item.thumbnailUrl} alt={item.title} />
                        ) : isService ? (
                          <Wrench size={18} color="var(--clay)" />
                        ) : (
                          <Package size={18} color="var(--clay)" />
                        )}
                      </div>
                      <div className="order-tracking__item-info">
                        <div className="order-tracking__item-title">{item.title}</div>
                        <div className="order-tracking__item-qty">
                          Qty: {item.quantity} · {formatKoboToNgn(item.unitPriceKobo)} each
                        </div>
                      </div>
                      <div className="order-tracking__item-price">
                        {formatKoboToNgn(item.totalPriceKobo)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chronological Timeline History */}
              <div className="order-tracking__timeline-section">
                <div className="order-tracking__timeline-heading">
                  <Clock size={15} />
                  <span>Timeline Milestones</span>
                </div>
                <div className="order-tracking__timeline-list">
                  {subOrder.fulfilmentEvents.map((ev, i) => (
                    <div key={ev.uuid} className="order-tracking__timeline-item">
                      <div className="order-tracking__timeline-beacon" />
                      <div className="order-tracking__timeline-body">
                        <div className="order-tracking__timeline-title-row">
                          <span className="order-tracking__timeline-title">{ev.title}</span>
                          <span className="order-tracking__timeline-time">
                            {formatDateTime(ev.createdAt)}
                          </span>
                        </div>
                        <div className="order-tracking__timeline-desc">{ev.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Customer Support / Dispute Modal */}
      <BottomSheetModal
        isOpen={!!activeDisputeSubOrder}
        onClose={() => setActiveDisputeSubOrder(null)}
        title="Upward Customer Support"
        icon={<ShieldCheck size={18} color="var(--clay)" />}
        maxWidth="480px"
      >
        {activeDisputeSubOrder && (
          <form onSubmit={handleSubmit(onSubmitDispute)} className="order-tracking__form">
            <p className="order-tracking__form-intro">
              Reporting an issue for{' '}
              {order.subOrders.length > 1 ? (
                <>package <strong>{activeDisputeSubOrder.subOrderNumber}</strong></>
              ) : (
                <>order <strong>{order.orderNumber}</strong></>
              )}
              . Our support team will coordinate directly with the partner to resolve this for you.
            </p>

            <div className="order-tracking__form-field">
              <label className="order-tracking__form-label">Nature of Issue</label>
              <select {...register('reason')} className="order-tracking__select">
                <option value="Damaged or incorrect item received">Damaged or incorrect item received</option>
                <option value="Item not delivered / severe transit delay">Item not delivered / severe transit delay</option>
                <option value="Technician did not show up for appointment">Technician did not show up for appointment</option>
                <option value="Service quality does not match specification">Service quality does not match specification</option>
                <option value="Other complaint or question">Other complaint or question</option>
              </select>
              {errors.reason && (
                <span className="order-tracking__error">{errors.reason.message}</span>
              )}
            </div>

            <div className="order-tracking__form-field">
              <label className="order-tracking__form-label">Detailed Explanation</label>
              <textarea
                {...register('explanation')}
                rows={4}
                className="order-tracking__textarea"
                placeholder="Please describe what happened in detail..."
              />
              {errors.explanation && (
                <span className="order-tracking__error">{errors.explanation.message}</span>
              )}
            </div>

            <div className="order-tracking__modal-actions">
              <button
                type="button"
                className="order-tracking__cancel-btn"
                onClick={() => setActiveDisputeSubOrder(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="order-tracking__submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <span>Submit to Support</span>
                )}
              </button>
            </div>
          </form>
        )}
      </BottomSheetModal>

      {/* Confirm Delivery Receipt BottomSheet Modal */}
      <BottomSheetModal
        isOpen={Boolean(subOrderToConfirm)}
        onClose={() => setSubOrderToConfirm(null)}
        title="Confirm Order Received"
        subtitle={
          subOrderToConfirm
            ? `Package: ${subOrderToConfirm.subOrderNumber} · ${subOrderToConfirm.vendor?.name || subOrderToConfirm.vendorName || 'Upward Merchant'}`
            : undefined
        }
        icon={<PackageCheck size={20} color="var(--clay)" />}
        maxWidth="480px"
      >
        {subOrderToConfirm && (
          <div className="order-tracking__confirm-sheet">
            {/* Vendor & Delivery Rating System */}
            <div className="order-tracking__rating-card">
              <div className="order-tracking__rating-header">
                <h4 className="order-tracking__rating-title">Rate Delivery & Experience</h4>
                <p className="order-tracking__rating-subtitle">
                  How satisfied are you with {subOrderToConfirm.vendor?.name || subOrderToConfirm.vendorName || 'the merchant'}&apos;s service?
                </p>
              </div>

              {/* 5-Star Rating Selector */}
              <div
                className="order-tracking__rating-stars"
                role="radiogroup"
                aria-label="Service Rating"
                onMouseLeave={() => setHoveredRating(null)}
              >
                {[1, 2, 3, 4, 5].map((starVal) => {
                  const effectiveRating = hoveredRating !== null ? hoveredRating : rating
                  const isFilled = starVal <= effectiveRating

                  return (
                    <button
                      key={starVal}
                      type="button"
                      className={`order-tracking__star-btn ${isFilled ? 'order-tracking__star-btn--filled' : ''}`}
                      onClick={() => setRating(starVal)}
                      onMouseEnter={() => setHoveredRating(starVal)}
                      aria-label={`${starVal} star${starVal > 1 ? 's' : ''}`}
                    >
                      <Star
                        size={28}
                        strokeWidth={1.5}
                        fill={isFilled ? '#F59E0B' : 'transparent'}
                        color={isFilled ? '#F59E0B' : 'var(--text-muted)'}
                      />
                    </button>
                  )
                })}
              </div>

              {/* Dynamic feedback badge */}
              <div className="order-tracking__rating-label">
                {(() => {
                  const currentScore = hoveredRating !== null ? hoveredRating : rating
                  switch (currentScore) {
                    case 5:
                      return 'Excellent Experience (5/5)'
                    case 4:
                      return 'Very Good (4/5)'
                    case 3:
                      return 'Satisfactory (3/5)'
                    case 2:
                      return 'Could Be Better (2/5)'
                    case 1:
                      return 'Poor Experience (1/5)'
                    default:
                      return 'Tap to Rate'
                  }
                })()}
              </div>

              {/* Optional comments */}
              <div className="order-tracking__rating-input-box">
                <textarea
                  className="order-tracking__rating-textarea"
                  rows={2}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Optional: Tell us what you loved or how service can improve..."
                  maxLength={500}
                />
              </div>
            </div>

            <div className="order-tracking__confirm-items-box">
              <div className="order-tracking__confirm-items-title">Items in this Delivery</div>
              <div className="order-tracking__confirm-items-list">
                {subOrderToConfirm.items.map((item) => (
                  <div key={item.uuid} className="order-tracking__confirm-item-row">
                    <span className="order-tracking__confirm-item-title">• {item.snapshotData?.title || 'Package Item'}</span>
                    <span className="order-tracking__confirm-item-qty">Qty: {item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="order-tracking__modal-actions">
              <button
                type="button"
                className="order-tracking__cancel-btn"
                onClick={() => setSubOrderToConfirm(null)}
                disabled={confirmReceipt.isPending}
              >
                Not Yet
              </button>
              <button
                type="button"
                className="order-tracking__submit-btn"
                onClick={executeConfirmReceipt}
                disabled={confirmReceipt.isPending}
              >
                {confirmReceipt.isPending ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Confirming...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Confirm Received</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </BottomSheetModal>
    </div>
  )
}
