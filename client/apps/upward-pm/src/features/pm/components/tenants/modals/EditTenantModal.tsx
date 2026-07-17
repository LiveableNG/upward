import React, { useEffect } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal/Modal'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useTenantActions } from '../../../hooks/useTenants'
import { Tenant } from '../../../services/tenantService'
import { PhoneInput } from '@/components/common/PhoneInput'
import { isValidPhoneNumber } from 'libphonenumber-js'

const tenantSchema = z.object({
  tenantType: z.enum(['individual', 'commercial']),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  commercialName: z.string().optional(),
  email: z.string().optional().refine((val) => !val || val.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
    message: 'Invalid email address'
  }),
  phone: z.string().optional().refine((val) => !val || isValidPhoneNumber(val), {
    message: 'Invalid international phone number'
  }),
  otherPhone: z.string().optional().refine((val) => !val || isValidPhoneNumber(val), {
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
  if (data.tenantType === 'commercial') {
    if (!data.commercialName || data.commercialName.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['commercialName'],
        message: 'Commercial/Business name is required'
      });
    }
  } else {
    if (!data.firstName || data.firstName.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['firstName'],
        message: 'First name is required'
      });
    }
    if (!data.lastName || data.lastName.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['lastName'],
        message: 'Last name is required'
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
      tenantType: 'individual',
      firstName: '',
      lastName: '',
      commercialName: '',
      email: '',
      phone: '',
      otherPhone: '',
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
        tenantType: tenant.commercialName ? 'commercial' : 'individual',
        firstName: tenant.firstName || '',
        lastName: tenant.lastName || '',
        commercialName: tenant.commercialName || '',
        email: tenant.email?.endsWith('@upward.com') ? '' : (tenant.email || ''),
        phone: tenant.phone || '',
        otherPhone: tenant.otherPhone || '',
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
    const { tenantType, ...updatedData } = data
    if (tenantType === 'commercial') {
      updatedData.firstName = ''
      updatedData.lastName = ''
    } else {
      updatedData.commercialName = ''
    }
    if (!updatedData.email || updatedData.email.trim() === '') {
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Tenant Profile"
      subtitle="Update the contact information for this tenant."
      maxWidth={640}
      footer={
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          <button type="button" className="btn btn--secondary" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button 
            type="submit" 
            form="edit-tenant-form"
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
      }
    >
        <form id="edit-tenant-form" onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ overflowY: 'auto', paddingRight: 8, flex: 1 }}>
            {/* Section: Personal Info */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16 }}>Personal Information</h3>
              {tenant.commercialName ? (
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Commercial / Business Name</label>
                  <input type="text" className="form-input" {...register('commercialName')} />
                  {errors.commercialName && <span className="form-error-text" style={{ color: 'var(--error)', fontSize: 12, marginTop: 4, display: 'block' }}>{errors.commercialName.message}</span>}
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div className="form-group">
                      <label className="form-label">First Name</label>
                      <input type="text" className="form-input" {...register('firstName')} />
                      {errors.firstName && <span className="form-error-text" style={{ color: 'var(--error)', fontSize: 12, marginTop: 4, display: 'block' }}>{errors.firstName.message}</span>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Last Name</label>
                      <input type="text" className="form-input" {...register('lastName')} />
                      {errors.lastName && <span className="form-error-text" style={{ color: 'var(--error)', fontSize: 12, marginTop: 4, display: 'block' }}>{errors.lastName.message}</span>}
                    </div>
                  </div>
                </>
              )}
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
              <div style={{ marginTop: 16 }}>
                <Controller
                  name="otherPhone"
                  control={control}
                  render={({ field }) => (
                    <PhoneInput
                      {...field}
                      label="Alternative Phone Number"
                      error={errors.otherPhone?.message}
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

        </form>
    </Modal>
  )
}

