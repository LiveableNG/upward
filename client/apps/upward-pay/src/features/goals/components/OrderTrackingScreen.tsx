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
} from 'lucide-react'
import {
  useTenantOrderDetail,
  useDownloadCommerceReceipt,
  useConfirmSubOrderReceipt,
  useCreateCommerceDispute,
} from '../hooks/useCommerceOrders'
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
  const { data: order, isLoading, error } = useTenantOrderDetail(orderUuid)
  const downloadReceipt = useDownloadCommerceReceipt()
  const confirmReceipt = useConfirmSubOrderReceipt()
  const createDispute = useCreateCommerceDispute()

  const [activeDisputeSubOrder, setActiveDisputeSubOrder] = useState<TenantSubOrderDetailDto | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [confirmingSubOrderUuid, setConfirmingSubOrderUuid] = useState<string | null>(null)

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
            <ArrowLeft size={18} />
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
      alert(err?.message || 'Could not download receipt.')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleConfirmReceipt = async (subOrderUuid: string) => {
    if (!window.confirm('Are you sure you want to confirm delivery? This releases vendor payout.')) {
      return
    }
    try {
      setConfirmingSubOrderUuid(subOrderUuid)
      await confirmReceipt.mutateAsync(subOrderUuid)
    } catch (err: any) {
      alert(err?.message || 'Could not confirm delivery.')
    } finally {
      setConfirmingSubOrderUuid(null)
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
      alert('Your inquiry has been logged. Upward Support is reviewing it.')
      setActiveDisputeSubOrder(null)
      reset()
    } catch (err: any) {
      alert(err?.message || 'Failed to submit inquiry.')
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
          <ArrowLeft size={18} />
        </button>
        <div className="order-tracking__header-meta">
          <div className="order-tracking__order-id">{order.orderNumber}</div>
          <div className="order-tracking__order-date">
            Placed on {formatDateTime(order.createdAt)} · {formatKoboToNgn(order.totalAmountKobo)}
          </div>
        </div>
        {order.paymentStatus === 'PAID' && (
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
        )}
      </header>

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

          // Derive milestone steps
          const productSteps = [
            { key: 'ORDER_CONFIRMED', label: 'Confirmed' },
            { key: 'PROCESSING', label: 'Processing' },
            { key: 'DISPATCHED', label: 'Dispatched' },
            { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
            { key: 'DELIVERED', label: 'Delivered' },
          ]

          const serviceSteps = [
            { key: 'ORDER_CONFIRMED', label: 'Confirmed' },
            { key: 'PROCESSING', label: 'Assigned' },
            { key: 'SERVICE_SCHEDULED', label: 'Scheduled' },
            { key: 'TECHNICIAN_EN_ROUTE', label: 'En Route' },
            { key: 'SERVICE_COMPLETED', label: 'Completed' },
          ]

          const steps = isService ? serviceSteps : productSteps

          const currentIdx = steps.findIndex((s) => s.key === subOrder.customerStatus)
          const activeStepIndex =
            currentIdx !== -1
              ? currentIdx
              : subOrder.customerStatus === 'RECEIVED_CONFIRMED'
              ? steps.length - 1
              : 0

          const hasTrafficDelay =
            subOrder.adminOperationalNotes &&
            subOrder.adminOperationalNotes.toLowerCase().includes('traffic')

          return (
            <div key={subOrder.uuid} className="order-tracking__suborder-card">
              {/* Suborder Header */}
              <div className="order-tracking__suborder-head">
                <div>
                  <div className="order-tracking__suborder-num">{subOrder.subOrderNumber}</div>
                  <div className="order-tracking__vendor-tag">
                    <ShieldCheck size={13} color="var(--clay)" />
                    <span>Fulfilled by {subOrder.vendorName}</span>
                  </div>
                </div>

                <div className="order-tracking__suborder-actions">
                  {['DELIVERED', 'SERVICE_COMPLETED'].includes(subOrder.customerStatus) && (
                    <button
                      type="button"
                      className="order-tracking__confirm-btn"
                      onClick={() => handleConfirmReceipt(subOrder.uuid)}
                      disabled={confirmingSubOrderUuid === subOrder.uuid}
                    >
                      {confirmingSubOrderUuid === subOrder.uuid ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={13} />
                      )}
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

              {/* Traffic / Delay Advisory if present */}
              {hasTrafficDelay && (
                <div className="order-tracking__alert-banner">
                  <AlertTriangle size={16} color="#B45309" />
                  <div className="order-tracking__alert-text">
                    <strong>Transit Notice:</strong> {subOrder.adminOperationalNotes}
                  </div>
                </div>
              )}

              {/* Stepper Progression */}
              <div className="order-tracking__stepper">
                <div className="order-tracking__stepper-track">
                  <div
                    className="order-tracking__stepper-fill"
                    style={{
                      width: `${(activeStepIndex / (steps.length - 1)) * 100}%`,
                    }}
                  />
                </div>
                <div className="order-tracking__stepper-nodes">
                  {steps.map((step, idx) => {
                    const isDone = idx < activeStepIndex
                    const isCurrent = idx === activeStepIndex
                    return (
                      <div
                        key={step.key}
                        className={`order-tracking__node ${
                          isDone
                            ? 'order-tracking__node--done'
                            : isCurrent
                            ? 'order-tracking__node--current'
                            : ''
                        }`}
                      >
                        <div className="order-tracking__node-dot">
                          {isDone ? <CheckCircle2 size={12} /> : idx + 1}
                        </div>
                        <div className="order-tracking__node-label">{step.label}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Carrier or Appointment Info Box */}
              {(subOrder.carrierName || subOrder.serviceScheduledAt) && (
                <div className="order-tracking__dispatch-box">
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

                  {subOrder.technicianName && (
                    <div className="order-tracking__dispatch-item">
                      <User size={16} color="var(--clay)" />
                      <div>
                        <div className="order-tracking__dispatch-label">Assigned Specialist</div>
                        <div className="order-tracking__dispatch-val">
                          {subOrder.technicianName} (Upward Verified)
                        </div>
                      </div>
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
              Reporting an issue for sub-order{' '}
              <strong>{activeDisputeSubOrder.subOrderNumber}</strong>. Our support team will
              coordinate directly with the partner to resolve this for you.
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
    </div>
  )
}
