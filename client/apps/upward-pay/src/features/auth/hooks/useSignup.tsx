import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { signup as authSignup } from '../services/authService'
import { useAuth } from '../AuthContext'
import { setAccessToken } from '@/lib/auth-token'

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
      rentEndDate?: string;
      address?: string;
      isFromInvite?: boolean;
    }) => authSignup(data),
    onSuccess: (result) => {
      if (result.accessToken) {
        setAccessToken(result.accessToken)
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
      rentEndDate?: string;
      address?: string;
      isFromWaitlist?: boolean;
      isFromInvite?: boolean;
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
