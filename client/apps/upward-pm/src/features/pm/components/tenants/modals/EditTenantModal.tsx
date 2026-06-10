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
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  commercialName: z.string().optional(),
  email: z.string().optional().refine((val) => !val || val.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
    message: 'Invalid email address'
  }),
  phone: z.string().optional().refine((val) => !val || isValidPhoneNumber(val), {
    message: 'Invalid international phone number'
  }),
  formerAddress: z.string().optional(),
  nextOfKinName: z.string().optional(),
  nextOfKinEmail: z.string().optional(),
  nextOfKinPhone: z.string().optional(),
  guarantorName: z.string().optional(),
  guarantorEmail: z.string().optional(),
  guarantorPhone: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactEmail: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
}).superRefine((data, ctx) => {
  // If no commercialName is set, we need firstName and lastName
  if (!data.commercialName || data.commercialName.trim() === '') {
    if (!data.firstName || data.firstName.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['firstName'],
        message: 'First name is required (or provide Commercial Name)'
      });
    }
    if (!data.lastName || data.lastName.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['lastName'],
        message: 'Last name is required (or provide Commercial Name)'
      });
    }
  }
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
    formState: { errors, isValid } 
  } = useForm<TenantFormData>({
    mode: 'all',
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      commercialName: '',
      email: '',
      phone: '',
      formerAddress: '',
      nextOfKinName: '',
      nextOfKinEmail: '',
      nextOfKinPhone: '',
      guarantorName: '',
      guarantorEmail: '',
      guarantorPhone: '',
      emergencyContactName: '',
      emergencyContactEmail: '',
      emergencyContactPhone: ''
    }
  })

  useEffect(() => {
    if (tenant && isOpen) {
      reset({
        firstName: tenant.firstName || '',
        lastName: tenant.lastName || '',
        commercialName: tenant.commercialName || '',
        email: tenant.email?.endsWith('@upward.com') ? '' : (tenant.email || ''),
        phone: tenant.phone || '',
        formerAddress: tenant.formerAddress || '',
        nextOfKinName: tenant.nextOfKinName || '',
        nextOfKinEmail: tenant.nextOfKinEmail || '',
        nextOfKinPhone: tenant.nextOfKinPhone || '',
        guarantorName: tenant.guarantorName || '',
        guarantorEmail: tenant.guarantorEmail || '',
        guarantorPhone: tenant.guarantorPhone || '',
        emergencyContactName: tenant.emergencyContactName || '',
        emergencyContactEmail: tenant.emergencyContactEmail || '',
        emergencyContactPhone: tenant.emergencyContactPhone || ''
      })
    }
  }, [tenant, isOpen, reset])

  if (!isOpen) return null

  const onSubmit = (data: TenantFormData) => {
    const updatedData = { ...data }
    if (!data.email || data.email.trim() === '') {
      updatedData.email = tenant.email
    }
    
    updateTenant.mutate({ 
      uuid: tenant.uuid, 
      data: updatedData 
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

        <form onSubmit={handleSubmit(onSubmit)} style={{ marginTop: 24, display: 'flex', flexDirection: 'column', maxHeight: '70vh' }}>
          <div style={{ overflowY: 'auto', paddingRight: 8, flex: 1 }}>
            {/* Section: Personal Info */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16 }}>Personal Information</h3>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Commercial / Business Name (Optional fallback)</label>
                <input type="text" className="form-input" {...register('commercialName')} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input type="text" className="form-input" {...register('firstName')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input type="text" className="form-input" {...register('lastName')} />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label">Email Address</label>
                <input type="email" className="form-input" {...register('email')} />
              </div>
              <div style={{ marginTop: 16 }}>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <PhoneInput
                      {...field}
                      label="Phone Number"
                      error={errors.phone?.message}
                    />
                  )}
                />
              </div>
            </div>

            {/* Section: Address */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16 }}>Address</h3>
              <div className="form-group">
                <label className="form-label">Former Address</label>
                <input type="text" className="form-input" {...register('formerAddress')} />
              </div>
            </div>

            {/* Section: Next of Kin */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16 }}>Next of Kin</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input type="text" className="form-input" {...register('nextOfKinName')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input type="text" className="form-input" {...register('nextOfKinPhone')} />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label">Email</label>
                <input type="text" className="form-input" {...register('nextOfKinEmail')} />
              </div>
            </div>

            {/* Section: Guarantor */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16 }}>Guarantor Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input type="text" className="form-input" {...register('guarantorName')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input type="text" className="form-input" {...register('guarantorPhone')} />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label">Email</label>
                <input type="text" className="form-input" {...register('guarantorEmail')} />
              </div>
            </div>

            {/* Section: Emergency Contact */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16 }}>Emergency Contact</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input type="text" className="form-input" {...register('emergencyContactName')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input type="text" className="form-input" {...register('emergencyContactPhone')} />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label">Email</label>
                <input type="text" className="form-input" {...register('emergencyContactEmail')} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
            <button type="button" className="btn btn--secondary" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn--primary" 
              style={{ flex: 1 }} 
              disabled={updateTenant.isPending || !isValid}
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

