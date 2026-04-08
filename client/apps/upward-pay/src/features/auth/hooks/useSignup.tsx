import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { signup as authSignup } from '../services/authService'
import { useAuth } from '../AuthContext'
import { setCookie } from '@/lib/cookie-utils'

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
      phone?: string;
      rentAnniversary?: string;
      address?: string;
      isFromInvite?: boolean;
    }) => authSignup(data),
    onSuccess: (result) => {
      // Set cookie for middleware visibility
      if (result.accessToken) {
        setCookie('access_token', result.accessToken)
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
      phone?: string;
      rentAnniversary?: string;
      address?: string;
      city?: string;
      country?: string;
      isFromWaitlist?: boolean;
      isFromInvite?: boolean;
    }) => signupMutation.mutate(data),
    loading: signupMutation.isPending,
    error: signupMutation.error instanceof Error ? signupMutation.error.message : '',
  }
}
