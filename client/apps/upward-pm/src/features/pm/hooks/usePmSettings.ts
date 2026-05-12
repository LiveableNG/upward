import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/common/Toast'

export function useUpdateProfile() {
  const { refreshUser } = useAuth()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: api.updatePmProfile,
    onSuccess: () => {
      success('Profile updated successfully')
      refreshUser()
    },
    onError: (err: any) => {
      error(err.message || 'Failed to update profile')
    }
  })
}

export function useUpdateBankInfo() {
  const { refreshUser } = useAuth()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: api.updatePmBankInfo,
    onSuccess: () => {
      success('Bank information saved')
      refreshUser()
    },
    onError: (err: any) => {
      error(err.message || 'Failed to save bank information')
    }
  })
}

export function useChangePassword() {
  const { success, error } = useToast()

  return useMutation({
    mutationFn: api.changePmPassword,
    onSuccess: () => {
      success('Password changed successfully')
    },
    onError: (err: any) => {
      error(err.message || 'Failed to change password')
    }
  })
}

export function useLetterheadUploadUrl() {
  return useMutation({
    mutationFn: (params: { type: 'header' | 'footer', contentType: string, filename: string }) => 
      api.getLetterheadUploadUrl(params)
  })
}
