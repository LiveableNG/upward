import { useMutation } from '@tanstack/react-query'
import { requestOTP, verifyOTP, otpLogin } from '../services/authService'
import { useToast } from '@/components/common/Toast'

export function useRequestOTP() {
  const { success, error } = useToast()

  return useMutation({
    mutationFn: ({ email, context }: { email: string; context: 'SIGNUP' | 'LOGIN' }) => 
      requestOTP(email, context),
    onSuccess: (data) => {
      if (data.context === 'LOGIN') {
        success("Welcome back! We found an existing account and sent a login code.")
      } else {
        success("Verification code sent to your email")
      }
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

export function useOtpLogin() {
  const { success, error } = useToast()

  return useMutation({
    mutationFn: ({ email, otp }: { email: string; otp: string }) => 
      otpLogin(email, otp),
    onSuccess: () => {
      success("Logged in successfully")
    },
    onError: (err: any) => {
      error(err.message || "Login failed")
    }
  })
}
