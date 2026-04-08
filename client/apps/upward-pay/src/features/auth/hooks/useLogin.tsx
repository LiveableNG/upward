import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { login as authLogin } from '../services/authService'
import { useAuth } from '../AuthContext'
import { setCookie } from '@/lib/cookie-utils'

export function useLogin(redirect: string) {
  const router = useRouter()
  const { login: setAuthUser } = useAuth()
  const queryClient = useQueryClient()

  const loginMutation = useMutation({
    mutationFn: (credentials: { email: string; password: string }) => authLogin(credentials),
    onSuccess: (result) => {
      // Set cookie for middleware visibility
      if (result.accessToken) {
        setCookie('access_token', result.accessToken)
      }
      
      setAuthUser(result.user)
      queryClient.setQueryData(['user'], result.user)
      router.push(redirect)
    },
  })

  return {
    login: (email: string, password: string) => loginMutation.mutate({ email, password }),
    loading: loginMutation.isPending,
    error: loginMutation.error instanceof Error ? loginMutation.error.message : '',
  }
}
