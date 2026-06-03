"use client"

import React, { useState, useEffect } from 'react'
import { X, UserPlus, Loader2, Building2, Calendar, CreditCard, ChevronDown, MapPin, CheckCircle2 } from 'lucide-react'
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
}).superRefine((data, ctx) => {
  if (data.unitUuid && data.unitUuid.trim() !== '') {
    if (!data.rentAmount || parseFloat(data.rentAmount) <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rentAmount'],
        message: 'Rent amount is required and must be greater than 0'
      })
    }
    if (!data.rentStartDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rentStartDate'],
        message: 'Rent start date is required'
      })
    }
    if (!data.rentEndDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rentEndDate'],
        message: 'Rent end date is required'
      })
    }
  }
})

type TenantFormData = z.infer<typeof tenantSchema>

interface AddTenantModalProps {
  isOpen: boolean
  onClose: () => void
  /** 'join-request' = opened from a tenant-initiated join request. 'add-tenant' = PM manually adding a tenant. Defaults to 'add-tenant'. */
  mode?: 'join-request' | 'add-tenant'
  initialData?: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    unitDetails?: {
      address?: string
      area?: string
      subarea?: string
      state?: string
      country?: string
      rentAmount?: number
      rentStartDate?: string
      rentEndDate?: string
    }
  }
}

export const AddTenantModal: React.FC<AddTenantModalProps> = ({ isOpen, onClose, mode = 'add-tenant', initialData }) => {
  const { createTenant, assignTenant } = useTenantActions()
  const { data: units = [] } = useUnits()

  const isJoinRequest = mode === 'join-request'

  // Auto-expand unit section for join requests, otherwise collapsed by default
  const [showLeaseFields, setShowLeaseFields] = useState(isJoinRequest || !!initialData?.unitDetails)

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
      rentStartDate: initialData?.unitDetails?.rentStartDate
        ? new Date(initialData.unitDetails.rentStartDate).toISOString().split('T')[0]
        : '',
      rentEndDate: initialData?.unitDetails?.rentEndDate
        ? new Date(initialData.unitDetails.rentEndDate).toISOString().split('T')[0]
        : '',
    }
  })

  const selectedUnitUuid = watch('unitUuid')
  const rentStartDate = watch('rentStartDate')
  const rentType = watch('rentType')

  // Auto-fill unit based on address if possible
  useEffect(() => {
    if (initialData?.unitDetails?.address && units.length > 0) {
      const addr = initialData.unitDetails.address.toLowerCase()
      const match = units.find(u =>
        u.property?.address?.toLowerCase().includes(addr) ||
        u.unitName.toLowerCase().includes(addr) ||
        (initialData.unitDetails?.area && u.property?.address?.toLowerCase().includes(initialData.unitDetails.area.toLowerCase()))
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
            rentAmountPaid: 0
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
  const ud = initialData?.unitDetails

  // Build a readable location string from the tenant's request
  const requestedLocation = [ud?.address, ud?.area, ud?.state, ud?.country]
    .filter(Boolean).join(', ')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 620 }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="modal-header-icon" style={{ background: isJoinRequest ? 'var(--forest-faint)' : 'var(--clay-faint)', color: isJoinRequest ? 'var(--forest)' : 'var(--clay)' }}>
              {isJoinRequest ? <CheckCircle2 size={22} /> : <UserPlus size={22} />}
            </div>
            <div>
              <h2 className="modal__title" style={{ marginBottom: 2 }}>
                {isJoinRequest ? 'Fulfill Tenant Request' : 'Add New Tenant'}
              </h2>
              <p className="modal__desc" style={{ margin: 0 }}>
                {isJoinRequest
                  ? 'Review the tenant\'s connection request and assign them to a unit.'
                  : 'Add a tenant manually and optionally assign them to a unit.'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={20} /></button>
        </div>

        {/* ── Join Request Summary Card ── */}
        {isJoinRequest && ud && requestedLocation && (
          <div className="join-request-card" style={{ marginTop: 24 }}>
            <div className="join-request-card__header">
              <MapPin size={14} />
              <span>Tenant's Requested Unit Details</span>
            </div>
            <div className="join-request-card__body">
              <div className="join-request-card__row">
                <span className="join-request-card__label">Address</span>
                <span className="join-request-card__val">{requestedLocation}</span>
              </div>
              {ud.rentAmount && (
                <div className="join-request-card__row">
                  <span className="join-request-card__label">Agreed Rent</span>
                  <span className="join-request-card__val join-request-card__val--highlight">
                    ₦{ud.rentAmount.toLocaleString()}
                  </span>
                </div>
              )}
              {ud.rentStartDate && (
                <div className="join-request-card__row">
                  <span className="join-request-card__label">Lease Start</span>
                  <span className="join-request-card__val">
                    {new Date(ud.rentStartDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              )}
              {ud.rentEndDate && (
                <div className="join-request-card__row">
                  <span className="join-request-card__label">Lease End</span>
                  <span className="join-request-card__val">
                    {new Date(ud.rentEndDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} style={{ marginTop: 24 }}>

          {/* ── Tenant Identity Section ── */}
          <div className="form-section-label">
            {isJoinRequest ? 'Tenant Profile (pre-filled from request)' : 'Tenant Details'}
          </div>
          <div className="form-section">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  className={cn("form-input", errors.firstName && "form-input--error")}
                  placeholder="e.g. John"
                  readOnly={isJoinRequest && !!initialData?.firstName}
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
                  readOnly={isJoinRequest && !!initialData?.lastName}
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
                  readOnly={isJoinRequest && !!initialData?.email}
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

          {/* ── Unit Assignment ── */}
          <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              onClick={() => setShowLeaseFields(!showLeaseFields)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="icon-box" style={{ background: 'var(--forest-faint)', color: 'var(--forest)' }}>
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
                    {isJoinRequest ? 'Assign to Unit' : 'Assign to Unit'}
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                    {isJoinRequest
                      ? 'Match this tenant to one of your vacant units to approve the connection.'
                      : 'Link this tenant to a specific property and unit.'}
                  </p>
                </div>
              </div>
              <ChevronDown size={20} style={{ transform: showLeaseFields ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </div>

            {showLeaseFields && (
              <div className="animate-fade-in" style={{ marginTop: 20 }}>
                {vacantUnits.length === 0 ? (
                  <div className="no-units-warning">
                    <strong>No vacant units available.</strong> You cannot assign this tenant without a vacant unit.
                    You can still save their profile now and assign them once a unit is available.
                  </div>
                ) : (
                  <>
                    <div className="form-group">
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Building2 size={14} />
                        {isJoinRequest ? 'Select Matching Unit' : 'Select Unit'}
                      </label>
                      <select
                        className={cn("form-input", errors.unitUuid && "form-input--error")}
                        {...register('unitUuid')}
                        style={{ appearance: 'none' }}
                      >
                        <option value="">-- Choose a vacant unit --</option>
                        {vacantUnits.map(u => (
                          <option key={u.uuid} value={u.uuid}>
                            {u.property?.name} — Unit {u.unitName}
                            {u.property?.address ? ` (${u.property.address})` : ''}
                          </option>
                        ))}
                      </select>
                      {errors.unitUuid && <span className="form-error-text">{errors.unitUuid.message}</span>}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                      <div className="form-group">
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <CreditCard size={14} /> Rent Amount (₦)
                        </label>
                        <input
                          type="number"
                          className={cn("form-input", errors.rentAmount && "form-input--error")}
                          placeholder="e.g. 2500000"
                          {...register('rentAmount')}
                        />
                        {errors.rentAmount && <span className="form-error-text">{errors.rentAmount.message}</span>}
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
                          className={cn("form-input", errors.rentStartDate && "form-input--error")}
                          {...register('rentStartDate')}
                        />
                        {errors.rentStartDate && <span className="form-error-text">{errors.rentStartDate.message}</span>}
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Calendar size={14} /> End Date
                        </label>
                        <input
                          type="date"
                          className={cn("form-input", errors.rentEndDate && "form-input--error")}
                          {...register('rentEndDate')}
                        />
                        {errors.rentEndDate && <span className="form-error-text">{errors.rentEndDate.message}</span>}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── Actions ── */}
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
                  {isJoinRequest
                    ? (selectedUnitUuid ? <><CheckCircle2 size={18} style={{ marginRight: 8 }} />Approve & Assign Unit</> : <><UserPlus size={18} style={{ marginRight: 8 }} />Approve Request</>)
                    : (selectedUnitUuid ? <><UserPlus size={18} style={{ marginRight: 8 }} />Add & Assign</> : <><UserPlus size={18} style={{ marginRight: 8 }} />Add Tenant</>)
                  }
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .modal-header-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .icon-box {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .form-section-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-muted);
          margin-bottom: 12px;
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
        .no-units-warning {
          padding: 14px 16px;
          background-color: #fffbeb;
          border-radius: 12px;
          border: 1px solid #fef3c7;
          font-size: 13px;
          color: #b45309;
          line-height: 1.5;
        }

        /* Join Request Card */
        .join-request-card {
          border: 1.5px solid var(--forest);
          border-radius: 16px;
          overflow: hidden;
          background: rgba(22, 101, 52, 0.03);
        }
        .join-request-card__header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: rgba(22, 101, 52, 0.07);
          border-bottom: 1px solid rgba(22, 101, 52, 0.12);
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--forest);
        }
        .join-request-card__body {
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .join-request-card__row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .join-request-card__label {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 500;
          white-space: nowrap;
        }
        .join-request-card__val {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          text-align: right;
        }
        .join-request-card__val--highlight {
          color: var(--forest);
          font-size: 14px;
        }
      `}</style>
    </div>
  )
}
