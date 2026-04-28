import React, { useEffect } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useTenantActions } from '../../../hooks/useTenants'
import { Tenant } from '../../../services/tenantService'
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

interface EditTenantModalProps {
  isOpen: boolean
  onClose: () => void
  tenant: Tenant
}

export const EditTenantModal: React.FC<EditTenantModalProps> = ({ isOpen, onClose, tenant }) => {
  const { updateTenant } = useTenantActions()
  
  const { 
    register, 
    handleSubmit, 
    control,
    reset,
    formState: { errors } 
  } = useForm<TenantFormData>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: ''
    }
  })

  useEffect(() => {
    if (tenant && isOpen) {
      reset({
        firstName: tenant.firstName || '',
        lastName: tenant.lastName || '',
        email: tenant.email || '',
        phone: tenant.phone || ''
      })
    }
  }, [tenant, isOpen, reset])

  if (!isOpen) return null

  const onSubmit = (data: TenantFormData) => {
    updateTenant.mutate({ 
      uuid: tenant.uuid, 
      data 
    }, {
      onSuccess: () => {
        onClose()
      }
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 className="modal__title">Edit Tenant Profile</h2>
            <p className="modal__desc">Update the contact information for this tenant.</p>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={20} /></button>
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
              disabled={updateTenant.isPending}
            >
              {updateTenant.isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <Save size={18} style={{ marginRight: 8 }} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

