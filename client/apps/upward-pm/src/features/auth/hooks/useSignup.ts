import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { signup as authSignup } from '../services/authService'
import { useAuth } from '../AuthContext'
import { useToast } from '@/components/common/Toast'

export function useSignup() {
  const router = useRouter()
  const { login: setAuthUser } = useAuth()
  const { success, error } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: any) => authSignup(data),
    onSuccess: (result) => {
      setAuthUser(result.user)
      queryClient.setQueryData(['user'], result.user)
      success("Account created successfully!")
      router.push('/dashboard')
    },
    onError: (err: any) => {
      error(err.message || "Signup failed")
    }
  })
}
