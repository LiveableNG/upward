'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useChangePassword } from '@/features/pm/hooks/usePmSettings'

const securitySchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
})

type SecurityFormData = z.infer<typeof securitySchema>

export function SecurityForm() {
  const { mutate: changePassword, isPending } = useChangePassword()

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<SecurityFormData>({
    resolver: zodResolver(securitySchema)
  })

  const onSubmit = (data: SecurityFormData) => {
    changePassword({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword
    }, {
      onSuccess: () => reset()
    })
  }

  return (
    <section className="settings__section">
      <div className="settings__section-header">
        <h2 className="settings__section-title">Security</h2>
        <p className="settings__section-subtitle">Manage your password and account security.</p>
      </div>

      <form className="settings__form" onSubmit={handleSubmit(onSubmit)}>
        <div className="settings__field">
          <label className="settings__label">Current Password</label>
          <input 
            type="password"
            {...register('currentPassword')}
            className="settings__input"
            placeholder="••••••••"
          />
          {errors.currentPassword && <span className="text-error text-xs">{errors.currentPassword.message}</span>}
        </div>

        <div className="settings__grid">
          <div className="settings__field">
            <label className="settings__label">New Password</label>
            <input 
              type="password"
              {...register('newPassword')}
              className="settings__input"
              placeholder="••••••••"
            />
            {errors.newPassword && <span className="text-error text-xs">{errors.newPassword.message}</span>}
          </div>
          <div className="settings__field">
            <label className="settings__label">Confirm New Password</label>
            <input 
              type="password"
              {...register('confirmPassword')}
              className="settings__input"
              placeholder="••••••••"
            />
            {errors.confirmPassword && <span className="text-error text-xs">{errors.confirmPassword.message}</span>}
          </div>
        </div>

        <button 
          type="submit" 
          className="settings__submit"
          disabled={isPending || !isDirty}
        >
          {isPending ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </section>
  )
}
