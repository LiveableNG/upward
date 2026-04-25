import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { login as authLogin } from '../services/authService'
import { useAuth } from '../AuthContext'
import { useToast } from '@/components/common/Toast'

export function useLogin() {
  const router = useRouter()
  const { login: setAuthUser } = useAuth()
  const { success, error } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: any) => authLogin(data),
    onSuccess: (result) => {
      setAuthUser(result.user)
      queryClient.setQueryData(['user'], result.user)
      success("Logged in successfully!")
      router.push('/dashboard')
    },
    onError: (err: any) => {
      error(err.message || "Login failed")
    }
  })
}
