import { useMutation } from '@tanstack/react-query'
import {
  requestOTP,
  verifyOTP,
  otpLogin,
  logout as authLogout,
  requestEmployeeOTP,
  verifyEmployeeOTP,
  employeeOtpLogin,
} from '../services/authService'
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
    mutationFn: async ({ email, otp }: { email: string; otp: string }) => {
      return otpLogin(email, otp)
    },
    onSuccess: () => {
      success("Logged in successfully")
    },
    onError: (err: any) => {
      error(err.message || "Login failed")
    }
  })
}

export function useEmployeeRequestOTP() {
  const { success, error } = useToast()

  return useMutation({
    mutationFn: ({ email, context }: { email: string; context?: 'LOGIN' | 'INVITE' }) =>
      requestEmployeeOTP(email, context),
    onSuccess: (data) => {
      if (data.context === 'LOGIN') {
        success("Welcome back! A login verification code has been sent to your email.")
      } else {
        success("Verification code sent! Please check your email to activate your account.")
      }
    },
    onError: (err: any) => {
      error(err.message || "Failed to send verification code")
    }
  })
}

export function useEmployeeVerifyOTP() {
  const { error } = useToast()

  return useMutation({
    mutationFn: ({ email, otp, context }: { email: string; otp: string; context?: string }) =>
      verifyEmployeeOTP(email, otp, context),
    onError: (err: any) => {
      error(err.message || "Verification failed")
    }
  })
}

export function useEmployeeOtpLogin() {
  const { success, error } = useToast()

  return useMutation({
    mutationFn: async ({ email, otp }: { email: string; otp: string }) => {
      return employeeOtpLogin(email, otp)
    },
    onSuccess: () => {
      success("Logged in successfully")
    },
    onError: (err: any) => {
      error(err.message || "Login failed")
    }
  })
}

