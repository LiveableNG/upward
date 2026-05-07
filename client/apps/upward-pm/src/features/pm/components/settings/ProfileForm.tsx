import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuth } from '@/features/auth/AuthContext'
import { useUpdateProfile } from '@/features/pm/hooks/usePmSettings'
import { PhoneInput } from '@/components/common/PhoneInput'
import { isValidPhoneNumber } from 'libphonenumber-js'

const profileSchema = z.object({
  firstName: z.string().min(2, 'First name is too short'),
  lastName: z.string().min(2, 'Last name is too short'),
  businessName: z.string().optional(),
  pmType: z.string().optional(),
  phone: z.string().refine((val) => !val || isValidPhoneNumber(val), {
    message: 'Invalid international phone number (e.g. +234...)'
  }),
})

type ProfileFormData = z.infer<typeof profileSchema>

export function ProfileForm() {
  const { user } = useAuth()
  const { mutate: updateProfile, isPending } = useUpdateProfile()

  const { register, handleSubmit, reset, control, formState: { errors, isDirty } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      businessName: user?.businessName || '',
      pmType: user?.pmType || '',
      phone: user?.phone || '',
    }
  })

  React.useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName,
        lastName: user.lastName,
        businessName: user.businessName || '',
        pmType: user.pmType || '',
        phone: user.phone || '',
      })
    }
  }, [user, reset])

  return (
    <section className="settings__section">
      <div className="settings__section-header">
        <h2 className="settings__section-title">Personal Information</h2>
        <p className="settings__section-subtitle">Update your personal and business details.</p>
      </div>

      <form className="settings__form" onSubmit={handleSubmit((data) => updateProfile(data))}>
        <div className="settings__grid">
          <div className="settings__field">
            <label className="settings__label">First Name</label>
            <input 
              {...register('firstName')}
              className={`settings__input ${errors.firstName ? 'settings__input--error' : ''}`}
              placeholder="Enter first name"
            />
            {errors.firstName && <span className="text-error text-xs">{errors.firstName.message}</span>}
          </div>
          <div className="settings__field">
            <label className="settings__label">Last Name</label>
            <input 
              {...register('lastName')}
              className={`settings__input ${errors.lastName ? 'settings__input--error' : ''}`}
              placeholder="Enter last name"
            />
            {errors.lastName && <span className="text-error text-xs">{errors.lastName.message}</span>}
          </div>
        </div>

        <div className="settings__grid">
          <div className="settings__field">
            <label className="settings__label">Business Name</label>
            <input 
              {...register('businessName')}
              className="settings__input"
              placeholder="Enter business name"
            />
          </div>
          <div className="settings__field">
            <label className="settings__label">Account Type</label>
            <select 
              {...register('pmType')}
              className="settings__input"
            >
              <option value="">Select account type</option>
              <option value="Landlord">Landlord</option>
              <option value="Caretaker">Caretaker</option>
              <option value="Lawyer">Lawyer</option>
              <option value="Estate Agent">Estate Agent</option>
              <option value="Property Manager">Property Manager</option>
              <option value="Company">Property Management Company</option>
            </select>
          </div>
        </div>

        <div className="settings__grid">
          <div className="settings__field">
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <PhoneInput
                  {...field}
                  label="Phone Number"
                  placeholder="e.g. +234 800 000 0000"
                  error={errors.phone?.message}
                  className="settings__input"
                />
              )}
            />
          </div>
        </div>

        <button 
          type="submit" 
          className="settings__submit"
          disabled={isPending || !isDirty}
        >
          {isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </section>
  )
}

