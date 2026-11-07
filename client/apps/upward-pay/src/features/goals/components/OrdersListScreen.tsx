'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Package,
  Clock,
  Download,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Truck,
  Wrench,
  Loader2,
} from 'lucide-react'
import {
  useTenantOrders,
  useDownloadCommerceReceipt,
  useCreateCommerceDispute,
} from '../hooks/useCommerceOrders'
import type { CustomerFulfilmentStatus, TenantOrderSummaryDto } from '../types/commerce.types'
import '../styles/goals.css'

function formatKoboToNgn(koboStr: string): string {
  const amount = Number(koboStr) / 100
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function getStatusBadge(status: CustomerFulfilmentStatus, isService: boolean) {
  switch (status) {
    case 'ORDER_CONFIRMED':
      return {
        label: isService ? 'Confirmed' : 'Order Placed',
        className: 'orders-hub__badge--confirmed',
      }
    case 'PROCESSING':
      return {
        label: 'Processing',
        className: 'orders-hub__badge--processing',
      }
    case 'DISPATCHED':
      return {
        label: 'Dispatched',
        className: 'orders-hub__badge--dispatched',
      }
    case 'OUT_FOR_DELIVERY':
      return {
        label: 'Out for Delivery',
        className: 'orders-hub__badge--out-for-delivery',
      }
    case 'SERVICE_SCHEDULED':
      return {
        label: 'Scheduled',
        className: 'orders-hub__badge--scheduled',
      }
    case 'TECHNICIAN_EN_ROUTE':
      return {
        label: 'Tech En Route',
        className: 'orders-hub__badge--en-route',
      }
    case 'DELIVERED':
    case 'SERVICE_COMPLETED':
    case 'RECEIVED_CONFIRMED':
      return {
        label: isService ? 'Completed' : 'Delivered',
        className: 'orders-hub__badge--delivered',
      }
    case 'DISPUTED':
      return {
        label: 'Inquiry Logged',
        className: 'orders-hub__badge--disputed',
      }
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        className: 'orders-hub__badge--cancelled',
      }
    default:
      return {
        label: String(status).replace('_', ' '),
        className: 'orders-hub__badge--default',
      }
  }
}

export function OrdersListScreen() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PAST'>('ACTIVE')
  const { data, isLoading } = useTenantOrders({ take: 50 })
  const downloadReceipt = useDownloadCommerceReceipt()
  const [downloadingUuid, setDownloadingUuid] = useState<string | null>(null)

  const handleDownload = async (uuid: string, orderNumber: string) => {
    try {
      setDownloadingUuid(uuid)
      await downloadReceipt.mutateAsync({
        orderUuid: uuid,
        filename: `${orderNumber}-receipt.pdf`,
      })
    } catch (err: any) {
      alert(err?.message || 'Could not download receipt. Please try again.')
    } finally {
      setDownloadingUuid(null)
    }
  }

  const allOrders = data?.orders || []

  const activeOrders = allOrders.filter((ord) => {
    if (['CANCELLED', 'REFUNDED'].includes(ord.status)) return false
    return !['DELIVERED', 'SERVICE_COMPLETED', 'RECEIVED_CONFIRMED'].includes(ord.primaryStatus)
  })

  const pastOrders = allOrders.filter((ord) => {
    if (['CANCELLED', 'REFUNDED'].includes(ord.status)) return true
    return ['DELIVERED', 'SERVICE_COMPLETED', 'RECEIVED_CONFIRMED'].includes(ord.primaryStatus)
  })

  const displayedOrders = activeTab === 'ACTIVE' ? activeOrders : pastOrders

  return (
    <div className="orders-hub">
      {/* Header Bar */}
      <header className="orders-hub__header">
        <button
          type="button"
          className="orders-hub__back-btn"
          onClick={() => router.push('/dashboard/lifestyle')}
          aria-label="Back to lifestyle marketplace"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="orders-hub__header-text">
          <h1 className="orders-hub__title">My Orders & Fulfillment</h1>
          <p className="orders-hub__subtitle">Track live delivery progress, view timeline updates and download official receipts</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="orders-hub__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'ACTIVE'}
          className={`orders-hub__tab ${activeTab === 'ACTIVE' ? 'orders-hub__tab--active' : ''}`}
          onClick={() => setActiveTab('ACTIVE')}
        >
          <span>Active Orders</span>
          {activeOrders.length > 0 && (
            <span className="orders-hub__tab-count">{activeOrders.length}</span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'PAST'}
          className={`orders-hub__tab ${activeTab === 'PAST' ? 'orders-hub__tab--active' : ''}`}
          onClick={() => setActiveTab('PAST')}
        >
          <span>Order History</span>
          {pastOrders.length > 0 && (
            <span className="orders-hub__tab-count">{pastOrders.length}</span>
          )}
        </button>
      </div>

      {/* Order List Content */}
      <div className="orders-hub__content">
        {isLoading ? (
          <div className="orders-hub__loading">
            {[1, 2].map((i) => (
              <div key={i} className="orders-hub__skeleton animate-pulse" />
            ))}
          </div>
        ) : displayedOrders.length === 0 ? (
          <div className="orders-hub__empty">
            <div className="orders-hub__empty-icon">
              <Package size={36} color="var(--text-muted)" />
            </div>
            <h3 className="orders-hub__empty-title">
              {activeTab === 'ACTIVE' ? 'No active orders in progress' : 'No past orders yet'}
            </h3>
            <p className="orders-hub__empty-desc">
              {activeTab === 'ACTIVE'
                ? 'Your active orders, tracking milestones, and technician appointments will appear here.'
                : 'Completed and fulfilled lifestyle purchases will be cataloged here for easy receipt re-download.'}
            </p>
            <button
              type="button"
              className="orders-hub__explore-btn"
              onClick={() => router.push('/dashboard/lifestyle')}
            >
              <span>Explore Marketplace</span>
              <ChevronRight size={16} />
            </button>
          </div>
        ) : (
          <div className="orders-hub__list">
            {displayedOrders.map((order) => {
              const itemsList = order.itemsPreview || []
              const isService = itemsList.some((i) => i.offeringType === 'SERVICE')
              const badge = getStatusBadge(order.primaryStatus, isService)
              const isDownloading = downloadingUuid === order.uuid

              return (
                <div key={order.uuid} className="orders-hub__card">
                  {/* Card Header */}
                  <div className="orders-hub__card-header">
                    <div className="orders-hub__card-meta">
                      <span className="orders-hub__order-number">{order.orderNumber}</span>
                      <span className="orders-hub__dot">·</span>
                      <span className="orders-hub__date">{formatDate(order.createdAt)}</span>
                    </div>
                    <span className={`orders-hub__badge ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Card Items Preview */}
                  <div className="orders-hub__items">
                    {itemsList.map((item, idx) => (
                      <div key={idx} className="orders-hub__item">
                        <div className="orders-hub__item-thumb">
                          {item.thumbnailUrl ? (
                            <img src={item.thumbnailUrl} alt={item.title} />
                          ) : item.offeringType === 'SERVICE' ? (
                            <Wrench size={18} color="var(--clay)" />
                          ) : (
                            <Truck size={18} color="var(--clay)" />
                          )}
                        </div>
                        <div className="orders-hub__item-info">
                          <div className="orders-hub__item-title">{item.title}</div>
                          <div className="orders-hub__item-sub">
                            Qty: {item.quantity} · {item.offeringType}
                          </div>
                        </div>
                      </div>
                    ))}
                    {(order.itemsCount ?? 0) > itemsList.length && (
                      <div className="orders-hub__more-items">
                        +{(order.itemsCount ?? 0) - itemsList.length} more item(s)
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="orders-hub__card-footer">
                    <div className="orders-hub__total-wrap">
                      <span className="orders-hub__total-label">Total Paid</span>
                      <span className="orders-hub__total-value">
                        {formatKoboToNgn(order.totalAmountKobo)}
                      </span>
                    </div>

                    <div className="orders-hub__actions">
                      {order.paymentStatus === 'PAID' && (
                        <button
                          type="button"
                          className="orders-hub__receipt-btn"
                          onClick={() => handleDownload(order.uuid, order.orderNumber)}
                          disabled={isDownloading}
                          title="Download official branded PDF receipt"
                        >
                          {isDownloading ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Download size={14} />
                          )}
                          <span>Receipt</span>
                        </button>
                      )}

                      {(() => {
                        const isCompleted =
                          ['DELIVERED', 'SERVICE_COMPLETED', 'RECEIVED_CONFIRMED'].includes(order.primaryStatus) ||
                          ['CANCELLED', 'REFUNDED'].includes(order.status)

                        return (
                          <button
                            type="button"
                            className={`orders-hub__track-btn ${isCompleted ? 'orders-hub__track-btn--completed' : ''}`}
                            onClick={() => router.push(`/dashboard/lifestyle/orders/${order.uuid}`)}
                          >
                            <span>{isCompleted ? 'View Details' : 'Track Live'}</span>
                            <ChevronRight size={14} />
                          </button>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
