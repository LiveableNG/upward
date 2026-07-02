import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { login as authLogin, loginWithOTP as authOTPLogin } from '../services/authService'
import { useAuth } from '../AuthContext'
import { setAccessToken } from '@/lib/auth-token'
import { setCookie } from '@/lib/cookie-utils'
import { BiometricsService } from '../services/biometricsService'

export function useLogin(redirect: string) {
  const router = useRouter()
  const { login: setAuthUser } = useAuth()
  const queryClient = useQueryClient()

  const loginMutation = useMutation({
    mutationFn: (credentials: { email: string; password: string }) => authLogin(credentials),
    onSuccess: async (result, variables) => {
      if (result.accessToken) {
        setAccessToken(result.accessToken)
        setCookie('pay_access_token', result.accessToken)
      }
      
      // Save credentials for biometrics if enabled
      if (await BiometricsService.isEnabled()) {
        await BiometricsService.saveCredentials(variables.email, variables.password)
      }

      // Clear any stale cache from a previously logged-in account before loading new user data
      queryClient.clear()
      setAuthUser(result.user)
      queryClient.setQueryData(['user'], result.user)
      router.push(redirect)
    },
  })

  const otpLoginMutation = useMutation({
    mutationFn: (data: { email: string; otp: string }) => authOTPLogin(data.email, data.otp),
    onSuccess: async (result) => {
      if (result.accessToken) {
        setAccessToken(result.accessToken)
        setCookie('pay_access_token', result.accessToken)
      }
      
      // Clear any stale cache from a previously logged-in account before loading new user data
      queryClient.clear()
      setAuthUser(result.user)
      queryClient.setQueryData(['user'], result.user)
      router.push(redirect)
    },
  })

  return {
    login: (email: string, password: string) => loginMutation.mutate({ email, password }),
    otpLogin: (email: string, otp: string) => otpLoginMutation.mutate({ email, otp }),
    loading: loginMutation.isPending || otpLoginMutation.isPending,
    error: (loginMutation.error || otpLoginMutation.error) as any,
  }
}
