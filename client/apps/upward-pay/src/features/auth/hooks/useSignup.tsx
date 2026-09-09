import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { signup as authSignup } from '../services/authService'
import { useAuth } from '../AuthContext'
import { setAccessToken, setRefreshToken } from '@/lib/auth-token'
import { setCookie } from '@/lib/cookie-utils'
import { Capacitor } from '@capacitor/core'
import { BiometricsService } from '../services/biometricsService'

export function useSignup(redirect: string = '/dashboard', onSuccess?: () => void) {
  const router = useRouter()
  const { login: setAuthUser } = useAuth()
  const queryClient = useQueryClient()

  const signupMutation = useMutation({
    mutationFn: (data: { 
      email: string; 
      password: string; 
      firstName: string; 
      lastName: string;
      dateOfBirth?: string;
      phone?: string;
      rentEndDate?: string;
      address?: string;
      isFromInvite?: boolean;
      hearAboutUs?: string;
    }) => authSignup(data),
    onSuccess: (result, variables) => {
      if (result.accessToken) {
        setAccessToken(result.accessToken)
        setCookie('pay_access_token', result.accessToken)
      }
      if (result.refreshToken) {
        setRefreshToken(result.refreshToken)
      }

      if (Capacitor.isNativePlatform() && variables.password) {
        BiometricsService.saveCredentials(variables.email, variables.password).catch(() => {})
      }

      setAuthUser(result.user)
      queryClient.setQueryData(['user'], result.user)
      if (onSuccess) {
        onSuccess()
      } else {
        router.push(redirect)
      }
    },
  })

  return {
    signup: (data: { 
      email: string; 
      password: string; 
      firstName: string; 
      lastName: string;
      dateOfBirth?: string;
      phone?: string;
      rentEndDate?: string;
      address?: string;
      isFromWaitlist?: boolean;
      isFromInvite?: boolean;
      hearAboutUs?: string;
      properties?: Array<{
        address: string;
        rentEndDate: string;
        companyName?: string;
        managerName?: string;
      }>
    }) => signupMutation.mutate(data),
    loading: signupMutation.isPending,
    error: signupMutation.error instanceof Error ? signupMutation.error.message : '',
  }
}
