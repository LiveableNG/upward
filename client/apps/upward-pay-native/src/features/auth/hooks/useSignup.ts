import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'expo-router'

import { useAuth } from '@/features/auth/AuthProvider'
import { getPostAuthSetupPath, needsProfileSetup } from '@/features/auth/session'
import { signup as authSignup } from '@/features/auth/services/authService'

export function useSignup(onSuccess?: () => void) {
  const router = useRouter()
  const { signIn } = useAuth()

  return useMutation({
    mutationFn: authSignup,
    onSuccess: async (result) => {
      await signIn(
        { accessToken: result.accessToken, refreshToken: result.refreshToken },
        result.user,
      )
      if (onSuccess) {
        onSuccess()
        return
      }
      router.replace(
        needsProfileSetup(result.user) ? getPostAuthSetupPath(result.user) : '/dashboard',
      )
    },
  })
}
