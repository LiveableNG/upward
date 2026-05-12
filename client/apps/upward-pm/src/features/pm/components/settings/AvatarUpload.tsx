'use client'

import React, { useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/common/Toast'
import { useMutation } from '@tanstack/react-query'
import { Camera, Loader2, User } from 'lucide-react'
import { api } from '@/lib/api'
import { UserAvatar } from '@/components/common/UserAvatar'

export function AvatarUpload() {
  const { user, refreshUser } = useAuth()
  const { success, error: toastError } = useToast()
  const [isUploading, setIsUploading] = useState(false)

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true)
      
      // Convert file to base64 to send to backend (avoids CORS issues with direct S3 upload)
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          const base64 = result.split(',')[1]
          resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const { publicUrl } = await api.uploadAvatar({
        base64Data,
        contentType: file.type
      })

      // 3. Update PM profile with public URL
      await api.updatePmProfile({ profilePic: publicUrl })
      
      return publicUrl
    },
    onSuccess: () => {
      success('Profile picture updated')
      refreshUser()
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to upload image')
    },
    onSettled: () => setIsUploading(false)
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toastError('File is too large. Max 5MB.')
        return
      }
      uploadMutation.mutate(file)
    }
  }

  return (
    <section className="settings__section">
      <div className="settings__section-header">
        <h2 className="settings__section-title">Profile Picture</h2>
        <p className="settings__section-subtitle">This will be visible on your profile and properties.</p>
      </div>

      <div className="avatar-upload">
        <div className="avatar-upload__preview">
          <UserAvatar 
            src={user?.profilePic} 
            alt="Profile" 
            size={100} 
            rounded={false}
            className="avatar-upload__img" 
          />
          {isUploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg">
              <Loader2 size={24} className="text-white animate-spin" />
            </div>
          )}
        </div>

        <div className="avatar-upload__btn">
          <input 
            type="file" 
            id="avatar-input" 
            className="avatar-upload__input" 
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
          />
          <label htmlFor="avatar-input" className="avatar-upload__label">
            <Camera size={16} className="inline mr-2" />
            Change Photo
          </label>
          <p className="text-xs text-muted">JPG, PNG or GIF. Max 5MB.</p>
        </div>
      </div>
    </section>
  )
}
