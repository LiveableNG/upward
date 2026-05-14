import React, { useState, useEffect } from 'react'
import { X, UserPlus, Loader2, Building2, Calendar, CreditCard, ChevronDown } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useTenantActions } from '../../../hooks/useTenants'
import { useUnits } from '../../../hooks/useProperties'
import { PhoneInput } from '@/components/common/PhoneInput'
import { isValidPhoneNumber } from 'libphonenumber-js'
import { cn } from '@/lib/utils'

const tenantSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().refine((val) => !val || isValidPhoneNumber(val), {
    message: 'Invalid international phone number (e.g. +234...)'
  }),
  // Assignment fields
  unitUuid: z.string().optional(),
  rentAmount: z.string().optional(),
  rentType: z.enum(['Monthly', 'Annually']).optional(),
  rentStartDate: z.string().optional(),
  rentEndDate: z.string().optional(),
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
    unitDetails?: any
  }
}

export const AddTenantModal: React.FC<AddTenantModalProps> = ({ isOpen, onClose, initialData }) => {
  const { createTenant, assignTenant } = useTenantActions()
  const { data: units = [] } = useUnits()
  const [showLeaseFields, setShowLeaseFields] = useState(!!initialData?.unitDetails)
  
  const { 
    register, 
    handleSubmit, 
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isValid } 
  } = useForm<TenantFormData>({
    mode: 'all',
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      unitUuid: '',
      rentAmount: initialData?.unitDetails?.rentAmount?.toString() || '',
      rentType: 'Annually',
      rentStartDate: initialData?.unitDetails?.rentStartDate ? new Date(initialData.unitDetails.rentStartDate).toISOString().split('T')[0] : '',
      rentEndDate: initialData?.unitDetails?.rentEndDate ? new Date(initialData.unitDetails.rentEndDate).toISOString().split('T')[0] : '',
    }
  })

  const selectedUnitUuid = watch('unitUuid')
  const rentStartDate = watch('rentStartDate')
  const rentType = watch('rentType')

  // Auto-fill unit based on address if possible
  useEffect(() => {
    if (initialData?.unitDetails?.address && units.length > 0) {
      const match = units.find(u => 
        u.property?.address?.toLowerCase().includes(initialData.unitDetails.address.toLowerCase()) ||
        u.unitName.toLowerCase().includes(initialData.unitDetails.address.toLowerCase())
      )
      if (match && !selectedUnitUuid) {
        setValue('unitUuid', match.uuid)
      }
    }
  }, [initialData, units, setValue, selectedUnitUuid])

  // Auto-calculate End Date if Start Date or Type changes
  useEffect(() => {
    if (rentStartDate && rentType) {
      const start = new Date(rentStartDate)
      if (isNaN(start.getTime())) return
      const end = new Date(start)
      if (rentType === 'Monthly') end.setMonth(end.getMonth() + 1)
      else end.setFullYear(end.getFullYear() + 1)
      end.setDate(end.getDate() - 1)
      setValue('rentEndDate', end.toISOString().split('T')[0])
    }
  }, [rentStartDate, rentType, setValue])

  if (!isOpen) return null

  const onSubmit = (data: TenantFormData) => {
    const { unitUuid, rentAmount, rentType, rentStartDate, rentEndDate, ...tenantData } = data
    
    createTenant.mutate(tenantData, {
      onSuccess: (tenant) => {
        if (unitUuid && rentAmount && rentType && rentStartDate && rentEndDate) {
          assignTenant.mutate({
            tenantUuid: tenant.uuid,
            unitUuid,
            rentAmount: parseFloat(rentAmount),
            rentType,
            rentStartDate,
            rentDueDate: rentEndDate,
            rentAmountPaid: 0 // Assume 0 for now as it's a join request
          }, {
            onSuccess: () => {
              reset()
              onClose()
            }
          })
        } else {
          reset()
          onClose()
        }
      }
    })
  }

  const vacantUnits = units.filter(u => !u.tenant && u.status !== 'MAINTENANCE')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 className="modal__title">Fulfill Join Request</h2>
            <p className="modal__desc">Review tenant details and assign them to a unit.</p>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ marginTop: 24 }}>
          {/* Tenant Identity Section */}
          <div className="form-section">
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                <label className="form-label">First Name</label>
                <input 
                    type="text" 
                    className={cn("form-input", errors.firstName && "form-input--error")}
                    placeholder="e.g. John" 
                    {...register('firstName')}
                />
                {errors.firstName && <span className="form-error-text">{errors.firstName.message}</span>}
                </div>
                <div className="form-group">
                <label className="form-label">Last Name</label>
                <input 
                    type="text" 
                    className={cn("form-input", errors.lastName && "form-input--error")}
                    placeholder="e.g. Doe" 
                    {...register('lastName')}
                />
                {errors.lastName && <span className="form-error-text">{errors.lastName.message}</span>}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input 
                    type="email" 
                    className={cn("form-input", errors.email && "form-input--error")}
                    placeholder="tenant@example.com" 
                    {...register('email')}
                    />
                    {errors.email && <span className="form-error-text">{errors.email.message}</span>}
                </div>
                <div>
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
            </div>
          </div>

          {/* Unit Assignment Toggle */}
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
             <div 
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                onClick={() => setShowLeaseFields(!showLeaseFields)}
             >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="icon-box" style={{ background: 'var(--forest-faint)', color: 'var(--forest)' }}>
                        <Building2 size={20} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Assign to Unit</h3>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Link this tenant to a specific property and unit.</p>
                    </div>
                </div>
                <ChevronDown size={20} style={{ transform: showLeaseFields ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
             </div>

             {showLeaseFields && (
                <div className="animate-fade-in" style={{ marginTop: 20 }}>
                    {initialData?.unitDetails && !selectedUnitUuid && (
                        <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#FFFBEB', borderRadius: 8, border: '1px solid #FEF3C7', fontSize: 12 }}>
                             <p style={{ margin: 0, color: '#92400E' }}>
                                <strong>Requested:</strong> {initialData.unitDetails.address} (₦{initialData.unitDetails.rentAmount?.toLocaleString()})
                             </p>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Select Unit</label>
                        <select 
                            className="form-input" 
                            {...register('unitUuid')}
                            style={{ appearance: 'none' }}
                        >
                            <option value="">-- Choose a vacant unit --</option>
                            {vacantUnits.map(u => (
                                <option key={u.uuid} value={u.uuid}>
                                    {u.property?.name} - Unit {u.unitName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <CreditCard size={14} /> Rent Amount (₦)
                            </label>
                            <input 
                                type="number" 
                                className="form-input"
                                placeholder="e.g. 2500000"
                                {...register('rentAmount')}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Rent Cycle</label>
                            <select className="form-input" {...register('rentType')}>
                                <option value="Annually">Annually</option>
                                <option value="Monthly">Monthly</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Calendar size={14} /> Start Date
                            </label>
                            <input 
                                type="date" 
                                className="form-input"
                                {...register('rentStartDate')}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Calendar size={14} /> End Date
                            </label>
                            <input 
                                type="date" 
                                className="form-input"
                                {...register('rentEndDate')}
                            />
                        </div>
                    </div>
                </div>
             )}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 40 }}>
            <button type="button" className="btn btn--secondary" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn--primary" 
              style={{ flex: 1 }} 
              disabled={createTenant.isPending || assignTenant.isPending || !isValid}
            >
              {createTenant.isPending || assignTenant.isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <UserPlus size={18} style={{ marginRight: 8 }} />
                  {selectedUnitUuid ? 'Approve & Assign' : 'Create Tenant'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .icon-box {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .form-section {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .form-error-text {
            color: var(--error);
            font-size: 12px;
            margin-top: 4px;
            display: block;
        }
      `}</style>
    </div>
  )
}

