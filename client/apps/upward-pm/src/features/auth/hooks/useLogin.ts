import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { login as authLogin, logout as authLogout, employeeLogin } from '../services/authService'
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
      return authLogin(data)
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

export function useEmployeeLogin() {
  const router = useRouter()
  const { login: setAuthUser } = useAuth()
  const { success, error } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      return employeeLogin(data)
    },
    onSuccess: async (result, variables) => {
      if (await BiometricsService.isEnabled()) {
        await BiometricsService.saveCredentials(variables.email, variables.password)
      }
      setAuthUser(result.user)
      queryClient.setQueryData(['user'], result.user)
      success("Welcome back! Logged in as Staff.")
      router.push('/dashboard')
    },
    onError: (err: any) => {
      error(err.message || "Staff login failed")
    }
  })
}
