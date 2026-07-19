import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { login as authLogin, logout as authLogout } from '../services/authService'
import { useAuth } from '../AuthContext'
import { useToast } from '@/components/common/Toast'
import { BiometricsService } from '../services/biometricsService'

export function useLogin() {
  const router = useRouter()
  const { login: setAuthUser } = useAuth()
  const { success, error } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: any) => {
      const result = await authLogin(data);
      if (result.user?.pmType === 'INDIVIDUAL_LANDLORD') {
        await authLogout().catch(() => {});
        throw new Error("Invalid details for Property Manager. Please use the Landlord portal.");
      }
      return result;
    },
    onSuccess: async (result, variables) => {
      if (await BiometricsService.isEnabled()) {
        await BiometricsService.saveCredentials(variables.email, variables.password)
      }
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
