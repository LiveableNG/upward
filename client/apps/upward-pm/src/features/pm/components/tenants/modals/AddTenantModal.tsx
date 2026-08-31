"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, UserPlus, Loader2, Building2, Calendar, CreditCard, ChevronDown, MapPin, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Modal } from '@/components/ui/Modal/Modal'
import { useTenantActions } from '../../../hooks/useTenants'
import { useUserLookup } from '../../../hooks/useUserLookup'
import { useUnits, useProperties, useCreateProperty, useBulkCreateUnits } from '../../../hooks/useProperties'
import { Property } from '../../../services/propertyService'
import { FormSelect } from '@/components/ui/Select/FormSelect'
import { PhoneInput } from '@/components/common/PhoneInput'
import { isValidPhoneNumber } from 'libphonenumber-js'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/common/Toast'

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
  deliveryChannel: z.enum(['EMAIL', 'SMS', 'WHATSAPP']).optional(),
  // Assignment fields
  unitUuid: z.string().optional(),
  rentAmount: z.string().optional(),
  rentType: z.enum(['Monthly', 'Annually', 'Lease']).optional(),
  leaseYears: z.string().optional(),
  rentStartDate: z.string().optional(),
  rentEndDate: z.string().optional(),
  isFullyPaid: z.boolean().optional(),
  rentAmountPaid: z.string().optional(),
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

  if ((data.unitUuid && data.unitUuid.trim() !== '') || (data.rentAmount && parseFloat(data.rentAmount) > 0)) {
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
    if (data.rentType === 'Lease') {
      if (!data.leaseYears || parseInt(data.leaseYears, 10) < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['leaseYears'],
          message: 'Lease duration must be 1 year or more'
        })
      }
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
    commercialName?: string
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
  const router = useRouter()
  const toast = useToast()
  const { createTenant, assignTenant } = useTenantActions()
  const { data: units = [] } = useUnits()
  const { data: properties = [] } = useProperties()
  const createPropertyMutation = useCreateProperty()
  const bulkCreateUnitsMutation = useBulkCreateUnits()
  const [successData, setSuccessData] = useState<{ tenantUuid: string; unitUuid?: string } | null>(null)

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
      tenantType: initialData?.commercialName ? 'commercial' : 'individual',
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      commercialName: initialData?.commercialName || '',
      email: (initialData?.email && !initialData.email.endsWith('@upward.com')) ? initialData.email : '',
      phone: initialData?.phone || '',
      otherPhone: '',
      deliveryChannel: undefined,
      unitUuid: '',
      rentAmount: initialData?.unitDetails?.rentAmount?.toString() || '',
      rentType: 'Annually',
      leaseYears: '1',
      rentStartDate: initialData?.unitDetails?.rentStartDate
        ? new Date(initialData.unitDetails.rentStartDate).toISOString().split('T')[0]
        : '',
      rentEndDate: initialData?.unitDetails?.rentEndDate
        ? new Date(initialData.unitDetails.rentEndDate).toISOString().split('T')[0]
        : '',
      isFullyPaid: true,
      rentAmountPaid: '0',
    }
  })

  const selectedUnitUuid = watch('unitUuid')
  const rentStartDate = watch('rentStartDate')
  const rentType = watch('rentType')
  const tenantType = watch('tenantType')
  const typedEmail = watch('email')
  const typedPhone = watch('phone')
  const { foundUser } = useUserLookup(typedEmail, typedPhone)

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

  const leaseYears = watch('leaseYears')

  // Auto-calculate End Date if Start Date, Cycle or Lease Years changes
  useEffect(() => {
    if (rentStartDate && rentType) {
      const start = new Date(rentStartDate)
      if (isNaN(start.getTime())) return
      const end = new Date(start)
      if (rentType === 'Monthly') {
        end.setMonth(end.getMonth() + 1)
      } else if (rentType === 'Lease') {
        const years = Math.max(1, parseInt(String(leaseYears || '1'), 10) || 1)
        end.setFullYear(end.getFullYear() + years)
      } else {
        end.setFullYear(end.getFullYear() + 1)
      }
      end.setDate(end.getDate() - 1)
      setValue('rentEndDate', end.toISOString().split('T')[0])
    }
  }, [rentStartDate, rentType, leaseYears, setValue])

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!isOpen || !mounted) return null


  const onSubmit = async (data: TenantFormData) => {
    const { tenantType, unitUuid, rentAmount, rentType, leaseYears, rentStartDate, rentEndDate, isFullyPaid, rentAmountPaid, ...tenantData } = data

    let email = tenantData.email || ''
    if (!email || email.trim() === '') {
      if (isJoinRequest && initialData?.email) {
        email = initialData.email
      } else {
        const cleanFirst = (tenantData.firstName || '').toLowerCase().replace(/[^a-z0-9]/g, '')
        const cleanLast = (tenantData.lastName || '').toLowerCase().replace(/[^a-z0-9]/g, '')
        const cleanComm = (tenantData.commercialName || '').toLowerCase().replace(/[^a-z0-9]/g, '')
        const namePart = tenantType === 'individual' && cleanFirst && cleanLast ? `${cleanFirst}-${cleanLast}` : cleanComm || 'tenant'
        const randomStr = Math.random().toString(36).substring(2, 8)
        email = `guest-${namePart}-${randomStr}@upward.com`
      }
    }

    const tenantPayload = {
      firstName: tenantType === 'individual' ? (tenantData.firstName || '') : '',
      lastName: tenantType === 'individual' ? (tenantData.lastName || '') : '',
      commercialName: tenantType === 'commercial' ? (tenantData.commercialName || '') : '',
      email,
      phone: tenantData.phone,
      otherPhone: tenantData.otherPhone || undefined,
      deliveryChannel: tenantData.deliveryChannel
    }

    if (showLeaseFields && assignMode === 'create') {
      if (!selectedPropertyId) {
        toast.error('Please select or create a property')
        return
      }
      if (selectedPropertyId === 'NEW' && !newPropertyName.trim()) {
        toast.error('Please enter a property name')
        return
      }
      if (!newUnitName.trim()) {
        toast.error('Please enter a unit name')
        return
      }
      if (!rentAmount || parseFloat(rentAmount) <= 0) {
        toast.error('Rent amount is required and must be greater than 0')
        return
      }
      if (!rentStartDate || !rentEndDate) {
        toast.error('Rent start and end dates are required')
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
            rentAmount: parseFloat(rentAmount) || 0,
            rentAmountPaid: isFullyPaid ? (parseFloat(rentAmount) || 0) : (parseFloat(rentAmountPaid || '0') || 0),
            isFullyPaid: !!isFullyPaid,
            rentType: rentType || 'Annually',
            leaseYears: rentType === 'Lease' ? Math.max(1, parseInt(String(leaseYears || '1'), 10) || 1) : undefined,
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
              rentAmount: parseFloat(rentAmount) || 0,
              rentType: rentType || 'Annually',
              rentStartDate,
              rentDueDate: rentEndDate,
              rentAmountPaid: isFullyPaid ? (parseFloat(rentAmount) || 0) : (parseFloat(rentAmountPaid || '0') || 0),
              isFullyPaid: !!isFullyPaid
            }, {
              onSuccess: () => {
                reset()
                setSuccessData({ tenantUuid: tenant.uuid, unitUuid: createdUnit.uuid })
              },
              onError: (err: any) => {
                toast.error(err?.message || 'Failed to assign tenant to unit')
              }
            })
          },
          onError: (err: any) => {
            toast.error(err?.message || 'Failed to create tenant profile')
          }
        })
      } catch (err: any) {
        toast.error(err.message || 'Failed to create unit and assign tenant')
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
              rentAmount: parseFloat(rentAmount) || 0,
              rentType,
              rentStartDate,
              rentDueDate: rentEndDate,
              rentAmountPaid: isFullyPaid ? (parseFloat(rentAmount) || 0) : (parseFloat(rentAmountPaid || '0') || 0),
              isFullyPaid: !!isFullyPaid
            }, {
              onSuccess: () => {
                reset()
                setSuccessData({ tenantUuid: tenant.uuid, unitUuid })
              },
              onError: (err: any) => {
                toast.error(err?.message || 'Failed to assign tenant to unit')
              }
            })
          } else {
            reset()
            setSuccessData({ tenantUuid: tenant.uuid })
          }
        },
        onError: (err: any) => {
          toast.error(err?.message || 'Failed to create tenant profile')
        }
      })
    }
  }

  const ud = initialData?.unitDetails

  // Build a readable location string from the tenant's request
  const requestedLocation = [ud?.address, ud?.area, ud?.state, ud?.country]
    .filter(Boolean).join(', ')

  const modalContent = (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isJoinRequest ? 'Fulfill Tenant Request' : 'Add New Tenant'}
      subtitle={isJoinRequest ? 'Review the tenant\'s connection request and assign them to a unit.' : 'Add a tenant manually and optionally assign them to a unit.'}
      icon={isJoinRequest ? CheckCircle2 : UserPlus}
      maxWidth={620}
      footer={
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          <button type="button" className="btn btn--secondary" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="add-tenant-form"
            className="btn btn--primary"
            style={{ flex: 1 }}
            disabled={createTenant.isPending || assignTenant.isPending || isCreatingUnit}
          >
            {createTenant.isPending || assignTenant.isPending || isCreatingUnit ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                {isJoinRequest
                  ? (showLeaseFields && (selectedUnitUuid || assignMode === 'create') ? <><CheckCircle2 size={18} style={{ marginRight: 8 }} />Approve & Assign Unit</> : <><UserPlus size={18} style={{ marginRight: 8 }} />Approve Request</>)
                  : (showLeaseFields && (selectedUnitUuid || assignMode === 'create') ? <><UserPlus size={18} style={{ marginRight: 8 }} />Add & Assign</> : <><UserPlus size={18} style={{ marginRight: 8 }} />Add Tenant</>)
                }
              </>
            )}
          </button>
        </div>
      }
    >
      <form id="add-tenant-form" onSubmit={handleSubmit(onSubmit, (errors) => {
        const firstErrorKey = Object.keys(errors)[0];
        const firstErrorMessage = (errors as any)[firstErrorKey]?.message || "Please fill in all required fields.";
        toast.error(firstErrorMessage);
      })} className="animate-fade-in">
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

        <div style={{ marginTop: 24 }}>

          {/* ── Tenant Identity Section ── */}
          <div className="form-section-label">
            {isJoinRequest ? 'Tenant Profile (pre-filled from request)' : 'Tenant Details'}
          </div>
          <div className="form-section">
            {/* Tenant Type Selector */}
            {!isJoinRequest && (
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Tenant Type</label>
                <div style={{ display: 'flex', gap: 6, background: 'var(--ivory-dim)', padding: 4, borderRadius: 12, border: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => setValue('tenantType', 'individual')}
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      borderRadius: 10,
                      border: 'none',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: tenantType === 'individual' ? 'white' : 'transparent',
                      color: tenantType === 'individual' ? 'var(--dark)' : 'var(--text-muted)',
                      boxShadow: tenantType === 'individual' ? 'var(--shadow-sm)' : 'none',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue('tenantType', 'commercial')}
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      borderRadius: 10,
                      border: 'none',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: tenantType === 'commercial' ? 'white' : 'transparent',
                      color: tenantType === 'commercial' ? 'var(--dark)' : 'var(--text-muted)',
                      boxShadow: tenantType === 'commercial' ? 'var(--shadow-sm)' : 'none',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Commercial
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 12 }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 12, marginTop: 12 }}>
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

            {/* Silent Search & Smart Suggestion Banner */}
            {foundUser && ((!typedEmail && foundUser.email) || (!typedPhone && foundUser.phone) || (!watch('firstName') && foundUser.firstName) || (!watch('lastName') && foundUser.lastName)) && (
              <div style={{
                marginTop: 12,
                padding: '12px 14px',
                borderRadius: 12,
                background: 'rgba(217, 119, 6, 0.08)',
                border: '1px solid rgba(217, 119, 6, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                fontSize: 13
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#92400e' }}>
                  <Sparkles size={16} style={{ flexShrink: 0, color: '#d97706' }} />
                  <span>
                    Existing Upward account found for <strong>{foundUser.firstName} {foundUser.lastName}</strong>!
                    {typedEmail && foundUser.phone && !typedPhone && ' Autofill their registered phone number?'}
                    {typedPhone && foundUser.email && !typedEmail && ' Autofill their registered email address?'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (foundUser.phone && !typedPhone) {
                      setValue('phone', foundUser.phone, { shouldValidate: true })
                    }
                    if (foundUser.email && !typedEmail) {
                      setValue('email', foundUser.email, { shouldValidate: true })
                    }
                    if (foundUser.firstName && (!watch('firstName') || watch('firstName')?.trim() === '')) {
                      setValue('firstName', foundUser.firstName, { shouldValidate: true })
                    }
                    if (foundUser.lastName && (!watch('lastName') || watch('lastName')?.trim() === '')) {
                      setValue('lastName', foundUser.lastName, { shouldValidate: true })
                    }
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: '#d97706',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                >
                  Autofill Details
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 12, marginTop: 12 }}>
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

            <div style={{ marginTop: 14 }}>
              <label className="form-label" style={{ marginBottom: 8 }}>Preferred Invite Delivery Method</label>
              <div className="delivery-options-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: 8 }}>
                {!(watch('email') || '').endsWith('@upward.com') && (watch('email') || '').trim() !== '' && (
                  <label 
                    className={cn("delivery-option", watch('deliveryChannel') === 'EMAIL' && "delivery-option--active")}
                    style={watch('deliveryChannel') === 'EMAIL' ? { backgroundColor: 'var(--forest)', color: '#ffffff', borderColor: 'var(--forest)' } : {}}
                  >
                    <input
                      type="radio"
                      value="EMAIL"
                      {...register('deliveryChannel')}
                      className="sr-only"
                    />
                    <span>Email</span>
                  </label>
                )}
                <label 
                  className={cn("delivery-option", watch('deliveryChannel') === 'SMS' && "delivery-option--active", !watch('phone') && "delivery-option--disabled")}
                  style={watch('deliveryChannel') === 'SMS' ? { backgroundColor: 'var(--forest)', color: '#ffffff', borderColor: 'var(--forest)' } : {}}
                >
                  <input
                    type="radio"
                    value="SMS"
                    {...register('deliveryChannel')}
                    disabled={!watch('phone')}
                    className="sr-only"
                  />
                  <span>SMS</span>
                </label>
                <label 
                  className={cn("delivery-option", watch('deliveryChannel') === 'WHATSAPP' && "delivery-option--active", !watch('phone') && "delivery-option--disabled")}
                  style={watch('deliveryChannel') === 'WHATSAPP' ? { backgroundColor: 'var(--forest)', color: '#ffffff', borderColor: 'var(--forest)' } : {}}
                >
                  <input
                    type="radio"
                    value="WHATSAPP"
                    {...register('deliveryChannel')}
                    disabled={!watch('phone')}
                    className="sr-only"
                  />
                  <span>WhatsApp</span>
                </label>
              </div>
              {!watch('phone') && (
                <p className="form-error-text" style={{ marginTop: 6, color: 'var(--text-muted)' }}>
                  Phone number is required for SMS/WhatsApp delivery.
                </p>
              )}
            </div>
          </div>

          {/* ── Unit Assignment ── */}
          <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, cursor: 'pointer' }}
              onClick={() => setShowLeaseFields(!showLeaseFields)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div className="icon-box" style={{ background: 'var(--forest-faint)', color: 'var(--forest)', flexShrink: 0 }}>
                  <Building2 size={20} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
                    {isJoinRequest ? 'Assign to Unit' : 'Assign to Unit'}
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0', lineHeight: 1.35 }}>
                    {isJoinRequest
                      ? 'Match tenant to a vacant unit to approve.'
                      : 'Link this tenant to a specific property and unit.'}
                  </p>
                </div>
              </div>
              <ChevronDown size={20} style={{ transform: showLeaseFields ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
            </div>

            {showLeaseFields && (
              <div className="animate-fade-in" style={{ marginTop: 16 }}>
                {/* Mode Selector */}
                {vacantUnits.length > 0 && (
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16, paddingBottom: 14, borderBottom: '1px dashed var(--border)' }}>
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
                    <Controller
                      name="unitUuid"
                      control={control}
                      render={({ field }) => (
                        <FormSelect
                          className={cn(errors.unitUuid && "form-input--error")}
                          value={field.value || ''}
                          onChange={field.onChange}
                          options={vacantUnits.map(u => ({
                            label: `${u.property?.name} — Unit ${u.unitName}${u.property?.address ? ` (${u.property.address})` : ''}`,
                            value: u.uuid
                          }))}
                          placeholder="-- Choose a vacant unit --"
                        />
                      )}
                    />
                    {errors.unitUuid && <span className="form-error-text">{errors.unitUuid.message}</span>}
                  </div>
                )}

                {assignMode === 'create' && (
                  <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="form-group">
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Building2 size={14} /> Select Property
                      </label>
                      <FormSelect
                        value={selectedPropertyId}
                        onChange={setSelectedPropertyId}
                        options={[
                          ...properties.map(p => ({ label: p.name, value: p.id.toString() })),
                          { label: '+ Create New Property', value: 'NEW' }
                        ]}
                        placeholder="-- Select Property --"
                      />
                    </div>

                    {selectedPropertyId === 'NEW' && (
                      <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 12 }}>
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))', gap: 12, marginTop: 14 }}>
                      <div className="form-group">
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
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
                        <Controller
                          name="rentType"
                          control={control}
                          render={({ field }) => (
                            <FormSelect
                              value={field.value || 'Annually'}
                              onChange={field.onChange}
                              options={[
                                { label: 'Annually', value: 'Annually' },
                                { label: 'Monthly', value: 'Monthly' },
                                { label: 'Lease', value: 'Lease' }
                              ]}
                              placeholder="Select Rent Cycle"
                            />
                          )}
                        />
                      </div>
                      {rentType === 'Lease' && (
                        <div className="form-group animate-fade-in">
                          <label className="form-label">Lease (Years)</label>
                          <input
                            type="number"
                            min="1"
                            className={cn("form-input", errors.leaseYears && "form-input--error")}
                            placeholder="e.g. 1"
                            {...register('leaseYears')}
                          />
                          {errors.leaseYears && <span className="form-error-text">{errors.leaseYears.message}</span>}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 12, marginTop: 12 }}>
                      <div className="form-group">
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
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
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
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

                    <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--ivory-dim)', borderRadius: 12, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: watch('isFullyPaid') ? 0 : 10 }}>
                        <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                          <h6 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: 'var(--dark)' }}>Fully Paid for Current Period?</h6>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0', lineHeight: 1.35 }}>Toggle off if the tenant is making a partial payment initially.</p>
                        </div>
                        <label className="toggle-switch" style={{ flexShrink: 0 }}>
                          <input 
                            type="checkbox" 
                            {...register('isFullyPaid')}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>

                      {!watch('isFullyPaid') && (
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: 11 }}>Initial Amount Paid (₦)</label>
                          <input
                            type="number"
                            className="form-input"
                            style={{ fontSize: 13, padding: '10px 14px' }}
                            placeholder="e.g. 500000"
                            {...register('rentAmountPaid')}
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

        </div>
        </form>

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
            border: 1px solid var(--border);
            border-radius: 16px;
            overflow: hidden;
            background: var(--ivory-dim);
          }
          .join-request-card__header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 16px;
            background: var(--surface-hover);
            border-bottom: 1px solid var(--border);
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: var(--text-secondary);
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
            color: var(--dark);
            font-weight: 700;
            font-size: 14px;
          }

          .delivery-option {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 10px 14px;
            border: 1px solid var(--border);
            border-radius: 10px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            color: var(--text-muted);
            transition: all 0.2s;
            background: #fff;
          }
          .delivery-option:hover:not(.delivery-option--disabled) {
            border-color: var(--clay);
            color: var(--clay);
            background: var(--clay-faint);
          }
          .delivery-option--active {
            border-color: var(--forest) !important;
            background: var(--forest) !important;
            color: #fff !important;
          }
          .delivery-option--active:hover:not(.delivery-option--disabled) {
            color: #fff !important;
          }
          .delivery-option--disabled {
            opacity: 0.5;
            cursor: not-allowed;
            background: var(--ivory-dim);
          }
          .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border-width: 0;
          }
        `}</style>
    </Modal>
  )
  
    if (successData) {
      return (
        <Modal
          isOpen={isOpen}
          onClose={() => {
            setSuccessData(null)
            onClose()
          }}
          title="Tenant Onboarding Info"
          subtitle="Step 2 of Onboarding (Optional)"
          icon={CheckCircle2}
          maxWidth={500}
          footer={
            <div style={{ display: 'flex', gap: 12, width: '100%' }}>
              <button
                type="button"
                className="btn btn--secondary"
                style={{ flex: 1 }}
                onClick={() => {
                  setSuccessData(null)
                  onClose()
                }}
              >
                Skip
              </button>
              <button
                type="button"
                className="btn btn--primary"
                style={{ flex: 1 }}
                onClick={() => {
                  const tenantUuid = successData.tenantUuid
                  const unitUuid = successData.unitUuid
                  setSuccessData(null)
                  onClose()
                  router.push(`/documents?tenantUuid=${tenantUuid}${unitUuid ? `&unitUuid=${unitUuid}` : ''}&templateUuid=system-onboarding-1&disableRecipientEdit=true`)
                }}
              >
                Send Welcome Template
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 0', textAlign: 'center', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: '50%', background: 'var(--forest-faint)', color: 'var(--forest)', marginBottom: 8 }}>
              <CheckCircle2 size={32} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--dark)', margin: 0 }}>Tenant Added Successfully!</h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              To begin making payment requests to this tenant, you must first send them the <strong>Welcome system template ("Getting Started")</strong>. This introduces Upward and ensures they can set up their portal.
            </p>
            <div style={{
              background: 'var(--ivory-dim)',
              padding: '12px 16px',
              borderRadius: 12,
              fontSize: 12,
              color: 'var(--clay)',
              borderLeft: '3px solid var(--clay)',
              textAlign: 'left',
              width: '100%',
              fontWeight: 600
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={15} style={{ flexShrink: 0, color: '#d97706' }} />
                <span>Failure to send the Welcome template will block any future payment requests to this tenant.</span>
              </div>
            </div>
          </div>
        </Modal>
      )
    }
  
    return modalContent
  }
