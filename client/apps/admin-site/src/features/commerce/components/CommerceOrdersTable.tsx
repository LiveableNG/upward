import React, { useState } from 'react'
import {
  Search,
  Package,
  Truck,
  Wrench,
  Clock,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
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
  const [expandedOrderUuid, setExpandedOrderUuid] = useState<string | null>(null)

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#666' }}>
          Showing <strong>{orders.length}</strong> of <strong>{total}</strong> orders
        </span>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
          Loading commerce orders...
        </div>
      ) : orders.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', background: '#fafafa', borderRadius: 12, border: '1px dashed #ddd' }}>
          <Package size={36} color="#aaa" style={{ margin: '0 auto 12px' }} />
          <h4 style={{ margin: '0 0 4px', fontSize: 16 }}>No orders found</h4>
          <p style={{ margin: 0, fontSize: 13, color: '#777' }}>
            There are no customer commerce orders matching the filter criteria.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {orders.map((order) => {
            const isExpanded = expandedOrderUuid === order.uuid

            return (
              <div
                key={order.uuid}
                style={{
                  background: '#fff',
                  border: '1px solid #e5e5e5',
                  borderRadius: 12,
                  padding: 16,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}
              >
                {/* Order Top Meta */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, fontFamily: 'monospace', color: '#111' }}>
                      {order.orderNumber}
                    </span>
                    <span style={{ fontSize: 12, color: '#888' }}>· {formatDate(order.createdAt)}</span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: order.paymentStatus === 'PAID' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(217, 119, 6, 0.1)',
                        color: order.paymentStatus === 'PAID' ? '#059669' : '#D97706',
                      }}
                    >
                      {order.paymentStatus}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#B65B37' }}>
                      {formatKoboToNgn(order.totalAmountKobo)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setExpandedOrderUuid(isExpanded ? null : order.uuid)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: '1px solid #ddd',
                        background: '#f9f9f9',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {isExpanded ? 'Hide Sub-Orders' : `View Sub-Orders (${order.subOrders.length})`}
                    </button>
                  </div>
                </div>

                {/* Recipient Snapshot */}
                <div style={{ fontSize: 12.5, color: '#555', background: '#faf8f6', padding: '8px 12px', borderRadius: 8, marginBottom: 12 }}>
                  <strong>Destination:</strong> {order.deliveryAddress} · <strong>Recipient:</strong> {order.recipientName} ({order.recipientPhone})
                </div>

                {/* Sub-Orders List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {order.subOrders.map((sub) => {
                    const isService = sub.items.some((i) => i.offeringType === 'SERVICE')

                    return (
                      <div
                        key={sub.uuid}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          background: '#fff',
                          border: '1px solid #eee',
                          borderRadius: 8,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {isService ? <Wrench size={18} color="#B65B37" /> : <Truck size={18} color="#B65B37" />}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>
                                {sub.subOrderNumber}
                              </span>
                              <span style={{ fontSize: 11, color: '#666' }}>
                                ({sub.vendor?.name || 'Partner'})
                              </span>
                            </div>
                            <div style={{ fontSize: 11.5, color: '#777', marginTop: 2 }}>
                              {sub.items.map((it) => it.snapshotData?.title || `Item #${it.offeringId}`).join(', ')}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 6,
                              background: 'rgba(182, 91, 55, 0.08)',
                              color: '#B65B37',
                            }}
                          >
                            {sub.customerStatus}
                          </span>

                          <button
                            type="button"
                            onClick={() => setActiveSubOrderForEdit(sub)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 6,
                              background: '#B65B37',
                              color: '#fff',
                              border: 'none',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Update Fulfilment
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit Fulfilment Modal */}
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
