import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { CreatePaymentRequestDto, UpdatePmPaymentRequestDto } from '../services/paymentService'

export const usePaymentRequests = () => {
  return useQuery({
    queryKey: ['pm-payment-requests'],
    queryFn: () => api.getPaymentRequests(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

export const useDashboardSummary = () => {
  return useQuery({
    queryKey: ['pm-dashboard-summary'],
    queryFn: () => api.getDashboardSummary(),
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

export const usePaymentRequest = (uuid: string) => {
  return useQuery({
    queryKey: ['pm-payment-request', uuid],
    queryFn: () => api.getPaymentRequest(uuid),
    enabled: !!uuid,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

export const useCreatePaymentRequest = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreatePaymentRequestDto) => api.createPaymentRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-payment-requests'] })
      queryClient.invalidateQueries({ queryKey: ['pm-units'] })
    }
  })
}

export const useUpdatePaymentRequest = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: UpdatePmPaymentRequestDto }) => api.updatePaymentRequest(uuid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-payment-requests'] })
      queryClient.invalidateQueries({ queryKey: ['pm-units'] })
    }
  })
}

export const useResendPaymentRequest = () => {
  return useMutation({
    mutationFn: ({ uuid, email, channels }: { uuid: string; email?: string; channels?: string[] }) => api.resendPaymentRequest(uuid, email, channels)
  })
}

export const useCancelPaymentRequest = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (uuid: string) => api.cancelPaymentRequest(uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-payment-requests'] })
      queryClient.invalidateQueries({ queryKey: ['pm-units'] })
    }
  })
}

export const usePayouts = () => {
  return useQuery({
    queryKey: ['pm-payouts'],
    queryFn: () => api.getPayouts()
  })
}

export const usePayoutBreakdown = (uuid: string) => {
  return useQuery({
    queryKey: ['pm-payout-breakdown', uuid],
    queryFn: () => api.getPayoutBreakdown(uuid),
    enabled: !!uuid
  })
}

export const useUnresolvedTransactions = () => {
  return useQuery({
    queryKey: ['pm-unresolved-payments'],
    queryFn: () => api.getUnresolvedTransactions(),
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

export const useResolveTransaction = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ uuid, action }: { uuid: string; action: 'REFUND' | 'ACCEPT' }) => 
      api.resolveTransaction(uuid, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-unresolved-payments'] })
      queryClient.invalidateQueries({ queryKey: ['pm-payouts'] })
      queryClient.invalidateQueries({ queryKey: ['pm-payment-requests'] })
    }
  })
}

