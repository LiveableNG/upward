import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchTenantOrders,
  fetchTenantOrderDetail,
  downloadCommerceReceiptPdf,
  createCommerceDispute,
  createCommerceInquiry,
  confirmSubOrderReceipt,
} from '../services/commerceService'

export function useTenantOrders(filter?: { status?: string; skip?: number; take?: number }) {
  return useQuery({
    queryKey: ['tenant-commerce-orders', filter],
    queryFn: () => fetchTenantOrders(filter),
    staleTime: 30 * 1000,
  })
}

export function useTenantOrderDetail(uuid: string, enabled = true) {
  return useQuery({
    queryKey: ['tenant-commerce-order', uuid],
    queryFn: () => fetchTenantOrderDetail(uuid),
    enabled: Boolean(uuid) && enabled,
    refetchInterval: (query) => {
      // Poll every 10 seconds if order is actively processing or in transit
      const data = query.state.data
      if (!data) return false
      const hasActiveSubOrder = data.subOrders.some((s) =>
        ['ORDER_CONFIRMED', 'PROCESSING', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'TECHNICIAN_EN_ROUTE'].includes(
          s.customerStatus,
        ),
      )
      return hasActiveSubOrder ? 10000 : false
    },
  })
}

export function useCreateCommerceDispute() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createCommerceDispute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-commerce-orders'] })
      queryClient.invalidateQueries({ queryKey: ['tenant-commerce-order'] })
    },
  })
}

export function useConfirmSubOrderReceipt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: confirmSubOrderReceipt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-commerce-orders'] })
      queryClient.invalidateQueries({ queryKey: ['tenant-commerce-order'] })
    },
  })
}

export function useCreateCommerceInquiry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createCommerceInquiry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useDownloadCommerceReceipt() {
  return useMutation({
    mutationFn: ({ orderUuid, filename }: { orderUuid: string; filename?: string }) =>
      downloadCommerceReceiptPdf(orderUuid, filename),
  })
}
