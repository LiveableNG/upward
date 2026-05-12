import { useQuery, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { CreatePaymentRequestDto, UpdatePmPaymentRequestDto } from '../services/paymentService'

export const usePaymentRequests = () => {
  return useSuspenseQuery({
    queryKey: ['pm-payment-requests'],
    queryFn: () => api.getPaymentRequests()
  })
}

export const usePaymentRequest = (uuid: string) => {
  return useQuery({
    queryKey: ['pm-payment-request', uuid],
    queryFn: () => api.getPaymentRequest(uuid),
    enabled: !!uuid
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
    mutationFn: ({ uuid, email }: { uuid: string; email?: string }) => api.resendPaymentRequest(uuid, email)
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
