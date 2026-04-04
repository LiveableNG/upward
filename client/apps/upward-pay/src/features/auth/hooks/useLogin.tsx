import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { login as authLogin } from '../services/authService'
import { useAuth } from '../AuthContext'

export function useLogin(redirect: string) {
  const router = useRouter()
  const { login: setAuthUser } = useAuth()
  const queryClient = useQueryClient()

  const loginMutation = useMutation({
    mutationFn: (credentials: { email: string; password: string }) => authLogin(credentials),
    onSuccess: (result) => {
      setAuthUser(result.tenant)
      queryClient.setQueryData(['user'], result.tenant)
      router.push(redirect)
    },
  })

  return {
    login: (email: string, password: string) => loginMutation.mutate({ email, password }),
    loading: loginMutation.isPending,
    error: loginMutation.error instanceof Error ? loginMutation.error.message : '',
  }
}
