import React, { useState } from 'react'
import {
  Package,
  Truck,
  Wrench,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
  MapPin,
} from 'lucide-react'
import type {
  AdminCommerceOrder,
  AdminCommerceSubOrder,
  AdminFulfilmentTransitionAction,
} from '../types'
import { SubOrderFulfilmentModal } from './SubOrderFulfilmentModal'

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
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

interface CommerceOrdersTableProps {
  orders: AdminCommerceOrder[]
  total: number
  loading: boolean
  onUpdateSubOrder: (
    subOrderUuid: string,
    payload: {
      action: AdminFulfilmentTransitionAction
      carrierName?: string
      trackingNumber?: string
      trackingUrl?: string
      serviceScheduledAt?: string
      serviceWindowNotes?: string
      technicianName?: string
      technicianPhone?: string
      adminOperationalNotes?: string
    },
  ) => Promise<any>
}

export function CommerceOrdersTable({
  orders,
  total,
  loading,
  onUpdateSubOrder,
}: CommerceOrdersTableProps) {
  const [activeSubOrderForEdit, setActiveSubOrderForEdit] = useState<AdminCommerceSubOrder | null>(null)
  const [expandedOrderUuids, setExpandedOrderUuids] = useState<Record<string, boolean>>({})

  const toggleExpand = (orderUuid: string) => {
    setExpandedOrderUuids((prev) => ({
      ...prev,
      [orderUuid]: !prev[orderUuid],
    }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Showing <strong>{orders.length}</strong> of <strong>{total}</strong> commerce orders
        </span>
      </div>

      <div className="table-wrapper">
        <div className="table-container">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr
                style={{
                  backgroundColor: 'var(--surface-hover)',
                  borderBottom: '2px solid var(--border)',
                }}
              >
                <th style={{ padding: '12px 16px', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', width: '160px' }}>
                  Order # & Date
                </th>
                <th style={{ padding: '12px 16px', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Customer & Delivery
                </th>
                <th style={{ padding: '12px 16px', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', width: '180px' }}>
                  Shipments / Vendors
                </th>
                <th style={{ padding: '12px 16px', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', width: '140px' }}>
                  Total Amount
                </th>
                <th style={{ padding: '12px 16px', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', width: '120px' }}>
                  Payment
                </th>
                <th style={{ padding: '12px 16px', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right', width: '150px' }}>
                  Sub-Orders
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <Clock size={16} className="loader" />
                      <span>Loading commerce orders...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 48, textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <Package size={36} color="var(--text-muted)" />
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                        No orders found
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        There are no customer commerce orders matching the filter criteria.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const isExpanded = !!expandedOrderUuids[order.uuid]
                  const subOrdersCount = (order.subOrders || []).length
                  const isPaid = order.paymentStatus === 'PAID'

                  return (
                    <React.Fragment key={order.uuid}>
                      <tr
                        style={{
                          borderBottom: isExpanded ? 'none' : '1px solid var(--border)',
                          backgroundColor: isExpanded ? 'var(--surface-hover)' : 'transparent',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        {/* Order Number & Date */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                          <div
                            style={{
                              fontFamily: 'monospace',
                              fontSize: 13,
                              fontWeight: 700,
                              color: 'var(--text)',
                              background: 'var(--surface)',
                              padding: '3px 8px',
                              borderRadius: 6,
                              border: '1px solid var(--border)',
                              display: 'inline-block',
                              marginBottom: 4,
                            }}
                          >
                            {order.orderNumber}
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                            {formatDate(order.createdAt)}
                          </div>
                        </td>

                        {/* Customer & Delivery */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                            <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>
                              {order.recipientName}
                            </span>
                            {order.recipientPhone && (
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                ({order.recipientPhone})
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: 'var(--text-secondary)',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 4,
                              maxWidth: 360,
                              lineHeight: 1.4,
                            }}
                          >
                            <MapPin size={13} style={{ flexShrink: 0, marginTop: 2, color: 'var(--text-muted)' }} />
                            <span>{order.deliveryAddress}</span>
                          </div>
                        </td>

                        {/* Sub-Orders / Vendors */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                            {subOrdersCount} {subOrdersCount === 1 ? 'Shipment' : 'Shipments'}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {(order.subOrders || []).map((sub) => (
                              <span
                                key={sub.uuid}
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  background: 'var(--surface)',
                                  border: '1px solid var(--border)',
                                  color: 'var(--text-muted)',
                                }}
                              >
                                {sub.vendor?.name || 'Upward Merchant'}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Total Amount */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
                            {formatKoboToNgn(order.totalAmountKobo)}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            Delivery: {formatKoboToNgn(order.deliveryFeeKobo)}
                          </div>
                        </td>

                        {/* Payment Status */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 6,
                              display: 'inline-block',
                              background: isPaid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                              color: isPaid ? '#059669' : '#d97706',
                              border: `1px solid ${isPaid ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
                            }}
                          >
                            {order.paymentStatus}
                          </span>
                        </td>

                        {/* Expand Button */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'top', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => toggleExpand(order.uuid)}
                            className="btn btn-secondary"
                            style={{
                              height: 32,
                              padding: '0 12px',
                              fontSize: 12,
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <span>{isExpanded ? 'Hide Details' : `View (${subOrdersCount})`}</span>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                      </tr>

                      {/* Nested Sub-Orders Row */}
                      {isExpanded && (
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <td colSpan={6} style={{ padding: '0 16px 16px 16px', background: 'var(--surface-hover)' }}>
                            <div
                              style={{
                                background: 'var(--white)',
                                border: '1px solid var(--border)',
                                borderRadius: 10,
                                padding: '12px 14px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 12,
                              }}
                            >
                              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                Sub-Orders & Fulfilment Milestones for {order.orderNumber}
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {(order.subOrders || []).map((subOrder) => {
                                  const isService = (subOrder.items || []).some((i) => i.offeringType === 'SERVICE')

                                  return (
                                    <div
                                      key={subOrder.uuid}
                                      style={{
                                        border: '1px solid var(--border)',
                                        borderRadius: 8,
                                        padding: 12,
                                        background: 'var(--bg)',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        justifyContent: 'space-between',
                                        gap: 16,
                                        flexWrap: 'wrap',
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 280 }}>
                                        <div
                                          style={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: 8,
                                            background: 'var(--accent-faint)',
                                            border: '1px solid var(--accent-muted)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'var(--accent)',
                                            flexShrink: 0,
                                          }}
                                        >
                                          {isService ? <Wrench size={18} /> : <Truck size={18} />}
                                        </div>

                                        <div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>
                                              {subOrder.subOrderNumber}
                                            </span>
                                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                              · Vendor: <strong>{subOrder.vendor?.name || 'Upward Merchant'}</strong>
                                            </span>
                                          </div>

                                          {/* Items List */}
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 6 }}>
                                            {(subOrder.items || []).map((item) => (
                                              <div key={item.uuid} style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                                                • {item.snapshotData?.title || 'Merchandise Item'} × {item.quantity} (
                                                {formatKoboToNgn(item.totalPriceKobo)})
                                              </div>
                                            ))}
                                          </div>

                                          {/* Status & Carrier / Tracking meta */}
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
                                            <span
                                              style={{
                                                fontSize: 11,
                                                fontWeight: 700,
                                                padding: '2px 7px',
                                                borderRadius: 4,
                                                background: 'rgba(59, 130, 246, 0.1)',
                                                color: '#2563eb',
                                              }}
                                            >
                                              {subOrder.customerStatus.replace(/_/g, ' ')}
                                            </span>

                                            {subOrder.carrierName && (
                                              <span style={{ color: 'var(--text-muted)' }}>
                                                Carrier: <strong>{subOrder.carrierName}</strong>
                                                {subOrder.trackingNumber && ` (${subOrder.trackingNumber})`}
                                              </span>
                                            )}

                                            {subOrder.trackingUrl && (
                                              <a
                                                href={subOrder.trackingUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: 3,
                                                  color: 'var(--accent)',
                                                  textDecoration: 'underline',
                                                  fontWeight: 600,
                                                }}
                                              >
                                                <span>Track</span>
                                                <ExternalLink size={12} />
                                              </a>
                                            )}

                                            {subOrder.serviceScheduledAt && (
                                              <span style={{ color: 'var(--text-muted)' }}>
                                                Appointment: <strong>{formatDate(subOrder.serviceScheduledAt)}</strong>
                                                {subOrder.technicianName && ` · Tech: ${subOrder.technicianName}`}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Action Button */}
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {isPaid ? (
                                          <button
                                            type="button"
                                            onClick={() => setActiveSubOrderForEdit(subOrder)}
                                            className="btn btn-secondary"
                                            style={{
                                              height: 32,
                                              padding: '0 12px',
                                              fontSize: 12,
                                              fontWeight: 700,
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: 6,
                                            }}
                                          >
                                            <Truck size={13} />
                                            <span>Update Milestone</span>
                                          </button>
                                        ) : (
                                          <span
                                            style={{
                                              fontSize: 11.5,
                                              fontWeight: 600,
                                              color: 'var(--text-muted)',
                                              background: 'rgba(0, 0, 0, 0.04)',
                                              border: '1px dashed var(--border)',
                                              padding: '5px 10px',
                                              borderRadius: 6,
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: 4,
                                            }}
                                            title="This order was abandoned or not yet paid by the customer."
                                          >
                                            Awaiting Payment
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update Fulfilment Modal */}
      {activeSubOrderForEdit && (
        <SubOrderFulfilmentModal
          subOrder={activeSubOrderForEdit}
          onClose={() => setActiveSubOrderForEdit(null)}
          onUpdate={onUpdateSubOrder}
        />
      )}
    </div>
  )
}
