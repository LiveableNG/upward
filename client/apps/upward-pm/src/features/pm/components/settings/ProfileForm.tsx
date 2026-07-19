import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuth } from '@/features/auth/AuthContext'
import { useUpdateProfile } from '@/features/pm/hooks/usePmSettings'
import { PhoneInput } from '@/components/common/PhoneInput'
import { isValidPhoneNumber } from 'libphonenumber-js'
import { FormSelect } from '@/components/ui/Select/FormSelect'

const profileSchema = z.object({
  firstName: z.string().min(2, 'First name is too short'),
  lastName: z.string().min(2, 'Last name is too short'),
  businessName: z.string().optional(),
  pmType: z.string().optional(),
  phone: z.string().refine((val) => !val || isValidPhoneNumber(val), {
    message: 'Invalid international phone number (e.g. +234...)'
  }),
  country: z.string().optional(),
  cacNumber: z.string().optional(),
})

type ProfileFormData = z.infer<typeof profileSchema>

const formatProfilePhone = (phone?: string, country?: string): string => {
  if (!phone) return ''
  let cleaned = phone.replace(/[^\d+]/g, '').trim()
  if (cleaned.startsWith('+')) {
    return cleaned
  }
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1)
  }
  const dialCode = country === 'Kenya' ? '+254' : '+234'
  return dialCode + cleaned
}

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
      phone: formatProfilePhone(user?.phone, user?.country),
      country: user?.country || '',
      cacNumber: user?.cacNumber || '',
    }
  })

  React.useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName,
        lastName: user.lastName,
        businessName: user.businessName || '',
        pmType: user.pmType || '',
        phone: formatProfilePhone(user.phone, user.country),
        country: user.country || '',
        cacNumber: user.cacNumber || '',
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
            <Controller
              name="pmType"
              control={control}
              render={({ field }) => (
                <FormSelect
                  label="Account Type"
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder="Select account type"
                  options={[
                    { label: 'Landlord', value: 'Landlord' },
                    { label: 'Caretaker', value: 'Caretaker' },
                    { label: 'Lawyer', value: 'Lawyer' },
                    { label: 'Estate Agent', value: 'Estate Agent' },
                    { label: 'Property Manager', value: 'Property Manager' },
                    { label: 'Property Management Company', value: 'Company' }
                  ]}
                  triggerClassName="settings__input"
                />
              )}
            />
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

        <div className="settings__grid">
          <div className="settings__field">
            <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <FormSelect
                  label="Country"
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder="Select country"
                  options={[
                    { label: 'Nigeria', value: 'Nigeria' },
                    { label: 'Kenya', value: 'Kenya' }
                  ]}
                  triggerClassName="settings__input"
                />
              )}
            />
          </div>
          <div className="settings__field">
            <label className="settings__label">CAC Number (Optional)</label>
            <input 
              {...register('cacNumber')}
              className="settings__input"
              placeholder="Enter CAC number"
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

