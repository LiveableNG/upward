"use client"

import React, { useState, useEffect } from 'react'
import { X, UserPlus, Loader2, Building2, Calendar, CreditCard, ChevronDown, MapPin, CheckCircle2 } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useTenantActions } from '../../../hooks/useTenants'
import { useUnits, useProperties, useCreateProperty, useBulkCreateUnits } from '../../../hooks/useProperties'
import { PhoneInput } from '@/components/common/PhoneInput'
import { isValidPhoneNumber } from 'libphonenumber-js'
import { cn } from '@/lib/utils'

const tenantSchema = z.object({
  tenantType: z.enum(['individual', 'commercial']),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  commercialName: z.string().optional(),
  email: z.string().optional().refine((val) => !val || val.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
    message: 'Invalid email address'
  }),
  phone: z.string().refine((val) => !val || isValidPhoneNumber(val), {
    message: 'Invalid international phone number (e.g. +234...)'
  }),
  otherPhone: z.string().optional().refine((val) => !val || isValidPhoneNumber(val), {
    message: 'Invalid international phone number (e.g. +234...)'
  }),
  // Assignment fields
  unitUuid: z.string().optional(),
  rentAmount: z.string().optional(),
  rentType: z.enum(['Monthly', 'Annually']).optional(),
  rentStartDate: z.string().optional(),
  rentEndDate: z.string().optional(),
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
  const { data: properties = [] } = useProperties()
  const createPropertyMutation = useCreateProperty()
  const bulkCreateUnitsMutation = useBulkCreateUnits()

  const isJoinRequest = mode === 'join-request'

  const [showLeaseFields, setShowLeaseFields] = useState(isJoinRequest || !!initialData?.unitDetails)

  const [assignMode, setAssignMode] = useState<'existing' | 'create'>('existing')
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const [newPropertyName, setNewPropertyName] = useState<string>('')
  const [newPropertyAddress, setNewPropertyAddress] = useState<string>('')
  const [newUnitName, setNewUnitName] = useState<string>('')
  const [isCreatingUnit, setIsCreatingUnit] = useState(false)

  const vacantUnits = units.filter(u => !u.tenant && u.status !== 'MAINTENANCE')

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
      tenantType: 'individual',
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      commercialName: '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      otherPhone: '',
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
  const tenantType = watch('tenantType')

  // Auto-fill unit based on address if possible (only for existing mode)
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

  // Prefill create-unit states if initialData exists
  useEffect(() => {
    if (initialData?.unitDetails) {
      setNewPropertyName(initialData.unitDetails.area || initialData.unitDetails.address || '')
      setNewPropertyAddress(initialData.unitDetails.address || '')
      setNewUnitName(initialData.unitDetails.subarea || '')
    }
  }, [initialData])

  // Default assign mode to create if there are no vacant units
  useEffect(() => {
    if (vacantUnits.length === 0) {
      setAssignMode('create')
    } else {
      setAssignMode('existing')
    }
  }, [vacantUnits.length])

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

  const onSubmit = async (data: TenantFormData) => {
    const { tenantType, unitUuid, rentAmount, rentType, rentStartDate, rentEndDate, ...tenantData } = data

    let email = tenantData.email || ''
    if (!email || email.trim() === '') {
      const cleanFirst = (tenantData.firstName || '').toLowerCase().replace(/[^a-z0-9]/g, '')
      const cleanLast = (tenantData.lastName || '').toLowerCase().replace(/[^a-z0-9]/g, '')
      const cleanComm = (tenantData.commercialName || '').toLowerCase().replace(/[^a-z0-9]/g, '')
      const namePart = tenantType === 'individual' && cleanFirst && cleanLast ? `${cleanFirst}-${cleanLast}` : cleanComm || 'tenant'
      const randomStr = Math.random().toString(36).substring(2, 8)
      email = `guest-${namePart}-${randomStr}@upward.com`
    }

    const tenantPayload = {
      firstName: tenantType === 'individual' ? (tenantData.firstName || '') : '',
      lastName: tenantType === 'individual' ? (tenantData.lastName || '') : '',
      commercialName: tenantType === 'commercial' ? (tenantData.commercialName || '') : '',
      email,
      phone: tenantData.phone,
      otherPhone: tenantData.otherPhone || undefined
    }

    if (showLeaseFields && assignMode === 'create') {
      if (!selectedPropertyId) {
        alert('Please select or create a property')
        return
      }
      if (selectedPropertyId === 'NEW' && !newPropertyName.trim()) {
        alert('Please enter a property name')
        return
      }
      if (!newUnitName.trim()) {
        alert('Please enter a unit name')
        return
      }
      if (!rentAmount || parseFloat(rentAmount) <= 0) {
        alert('Rent amount is required and must be greater than 0')
        return
      }
      if (!rentStartDate || !rentEndDate) {
        alert('Rent start and end dates are required')
        return
      }

      setIsCreatingUnit(true)
      try {
        let propertyUuid = ''
        if (selectedPropertyId === 'NEW') {
          const newProp = await createPropertyMutation.mutateAsync({
            name: newPropertyName.trim(),
            address: newPropertyAddress.trim() || undefined,
          })
          propertyUuid = newProp.uuid
        } else {
          const prop = properties.find(p => p.id === parseInt(selectedPropertyId))
          if (prop) {
            propertyUuid = prop.uuid
          }
        }

        if (!propertyUuid) {
          throw new Error('Property selection failed')
        }

        const createUnitRes = await bulkCreateUnitsMutation.mutateAsync({
          propertyUuid,
          units: [{
            unitName: newUnitName.trim(),
            rentAmount: parseFloat(rentAmount),
            rentType: rentType || 'Annually',
            rentStartDate,
            rentDueDate: rentEndDate,
            status: 'VACANT',
          }]
        })

        const createdUnit = (createUnitRes as any).units?.[0]
        if (!createdUnit) {
          throw new Error('Failed to retrieve newly created unit')
        }

        createTenant.mutate(tenantPayload, {
          onSuccess: (tenant) => {
            assignTenant.mutate({
              tenantUuid: tenant.uuid,
              unitUuid: createdUnit.uuid,
              rentAmount: parseFloat(rentAmount),
              rentType: rentType || 'Annually',
              rentStartDate,
              rentDueDate: rentEndDate,
              rentAmountPaid: 0
            }, {
              onSuccess: () => {
                reset()
                onClose()
              }
            })
          }
        })
      } catch (err: any) {
        alert(err.message || 'Failed to create unit and assign tenant')
      } finally {
        setIsCreatingUnit(false)
      }
    } else {
      createTenant.mutate(tenantPayload, {
        onSuccess: (tenant) => {
          if (showLeaseFields && unitUuid && rentAmount && rentType && rentStartDate && rentEndDate) {
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
  }

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
            {/* Tenant Type Selector */}
            {!isJoinRequest && (
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Tenant Type</label>
                <div style={{ display: 'flex', gap: 12, background: 'var(--ivory-dim)', padding: 4, borderRadius: 12, border: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => setValue('tenantType', 'individual')}
                    style={{
                      flex: 1,
                      padding: '8px 16px',
                      borderRadius: 10,
                      border: 'none',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: tenantType === 'individual' ? 'white' : 'transparent',
                      color: tenantType === 'individual' ? 'var(--dark)' : 'var(--text-muted)',
                      boxShadow: tenantType === 'individual' ? 'var(--shadow-sm)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    Individual Tenant
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue('tenantType', 'commercial')}
                    style={{
                      flex: 1,
                      padding: '8px 16px',
                      borderRadius: 10,
                      border: 'none',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: tenantType === 'commercial' ? 'white' : 'transparent',
                      color: tenantType === 'commercial' ? 'var(--dark)' : 'var(--text-muted)',
                      boxShadow: tenantType === 'commercial' ? 'var(--shadow-sm)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    Commercial Tenant
                  </button>
                </div>
              </div>
            )}

            {tenantType === 'commercial' ? (
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Commercial / Business Name</label>
                <input
                  type="text"
                  className={cn("form-input", errors.commercialName && "form-input--error")}
                  placeholder="e.g. Acme Holdings Ltd"
                  {...register('commercialName')}
                />
                {errors.commercialName && <span className="form-error-text">{errors.commercialName.message}</span>}
              </div>
            ) : (
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
            )}

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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
              <div>
                <Controller
                  name="otherPhone"
                  control={control}
                  render={({ field }) => (
                    <PhoneInput
                      {...field}
                      label="Alternative Phone Number"
                      placeholder="e.g. +234 800 000 0000"
                      error={errors.otherPhone?.message}
                    />
                  )}
                />
              </div>
              <div />
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
                {/* Mode Selector */}
                {vacantUnits.length > 0 && (
                  <div style={{ display: 'flex', gap: 20, marginBottom: 20, paddingBottom: 16, borderBottom: '1px dashed var(--border)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="assignMode"
                        checked={assignMode === 'existing'}
                        onChange={() => setAssignMode('existing')}
                      />
                      Assign to Vacant Unit
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="assignMode"
                        checked={assignMode === 'create'}
                        onChange={() => setAssignMode('create')}
                      />
                      Create New Unit
                    </label>
                  </div>
                )}

                {assignMode === 'existing' && vacantUnits.length > 0 && (
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
                )}

                {assignMode === 'create' && (
                  <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="form-group">
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Building2 size={14} /> Select Property
                      </label>
                      <select
                        className="form-input"
                        value={selectedPropertyId}
                        onChange={(e) => setSelectedPropertyId(e.target.value)}
                        style={{ appearance: 'none' }}
                      >
                        <option value="">-- Select Property --</option>
                        {properties.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                        <option value="NEW">+ Create New Property</option>
                      </select>
                    </div>

                    {selectedPropertyId === 'NEW' && (
                      <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className="form-group">
                          <label className="form-label">Property Name</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. Oakwood Heights"
                            value={newPropertyName}
                            onChange={(e) => setNewPropertyName(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Property Address</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. 12 Park Avenue"
                            value={newPropertyAddress}
                            onChange={(e) => setNewPropertyAddress(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">Unit Name</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Apartment 4B"
                        value={newUnitName}
                        onChange={(e) => setNewUnitName(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {(assignMode === 'create' || (assignMode === 'existing' && vacantUnits.length > 0)) && (
                  <>
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
              disabled={createTenant.isPending || assignTenant.isPending || isCreatingUnit || (!isValid && assignMode === 'existing')}
            >
              {createTenant.isPending || assignTenant.isPending || isCreatingUnit ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  {isJoinRequest
                    ? (selectedUnitUuid || assignMode === 'create' ? <><CheckCircle2 size={18} style={{ marginRight: 8 }} />Approve & Assign Unit</> : <><UserPlus size={18} style={{ marginRight: 8 }} />Approve Request</>)
                    : (selectedUnitUuid || assignMode === 'create' ? <><UserPlus size={18} style={{ marginRight: 8 }} />Add & Assign</> : <><UserPlus size={18} style={{ marginRight: 8 }} />Add Tenant</>)
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
