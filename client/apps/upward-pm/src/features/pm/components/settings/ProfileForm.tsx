import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuth } from '@/features/auth/AuthContext'
import { useUpdateProfile } from '@/features/pm/hooks/usePmSettings'
import { PhoneInput } from '@/components/common/PhoneInput'
import { isValidPhoneNumber } from 'libphonenumber-js'
import { FormSelect } from '@/components/ui/Select/FormSelect'

const memberProfileSchema = z.object({
  firstName: z.string().min(2, 'First name is too short'),
  lastName: z.string().min(2, 'Last name is too short'),
  phone: z.string().refine((val) => !val || isValidPhoneNumber(val), {
    message: 'Invalid international phone number (e.g. +234...)'
  }),
})

const ownerProfileSchema = memberProfileSchema.extend({
  businessName: z.string().optional(),
  pmType: z.string().optional(),
  country: z.string().optional(),
  companyAddress: z.string().optional(),
  cacNumber: z.string().optional(),
})

type MemberProfileFormData = z.infer<typeof memberProfileSchema>
type OwnerProfileFormData = z.infer<typeof ownerProfileSchema>

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
  const canManageCompanySettings = user?.canManageCompanySettings !== false

  const schema = canManageCompanySettings ? ownerProfileSchema : memberProfileSchema

  const { register, handleSubmit, reset, control, formState: { errors, isDirty } } = useForm<OwnerProfileFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      businessName: user?.businessName || '',
      pmType: user?.pmType || '',
      phone: formatProfilePhone(user?.phone, user?.country),
      country: user?.country || '',
      companyAddress: user?.companyAddress || '',
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
        companyAddress: user.companyAddress || '',
        cacNumber: user.cacNumber || '',
      })
    }
  }, [user, reset])

  const onSubmit = (data: OwnerProfileFormData | MemberProfileFormData) => {
    if (canManageCompanySettings) {
      updateProfile(data)
      return
    }
    updateProfile({
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
    })
  }

  return (
    <section className="settings__section">
      <div className="settings__section-header">
        <h2 className="settings__section-title">Personal Information</h2>
        <p className="settings__section-subtitle">
          {canManageCompanySettings
            ? 'Update your personal and business details.'
            : 'Update your personal details. Company fields are managed by your admin.'}
        </p>
      </div>

      <form className="settings__form" onSubmit={handleSubmit(onSubmit)}>
        <div className="settings__field" style={{ marginBottom: 16 }}>
          <label className="settings__label">Email</label>
          <input
            className="settings__input"
            value={user?.email || ''}
            readOnly
            disabled
            style={{ opacity: 0.75, cursor: 'not-allowed' }}
          />
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, display: 'block' }}>
            {canManageCompanySettings
              ? 'Email cannot be changed here.'
              : 'Email is set by your admin and cannot be changed here.'}
          </span>
        </div>

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
            <label className="settings__label">Phone Number</label>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <PhoneInput
                  {...field}
                  placeholder="e.g. +234 800 000 0000"
                  error={errors.phone?.message}
                  className="settings__input"
                />
              )}
            />
          </div>
          {canManageCompanySettings ? (
            <div className="settings__field">
              <label className="settings__label">Company Address</label>
              <input
                {...register('companyAddress')}
                className="settings__input"
                placeholder="Enter company address"
              />
            </div>
          ) : (
            <div className="settings__field" />
          )}
        </div>

        {canManageCompanySettings && (
          <>
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
                <Controller
                  name="pmType"
                  control={control}
                  render={({ field }) => (
                    <FormSelect
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
                <label className="settings__label">Country</label>
                <Controller
                  name="country"
                  control={control}
                  render={({ field }) => (
                    <FormSelect
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
          </>
        )}

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
