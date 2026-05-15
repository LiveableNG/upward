import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'

export function useVerificationStatus() {
  return useQuery({
    queryKey: ['verification-status'],
    queryFn: api.getVerificationStatus,
    refetchInterval: 30000, // Refetch every 30 seconds to check for approval
  })
}

export function useSubmitVerification() {
  const { success, error } = useToast()

  return useMutation({
    mutationFn: api.submitVerification,
    onSuccess: () => {
      success('Verification details submitted! We will review them shortly.')
    },
    onError: (err: any) => {
      error(err.message || 'Failed to submit verification')
    }
  })
}
