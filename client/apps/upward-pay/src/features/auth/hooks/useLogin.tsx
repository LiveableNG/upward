import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { login as authLogin, loginWithOTP as authOTPLogin } from '../services/authService'
import { useAuth } from '../AuthContext'
import { setAccessToken, setRefreshToken } from '@/lib/auth-token'
import { setCookie } from '@/lib/cookie-utils'
import { BiometricsService } from '../services/biometricsService'
import { Capacitor } from '@capacitor/core'

export function useLogin(redirect: string) {
  const router = useRouter()
  const { login: setAuthUser } = useAuth()
  const queryClient = useQueryClient()

  const loginMutation = useMutation({
    mutationFn: (credentials: { email: string; password: string; type?: 'email' | 'phone' }) => authLogin(credentials),
    onSuccess: async (result, variables) => {
      if (result.accessToken) {
        setAccessToken(result.accessToken)
        setCookie('pay_access_token', result.accessToken)
      }
      if (result.refreshToken) {
        setRefreshToken(result.refreshToken)
      }
      
      // Save credentials for biometrics & PIN silent re-authentication on native mobile
      if (Capacitor.isNativePlatform() && variables.password) {
        try {
          await BiometricsService.saveCredentials(variables.email, variables.password)
        } catch (e) {
          console.warn('[useLogin] Credentials save error ignored:', e)
        }
      }

      // Clear any stale cache from a previously logged-in account before loading new user data
      queryClient.clear()
      setAuthUser(result.user)
      queryClient.setQueryData(['user'], result.user)
      router.refresh()
      router.push(redirect)
    },
  })

  const otpLoginMutation = useMutation({
    mutationFn: (data: { email: string; otp: string; type?: 'email' | 'phone' }) => authOTPLogin(data.email, data.otp, data.type),
    onSuccess: async (result) => {
      if (result.accessToken) {
        setAccessToken(result.accessToken)
        setCookie('pay_access_token', result.accessToken)
      }
      if (result.refreshToken) {
        setRefreshToken(result.refreshToken)
      }
      
      // Clear any stale cache from a previously logged-in account before loading new user data
      queryClient.clear()
      setAuthUser(result.user)
      queryClient.setQueryData(['user'], result.user)
      router.refresh()
      router.push(redirect)
    },
  })

  return {
    login: (email: string, password: string, type?: 'email' | 'phone') => loginMutation.mutate({ email, password, type }),
    otpLogin: (email: string, otp: string, type?: 'email' | 'phone') => otpLoginMutation.mutateAsync({ email, otp, type }),
    loading: loginMutation.isPending || otpLoginMutation.isPending,
    error: (loginMutation.error || otpLoginMutation.error) as any,
  }
}
