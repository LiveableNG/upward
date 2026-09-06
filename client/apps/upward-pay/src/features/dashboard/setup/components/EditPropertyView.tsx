'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  FileText,
  Globe,
  Lock,
  MapPin,
  Trash2,
  UploadCloud,
  AlertCircle,
} from 'lucide-react'
import { api } from '@/lib/api'
import { COUNTRIES, STATES } from '@/lib/location-data'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/common/Toast'
import { PayFlowPrimaryButton, PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import { PaymentAccountForm, isPaymentAccountResolved } from '@/features/dashboard/components/payment/PaymentAccountForm'
import { toDateInputValue, validateRentDates } from '../rentalDates'
import { deleteProofOfPayment, uploadProofOfPayment } from '@/features/payments/services/paymentService'
import { setupRentalListPath } from '../setupPaths'

interface EditPropertyViewProps {
  propertyUuid: string
}

export function EditPropertyView({ propertyUuid }: EditPropertyViewProps) {
  const router = useRouter()
  const { user, refreshUser } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()

  const property = (user?.properties || []).find((p) => p.uuid === propertyUuid)

  const isPmVerified = !!(property?.isVerified && (property as any)?.isManaged)
  const isExternalUnit = !!((property as any)?.pmUnitId || (property as any)?.externalUnitId || property?.isPlatformLinked)
  
  const onlinePayments = ((property as any)?.platformRentPayments || []).filter(
    (p: any) => p.method !== 'INITIAL_ONBOARDING' && p.status === 'SUCCESS'
  )
  const hasPaidOnUpward = ((property as any)?.amountPaid || 0) > ((property as any)?.initialAmountPaid || 0) || onlinePayments.length > 0

  const isManaged = isPmVerified || isExternalUnit || hasPaidOnUpward

  const initialManual = (property as any)?.manualAccount || (property as any)?.pmManualAccount

  const [address, setAddress] = useState('')
  const [area, setArea] = useState('')
  const [subarea, setSubarea] = useState('')
  const [stateName, setStateName] = useState('Lagos')
  const [country, setCountry] = useState('NG')

  const [rentAmount, setRentAmount] = useState('')
  const [rentType, setRentType] = useState('Annually')
  const [rentStartDate, setRentStartDate] = useState('')
  const [rentEndDate, setRentEndDate] = useState('')

  const [paymentAccount, setPaymentAccount] = useState({
    accountNumber: '',
    bankCode: '',
    accountName: '',
    bankName: '',
  })

  const [activeProof, setActiveProof] = useState<any | null>(null)
  const [isDeletingProof, setIsDeletingProof] = useState(false)
  const [newProofFile, setNewProofFile] = useState<File | null>(null)
  const [isUploadingProof, setIsUploadingProof] = useState(false)

  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    if (!property) return

    setAddress(property.location?.address || property.address || '')
    setArea(property.location?.area || '')
    setSubarea(property.location?.subarea || '')
    setStateName(property.location?.state || STATES['NG']?.[24] || 'Lagos')
    setCountry(property.location?.country || 'NG')

    setRentAmount(property.rentAmount ? property.rentAmount.toLocaleString() : '')
    setRentType(property.rentType || 'Annually')
    setRentStartDate(toDateInputValue(property.rentStartDate))
    setRentEndDate(toDateInputValue(property.rentEndDate))

    if (initialManual?.accountNumber && initialManual?.bankCode) {
      setPaymentAccount({
        accountNumber: initialManual.accountNumber,
        bankCode: initialManual.bankCode,
        accountName: initialManual.accountName || '',
        bankName: initialManual.bankName || '',
      })
    } else if ((property as any)?.subaccount?.accountNumber) {
      const sub = (property as any).subaccount
      setPaymentAccount({
        accountNumber: sub.accountNumber || '',
        bankCode: sub.bankCode || '',
        accountName: sub.businessName || '',
        bankName: '',
      })
    }

    const proofs = (property as any)?.paymentProofs || []
    if (proofs.length > 0) {
      setActiveProof(proofs[0])
    } else {
      setActiveProof(null)
    }

    setIsHydrated(true)
  }, [property])

  const handleDeleteProof = async (proofId: number) => {
    if (!confirm('Are you sure you want to remove this proof of payment?')) return
    setIsDeletingProof(true)
    try {
      await deleteProofOfPayment(proofId)
      toast.success('Proof of payment removed.', 'Removed')
      setActiveProof(null)
      await refreshUser()
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove proof of payment.', 'Error')
    } finally {
      setIsDeletingProof(false)
    }
  }

  const handleProofFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0]
      if (selected.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB', 'File Too Large')
        return
      }
      if (!['application/pdf', 'image/jpeg', 'image/png'].includes(selected.type)) {
        toast.error('Only PDF, JPG, and PNG files are allowed', 'Invalid Format')
        return
      }
      setNewProofFile(selected)
    }
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!address.trim() || !area.trim()) {
        throw new Error('Please provide property address and area.')
      }
      if (!rentAmount || !rentStartDate || !rentEndDate) {
        throw new Error('Please complete rent amount and tenancy dates.')
      }
      const dateErr = validateRentDates(rentStartDate, rentEndDate)
      if (dateErr) {
        throw new Error(dateErr)
      }

      const numAmount = parseFloat(rentAmount.replace(/,/g, ''))
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Please enter a valid rent amount.')
      }

      if (!isManaged && paymentAccount.accountNumber && !isPaymentAccountResolved(paymentAccount)) {
        throw new Error('Please enter and verify a valid landlord bank account.')
      }

      // Upload replacement proof if selected
      if (newProofFile && property?.uuid) {
        setIsUploadingProof(true)
        try {
          await uploadProofOfPayment({
            userPropertyUuid: property.uuid,
            amount: numAmount,
            file: newProofFile,
          })
        } finally {
          setIsUploadingProof(false)
        }
      }

      const payload = {
        unitDetails: {
          uuid: propertyUuid,
          address: address.trim(),
          area: area.trim(),
          subarea: subarea.trim(),
          state: stateName,
          country,
          rentAmount: numAmount,
          rentStartDate: toDateInputValue(rentStartDate),
          rentEndDate: toDateInputValue(rentEndDate),
          rentType,
        },
        paymentDetails: isManaged
          ? undefined
          : {
              accountNumber: paymentAccount.accountNumber,
              bankCode: paymentAccount.bankCode,
              accountName: paymentAccount.accountName,
              bankName: paymentAccount.bankName,
            },
      }

      await api.post('/user/pm-connection/add-unit-request', payload)
    },
    onSuccess: async () => {
      toast.success('Your rental details have been saved.', 'Saved')
      await refreshUser()
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['score-profile'] })
      router.push(setupRentalListPath())
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save changes. Please try again.', 'Error')
    },
  })

  if (!property && isHydrated) {
    return (
      <PayPageShell
        title="Property not found"
        subtitle="The requested property could not be found."
        showBack
        onBack={() => router.push(setupRentalListPath())}
      >
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <AlertCircle size={48} color="var(--text-muted, #7a7268)" />
          <p style={{ marginTop: 16 }}>This property may have been removed or unlinked.</p>
        </div>
      </PayPageShell>
    )
  }

  const managerLabel =
    (property as any)?.companyName ||
    (property as any)?.managerName ||
    ((property as any)?.manager?.firstName
      ? `${(property as any).manager.firstName} ${(property as any).manager.lastName || ''}`.trim()
      : 'Property Manager')

  return (
    <PayPageShell
      title="Property details"
      subtitle={
        isManaged
          ? 'This property is verified and managed by your property manager.'
          : 'Update address, rent terms, and landlord bank account details.'
      }
      showBack
      onBack={() => router.push(setupRentalListPath())}
      footer={
        isManaged ? (
          <PayFlowPrimaryButton
            onClick={() => router.push('/dashboard/help')}
          >
            Contact support to update
          </PayFlowPrimaryButton>
        ) : (
          <PayFlowPrimaryButton
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || isUploadingProof}
            loading={saveMutation.isPending || isUploadingProof}
          >
            {saveMutation.isPending ? 'Saving changes…' : 'Save changes'}
          </PayFlowPrimaryButton>
        )
      }
    >
      <div className="setup-page__edit-grid" style={{ display: 'grid', gap: 20, width: '100%', boxSizing: 'border-box' }}>
        {/* Managed Notice Banner */}
        {isManaged && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '14px 16px',
              borderRadius: 14,
              background: 'rgba(194, 80, 31, 0.08)',
              border: '1px solid rgba(194, 80, 31, 0.2)',
              color: '#8f330b',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 240 }}>
              <Lock size={20} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ display: 'block', fontSize: 14, marginBottom: 2 }}>
                  Managed Property ({managerLabel})
                </strong>
                <span style={{ fontSize: 13, lineHeight: 1.45, opacity: 0.9 }}>
                  Tenancy dates, rent amounts, and payout accounts are locked because this property is verified or has active rent payments.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push('/dashboard/help')}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                background: 'var(--skin-primary, #c2501f)',
                color: '#fff',
                border: 'none',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Contact Support
            </button>
          </div>
        )}

        {/* Section 1: Location & Address */}
        <div className="setup-page__card" style={{ background: '#fff', borderRadius: 16, padding: 18, border: '1px solid #eae2d7', boxSizing: 'border-box', overflow: 'hidden' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={18} color="var(--skin-primary, #c2501f)" />
            Location & Address
          </h3>

          <div className="setup-page__field" style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#5c544b', marginBottom: 6, display: 'block' }}>Street address</label>
            <input
              disabled={isManaged}
              className="setup-page__input"
              type="text"
              placeholder="14 Admiralty Way, Lekki"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="setup-page__field-row" style={{ marginBottom: 14 }}>
            <div className="setup-page__field">
              <label style={{ fontSize: 13, fontWeight: 600, color: '#5c544b', marginBottom: 6, display: 'block' }}>Area</label>
              <input
                disabled={isManaged}
                className="setup-page__input"
                type="text"
                placeholder="Lekki"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              />
            </div>
            <div className="setup-page__field">
              <label style={{ fontSize: 13, fontWeight: 600, color: '#5c544b', marginBottom: 6, display: 'block' }}>State</label>
              <select
                disabled={isManaged}
                className="setup-page__input"
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
              >
                {(STATES[country] || []).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="setup-page__field">
            <label style={{ fontSize: 13, fontWeight: 600, color: '#5c544b', marginBottom: 6, display: 'block' }}>Country</label>
            <select
              disabled={isManaged}
              className="setup-page__input"
              value={country}
              onChange={(e) => {
                setCountry(e.target.value)
                setStateName(STATES[e.target.value]?.[0] || '')
              }}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 2: Tenancy & Rent Schedule */}
        <div className="setup-page__card" style={{ background: '#fff', borderRadius: 16, padding: 18, border: '1px solid #eae2d7', boxSizing: 'border-box', overflow: 'hidden' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={18} color="var(--skin-primary, #c2501f)" />
            Tenancy Terms
          </h3>

          <div className="setup-page__field-row" style={{ marginBottom: 14 }}>
            <div className="setup-page__field">
              <label style={{ fontSize: 13, fontWeight: 600, color: '#5c544b', marginBottom: 6, display: 'block' }}>Rent cycle</label>
              <select
                disabled={isManaged}
                className="setup-page__input"
                value={rentType}
                onChange={(e) => setRentType(e.target.value)}
              >
                <option value="Monthly">Monthly</option>
                <option value="Annually">Annually</option>
                <option value="Lease">Lease</option>
              </select>
            </div>

            <div className="setup-page__field">
              <label style={{ fontSize: 13, fontWeight: 600, color: '#5c544b', marginBottom: 6, display: 'block' }}>
                {rentType === 'Monthly' ? 'Monthly' : 'Yearly'} rent amount
              </label>
              <div className="setup-page__input-row">
                <span>₦</span>
                <input
                  disabled={isManaged}
                  type="text"
                  placeholder="1,200,000"
                  value={rentAmount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '')
                    setRentAmount(val ? parseInt(val, 10).toLocaleString() : '')
                  }}
                />
              </div>
            </div>
          </div>

          <div className="setup-page__field-row">
            <div className="setup-page__field">
              <label style={{ fontSize: 13, fontWeight: 600, color: '#5c544b', marginBottom: 6, display: 'block' }}>Tenancy period start</label>
              <input
                disabled={isManaged}
                className="setup-page__input"
                type="date"
                value={rentStartDate}
                onChange={(e) => {
                  const val = toDateInputValue(e.target.value)
                  setRentStartDate(val)
                  if (rentEndDate && !validateRentDates(val, rentEndDate)) {
                    setRentEndDate('')
                  }
                }}
              />
            </div>

            <div className="setup-page__field">
              <label style={{ fontSize: 13, fontWeight: 600, color: '#5c544b', marginBottom: 6, display: 'block' }}>Next rent due date</label>
              <input
                disabled={isManaged}
                className="setup-page__input"
                type="date"
                min={rentStartDate || undefined}
                value={rentEndDate}
                onChange={(e) => setRentEndDate(toDateInputValue(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Landlord Bank Account */}
        <div className="setup-page__card" style={{ background: '#fff', borderRadius: 16, padding: 18, border: '1px solid #eae2d7', boxSizing: 'border-box', overflow: 'hidden' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={18} color="var(--skin-primary, #c2501f)" />
            Landlord Payment Account
          </h3>

          <PaymentAccountForm
            value={paymentAccount}
            onChange={setPaymentAccount}
            disabled={isManaged}
            intro=""
          />
        </div>
      </div>
    </PayPageShell>
  )
}
