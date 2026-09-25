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
  Loader2,
  Sparkles,
  PlusCircle,
  Mail,
  MessageSquare,
  Smartphone
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
      deliveryChannel: initialData?.email ? 'EMAIL' : initialData?.phone ? 'SMS' : undefined,
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
  const deliveryChannel = watch('deliveryChannel')
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
        deliveryChannel: initialData?.email ? 'EMAIL' : initialData?.phone ? 'SMS' : undefined,
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
      setIsSubmitting(true)
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

        const tenant = await createTenant.mutateAsync({ ...tenantPayload, suppressToast: true })
        await assignTenant.mutateAsync({
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
        })

        reset()
        setSuccessData({ tenantUuid: tenant.uuid, unitUuid: createdUnit.uuid })
      } catch (err: any) {
        toast.error(err?.message || 'Failed to create unit and assign tenant')
      } finally {
        setIsCreatingUnit(false)
        setIsSubmitting(false)
      }
    } else {
      if (!unitUuid) {
        toast.error('Please select a unit to assign')
        return
      }

      setIsSubmitting(true)
      try {
        const tenant = await createTenant.mutateAsync({ ...tenantPayload, suppressToast: true })
        await assignTenant.mutateAsync({
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
        })

        reset()
        setSuccessData({ tenantUuid: tenant.uuid, unitUuid })
      } catch (err: any) {
        toast.error(err?.message || 'Failed to assign tenant to unit')
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const ud = initialData.unitDetails
  const requestedLocation = [ud?.address, ud?.area, ud?.state, ud?.country]
    .filter(Boolean).join(', ')

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
      maxWidth={680}
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
      })} className="animate-fade-in verify-form">
        
        {/* ── CARD 1: Tenancy Intelligence Summary ── */}
        <section className="apple-card">
          <div className="apple-card__header">
            <div className="apple-card__location">
              <MapPin size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <span className="apple-card__location-text">
                {requestedLocation || 'Location not specified in request'}
              </span>
            </div>
            {initialData?.paymentDestinationAudit && (
              <div>
                {(initialData.paymentDestinationAudit.isRegisteredPmAccount ?? initialData.paymentDestinationAudit.isDirectToPmAccount) ? (
                  <span className="apple-pill apple-pill--verified" title="Funds deposited to verified PM account">
                    <ShieldCheck size={13} style={{ flexShrink: 0 }} />
                    <span>
                      Verified PM Payout Account {initialData.paymentDestinationAudit.maskedAccountNumber || initialData.paymentDestinationAudit.destinationAccount ? `(${initialData.paymentDestinationAudit.maskedAccountNumber || initialData.paymentDestinationAudit.destinationAccount})` : ''}
                    </span>
                  </span>
                ) : (
                  <span className="apple-pill apple-pill--warning" title="Warning: External account detected">
                    <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                    <span>External Account Detected</span>
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="apple-card__grid">
            <div className="apple-card__col">
              <div className="apple-card__col-title">
                <Clock size={13} />
                <span>Onboarding Request</span>
              </div>
              <div className="apple-card__stat-row">
                <span className="apple-card__stat-label">Claimed Rent:</span>
                <span className="apple-card__stat-val">
                  ₦{(initialData?.originalDeclaration?.rentAmount || ud?.rentAmount || 0).toLocaleString()}
                </span>
              </div>
              <div className="apple-card__stat-row">
                <span className="apple-card__stat-label">Initial Period:</span>
                <span className="apple-card__stat-val apple-card__stat-val--muted">
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

            <div className="apple-card__divider" />

            <div className="apple-card__col">
              <div className="apple-card__col-title">
                <CreditCard size={13} />
                <span>Live Upward Pay History</span>
                {initialData?.platformActivity?.creditScore !== undefined && (
                  <span className="apple-score-badge">
                    Score: {initialData.platformActivity.creditScore}
                  </span>
                )}
              </div>
              <div className="apple-card__stat-row">
                <span className="apple-card__stat-label">Live Period:</span>
                <span className="apple-card__stat-val apple-card__stat-val--forest">
                  {(initialData?.platformActivity?.currentTenure?.rentStartDate || initialData?.platformActivity?.currentTenure?.startDate) 
                    ? new Date(initialData.platformActivity.currentTenure.rentStartDate || initialData.platformActivity.currentTenure.startDate!).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) 
                    : 'N/A'}
                  {' → '}
                  {(initialData?.platformActivity?.currentTenure?.rentEndDate || initialData?.platformActivity?.currentTenure?.endDate) 
                    ? new Date(initialData.platformActivity.currentTenure.rentEndDate || initialData.platformActivity.currentTenure.endDate!).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) 
                    : 'N/A'}
                </span>
              </div>
              <div className="apple-card__stat-row">
                <span className="apple-card__stat-label">Paid to Date:</span>
                <span className="apple-card__stat-val">
                  <strong style={{ color: 'var(--forest)' }}>
                    ₦{(initialData?.platformActivity?.activeCyclePaid ?? initialData?.platformActivity?.currentTenure?.amountPaid ?? 0).toLocaleString()}
                  </strong>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>
                    (₦{(initialData?.platformActivity?.totalPlatformPaid || 0).toLocaleString()} total)
                  </span>
                </span>
              </div>
              {initialData?.activePaymentRequest && (
                <div className="apple-card__stat-row">
                  <span className="apple-card__stat-label">Active Invoice:</span>
                  <span className="apple-card__stat-val" style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
                    ₦{(initialData.activePaymentRequest.amountRemaining ?? initialData.activePaymentRequest.remainingBalance ?? 0).toLocaleString()} ({initialData.activePaymentRequest.status})
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── CARD 2: Match Unit & Confirm Rent Terms ── */}
        <section className="apple-section-card">
          <div className="apple-section-header">
            <div className="apple-section-header__title">
              <Building2 size={16} className="apple-section-header__icon" />
              <span>1. Unit Matching & Confirmed Terms</span>
            </div>
          </div>

          <div className="apple-form-grid">
            {/* Property Dropdown */}
            <div className="apple-field">
              <label className="apple-field__label">
                <span>Select Target Property</span>
                {selectedPropertyId === 'NEW' && (
                  <span className="apple-badge-action">Creating New Property</span>
                )}
              </label>
              <FormSelect
                value={selectedPropertyId}
                onChange={(val) => setSelectedPropertyId(val)}
                options={[
                  ...properties.map(p => ({ label: `${p.name}${p.address ? ` (${p.address})` : ''}`, value: p.id.toString() })),
                  { label: '+ Create New Property', value: 'NEW' }
                ]}
                placeholder="-- Select Property --"
              />
            </div>

            {/* When Creating New Property */}
            {selectedPropertyId === 'NEW' && (
              <div className="apple-nested-box animate-fade-in">
                <div className="apple-grid-2">
                  <div className="apple-field">
                    <label className="apple-field__label">Property Name</label>
                    <input
                      type="text"
                      className="apple-input"
                      placeholder="e.g. Oakwood Heights"
                      value={newPropertyName}
                      onChange={(e) => setNewPropertyName(e.target.value)}
                    />
                  </div>
                  <div className="apple-field">
                    <label className="apple-field__label">Property Address</label>
                    <input
                      type="text"
                      className="apple-input"
                      placeholder="e.g. 12 Park Avenue"
                      value={newPropertyAddress}
                      onChange={(e) => setNewPropertyAddress(e.target.value)}
                    />
                  </div>
                </div>
                <div className="apple-field">
                  <label className="apple-field__label">Unit Name / Apartment Number</label>
                  <input
                    type="text"
                    className="apple-input"
                    placeholder="e.g. Flat 1 or Apartment 4B"
                    value={newUnitName}
                    onChange={(e) => setNewUnitName(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* When Existing Property is Selected */}
            {selectedPropertyId && selectedPropertyId !== 'NEW' && (
              <div className="apple-field animate-fade-in">
                {selectedPropertyVacantUnits.length > 0 ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <label className="apple-field__label" style={{ margin: 0 }}>Select Vacant Unit</label>
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
                        className="apple-link-btn"
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
                            placeholder="-- Choose a vacant unit --"
                          />
                        )}
                      />
                    ) : (
                      <input
                        type="text"
                        className="apple-input"
                        placeholder="e.g. Flat 2 or Apartment 4B"
                        value={newUnitName}
                        onChange={(e) => setNewUnitName(e.target.value)}
                      />
                    )}
                    {errors.unitUuid && unitSelectMode === 'existing' && <span className="apple-error-text">{errors.unitUuid.message}</span>}
                  </>
                ) : (
                  <>
                    <label className="apple-field__label">Unit Name (No vacant units in this property)</label>
                    <input
                      type="text"
                      className="apple-input"
                      placeholder="e.g. Flat 1 or Apartment 4B"
                      value={newUnitName}
                      onChange={(e) => setNewUnitName(e.target.value)}
                    />
                  </>
                )}
              </div>
            )}

            {/* Confirmed Rent Terms Grid */}
            <div className="apple-grid-2">
              <div className="apple-field">
                <label className="apple-field__label">Confirmed Rent (₦)</label>
                <input
                  type="number"
                  className={cn("apple-input", errors.rentAmount && "apple-input--error")}
                  placeholder="e.g. 650000"
                  {...register('rentAmount')}
                />
                {errors.rentAmount && <span className="apple-error-text">{errors.rentAmount.message}</span>}
              </div>
              <div className="apple-field">
                <label className="apple-field__label">Rent Cycle</label>
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
                      placeholder="Select Cycle"
                    />
                  )}
                />
              </div>
            </div>

            {rentType === 'Lease' && (
              <div className="apple-grid-2 animate-fade-in">
                <div className="apple-field">
                  <label className="apple-field__label">Lease Duration Number</label>
                  <input
                    type="number"
                    min="1"
                    className={cn("apple-input", errors.leaseYears && "apple-input--error")}
                    placeholder="1"
                    {...register('leaseYears')}
                  />
                  {errors.leaseYears && <span className="apple-error-text">{errors.leaseYears.message}</span>}
                </div>
                <div className="apple-field">
                  <label className="apple-field__label">Lease Unit</label>
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
              </div>
            )}

            {/* Dates Grid */}
            <div className="apple-grid-2">
              <div className="apple-field">
                <label className="apple-field__label">Tenancy Start Date</label>
                <input
                  type="date"
                  className={cn("apple-input", errors.rentStartDate && "apple-input--error")}
                  {...register('rentStartDate')}
                />
                {errors.rentStartDate && <span className="apple-error-text">{errors.rentStartDate.message}</span>}
              </div>
              <div className="apple-field">
                <label className="apple-field__label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Rent End Date</span>
                  <span className="apple-auto-badge"><Lock size={10} /> Auto-calculated</span>
                </label>
                <input
                  type="date"
                  readOnly
                  disabled
                  className="apple-input apple-input--disabled"
                  {...register('rentEndDate')}
                />
                {errors.rentEndDate && <span className="apple-error-text">{errors.rentEndDate.message}</span>}
              </div>
            </div>

            {/* Apple-style Payment Reconciliation Toggle Box */}
            <div className="apple-toggle-box">
              <div className="apple-toggle-box__header">
                <div>
                  <h4 className="apple-toggle-box__title">Fully Paid for Current Period?</h4>
                  <p className="apple-toggle-box__desc">Toggle off if this tenant has an outstanding initial balance to settle.</p>
                </div>
                <label className="ios-switch">
                  <input 
                    type="checkbox" 
                    {...register('isFullyPaid')}
                  />
                  <span className="ios-switch__slider"></span>
                </label>
              </div>

              {!watch('isFullyPaid') && (
                <div className="apple-reconciliation-panel animate-fade-in">
                  <div className="apple-field">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <label className="apple-field__label" style={{ margin: 0 }}>PM Acknowledged Amount Paid (₦)</label>
                      {(() => {
                        const platformCyclePaid = initialData?.platformActivity?.activeCyclePaid ?? initialData?.platformActivity?.currentTenure?.amountPaid;
                        if (!platformCyclePaid || platformCyclePaid <= 0) return null;
                        return (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => setValue('rentAmountPaid', String(platformCyclePaid))}
                              className="apple-chip"
                            >
                              Credit Platform (₦{platformCyclePaid.toLocaleString()})
                            </button>
                            <button
                              type="button"
                              onClick={() => setValue('rentAmountPaid', '0')}
                              className="apple-chip apple-chip--muted"
                            >
                              Set ₦0
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                    <input
                      type="number"
                      className="apple-input"
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
                      <div className="apple-calculation-card">
                        <div className="apple-calculation-row">
                          <span className="apple-calculation-label">Confirmed Rent:</span>
                          <span className="apple-calculation-val">₦{totalRent.toLocaleString()}</span>
                        </div>
                        <div className="apple-calculation-row">
                          <span className="apple-calculation-label">PM Acknowledged Paid:</span>
                          <span className="apple-calculation-val" style={{ color: 'var(--forest)' }}>- ₦{ackPaid.toLocaleString()}</span>
                        </div>
                        <div className="apple-calculation-row apple-calculation-row--total">
                          <span>Remaining Balance to Bill Tenant:</span>
                          <span style={{ color: isOverpaid ? 'var(--error)' : 'var(--dark)' }}>
                            ₦{balanceToBill.toLocaleString()}
                          </span>
                        </div>

                        {isOverpaid ? (
                          <div className="apple-alert-note apple-alert-note--error">
                            <AlertTriangle size={13} />
                            <span>Acknowledged amount cannot exceed total agreed rent.</span>
                          </div>
                        ) : balanceToBill > 0 ? (
                          <div className="apple-alert-note apple-alert-note--info">
                            <Info size={13} />
                            <span>An authoritative balance invoice for ₦{balanceToBill.toLocaleString()} will be automatically generated.</span>
                          </div>
                        ) : (
                          <div className="apple-alert-note apple-alert-note--success">
                            <CheckCircle2 size={13} />
                            <span>Full rent acknowledged. No outstanding invoice will be created.</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── CARD 3: Tenant Profile & Invite Delivery ── */}
        <section className="apple-section-card">
          <div className="apple-section-header">
            <div className="apple-section-header__title">
              <User size={16} className="apple-section-header__icon" />
              <span>2. Tenant Identity & Invite Delivery</span>
            </div>
          </div>

          <div className="apple-form-grid">
            {/* Tenant Type Selector */}
            <div className="apple-segmented-control">
              <button
                type="button"
                className={cn("apple-segmented-item", tenantType === 'individual' && "apple-segmented-item--active")}
                onClick={() => setValue('tenantType', 'individual')}
              >
                Individual Tenant
              </button>
              <button
                type="button"
                className={cn("apple-segmented-item", tenantType === 'commercial' && "apple-segmented-item--active")}
                onClick={() => setValue('tenantType', 'commercial')}
              >
                Commercial / Corporate
              </button>
            </div>

            {tenantType === 'commercial' ? (
              <div className="apple-field">
                <label className="apple-field__label">Commercial / Business Name</label>
                <input
                  type="text"
                  className={cn("apple-input", errors.commercialName && "apple-input--error")}
                  placeholder="e.g. Acme Holdings Ltd"
                  {...register('commercialName')}
                />
                {errors.commercialName && <span className="apple-error-text">{errors.commercialName.message}</span>}
              </div>
            ) : (
              <div className="apple-grid-2">
                <div className="apple-field">
                  <label className="apple-field__label">First Name</label>
                  <input
                    type="text"
                    className={cn("apple-input", errors.firstName && "apple-input--error")}
                    placeholder="e.g. John"
                    {...register('firstName')}
                  />
                  {errors.firstName && <span className="apple-error-text">{errors.firstName.message}</span>}
                </div>
                <div className="apple-field">
                  <label className="apple-field__label">Last Name</label>
                  <input
                    type="text"
                    className={cn("apple-input", errors.lastName && "apple-input--error")}
                    placeholder="e.g. Doe"
                    {...register('lastName')}
                  />
                  {errors.lastName && <span className="apple-error-text">{errors.lastName.message}</span>}
                </div>
              </div>
            )}

            {/* Email & Phone */}
            <div className="apple-grid-2">
              <div className="apple-field">
                <label className="apple-field__label">Email Address</label>
                <input
                  type="email"
                  className={cn("apple-input", errors.email && "apple-input--error")}
                  placeholder="tenant@example.com"
                  {...register('email')}
                />
                {errors.email && <span className="apple-error-text">{errors.email.message}</span>}
              </div>
              <div className="apple-field">
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <PhoneInput
                      {...field}
                      label="Primary Phone Number"
                      placeholder="e.g. +234 800 000 0000"
                      error={errors.phone?.message}
                    />
                  )}
                />
              </div>
            </div>

            {/* Smart Account Banner */}
            {foundUser && ((!typedEmail && foundUser.email) || (!typedPhone && foundUser.phone) || (!watch('firstName') && foundUser.firstName) || (!watch('lastName') && foundUser.lastName)) && (
              <div className="apple-smart-banner animate-fade-in">
                <div className="apple-smart-banner__left">
                  <Sparkles size={16} />
                  <span>
                    Existing Upward account found for <strong>{foundUser.firstName} {foundUser.lastName}</strong>!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (foundUser.phone && !typedPhone) setValue('phone', foundUser.phone, { shouldValidate: true })
                    if (foundUser.email && !typedEmail) setValue('email', foundUser.email, { shouldValidate: true })
                    if (foundUser.firstName && !watch('firstName')) setValue('firstName', foundUser.firstName, { shouldValidate: true })
                    if (foundUser.lastName && !watch('lastName')) setValue('lastName', foundUser.lastName, { shouldValidate: true })
                  }}
                  className="apple-chip apple-chip--primary"
                >
                  Autofill Details
                </button>
              </div>
            )}

            {/* Alternative Phone */}
            <div className="apple-grid-2">
              <div className="apple-field">
                <Controller
                  name="otherPhone"
                  control={control}
                  render={({ field }) => (
                    <PhoneInput
                      {...field}
                      label="Alternative Phone Number (Optional)"
                      placeholder="e.g. +234 800 000 0000"
                      error={errors.otherPhone?.message}
                    />
                  )}
                />
              </div>
              <div />
            </div>

            {/* ── Preferred Invite Delivery Channel Selection ── */}
            <div className="apple-delivery-section">
              <label className="apple-field__label">
                Preferred Invite Delivery Method <span style={{ color: 'var(--forest)' }}>*</span>
              </label>
              <div className="apple-delivery-grid">
                {!(watch('email') || '').endsWith('@upward.com') && (watch('email') || '').trim() !== '' && (
                  <label className={cn("apple-delivery-card", deliveryChannel === 'EMAIL' && "apple-delivery-card--active")}>
                    <input
                      type="radio"
                      value="EMAIL"
                      {...register('deliveryChannel')}
                      className="sr-only"
                    />
                    <Mail size={16} className="apple-delivery-card__icon" />
                    <div>
                      <div className="apple-delivery-card__title">Email</div>
                      <div className="apple-delivery-card__sub">Direct to inbox</div>
                    </div>
                  </label>
                )}

                <label className={cn(
                  "apple-delivery-card", 
                  deliveryChannel === 'SMS' && "apple-delivery-card--active",
                  !watch('phone') && "apple-delivery-card--disabled"
                )}>
                  <input
                    type="radio"
                    value="SMS"
                    {...register('deliveryChannel')}
                    disabled={!watch('phone')}
                    className="sr-only"
                  />
                  <Smartphone size={16} className="apple-delivery-card__icon" />
                  <div>
                    <div className="apple-delivery-card__title">SMS</div>
                    <div className="apple-delivery-card__sub">Instant text link</div>
                  </div>
                </label>

                <label className={cn(
                  "apple-delivery-card", 
                  deliveryChannel === 'WHATSAPP' && "apple-delivery-card--active",
                  !watch('phone') && "apple-delivery-card--disabled"
                )}>
                  <input
                    type="radio"
                    value="WHATSAPP"
                    {...register('deliveryChannel')}
                    disabled={!watch('phone')}
                    className="sr-only"
                  />
                  <MessageSquare size={16} className="apple-delivery-card__icon" />
                  <div>
                    <div className="apple-delivery-card__title">WhatsApp</div>
                    <div className="apple-delivery-card__sub">Direct chat message</div>
                  </div>
                </label>
              </div>
              {!watch('phone') && (
                <p className="apple-hint-text">
                  Phone number required to enable SMS & WhatsApp delivery.
                </p>
              )}
            </div>
          </div>
        </section>
      </form>

      <style jsx>{`
        .verify-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 8px;
        }

        /* Card 1: Intelligence Summary */
        .apple-card {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: var(--radius-md);
          overflow: hidden;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
        }
        .apple-card__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 16px;
          background: var(--ivory);
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          flex-wrap: wrap;
        }
        .apple-card__location {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: var(--dark);
        }
        .apple-card__location-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .apple-card__grid {
          display: grid;
          grid-template-columns: 1fr 1px 1.2fr;
          padding: 14px 16px;
          gap: 16px;
          align-items: start;
        }
        @media (max-width: 600px) {
          .apple-card__grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .apple-card__divider {
            display: none;
          }
        }
        .apple-card__divider {
          background: rgba(0, 0, 0, 0.06);
          height: 100%;
        }
        .apple-card__col {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .apple-card__col-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          margin-bottom: 2px;
        }
        .apple-card__stat-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          font-size: 12.5px;
        }
        .apple-card__stat-label {
          color: var(--text-muted);
          font-weight: 500;
        }
        .apple-card__stat-val {
          font-weight: 600;
          color: var(--dark);
          text-align: right;
        }
        .apple-card__stat-val--muted {
          font-size: 11.5px;
          color: var(--text-secondary);
        }
        .apple-card__stat-val--forest {
          color: var(--forest);
          font-weight: 600;
        }

        /* Section Cards */
        .apple-section-card {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: var(--radius-md);
          padding: 18px 20px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
        }
        .apple-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }
        .apple-section-header__title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 700;
          color: var(--dark);
        }
        .apple-section-header__icon {
          color: var(--forest);
        }

        /* Form Structure */
        .apple-form-grid {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .apple-grid-2 {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));
          gap: 12px;
        }
        .apple-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .apple-field__label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .apple-input {
          width: 100%;
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13.5px;
          font-weight: 500;
          color: var(--dark);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
          transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
          outline: none;
        }
        .apple-input:focus {
          border-color: var(--forest);
          box-shadow: 0 0 0 3px rgba(22, 101, 52, 0.12);
        }
        .apple-input--error {
          border-color: var(--error) !important;
          box-shadow: 0 0 0 3px var(--error-bg) !important;
        }
        .apple-input--disabled {
          background: var(--ivory-dim);
          border-color: rgba(0, 0, 0, 0.06);
          color: var(--text-muted);
          cursor: not-allowed;
        }
        .apple-error-text {
          color: var(--error);
          font-size: 11.5px;
          font-weight: 500;
          margin-top: 2px;
        }
        .apple-hint-text {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 6px;
        }

        /* Nested Container */
        .apple-nested-box {
          background: var(--ivory);
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-radius: 12px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* Badges & Pills */
        .apple-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: var(--radius-full);
          white-space: nowrap;
        }
        .apple-pill--verified {
          background: var(--forest-faint);
          color: var(--forest);
          border: 1px solid rgba(22, 101, 52, 0.15);
        }
        .apple-pill--warning {
          background: #fffbeb;
          color: #b45309;
          border: 1px solid #fef3c7;
        }
        .apple-score-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 6px;
          background: var(--ivory-dim);
          color: var(--text-secondary);
          margin-left: auto;
        }
        .apple-badge-action {
          font-size: 11px;
          font-weight: 600;
          color: var(--forest);
        }
        .apple-auto-badge {
          font-size: 10.5px;
          color: var(--text-muted);
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-weight: 500;
        }

        /* Buttons & Chips */
        .apple-link-btn {
          background: transparent;
          border: none;
          font-size: 12px;
          color: var(--forest);
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 0;
          transition: opacity 0.15s;
        }
        .apple-link-btn:hover {
          opacity: 0.8;
        }
        .apple-chip {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 8px;
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.1);
          color: var(--forest);
          cursor: pointer;
          transition: all 0.15s;
        }
        .apple-chip:hover {
          background: var(--forest-faint);
          border-color: rgba(22, 101, 52, 0.2);
        }
        .apple-chip:active {
          transform: scale(0.97);
        }
        .apple-chip--muted {
          color: var(--text-muted);
        }
        .apple-chip--muted:hover {
          background: var(--ivory-dim);
          color: var(--text-secondary);
        }
        .apple-chip--primary {
          background: var(--forest);
          color: #ffffff;
          border: none;
        }
        .apple-chip--primary:hover {
          background: var(--forest-hover);
        }

        /* Segmented Controls */
        .apple-segmented-control {
          display: flex;
          background: var(--ivory-dim);
          padding: 4px;
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          gap: 4px;
        }
        .apple-segmented-item {
          flex: 1;
          padding: 8px 14px;
          border-radius: 8px;
          border: none;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-muted);
          background: transparent;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .apple-segmented-item--active {
          background: #ffffff;
          color: var(--dark);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
        }

        /* Toggle Box */
        .apple-toggle-box {
          margin-top: 6px;
          padding: 14px 16px;
          background: var(--ivory);
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.06);
        }
        .apple-toggle-box__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .apple-toggle-box__title {
          font-size: 13.5px;
          font-weight: 700;
          color: var(--dark);
          margin: 0;
        }
        .apple-toggle-box__desc {
          font-size: 11.5px;
          color: var(--text-muted);
          margin: 2px 0 0;
        }
        .apple-reconciliation-panel {
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px dashed rgba(0, 0, 0, 0.08);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .apple-calculation-card {
          padding: 12px 14px;
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 10px;
          font-size: 12px;
        }
        .apple-calculation-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }
        .apple-calculation-label {
          color: var(--text-muted);
          font-weight: 500;
        }
        .apple-calculation-val {
          font-weight: 600;
          color: var(--dark);
        }
        .apple-calculation-row--total {
          padding-top: 8px;
          border-top: 1px dashed rgba(0, 0, 0, 0.08);
          font-weight: 700;
          font-size: 13px;
        }
        .apple-alert-note {
          margin-top: 8px;
          font-size: 11.5px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 6px;
        }
        .apple-alert-note--error {
          background: var(--error-bg);
          color: var(--error);
        }
        .apple-alert-note--info {
          background: rgba(59, 130, 246, 0.08);
          color: var(--info);
        }
        .apple-alert-note--success {
          background: var(--forest-faint);
          color: var(--forest);
        }

        /* Smart Banner */
        .apple-smart-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 10px;
          background: var(--forest-faint);
          border: 1px solid rgba(22, 101, 52, 0.12);
          font-size: 12.5px;
        }
        .apple-smart-banner__left {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--forest);
        }

        /* Delivery Channel Cards */
        .apple-delivery-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .apple-delivery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 10px;
        }
        .apple-delivery-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          background: #ffffff;
          border: 1.5px solid rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          user-select: none;
        }
        .apple-delivery-card:hover:not(.apple-delivery-card--disabled) {
          border-color: var(--forest);
          background: var(--forest-faint);
        }
        .apple-delivery-card:active:not(.apple-delivery-card--disabled) {
          transform: scale(0.98);
        }
        .apple-delivery-card--active {
          border-color: var(--forest) !important;
          background: var(--forest-faint) !important;
          box-shadow: 0 0 0 2px rgba(22, 101, 52, 0.12);
        }
        .apple-delivery-card--disabled {
          opacity: 0.45;
          cursor: not-allowed;
          background: var(--ivory-dim);
        }
        .apple-delivery-card__icon {
          color: var(--text-secondary);
        }
        .apple-delivery-card--active .apple-delivery-card__icon {
          color: var(--forest);
        }
        .apple-delivery-card__title {
          font-size: 13px;
          font-weight: 700;
          color: var(--dark);
        }
        .apple-delivery-card--active .apple-delivery-card__title {
          color: var(--forest);
        }
        .apple-delivery-card__sub {
          font-size: 10.5px;
          color: var(--text-muted);
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
