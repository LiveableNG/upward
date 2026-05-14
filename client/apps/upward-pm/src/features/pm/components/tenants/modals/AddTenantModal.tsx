import React from 'react'
import { X, UserPlus, Loader2 } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useTenantActions } from '../../../hooks/useTenants'
import { PhoneInput } from '@/components/common/PhoneInput'
import { isValidPhoneNumber } from 'libphonenumber-js'

const tenantSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().refine((val) => !val || isValidPhoneNumber(val), {
    message: 'Invalid international phone number (e.g. +234...)'
  })
})

type TenantFormData = z.infer<typeof tenantSchema>

interface AddTenantModalProps {
  isOpen: boolean
  onClose: () => void
  initialData?: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
  }
}

export const AddTenantModal: React.FC<AddTenantModalProps> = ({ isOpen, onClose, initialData }) => {
  const { createTenant } = useTenantActions()
  
  const { 
    register, 
    handleSubmit, 
    control,
    reset,
    formState: { errors, isValid } 
  } = useForm<TenantFormData>({
    mode: 'all',
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      email: initialData?.email || '',
      phone: initialData?.phone || ''
    }
  })

  if (!isOpen) return null

  const onSubmit = (data: TenantFormData) => {
    createTenant.mutate(data, {
      onSuccess: () => {
        reset()
        onClose()
      }
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 className="modal__title">Add New Tenant</h2>
            <p className="modal__desc">Create a new tenant profile to assign to your units.</p>
          </div>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ marginTop: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input 
                type="text" 
                className={`form-input ${errors.firstName ? 'form-input--error' : ''}`}
                placeholder="e.g. John" 
                {...register('firstName')}
              />
              {errors.firstName && <span className="form-error-text" style={{ color: 'var(--error)', fontSize: '12px' }}>{errors.firstName.message}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input 
                type="text" 
                className={`form-input ${errors.lastName ? 'form-input--error' : ''}`}
                placeholder="e.g. Doe" 
                {...register('lastName')}
              />
              {errors.lastName && <span className="form-error-text" style={{ color: 'var(--error)', fontSize: '12px' }}>{errors.lastName.message}</span>}
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 16 }}>
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              className={`form-input ${errors.email ? 'form-input--error' : ''}`}
              placeholder="tenant@example.com" 
              {...register('email')}
            />
            {errors.email && <span className="form-error-text" style={{ color: 'var(--error)', fontSize: '12px' }}>{errors.email.message}</span>}
          </div>

          <div style={{ marginTop: 16 }}>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <PhoneInput
                  {...field}
                  label="Phone Number"
                  placeholder="e.g. +234 800 000 0000"
                  error={errors.phone?.message}
                />
              )}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
            <button type="button" className="btn btn--secondary" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn--primary" 
              style={{ flex: 1 }} 
              disabled={createTenant.isPending || !isValid}
            >
              {createTenant.isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <UserPlus size={18} style={{ marginRight: 8 }} />
                  Create Tenant
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

