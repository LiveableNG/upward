import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchUserVoucherSummary,
  fetchTenantOrders,
  fetchTenantOrderDetail,
  downloadCommerceReceiptPdf,
  createCommerceDispute,
  createCommerceInquiry,
  confirmSubOrderReceipt,
  previewCommerceOrder,
  createCommerceOrder,
  initializeCommercePayment,
  verifyCommercePayment,
  createServiceQuoteOrder,
  postCommerceOrderMessage,
  declineServiceQuote,
  type PreviewCommerceOrderInput,
  type CreateCommerceOrderInput,
  type CreateServiceQuoteOrderInput,
} from '../services/commerceService'

export function useUserVoucher(enabled = true) {
  return useQuery({
    queryKey: ['user-voucher-summary'],
    queryFn: () => fetchUserVoucherSummary(),
    enabled,
    staleTime: 30 * 1000,
    retry: false,
  })
}

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
        [
          'QUOTE_REQUESTED',
          'QUOTE_PROVIDED',
          'QUOTE_DECLINED',
          'ORDER_CONFIRMED',
          'PROCESSING',
          'DISPATCHED',
          'OUT_FOR_DELIVERY',
          'SERVICE_SCHEDULED',
          'TECHNICIAN_EN_ROUTE',
        ].includes(s.customerStatus),
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

export function usePreviewCommerceOrder() {
  return useMutation({
    mutationFn: (input: PreviewCommerceOrderInput) => previewCommerceOrder(input),
  })
}

export function useCreateCommerceOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCommerceOrderInput) => createCommerceOrder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-commerce-orders'] })
      queryClient.invalidateQueries({ queryKey: ['user-voucher-summary'] })
    },
  })
}

export function useInitializeCommercePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: string | { orderUuid: string; applyVoucher?: boolean }) => {
      if (typeof input === 'string') {
        return initializeCommercePayment(input)
      }
      return initializeCommercePayment(input.orderUuid, { applyVoucher: input.applyVoucher })
    },
    onSuccess: (_, input) => {
      const orderUuid = typeof input === 'string' ? input : input.orderUuid
      queryClient.invalidateQueries({ queryKey: ['tenant-commerce-orders'] })
      queryClient.invalidateQueries({ queryKey: ['tenant-commerce-order', orderUuid] })
      queryClient.invalidateQueries({ queryKey: ['user-voucher-summary'] })
    },
  })
}

export function useVerifyCommercePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderUuid, reference }: { orderUuid: string; reference: string }) =>
      verifyCommercePayment(orderUuid, reference),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-commerce-orders'] })
      queryClient.invalidateQueries({ queryKey: ['tenant-commerce-order', variables.orderUuid] })
      queryClient.invalidateQueries({ queryKey: ['user-voucher-summary'] })
    },
  })
}

export function useCreateServiceQuoteOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateServiceQuoteOrderInput) => createServiceQuoteOrder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-commerce-orders'] })
    },
  })
}

export function usePostCommerceOrderMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ subOrderUuid, message }: { orderUuid?: string; subOrderUuid: string; message: string }) =>
      postCommerceOrderMessage(subOrderUuid, message),
    onMutate: async (variables) => {
      if (!variables.orderUuid) return undefined
      const queryKey = ['tenant-commerce-order', variables.orderUuid]
      await queryClient.cancelQueries({ queryKey })
      const previousOrder = queryClient.getQueryData<any>(queryKey)

      if (previousOrder?.subOrders) {
        const optimisticMsg = {
          uuid: `optimistic-${Date.now()}`,
          senderType: 'TENANT',
          senderName: previousOrder.recipientName || 'You',
          message: variables.message.trim(),
          createdAt: new Date().toISOString(),
        }
        queryClient.setQueryData(queryKey, {
          ...previousOrder,
          subOrders: previousOrder.subOrders.map((sub: any) =>
            sub.uuid === variables.subOrderUuid
              ? { ...sub, messages: [...(sub.messages || []), optimisticMsg] }
              : sub,
          ),
        })
      }

      return { previousOrder, queryKey }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousOrder && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousOrder)
      }
    },
    onSettled: (_data, _err, variables) => {
      if (variables.orderUuid) {
        queryClient.invalidateQueries({ queryKey: ['tenant-commerce-order', variables.orderUuid] })
      } else {
        queryClient.invalidateQueries({ queryKey: ['tenant-commerce-order'] })
      }
    },
  })
}

export function useDeclineServiceQuote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderUuid, reason }: { orderUuid: string; reason?: string }) =>
      declineServiceQuote(orderUuid, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-commerce-orders'] })
      queryClient.invalidateQueries({ queryKey: ['tenant-commerce-order', variables.orderUuid] })
      queryClient.invalidateQueries({ queryKey: ['user-voucher-summary'] })
    },
  })
}
