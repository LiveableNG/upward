import { useMutation } from '@tanstack/react-query'
import { requestOTP, verifyOTP } from '../services/authService'
import { useToast } from '@/components/common/Toast'

export function useRequestOTP() {
  const { success, error } = useToast()

  return useMutation({
    mutationFn: ({ email, context }: { email: string; context: 'SIGNUP' | 'LOGIN' }) => 
      requestOTP(email, context),
    onSuccess: () => {
      success("Verification code sent to your email")
    },
    onError: (err: any) => {
      error(err.message || "Failed to send code")
    }
  })
}

export function useVerifyOTP() {
  const { error } = useToast()

  return useMutation({
    mutationFn: ({ email, otp, context }: { email: string; otp: string; context: string }) => 
      verifyOTP(email, otp, context),
    onError: (err: any) => {
      error(err.message || "Verification failed")
    }
  })
}
