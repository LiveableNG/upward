import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { signup as authSignup } from '../services/authService'
import { useAuth } from '../AuthContext'

export function useSignup(redirect: string = '/dashboard') {
  const router = useRouter()
  const { login: setAuthUser } = useAuth()
  const queryClient = useQueryClient()

  const signupMutation = useMutation({
    mutationFn: (data: { email: string; password: string; fullName: string; phone?: string }) =>
      authSignup(data),
    onSuccess: (result) => {
      setAuthUser(result.tenant)
      queryClient.setQueryData(['user'], result.tenant)
      router.push(redirect)
    },
  })

  return {
    signup: (data: { email: string; password: string; fullName: string; phone?: string }) =>
      signupMutation.mutate(data),
    loading: signupMutation.isPending,
    error: signupMutation.error instanceof Error ? signupMutation.error.message : '',
  }
}
