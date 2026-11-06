import { useState, useCallback } from 'react'
import { apiService } from '../../../services/api.service'
import { showToast } from '@upward/client-core'
import type {
  AdminCommerceOrder,
  AdminCommerceSubOrder,
  AdminCommerceDispute,
  AdminFulfilmentTransitionAction,
  DisputeStatus,
} from '../types'

export function useCommerceAdmin(token?: string) {
  // Orders
  const [orders, setOrders] = useState<AdminCommerceOrder[]>([])
  const [ordersTotal, setOrdersTotal] = useState(0)
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<AdminCommerceOrder | null>(null)
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false)

  // Disputes
  const [disputes, setDisputes] = useState<AdminCommerceDispute[]>([])
  const [disputesTotal, setDisputesTotal] = useState(0)
  const [loadingDisputes, setLoadingDisputes] = useState(false)

  const fetchOrders = useCallback(
    async (filter: { status?: string; paymentStatus?: string; search?: string; skip?: number; take?: number } = {}) => {
      setLoadingOrders(true)
      try {
        const params = new URLSearchParams()
        if (filter.status) params.set('status', filter.status)
        if (filter.paymentStatus) params.set('paymentStatus', filter.paymentStatus)
        if (filter.search) params.set('search', filter.search)
        if (filter.skip !== undefined) params.set('skip', String(filter.skip))
        if (filter.take !== undefined) params.set('take', String(filter.take))

        const qs = params.toString()
        const res = await apiService.get(`/admin/commerce/orders${qs ? `?${qs}` : ''}`, token)
        if (res?.data) {
          setOrders(res.data.items || [])
          setOrdersTotal(res.data.total || 0)
        }
      } catch (err: any) {
        showToast(err?.message || 'Failed to load commerce orders', true)
      } finally {
        setLoadingOrders(false)
      }
    },
    [token],
  )

  const fetchOrderDetail = useCallback(
    async (orderUuid: string) => {
      setLoadingOrderDetail(true)
      try {
        const res = await apiService.get(`/admin/commerce/orders/${orderUuid}`, token)
        if (res?.data) {
          setSelectedOrder(res.data)
          return res.data
        }
      } catch (err: any) {
        showToast(err?.message || 'Failed to load order details', true)
      } finally {
        setLoadingOrderDetail(false)
      }
    },
    [token],
  )

  const updateSubOrderFulfilment = useCallback(
    async (
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
    ) => {
      try {
        const res = await apiService.patch(`/admin/commerce/sub-orders/${subOrderUuid}/fulfilment`, payload, token)
        showToast('Sub-order milestone updated successfully')
        return res?.data
      } catch (err: any) {
        showToast(err?.message || 'Failed to transition sub-order milestone', true)
        throw err
      }
    },
    [token],
  )

  const fetchDisputes = useCallback(
    async (filter: { status?: DisputeStatus; skip?: number; take?: number } = {}) => {
      setLoadingDisputes(true)
      try {
        const params = new URLSearchParams()
        if (filter.status) params.set('status', filter.status)
        if (filter.skip !== undefined) params.set('skip', String(filter.skip))
        if (filter.take !== undefined) params.set('take', String(filter.take))

        const qs = params.toString()
        const res = await apiService.get(`/admin/commerce/disputes${qs ? `?${qs}` : ''}`, token)
        if (res?.data) {
          setDisputes(res.data.items || [])
          setDisputesTotal(res.data.total || 0)
        }
      } catch (err: any) {
        showToast(err?.message || 'Failed to load disputes', true)
      } finally {
        setLoadingDisputes(false)
      }
    },
    [token],
  )

  const resolveDispute = useCallback(
    async (
      disputeUuid: string,
      payload: {
        resolutionStatus: DisputeStatus
        resolutionNotes: string
        refundAmountKobo?: string
      },
    ) => {
      try {
        const res = await apiService.post(`/admin/commerce/disputes/${disputeUuid}/resolve`, payload, token)
        showToast('Dispute resolved successfully')
        return res?.data
      } catch (err: any) {
        showToast(err?.message || 'Failed to resolve dispute', true)
        throw err
      }
    },
    [token],
  )

  return {
    orders,
    ordersTotal,
    loadingOrders,
    fetchOrders,
    selectedOrder,
    loadingOrderDetail,
    fetchOrderDetail,
    updateSubOrderFulfilment,
    disputes,
    disputesTotal,
    loadingDisputes,
    fetchDisputes,
    resolveDispute,
  }
}
