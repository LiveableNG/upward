'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
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
  Send,
} from 'lucide-react'
import { useToast } from '@/components/common/Toast'
import {
  useTenantOrderDetail,
  useDownloadCommerceReceipt,
  useConfirmSubOrderReceipt,
  useCreateCommerceDispute,
  useInitializeCommercePayment,
  useVerifyCommercePayment,
  usePostCommerceOrderMessage,
  useDeclineServiceQuote,
} from '../hooks/useCommerceOrders'
import { openPaystackInline } from '../utils/paystackInline'
import { BottomSheetModal } from '@/components/common/BottomSheetModal'
import { haptics } from '@/lib/haptics'
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

export function OrderTrackingScreen({
  orderUuid: propOrderUuid,
  onBack,
}: {
  orderUuid?: string
  onBack?: () => void
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()

  const handleBack = () => {
    try {
      haptics.light()
    } catch (_) {}
    if (typeof onBack === 'function') {
      onBack()
      return
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/dashboard/lifestyle/orders')
    }
  }

  const orderUuid = React.useMemo(() => {
    if (propOrderUuid && propOrderUuid !== 'placeholder') {
      return propOrderUuid
    }
    const fromSearch = searchParams?.get('uuid') || searchParams?.get('order') || searchParams?.get('id')
    if (fromSearch) return fromSearch
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/dashboard/lifestyle/orders/')
      if (parts[1]) {
        const seg = parts[1].split(/[/?#]/)[0]
        if (seg && seg !== 'placeholder') return seg
      }
    }
    return propOrderUuid || ''
  }, [propOrderUuid, searchParams])

  const { data: order, isLoading, error } = useTenantOrderDetail(
    orderUuid,
    Boolean(orderUuid && orderUuid !== 'placeholder'),
  )
  const downloadReceipt = useDownloadCommerceReceipt()
  const confirmReceipt = useConfirmSubOrderReceipt()
  const createDispute = useCreateCommerceDispute()
  const initializePayment = useInitializeCommercePayment()
  const verifyPayment = useVerifyCommercePayment()
  const postOrderMessage = usePostCommerceOrderMessage()
  const declineServiceQuote = useDeclineServiceQuote()

  const [activeDisputeSubOrder, setActiveDisputeSubOrder] = useState<TenantSubOrderDetailDto | null>(null)
  const [subOrderToConfirm, setSubOrderToConfirm] = useState<TenantSubOrderDetailDto | null>(null)
  const [rating, setRating] = useState<number>(5)
  const [feedback, setFeedback] = useState<string>('')
  const [messageDrafts, setMessageDrafts] = useState<Record<string, string>>({})
  const [expandedChatSubOrders, setExpandedChatSubOrders] = useState<Record<string, boolean>>({})
  const [sendingSubOrderUuid, setSendingSubOrderUuid] = useState<string | null>(null)
  const [isDecliningQuote, setIsDecliningQuote] = useState(false)
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
            onClick={handleBack}
            aria-label="Back"
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
      <div className="order-tracking">
        <header className="order-tracking__header">
          <button
            type="button"
            className="order-tracking__back-btn"
            onClick={handleBack}
            aria-label="Back to orders"
          >
            <ArrowLeft size={16} />
          </button>
        </header>
        <div className="orders-hub__empty">
          <AlertTriangle size={40} color="#D97706" />
          <h2 className="orders-hub__empty-title">Order Not Found</h2>
          <p className="orders-hub__empty-desc">
            We could not locate this order or it belongs to a different session.
          </p>
          <button
            type="button"
            className="orders-hub__explore-btn"
            onClick={handleBack}
          >
            <span>Back to My Orders</span>
          </button>
        </div>
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

  const handleSendMilestoneReply = async (subOrderUuid: string) => {
    const text = (messageDrafts[subOrderUuid] || '').trim()
    if (!text || !order) return
    // Clear input immediately for 0ms optimistic chat UX
    setMessageDrafts((prev) => ({ ...prev, [subOrderUuid]: '' }))
    try {
      setSendingSubOrderUuid(subOrderUuid)
      await postOrderMessage.mutateAsync({
        orderUuid: order.uuid,
        subOrderUuid,
        message: text,
      })
    } catch (err: any) {
      // Restore draft if sending failed
      setMessageDrafts((prev) => ({ ...prev, [subOrderUuid]: text }))
      toast.error(err?.message || 'Could not send message.')
    } finally {
      setSendingSubOrderUuid(null)
    }
  }

  const handleDeclineQuote = async () => {
    if (!order) return
    try {
      setIsDecliningQuote(true)
      await declineServiceQuote.mutateAsync({ orderUuid: order.uuid })
      toast.info('Quote declined and service request cancelled.')
    } catch (err: any) {
      toast.error(err?.message || 'Could not decline quote.')
    } finally {
      setIsDecliningQuote(false)
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
          onClick={handleBack}
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
        {order.status === 'CANCELLED' ? (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '6px',
              background: 'rgba(107, 114, 128, 0.12)',
              color: '#4b5563',
              border: '1px solid rgba(107, 114, 128, 0.25)',
            }}
          >
            Cancelled
          </span>
        ) : order.paymentStatus === 'PAID' ? (
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
          <span className="order-tracking__header-badge-unpaid">
            Payment Pending
          </span>
        )}
      </header>

      {/* Cancelled Order Banner */}
      {order.status === 'CANCELLED' ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: '16px',
            borderRadius: '12px',
            background: 'rgba(220, 38, 38, 0.06)',
            border: '1px solid rgba(220, 38, 38, 0.2)',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(220, 38, 38, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#dc2626',
              flexShrink: 0,
            }}
          >
            <AlertCircle size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <strong style={{ fontSize: '14px', color: '#1a1714', fontWeight: 700 }}>
                Order Cancelled
              </strong>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: 'rgba(220, 38, 38, 0.1)',
                  color: '#dc2626',
                }}
              >
                Closed
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#4a4238', margin: '0 0 10px 0', lineHeight: 1.5 }}>
              This order has been cancelled by Upward Operations.
              {order.paymentStatus === 'PAID'
                ? ' A full refund has been initiated to your original payment method.'
                : ' No payment was captured for this order.'}
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              style={{
                height: 32,
                padding: '0 12px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
              onClick={() => setActiveDisputeSubOrder(order.subOrders[0] || null)}
            >
              <MessageSquare size={13} />
              <span>Contact Support Regarding Cancellation</span>
            </button>
          </div>
        </div>
      ) : order.paymentStatus !== 'PAID' &&
        Number(order.totalAmountKobo) > 0 &&
        !order.subOrders.some((s) => s.customerStatus === 'QUOTE_PROVIDED') && (
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
        {order.subOrders.map((subOrder, subIdx) => {
          const isService = subOrder.items.some((i) => i.offeringType === 'SERVICE')

          // Consolidated 3-step pipeline for physical goods
          const productSteps = [
            { key: 'CONFIRMED', label: 'Order Confirmed' },
            { key: 'DISPATCHED', label: 'Dispatched & En Route' },
            { key: 'DELIVERED', label: 'Delivered' },
          ]

          const serviceSteps = [
            { key: 'QUOTE_REQUESTED', label: 'Reviewing' },
            { key: 'QUOTE_PROVIDED', label: 'Approve & Pay' },
            { key: 'SERVICE_SCHEDULED', label: 'Team Assigned' },
            { key: 'TECHNICIAN_EN_ROUTE', label: 'En Route' },
            { key: 'SERVICE_COMPLETED', label: 'Completed' },
          ]

          const steps = isService ? serviceSteps : productSteps

          let activeStepIndex = 0
          if (isService) {
            if (['SERVICE_COMPLETED', 'RECEIVED_CONFIRMED'].includes(subOrder.customerStatus)) {
              activeStepIndex = 4
            } else if (subOrder.customerStatus === 'TECHNICIAN_EN_ROUTE') {
              activeStepIndex = 3
            } else if (
              subOrder.customerStatus === 'SERVICE_SCHEDULED' ||
              subOrder.customerStatus === 'PROCESSING' ||
              subOrder.customerStatus === 'ORDER_CONFIRMED'
            ) {
              activeStepIndex = 2
            } else if (subOrder.customerStatus === 'QUOTE_PROVIDED') {
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
                  <div className="order-tracking__suborder-num">
                    {isService
                      ? 'Service Request'
                      : order.subOrders.length > 1
                        ? `Package ${subIdx + 1} of ${order.subOrders.length}`
                        : 'Fulfillment Package'}
                  </div>
                  <div className="order-tracking__vendor-tag">
                    <ShieldCheck size={14} color="var(--clay)" />
                    <span>Fulfilled by {subOrder.vendor?.name || subOrder.vendorName || 'Upward Verified Merchant'}</span>
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

              {/* Stepper Progression or Cancelled State */}
              {order.status === 'CANCELLED' || subOrder.customerStatus === 'CANCELLED' ? (
                <div
                  style={{
                    padding: '12px 14px',
                    background: 'rgba(107, 114, 128, 0.08)',
                    border: '1px solid rgba(107, 114, 128, 0.2)',
                    borderRadius: 8,
                    fontSize: '12.5px',
                    color: '#4b5563',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <AlertCircle size={15} color="#6b7280" />
                  <span>This fulfillment package has been cancelled.</span>
                </div>
              ) : (
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
              )}

              {/* Operational Dispatch Message / Live Advisory */}
              {subOrder.adminOperationalNotes && (
                <div className="order-tracking__alert-banner order-tracking__alert-banner--dispatch" style={{ marginTop: 12 }}>
                  <MessageSquare size={15} color="var(--clay)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div className="order-tracking__alert-text">
                    <strong>Update from Upward:</strong> {subOrder.adminOperationalNotes}
                  </div>
                </div>
              )}

              {/* Quote Ready & Payment Approval Card (Service Quote Milestone 3) */}
              {isService &&
                subOrder.customerStatus === 'QUOTE_PROVIDED' &&
                order.paymentStatus !== 'PAID' &&
                order.status !== 'CANCELLED' && (
                  <div className="order-tracking__quote-card">
                    <div className="order-tracking__quote-header">
                      <span className="order-tracking__quote-badge">
                        <ShieldCheck size={12} />
                        <span>Your Price is Ready</span>
                      </span>
                      <span className="order-tracking__quote-subtitle">All-inclusive</span>
                    </div>

                    <div className="order-tracking__quote-amount-row">
                      <span className="order-tracking__quote-amount">
                        {formatKoboToNgn(order.totalAmountKobo)}
                      </span>
                    </div>

                    {subOrder.quoteNotes && (
                      <p className="order-tracking__quote-note">
                        {subOrder.quoteNotes}
                      </p>
                    )}

                    <div className="order-tracking__quote-actions">
                      <button
                        type="button"
                        className="order-tracking__quote-pay-btn"
                        onClick={handlePayNow}
                        disabled={isPaying || isDecliningQuote}
                      >
                        {isPaying ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
                        <span>{isPaying ? 'Opening Paystack…' : `Pay ${formatKoboToNgn(order.totalAmountKobo)}`}</span>
                      </button>

                      <button
                        type="button"
                        className="order-tracking__quote-decline-btn"
                        onClick={handleDeclineQuote}
                        disabled={isPaying || isDecliningQuote}
                      >
                        {isDecliningQuote ? 'Declining…' : 'Decline Price'}
                      </button>
                    </div>
                  </div>
                )}

              {/* Redesigned Service Appointment & Assigned Crew Card */}
              {isService &&
                (subOrder.serviceScheduledAt || subOrder.technicianName || subOrder.technicianPhone) && (
                  <div className="order-tracking__service-card">
                    {subOrder.serviceScheduledAt && (
                      <div className="order-tracking__service-row">
                        <div className="order-tracking__service-icon">
                          <Calendar size={17} />
                        </div>
                        <div className="order-tracking__service-meta">
                          <div className="order-tracking__service-label">Scheduled Appointment</div>
                          <div className="order-tracking__service-val">
                            {formatDateTime(subOrder.serviceScheduledAt)}
                          </div>
                          {subOrder.serviceWindowNotes && (
                            <div className="order-tracking__service-sub">
                              {subOrder.serviceWindowNotes}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {subOrder.serviceScheduledAt &&
                      (subOrder.technicianName || subOrder.technicianPhone) && (
                        <div className="order-tracking__service-divider" />
                      )}

                    {(subOrder.technicianName || subOrder.technicianPhone) && (
                      <div className="order-tracking__service-row order-tracking__service-row--crew">
                        <div className="order-tracking__service-icon">
                          <User size={17} />
                        </div>
                        <div className="order-tracking__service-meta">
                          <div className="order-tracking__service-label">Assigned Crew</div>
                          <div className="order-tracking__service-val">
                            <span>{subOrder.technicianName || 'Assigned Crew'}</span>
                            <span className="order-tracking__service-verified">
                              <ShieldCheck size={11} />
                              <span>Verified</span>
                            </span>
                          </div>
                          {subOrder.technicianPhone && (
                            <div className="order-tracking__service-sub">
                              {subOrder.technicianPhone}
                            </div>
                          )}
                        </div>
                        {subOrder.technicianPhone && (
                          <a
                            href={`tel:${subOrder.technicianPhone.replace(/\s+/g, '')}`}
                            className="order-tracking__service-call-btn"
                            aria-label={`Call assigned crew at ${subOrder.technicianPhone}`}
                          >
                            <Phone size={13} />
                            <span>Call</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}

              {/* Interactive Scope & Clarification Conversation Thread (Service Orders) */}
              {isService &&
                (() => {
                  const msgs = subOrder.messages || []
                  const isQuotePhase =
                    ['QUOTE_REQUESTED', 'QUOTE_PROVIDED'].includes(subOrder.customerStatus) &&
                    order.paymentStatus !== 'PAID' &&
                    order.status !== 'CANCELLED'

                  if (!isQuotePhase && msgs.length === 0) return null

                  if (isQuotePhase) {
                    return (
                      <div className="order-tracking__chat-card">
                        <div className="order-tracking__chat-header">
                          <MessageSquare size={14} color="var(--clay, #d97757)" />
                          <span>Service Discussion</span>
                        </div>

                        <div className="order-tracking__chat-list">
                          {msgs.length === 0 ? (
                            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-muted, #8a8a8a)' }}>
                              Our team is reviewing your request. Any follow-up questions will appear here.
                            </p>
                          ) : (
                            msgs.map((msg) => {
                              const isMine = msg.senderType === 'TENANT'
                              return (
                                <div
                                  key={msg.uuid}
                                  className={`order-tracking__chat-bubble ${
                                    isMine
                                      ? 'order-tracking__chat-bubble--mine'
                                      : 'order-tracking__chat-bubble--admin'
                                  }`}
                                >
                                  <div className="order-tracking__chat-sender">
                                    {isMine ? 'You' : 'Upward Team'}
                                  </div>
                                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.message}</div>
                                </div>
                              )
                            })
                          )}
                        </div>

                        <div className="order-tracking__chat-composer">
                          <input
                            type="text"
                            className="order-tracking__chat-input"
                            value={messageDrafts[subOrder.uuid] || ''}
                            onChange={(e) =>
                              setMessageDrafts((prev) => ({
                                ...prev,
                                [subOrder.uuid]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleSendMilestoneReply(subOrder.uuid)
                              }
                            }}
                            placeholder="Reply or add extra details…"
                          />
                          <button
                            type="button"
                            className="order-tracking__chat-send-btn"
                            onClick={() => handleSendMilestoneReply(subOrder.uuid)}
                            disabled={
                              sendingSubOrderUuid === subOrder.uuid ||
                              !(messageDrafts[subOrder.uuid] || '').trim()
                            }
                          >
                            {sendingSubOrderUuid === subOrder.uuid ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Send size={14} />
                            )}
                            <span>Send</span>
                          </button>
                        </div>
                      </div>
                    )
                  }

                  const isExpanded = Boolean(expandedChatSubOrders[subOrder.uuid])
                  return (
                    <div className="order-tracking__chat-accordion">
                      <button
                        type="button"
                        className="order-tracking__chat-toggle"
                        onClick={() =>
                          setExpandedChatSubOrders((prev) => ({
                            ...prev,
                            [subOrder.uuid]: !prev[subOrder.uuid],
                          }))
                        }
                        aria-expanded={isExpanded}
                      >
                        <span className="order-tracking__chat-toggle-left">
                          <MessageSquare size={14} color="var(--clay, #d97757)" style={{ flexShrink: 0 }} />
                          <span className="order-tracking__chat-toggle-title">Service Discussion</span>
                          <span className="order-tracking__chat-toggle-count">
                            {msgs.length} {msgs.length === 1 ? 'message' : 'messages'}
                          </span>
                        </span>
                        <span className="order-tracking__chat-toggle-right">
                          <span>{isExpanded ? 'Hide' : 'View'}</span>
                          <ChevronDown
                            size={14}
                            className={`order-tracking__chat-chevron ${
                              isExpanded ? 'order-tracking__chat-chevron--open' : ''
                            }`}
                          />
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="order-tracking__chat-body">
                          <div className="order-tracking__chat-list">
                            {msgs.map((msg) => {
                              const isMine = msg.senderType === 'TENANT'
                              return (
                                <div
                                  key={msg.uuid}
                                  className={`order-tracking__chat-bubble ${
                                    isMine
                                      ? 'order-tracking__chat-bubble--mine'
                                      : 'order-tracking__chat-bubble--admin'
                                  }`}
                                >
                                  <div className="order-tracking__chat-sender">
                                    {isMine ? 'You' : 'Upward Team'}
                                  </div>
                                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.message}</div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}

              {/* Submitted Service Review Summary */}
              {isService && subOrder.serviceRating && (
                <div
                  style={{
                    marginTop: 14,
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: 'rgba(34, 197, 94, 0.06)',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: '#15803d' }}>
                    <Star size={14} fill="#f59e0b" color="#f59e0b" />
                    <span>Your Service Rating: {subOrder.serviceRating}/5</span>
                  </div>
                  {subOrder.serviceReviewComment && (
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary, #4a4642)', lineHeight: 1.45 }}>
                      “{subOrder.serviceReviewComment}”
                    </p>
                  )}
                </div>
              )}

              {/* Carrier or Rider Info Box (Physical goods delivery) */}
              {!isService &&
                (subOrder.carrierName || subOrder.technicianName || subOrder.technicianPhone) && (
                  <div className="order-tracking__dispatch-box">
                    {/* Delivery Rider */}
                    {(subOrder.technicianName || subOrder.technicianPhone) && (
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
                  </div>
                )}

              {/* Items in this suborder */}
              <div className="order-tracking__items-section">
                <div className="order-tracking__items-heading">
                  {isService ? 'Service Details' : 'Items in Package'}
                </div>
                <div className="order-tracking__items-list">
                  {subOrder.items.map((item) => {
                    const itemTitle = item.title || (item.snapshotData as any)?.title || 'Package Item'
                    const itemImage =
                      item.thumbnailUrl ||
                      (item.snapshotData as any)?.thumbnailUrl ||
                      (item.snapshotData as any)?.imageUrl ||
                      null

                    return (
                      <div key={item.uuid} className="order-tracking__item-row">
                        <div className="order-tracking__item-thumb">
                          {itemImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={itemImage}
                              alt={itemTitle}
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none'
                              }}
                            />
                          ) : isService ? (
                            <Wrench size={18} color="var(--clay)" />
                          ) : (
                            <Package size={18} color="var(--clay)" />
                          )}
                        </div>
                        <div className="order-tracking__item-info">
                          <div className="order-tracking__item-title">{itemTitle}</div>
                          <div className="order-tracking__item-qty">
                            {isService && Number(item.totalPriceKobo || 0) <= 0
                              ? 'Price Requested'
                              : `Qty: ${item.quantity} · ${formatKoboToNgn(item.unitPriceKobo)} each`}
                          </div>
                        </div>
                        <div className="order-tracking__item-price">
                          {isService && Number(item.totalPriceKobo || 0) <= 0 ? (
                            <span
                              style={{
                                fontSize: 11.5,
                                fontWeight: 700,
                                color: 'var(--clay, #d97757)',
                                background: 'rgba(var(--clay-rgb, 217, 119, 87), 0.1)',
                                padding: '3px 8px',
                                borderRadius: 6,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Pending Price
                            </span>
                          ) : (
                            formatKoboToNgn(item.totalPriceKobo)
                          )}
                        </div>
                      </div>
                    )
                  })}
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

      {/* Unified Order Financial Summary — hidden while service quote is still pending */}
      {!(
        Number(order.totalAmountKobo || 0) <= 0 &&
        order.subOrders.some((s) => s.customerStatus === 'QUOTE_REQUESTED')
      ) ? (
        <div className="order-tracking__summary-card">
          <h3 className="order-tracking__summary-title">Order Financial Summary</h3>
          <div className="order-tracking__summary-rows">
            <div className="order-tracking__summary-row">
              <span>{order.subOrders.some((s) => s.items.some((i) => i.offeringType === 'SERVICE')) ? 'Service Fee' : 'Items Subtotal'}</span>
              <span>{formatKoboToNgn(order.itemsSubtotalKobo)}</span>
            </div>
            {!order.subOrders.every((s) => s.items.every((i) => i.offeringType === 'SERVICE')) && (
              <div className="order-tracking__summary-row">
                <span>Verified Logistics & Delivery</span>
                <span>
                  {BigInt(order.deliveryFeeKobo || 0) > BigInt(0)
                    ? formatKoboToNgn(order.deliveryFeeKobo)
                    : 'Free'}
                </span>
              </div>
            )}
            {BigInt(order.discountKobo || 0) > BigInt(0) && (
              <div className="order-tracking__summary-row order-tracking__summary-row--discount">
                <span>Applied Discount</span>
                <span>-{formatKoboToNgn(order.discountKobo)}</span>
              </div>
            )}
            <div className="order-tracking__summary-row order-tracking__summary-row--total">
              <span>{order.paymentStatus === 'PAID' ? 'Total Paid' : 'Total Due'}</span>
              <strong>{formatKoboToNgn(order.totalAmountKobo)}</strong>
            </div>
          </div>
        </div>
      ) : (
        <div className="order-tracking__summary-card">
          <h3 className="order-tracking__summary-title">Quote Under Review</h3>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary, #4a4642)' }}>
            No payment is due yet. Once our team reviews your request and finalizes the scope, your tailored quote will appear here for approval.
          </p>
        </div>
      )}

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
