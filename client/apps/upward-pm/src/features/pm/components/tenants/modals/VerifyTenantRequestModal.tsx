"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Building2, 
  Calendar, 
  CreditCard, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  ShieldCheck, 
  Info, 
  Clock, 
  User, 
  Edit3,
  Loader2,
  Sparkles,
  PlusCircle
} from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Modal } from '@/components/ui/Modal/Modal'
import { useTenantActions } from '../../../hooks/useTenants'
import { useUserLookup } from '../../../hooks/useUserLookup'
import { useUnits, useProperties, useCreateProperty, useBulkCreateUnits } from '../../../hooks/useProperties'
import { FormSelect } from '@/components/ui/Select/FormSelect'
import { PhoneInput } from '@/components/common/PhoneInput'
import { isValidPhoneNumber } from 'libphonenumber-js'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/common/Toast'
import { calculateRentEndDate, type LeaseDurationUnit } from '../../../utils/rentalDates'

const verifyRequestSchema = z.object({
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
  // Assignment & confirmation fields
  unitUuid: z.string().optional(),
  rentAmount: z.string().optional(),
  rentType: z.enum(['Monthly', 'Annually', 'Lease']).optional(),
  leaseYears: z.string().optional(),
  leaseUnit: z.enum(['years', 'months', 'weeks', 'days']).optional(),
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

  if (!data.rentAmount || parseFloat(data.rentAmount) <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['rentAmount'],
      message: 'Confirmed rent amount is required and must be greater than 0'
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
})

type VerifyRequestFormData = z.infer<typeof verifyRequestSchema>

export interface VerifyTenantRequestModalProps {
  isOpen: boolean
  onClose: () => void
  initialData: {
    uuid: string
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
      rentType?: 'Monthly' | 'Annually' | 'Lease'
      leaseYears?: string | number
      leaseUnit?: 'years' | 'months' | 'weeks' | 'days'
      rentStartDate?: string
      rentEndDate?: string
    }
    originalDeclaration?: any
    platformActivity?: {
      currentTenure?: {
        rentStartDate?: string
        rentEndDate?: string
        rentAmount?: number
        rentType?: string
        amountPaid?: number
        amountRemaining?: number
        isFirstRent?: boolean
        startDate?: string
        endDate?: string
      }
      platformPayments?: Array<{
        id: number
        uuid: string
        amount: number
        paymentDate: string
        method: string
        status: string
        periodStart?: string
        periodEnd?: string
      }>
      totalPlatformPaid?: number
      settledPeriodsCount?: number
      settledCycles?: number
      activeCyclePaid?: number
      creditScore?: number
    }
    activePaymentRequest?: {
      id?: number
      uuid: string
      amount: number
      amountPaid: number
      amountRemaining: number
      remainingBalance?: number
      dueDate: string
      rentStartDate?: string
      rentEndDate?: string
      status: string
      description?: string
      lineItems?: Array<{
        id: number
        name: string
        totalAmount: number
        amountPaid: number
        status: string
      }>
    }
    paymentDestinationAudit?: {
      isRegisteredPmAccount?: boolean
      bankName?: string | null
      maskedAccountNumber?: string | null
      warningMessage?: string | null
      isDirectToPmAccount?: boolean
      destinationAccount?: string | null
      destinationBank?: string | null
      riskNote?: string | null
    }
  }
}

export const VerifyTenantRequestModal: React.FC<VerifyTenantRequestModalProps> = ({
  isOpen,
  onClose,
  initialData
}) => {
  const router = useRouter()
  const toast = useToast()
  const { createTenant, assignTenant } = useTenantActions()
  const { data: units = [] } = useUnits()
  const { data: properties = [] } = useProperties()
  const createPropertyMutation = useCreateProperty()
  const bulkCreateUnitsMutation = useBulkCreateUnits()
  const [successData, setSuccessData] = useState<{ tenantUuid: string; unitUuid?: string } | null>(null)

  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const [unitSelectMode, setUnitSelectMode] = useState<'existing' | 'create'>('create')
  const [newPropertyName, setNewPropertyName] = useState<string>('')
  const [newPropertyAddress, setNewPropertyAddress] = useState<string>('')
  const [newUnitName, setNewUnitName] = useState<string>('')
  const [isCreatingUnit, setIsCreatingUnit] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentBreakdown, setPaymentBreakdown] = useState<{
    platformAmount?: number;
    offlineAmount?: number;
    platformPaymentIds?: number[];
  }>({})

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors }
  } = useForm<VerifyRequestFormData>({
    mode: 'all',
    resolver: zodResolver(verifyRequestSchema),
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
      rentType: initialData?.unitDetails?.rentType || 'Annually',
      leaseYears: '1',
      leaseUnit: 'years',
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
  const leaseYears = watch('leaseYears')
  const leaseUnit = watch('leaseUnit')
  const tenantType = watch('tenantType')
  const typedEmail = watch('email')
  const typedPhone = watch('phone')
  const { foundUser } = useUserLookup(typedEmail, typedPhone)

  // Filter vacant units for the selected property
  const selectedPropertyVacantUnits = useMemo(() => {
    if (!selectedPropertyId || selectedPropertyId === 'NEW') return []
    const propId = parseInt(selectedPropertyId)
    return units.filter(u => u.propertyId === propId && !u.tenant && u.status !== 'MAINTENANCE')
  }, [units, selectedPropertyId])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && initialData) {
      const liveTenure = initialData.platformActivity?.currentTenure
      const rawStart = liveTenure?.startDate || (liveTenure as any)?.rentStartDate || initialData?.unitDetails?.rentStartDate
      const start = rawStart ? new Date(rawStart).toISOString().split('T')[0] : ''
      
      const cycle = (liveTenure as any)?.rentType || initialData?.unitDetails?.rentType || 'Annually'
      const rawEnd = liveTenure?.endDate || (liveTenure as any)?.rentEndDate || initialData?.unitDetails?.rentEndDate
      const declaredEnd = rawEnd ? new Date(rawEnd).toISOString().split('T')[0] : ''
      const computedEnd = calculateRentEndDate(start, cycle, '1', 'years')

      const defaultRent = initialData?.unitDetails?.rentAmount || ''
      const settledCount = initialData.platformActivity?.settledPeriodsCount ?? initialData.platformActivity?.settledCycles ?? 0
      const cyclePaid = initialData.platformActivity?.activeCyclePaid ?? initialData.platformActivity?.currentTenure?.amountPaid ?? (settledCount === 0 ? initialData.platformActivity?.totalPlatformPaid : 0) ?? 0
      const isFull = cyclePaid >= Number(defaultRent) && Number(defaultRent) > 0

      if (cyclePaid > 0) {
        setPaymentBreakdown({
          platformAmount: cyclePaid,
          offlineAmount: 0,
        })
      }

      reset({
        tenantType: initialData?.commercialName ? 'commercial' : 'individual',
        firstName: initialData?.firstName || '',
        lastName: initialData?.lastName || '',
        commercialName: initialData?.commercialName || '',
        email: (initialData?.email && !initialData.email.endsWith('@upward.com')) ? initialData.email : '',
        phone: initialData?.phone || '',
        otherPhone: '',
        deliveryChannel: undefined,
        unitUuid: '',
        rentAmount: defaultRent ? defaultRent.toString() : '',
        rentType: cycle,
        leaseYears: '1',
        leaseUnit: 'years',
        rentStartDate: start,
        rentEndDate: declaredEnd || computedEnd,
        isFullyPaid: isFull,
        rentAmountPaid: cyclePaid > 0 ? cyclePaid.toString() : '0',
      })

      // Prefill new property inputs from request
      setNewPropertyName(initialData.unitDetails?.address || initialData.unitDetails?.area || '')
      setNewPropertyAddress(initialData.unitDetails?.address || '')
      setNewUnitName(initialData.unitDetails?.subarea || 'Unit 1')
    }
  }, [isOpen, initialData, reset])

  // Intelligently auto-match property when properties load
  useEffect(() => {
    if (isOpen && properties.length > 0 && initialData?.unitDetails) {
      const requestedAddr = (initialData.unitDetails.address || '').toLowerCase().trim()
      const requestedArea = (initialData.unitDetails.area || '').toLowerCase().trim()

      const matchingProp = properties.find(p => {
        const pName = (p.name || '').toLowerCase().trim()
        const pAddr = (p.address || '').toLowerCase().trim()
        return (
          (requestedAddr && (requestedAddr === pAddr || requestedAddr.includes(pAddr) || pAddr.includes(requestedAddr))) ||
          (requestedAddr && (requestedAddr === pName || requestedAddr.includes(pName) || pName.includes(requestedAddr))) ||
          (requestedArea && (requestedArea === pName || requestedArea.includes(pName) || pName.includes(requestedArea)))
        )
      })

      if (matchingProp) {
        setSelectedPropertyId(matchingProp.id.toString())
      } else {
        setSelectedPropertyId('NEW')
      }
    } else if (isOpen && properties.length === 0) {
      setSelectedPropertyId('NEW')
    }
  }, [isOpen, properties, initialData])

  // When selected property changes, determine unit selection or creation mode
  useEffect(() => {
    if (selectedPropertyId === 'NEW') {
      setUnitSelectMode('create')
      setValue('unitUuid', '')
    } else if (selectedPropertyId) {
      if (selectedPropertyVacantUnits.length > 0) {
        setUnitSelectMode('existing')
        const requestedSubarea = (initialData?.unitDetails?.subarea || '').toLowerCase().trim()
        const matchingUnit = requestedSubarea
          ? selectedPropertyVacantUnits.find(u => (u.unitName || '').toLowerCase().trim().includes(requestedSubarea))
          : null
        setValue('unitUuid', matchingUnit ? matchingUnit.uuid : selectedPropertyVacantUnits[0].uuid)
      } else {
        setUnitSelectMode('create')
        setValue('unitUuid', '')
        if (!newUnitName) {
          setNewUnitName(initialData?.unitDetails?.subarea || 'Unit 1')
        }
      }
    }
  }, [selectedPropertyId, selectedPropertyVacantUnits, initialData, setValue, newUnitName])

  // Auto-calculate End Date
  useEffect(() => {
    if (rentStartDate && rentType) {
      const computed = calculateRentEndDate(
        rentStartDate,
        rentType,
        leaseYears || '1',
        (leaseUnit as LeaseDurationUnit) || 'years'
      )
      if (computed) {
        setValue('rentEndDate', computed, { shouldValidate: true })
      }
    }
  }, [rentStartDate, rentType, leaseYears, leaseUnit, setValue])

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!isOpen || !mounted) return null

  const onSubmit = async (data: VerifyRequestFormData) => {
    const { tenantType, unitUuid, rentAmount, rentType, leaseYears, rentStartDate, rentEndDate, isFullyPaid, rentAmountPaid, ...tenantData } = data

    let email = tenantData.email || ''
    if (!email || email.trim() === '') {
      if (initialData?.email) {
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

    const effectiveAcknowledged = isFullyPaid ? (parseFloat(rentAmount || '0') || 0) : (parseFloat(rentAmountPaid || '0') || 0)

    if (selectedPropertyId === 'NEW' || unitSelectMode === 'create') {
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

        setIsSubmitting(true)
        const createUnitRes = await bulkCreateUnitsMutation.mutateAsync({
          propertyUuid,
          units: [{
            unitName: newUnitName.trim(),
            rentAmount: parseFloat(rentAmount || '0') || 0,
            rentAmountPaid: 0,
            isFullyPaid: false,
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
              joinRequestUuid: initialData.uuid,
              rentAmount: parseFloat(rentAmount || '0') || 0,
              rentType: rentType || 'Annually',
              rentStartDate,
              rentDueDate: rentEndDate,
              rentAmountPaid: effectiveAcknowledged,
              pmAcknowledgedAmountPaid: effectiveAcknowledged,
              isFullyPaid: !!isFullyPaid,
              breakdown: paymentBreakdown,
            }, {
              onSuccess: () => {
                reset()
                setIsSubmitting(false)
                setSuccessData({ tenantUuid: tenant.uuid, unitUuid: createdUnit.uuid })
              },
              onError: (err: any) => {
                setIsSubmitting(false)
                toast.error(err?.message || 'Failed to assign tenant to unit')
              }
            })
          },
          onError: (err: any) => {
            setIsSubmitting(false)
            toast.error(err?.message || 'Failed to create tenant profile')
          }
        })
      } catch (err: any) {
        setIsSubmitting(false)
        toast.error(err.message || 'Failed to create unit and assign tenant')
      } finally {
        setIsCreatingUnit(false)
      }
    } else {
      if (!unitUuid) {
        toast.error('Please select a unit to assign')
        return
      }

      setIsSubmitting(true)
      createTenant.mutate(tenantPayload, {
        onSuccess: (tenant) => {
          assignTenant.mutate({
            tenantUuid: tenant.uuid,
            unitUuid,
            joinRequestUuid: initialData.uuid,
            rentAmount: parseFloat(rentAmount || '0') || 0,
            rentType: rentType || 'Annually',
            rentStartDate,
            rentDueDate: rentEndDate,
            rentAmountPaid: effectiveAcknowledged,
            pmAcknowledgedAmountPaid: effectiveAcknowledged,
            isFullyPaid: !!isFullyPaid,
            breakdown: paymentBreakdown,
          }, {
            onSuccess: () => {
              reset()
              setIsSubmitting(false)
              setSuccessData({ tenantUuid: tenant.uuid, unitUuid })
            },
            onError: (err: any) => {
              setIsSubmitting(false)
              toast.error(err?.message || 'Failed to assign tenant to unit')
            }
          })
        },
        onError: (err: any) => {
          setIsSubmitting(false)
          toast.error(err?.message || 'Failed to create tenant profile')
        }
      })
    }
  }

  const ud = initialData.unitDetails
  const requestedLocation = [ud?.address, ud?.area, ud?.state, ud?.country]
    .filter(Boolean).join(', ')

  const renderTenantIdentityFields = () => (
    <div className="form-section">
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
              readOnly={!!initialData?.firstName && !isEditingProfile}
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
              readOnly={!!initialData?.lastName && !isEditingProfile}
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
            readOnly={!!initialData?.email && !isEditingProfile}
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
          background: 'var(--forest-faint)',
          border: '1px solid rgba(22, 101, 52, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          fontSize: 13
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--forest)' }}>
            <Sparkles size={16} style={{ flexShrink: 0 }} />
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
            className="btn btn--primary"
            style={{
              padding: '6px 12px',
              fontSize: 12,
              whiteSpace: 'nowrap'
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
      </div>
    </div>
  )

  const renderUnitAssignmentFields = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 1. Property Selection */}
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Building2 size={14} /> Select Property
          </span>
          {selectedPropertyId === 'NEW' && (
            <span style={{ fontSize: 11, color: 'var(--forest)', fontWeight: 600 }}>Creating New Property</span>
          )}
        </label>
        <FormSelect
          value={selectedPropertyId}
          onChange={(val) => {
            setSelectedPropertyId(val)
          }}
          options={[
            ...properties.map(p => ({ label: `${p.name}${p.address ? ` (${p.address})` : ''}`, value: p.id.toString() })),
            { label: '+ Create New Property', value: 'NEW' }
          ]}
          placeholder="-- Select Property --"
        />
      </div>

      {/* 2. When Creating a New Property */}
      {selectedPropertyId === 'NEW' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--ivory-dim)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Property Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Oakwood Heights"
                value={newPropertyName}
                onChange={(e) => setNewPropertyName(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
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
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Unit Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Flat 1 or Apartment 4B"
              value={newUnitName}
              onChange={(e) => setNewUnitName(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* 3. When an Existing Property is Selected */}
      {selectedPropertyId && selectedPropertyId !== 'NEW' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {selectedPropertyVacantUnits.length > 0 ? (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Building2 size={14} /> Select Unit
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (unitSelectMode === 'existing') {
                      setUnitSelectMode('create')
                      setValue('unitUuid', '')
                    } else {
                      setUnitSelectMode('existing')
                      setValue('unitUuid', selectedPropertyVacantUnits[0]?.uuid || '')
                    }
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: 12,
                    color: 'var(--forest)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  {unitSelectMode === 'existing' ? <><PlusCircle size={13} /> Add New Unit Instead</> : '← Select Existing Vacant Unit'}
                </button>
              </div>

              {unitSelectMode === 'existing' ? (
                <Controller
                  name="unitUuid"
                  control={control}
                  render={({ field }) => (
                    <FormSelect
                      className={cn(errors.unitUuid && "form-input--error")}
                      value={field.value || ''}
                      onChange={field.onChange}
                      options={selectedPropertyVacantUnits.map(u => ({
                        label: `Unit ${u.unitName} (Vacant)`,
                        value: u.uuid
                      }))}
                      placeholder="-- Select a vacant unit --"
                    />
                  )}
                />
              ) : (
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Flat 2 or Apartment 4B"
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                />
              )}
              {errors.unitUuid && unitSelectMode === 'existing' && <span className="form-error-text">{errors.unitUuid.message}</span>}
            </div>
          ) : (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label className="form-label" style={{ margin: 0 }}>Unit Name (No vacant units currently exist)</label>
              </div>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Flat 1 or Apartment 4B"
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
              />
            </div>
          )}
        </div>
      )}

      {/* 4. Confirmed Rent Terms & Cycle */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))', gap: 12, marginTop: 4 }}>
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
            <CreditCard size={14} /> Confirmed Rent (₦)
          </label>
          <input
            type="number"
            className={cn("form-input", errors.rentAmount && "form-input--error")}
            placeholder="e.g. 650000"
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
            <label className="form-label">Lease Duration</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 6 }}>
              <input
                type="number"
                min="1"
                className={cn("form-input", errors.leaseYears && "form-input--error")}
                placeholder="1"
                {...register('leaseYears')}
              />
              <Controller
                name="leaseUnit"
                control={control}
                render={({ field }) => (
                  <FormSelect
                    value={field.value || 'years'}
                    onChange={field.onChange}
                    options={[
                      { label: 'Years', value: 'years' },
                      { label: 'Months', value: 'months' },
                      { label: 'Weeks', value: 'weeks' },
                      { label: 'Days', value: 'days' }
                    ]}
                    placeholder="Unit"
                  />
                )}
              />
            </div>
            {errors.leaseYears && <span className="form-error-text">{errors.leaseYears.message}</span>}
          </div>
        )}
      </div>

      {/* 5. Tenancy Dates */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 12, marginTop: 4 }}>
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
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', whiteSpace: 'nowrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={14} /> End Date</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 600 }}>
              <Lock size={10} /> Auto
            </span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="date"
              readOnly
              disabled
              className={cn("form-input", errors.rentEndDate && "form-input--error")}
              style={{ backgroundColor: 'var(--ivory-dim)', borderColor: 'var(--border)', cursor: 'not-allowed', color: 'var(--dark)' }}
              {...register('rentEndDate')}
            />
          </div>
          {errors.rentEndDate && <span className="form-error-text">{errors.rentEndDate.message}</span>}
        </div>
      </div>

      {/* 6. Payment Reconciliation Card */}
      <div style={{ marginTop: 8, padding: '12px 14px', background: 'var(--ivory-dim)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label className="form-label" style={{ fontSize: 11, margin: 0 }}>PM Acknowledged Amount Paid (₦)</label>
                {(() => {
                  const platformCyclePaid = initialData?.platformActivity?.activeCyclePaid ?? initialData?.platformActivity?.currentTenure?.amountPaid;
                  if (!platformCyclePaid || platformCyclePaid <= 0) return null;
                  return (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => setValue('rentAmountPaid', String(platformCyclePaid))}
                        className="quick-chip"
                      >
                        Credit Platform Paid (₦{platformCyclePaid.toLocaleString()})
                      </button>
                      <button
                        type="button"
                        onClick={() => setValue('rentAmountPaid', '0')}
                        className="quick-chip quick-chip--muted"
                      >
                        Set ₦0
                      </button>
                    </div>
                  );
                })()}
              </div>
              <input
                type="number"
                className="form-input"
                style={{ fontSize: 13, padding: '9px 12px' }}
                placeholder="e.g. 500000"
                {...register('rentAmountPaid')}
              />
            </div>

            {(() => {
              const totalRent = parseFloat(watch('rentAmount') || '0') || 0;
              const ackPaid = parseFloat(watch('rentAmountPaid') || '0') || 0;
              const balanceToBill = Math.max(0, totalRent - ackPaid);
              const isOverpaid = ackPaid > totalRent;

              return (
                <div style={{ padding: '10px 12px', background: 'white', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Agreed Rent:</span>
                    <span style={{ fontWeight: 600 }}>₦{totalRent.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-muted)' }}>PM Acknowledged:</span>
                    <span style={{ fontWeight: 600, color: 'var(--forest)' }}>- ₦{ackPaid.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px dashed var(--border)', fontWeight: 700 }}>
                    <span>Remaining Balance to Bill Tenant:</span>
                    <span style={{ color: isOverpaid ? 'var(--error)' : 'var(--dark)' }}>
                      ₦{balanceToBill.toLocaleString()}
                    </span>
                  </div>

                  {isOverpaid ? (
                    <div style={{ marginTop: 6, fontSize: 11, color: 'var(--error)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertTriangle size={12} />
                      <span>Acknowledged paid amount cannot exceed total agreed rent.</span>
                    </div>
                  ) : balanceToBill > 0 ? (
                    <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Info size={12} />
                      <span>An authoritative balance invoice for ₦{balanceToBill.toLocaleString()} will be issued to the tenant.</span>
                    </div>
                  ) : (
                    <div style={{ marginTop: 6, fontSize: 11, color: 'var(--forest)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={12} />
                      <span>Full rent acknowledged. No outstanding payment request will be created.</span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
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
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--dark)', margin: 0 }}>Tenant Request Verified!</h3>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
            The tenant has been assigned and verified for this unit. You can send them the <strong>Welcome system template (&quot;Getting Started&quot;)</strong> to ensure they get full portal access.
          </p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Fulfill Tenant Request"
      subtitle="Review the tenant's connection request and assign them to a unit."
      icon={CheckCircle2}
      maxWidth={660}
      footer={
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          <button type="button" className="btn btn--secondary" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="verify-tenant-request-form"
            className="btn btn--primary"
            style={{ flex: 1 }}
            disabled={createTenant.isPending || assignTenant.isPending || isCreatingUnit || isSubmitting}
          >
            {createTenant.isPending || assignTenant.isPending || isCreatingUnit || isSubmitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <CheckCircle2 size={18} style={{ marginRight: 8 }} />
                Approve & Assign Unit
              </>
            )}
          </button>
        </div>
      }
    >
      <form id="verify-tenant-request-form" onSubmit={handleSubmit(onSubmit, (formErrors) => {
        const firstErrorKey = Object.keys(formErrors)[0];
        const firstErrorMessage = (formErrors as any)[firstErrorKey]?.message || "Please fill in all required fields.";
        toast.error(firstErrorMessage);
      })} className="animate-fade-in">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 12 }}>
          {/* 1. Tenancy Overview Card */}
          <div className="tenancy-overview-card">
            <div className="tenancy-overview-card__header">
              <div className="tenancy-overview-card__location">
                <MapPin size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span className="tenancy-overview-card__address">
                  {requestedLocation || 'Location not specified in request'}
                </span>
              </div>
              {initialData?.paymentDestinationAudit && (
                <div>
                  {(initialData.paymentDestinationAudit.isRegisteredPmAccount ?? initialData.paymentDestinationAudit.isDirectToPmAccount) ? (
                    <span className="tenancy-overview-card__pill tenancy-overview-card__pill--verified" title="Funds deposited to verified PM account">
                      <ShieldCheck size={13} style={{ flexShrink: 0 }} />
                      <span>
                        Verified PM Account {initialData.paymentDestinationAudit.maskedAccountNumber || initialData.paymentDestinationAudit.destinationAccount ? `(${initialData.paymentDestinationAudit.maskedAccountNumber || initialData.paymentDestinationAudit.destinationAccount} • ${initialData.paymentDestinationAudit.bankName || initialData.paymentDestinationAudit.destinationBank})` : ''}
                      </span>
                    </span>
                  ) : (
                    <span className="tenancy-overview-card__pill tenancy-overview-card__pill--warning" title="Warning: External account detected">
                      <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                      <span>External Account Detected</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="tenancy-overview-card__grid">
              {/* Column 1: Onboarding Request */}
              <div className="tenancy-overview-card__col">
                <div className="tenancy-overview-card__col-title">
                  <Clock size={12} />
                  <span>Onboarding Request</span>
                </div>
                <div className="tenancy-overview-card__stat">
                  <span className="tenancy-overview-card__stat-label">Agreed Rent</span>
                  <span className="tenancy-overview-card__stat-val">
                    ₦{(initialData?.originalDeclaration?.rentAmount || ud?.rentAmount || 0).toLocaleString()}
                  </span>
                </div>
                <div className="tenancy-overview-card__stat">
                  <span className="tenancy-overview-card__stat-label">Initial Period</span>
                  <span className="tenancy-overview-card__stat-val tenancy-overview-card__stat-val--muted">
                    {(initialData?.originalDeclaration?.rentStartDate || ud?.rentStartDate) ? (
                      <>
                        {new Date(initialData?.originalDeclaration?.rentStartDate || ud?.rentStartDate!).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' → '}
                        {new Date(initialData?.originalDeclaration?.rentEndDate || ud?.rentEndDate!).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </>
                    ) : '—'}
                  </span>
                </div>
              </div>

              <div className="tenancy-overview-card__divider" />

              {/* Column 2: Upward Pay Live Activity */}
              <div className="tenancy-overview-card__col">
                <div className="tenancy-overview-card__col-header">
                  <div className="tenancy-overview-card__col-title">
                    <CreditCard size={12} />
                    <span>Live on Upward Pay</span>
                  </div>
                  {initialData?.platformActivity?.creditScore !== undefined && (
                    <span className="tenancy-overview-card__score">
                      Score: {initialData.platformActivity.creditScore}
                    </span>
                  )}
                </div>
                <div className="tenancy-overview-card__stat">
                  <span className="tenancy-overview-card__stat-label">Current Live Cycle</span>
                  <span className="tenancy-overview-card__stat-val tenancy-overview-card__stat-val--forest">
                    {(initialData?.platformActivity?.currentTenure?.rentStartDate || initialData?.platformActivity?.currentTenure?.startDate) 
                      ? new Date(initialData.platformActivity.currentTenure.rentStartDate || initialData.platformActivity.currentTenure.startDate!).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) 
                      : 'N/A'}
                    {' → '}
                    {(initialData?.platformActivity?.currentTenure?.rentEndDate || initialData?.platformActivity?.currentTenure?.endDate) 
                      ? new Date(initialData.platformActivity.currentTenure.rentEndDate || initialData.platformActivity.currentTenure.endDate!).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) 
                      : 'N/A'}
                  </span>
                </div>
                <div className="tenancy-overview-card__stat">
                  <span className="tenancy-overview-card__stat-label">Paid to Date</span>
                  <span className="tenancy-overview-card__stat-val">
                    <strong style={{ color: 'var(--forest)' }}>
                      ₦{(initialData?.platformActivity?.activeCyclePaid ?? initialData?.platformActivity?.currentTenure?.amountPaid ?? 0).toLocaleString()}
                    </strong>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>
                      (₦{(initialData?.platformActivity?.totalPlatformPaid || 0).toLocaleString()} total)
                    </span>
                  </span>
                </div>
                {initialData?.activePaymentRequest && (
                  <div className="tenancy-overview-card__stat">
                    <span className="tenancy-overview-card__stat-label">Active Invoice</span>
                    <span className="tenancy-overview-card__stat-val" style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
                      ₦{(initialData.activePaymentRequest.amountRemaining ?? initialData.activePaymentRequest.remainingBalance ?? 0).toLocaleString()} remaining ({initialData.activePaymentRequest.status})
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. Primary Action: Match Unit & Confirm Terms */}
          <div>
            <div className="section-header-compact">
              <Building2 size={16} style={{ color: 'var(--forest)' }} />
              <span>1. Match Unit & Confirm Rent Terms</span>
            </div>
            {renderUnitAssignmentFields()}
          </div>

          {/* 3. Secondary: Tenant Profile */}
          <div style={{ paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div className="section-header-compact" style={{ margin: 0 }}>
                <User size={16} style={{ color: 'var(--forest)' }} />
                <span>2. Tenant Information</span>
              </div>
              <button
                type="button"
                className="tenant-profile-card__btn"
                onClick={() => setIsEditingProfile(!isEditingProfile)}
              >
                <Edit3 size={12} />
                <span>{isEditingProfile ? 'Done Editing' : 'Edit Details'}</span>
              </button>
            </div>

            {!isEditingProfile && (
              <div className="tenant-profile-card">
                <div className="tenant-profile-card__left">
                  <div className="tenant-profile-card__avatar">
                    <User size={15} />
                  </div>
                  <div>
                    <div className="tenant-profile-card__name">
                      {watch('tenantType') === 'commercial'
                        ? (watch('commercialName') || 'Commercial Tenant')
                        : `${watch('firstName') || ''} ${watch('lastName') || ''}`.trim() || 'Individual Tenant'}
                    </div>
                    <div className="tenant-profile-card__meta">
                      {watch('email') && <span>{watch('email')}</span>}
                      {watch('email') && watch('phone') && <span>•</span>}
                      {watch('phone') && <span>{watch('phone')}</span>}
                      {watch('deliveryChannel') && <span>• Delivery: {watch('deliveryChannel')}</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: isEditingProfile ? 'block' : 'none', marginTop: 10 }}>
              {renderTenantIdentityFields()}
            </div>
          </div>
        </div>
      </form>

      <style jsx>{`
        :global(.upward-modal__icon) {
          background: var(--forest-faint) !important;
          color: var(--forest) !important;
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

        /* Tenancy Overview Card */
        .tenancy-overview-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-sm);
          overflow: hidden;
        }
        .tenancy-overview-card__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 14px;
          background: var(--ivory);
          border-bottom: 1px solid var(--border);
          flex-wrap: wrap;
        }
        .tenancy-overview-card__location {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: var(--dark);
          min-width: 0;
        }
        .tenancy-overview-card__address {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .tenancy-overview-card__pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: var(--radius-full);
          white-space: nowrap;
        }
        .tenancy-overview-card__pill--verified {
          background: var(--forest-faint);
          color: var(--forest);
          border: 1px solid rgba(22, 101, 52, 0.15);
        }
        .tenancy-overview-card__pill--warning {
          background: #fffbeb;
          color: #b45309;
          border: 1px solid #fef3c7;
        }
        .tenancy-overview-card__grid {
          display: grid;
          grid-template-columns: 1fr 1px 1.15fr;
          padding: 12px 14px;
          gap: 14px;
          align-items: start;
        }
        @media (max-width: 600px) {
          .tenancy-overview-card__grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .tenancy-overview-card__divider {
            display: none;
          }
        }
        .tenancy-overview-card__divider {
          background: var(--border);
          height: 100%;
        }
        .tenancy-overview-card__col {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .tenancy-overview-card__col-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .tenancy-overview-card__col-title {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-muted);
        }
        .tenancy-overview-card__score {
          font-size: 10px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 6px;
          background: var(--ivory-dim);
          color: var(--text-secondary);
        }
        .tenancy-overview-card__stat {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          font-size: 12px;
        }
        .tenancy-overview-card__stat-label {
          color: var(--text-muted);
          font-weight: 500;
          white-space: nowrap;
        }
        .tenancy-overview-card__stat-val {
          font-weight: 600;
          color: var(--dark);
          text-align: right;
        }
        .tenancy-overview-card__stat-val--muted {
          font-size: 11px;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .tenancy-overview-card__stat-val--forest {
          color: var(--forest);
          font-weight: 600;
        }

        /* Section Header Compact */
        .section-header-compact {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          color: var(--dark);
          margin-bottom: 10px;
        }

        /* Tenant Profile Card */
        .tenant-profile-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: var(--ivory);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
        }
        .tenant-profile-card__left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .tenant-profile-card__avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--ivory-dim);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--forest);
          flex-shrink: 0;
        }
        .tenant-profile-card__name {
          font-size: 13px;
          font-weight: 600;
          color: var(--dark);
          line-height: 1.2;
        }
        .tenant-profile-card__meta {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .tenant-profile-card__btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 5px 10px;
          font-size: 11px;
          font-weight: 600;
          background: white;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .tenant-profile-card__btn:hover {
          background: var(--ivory-dim);
          color: var(--dark);
          border-color: var(--border-strong);
        }
        .tenant-profile-card__btn:active {
          transform: scale(0.97);
        }

        /* Quick Action Chips */
        .quick-chip {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 6px;
          background: white;
          border: 1px solid var(--border);
          color: var(--forest);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .quick-chip:hover {
          background: var(--forest-faint);
          border-color: rgba(22, 101, 52, 0.2);
        }
        .quick-chip:active {
          transform: scale(0.97);
        }
        .quick-chip--muted {
          color: var(--text-muted);
        }
        .quick-chip--muted:hover {
          background: var(--ivory-dim);
          color: var(--text-secondary);
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
          border-color: var(--forest);
          color: var(--forest);
          background: var(--forest-faint);
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
}
