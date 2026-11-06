import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ShoppingBag,
  Truck,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  PackageCheck,
  Clock,
} from 'lucide-react'
import { useCommerceAdmin } from '../features/commerce/hooks/useCommerceAdmin'
import { CommerceOrdersTable } from '../features/commerce/components/CommerceOrdersTable'
import { CommerceDisputesTable } from '../features/commerce/components/CommerceDisputesTable'

interface CommerceWorkspaceProps {
  token?: string
  adminRole?: string
}

export default function CommerceWorkspace({ token }: CommerceWorkspaceProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = (searchParams.get('tab')?.toUpperCase() || 'ORDERS') as 'ORDERS' | 'DISPUTES'

  const {
    orders,
    ordersTotal,
    loadingOrders,
    fetchOrders,
    updateSubOrderFulfilment,
    disputes,
    disputesTotal,
    loadingDisputes,
    fetchDisputes,
    resolveDispute,
  } = useCommerceAdmin(token)

  const [search, setSearch] = useState('')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL')

  useEffect(() => {
    fetchOrders({
      search: search || undefined,
      paymentStatus: paymentStatusFilter !== 'ALL' ? paymentStatusFilter : undefined,
    })
    fetchDisputes()
  }, [fetchOrders, fetchDisputes, search, paymentStatusFilter])

  const handleTabChange = (tab: 'ORDERS' | 'DISPUTES') => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (tab === 'ORDERS') next.delete('tab')
      else next.set('tab', tab.toLowerCase())
      return next
    })
  }

  const handleRefresh = () => {
    if (activeTab === 'ORDERS') {
      fetchOrders({
        search: search || undefined,
        paymentStatus: paymentStatusFilter !== 'ALL' ? paymentStatusFilter : undefined,
      })
    } else {
      fetchDisputes()
    }
  }

  return (
    <div className="admin-page-container" style={{ padding: '24px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(182, 91, 55, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShoppingBag size={24} color="#B65B37" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#111' }}>
              Commerce & Fulfilment Desk
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: '#666' }}>
              Operations management for multi-vendor lifestyle purchases, dispatch logistics & concierge support
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid #ddd',
            background: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} className={loadingOrders || loadingDisputes ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid #eee', marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => handleTabChange('ORDERS')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'ORDERS' ? '2px solid #B65B37' : '2px solid transparent',
            color: activeTab === 'ORDERS' ? '#B65B37' : '#666',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <Truck size={16} />
          <span>Orders & Fulfilment ({ordersTotal})</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('DISPUTES')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'DISPUTES' ? '2px solid #B65B37' : '2px solid transparent',
            color: activeTab === 'DISPUTES' ? '#B65B37' : '#666',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <ShieldAlert size={16} />
          <span>Concierge Inquiries & Disputes ({disputesTotal})</span>
        </button>
      </div>

      {/* Search / Filter Row for Orders */}
      {activeTab === 'ORDERS' && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} color="#888" style={{ position: 'absolute', left: 12, top: 11 }} />
            <input
              type="text"
              placeholder="Search by order number, customer name, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: 8,
                border: '1px solid #ddd',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }}
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="PAID">Paid Only</option>
            <option value="UNPAID">Unpaid Only</option>
          </select>
        </div>
      )}

      {/* Tab Panels */}
      {activeTab === 'ORDERS' ? (
        <CommerceOrdersTable
          orders={orders}
          total={ordersTotal}
          loading={loadingOrders}
          onUpdateSubOrder={async (subOrderUuid, payload) => {
            await updateSubOrderFulfilment(subOrderUuid, payload)
            fetchOrders({
              search: search || undefined,
              paymentStatus: paymentStatusFilter !== 'ALL' ? paymentStatusFilter : undefined,
            })
          }}
        />
      ) : (
        <CommerceDisputesTable
          disputes={disputes}
          total={disputesTotal}
          loading={loadingDisputes}
          onResolveDispute={async (disputeUuid, payload) => {
            await resolveDispute(disputeUuid, payload)
            fetchDisputes()
          }}
        />
      )}
    </div>
  )
}
