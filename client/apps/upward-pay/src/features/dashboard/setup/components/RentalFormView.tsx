'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import {
  ArrowRight,
  CheckCircle2,
  Search,
  CreditCard,
  Scale,
  FileText,
  Calendar,
  Building2,
  MapPin,
  UploadCloud,
  X,
  AlertCircle,
  HelpCircle,
  Info,
} from 'lucide-react'
import { api } from '@/lib/api'
import { COUNTRIES, STATES } from '@/lib/location-data'
import { useToast } from '@/components/common/Toast'
import { useSetupDraft } from '../SetupDraftContext'
import { SETUP_PATHS, setupRentalListPath, useSetupMode } from '../setupPaths'
import { SetupPageShell, SetupPrimaryButton } from './SetupPageShell'
import { type SetupDraft, type TenancyStatus } from '../setupDraft'
import {
  PaymentAccountForm,
  isPaymentAccountResolved,
} from '@/features/dashboard/components/payment/PaymentAccountForm'
import { toDateInputValue, validateRentDates } from '../rentalDates'
import { formatCurrency } from '@/lib/utils'

type RentalFormStep = 'location' | 'tenancy' | 'manager'

const STEP_NAMES = ['Location', 'Tenancy', 'Landlord', 'Review']

function shouldRestoreLookup(draft: SetupDraft, isEdit: boolean): boolean {
  if (!draft.pmEmail.trim()) return false
  if (draft.pmFound && draft.pmDetails) return true
  if (isEdit) return true
  if (!draft.pmFound && draft.formData.pmName.trim()) return true
  return false
}

export function RentalFormView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const { draft, updateDraft } = useSetupDraft()
  const { isEdit, withMode, returnTo } = useSetupMode()

  const [lookupDone, setLookupDone] = useState(() => shouldRestoreLookup(draft, isEdit))
  const [formStep, setFormStep] = useState<RentalFormStep>('location')

  const verifyMutation = useMutation({
    mutationFn: async (identifier: string) => {
      const res = await api.post('/user/pm-connection/verify', { identifier })
      return res.data
    },
    onSuccess: (data) => {
      if (data.found && data.pm) {
        updateDraft({
          pmFound: true,
          landlordSkipped: false,
          pmDetails: {
            id: data.pm.id,
            name: `${data.pm.firstName} ${data.pm.lastName}`,
            businessName: data.pm.businessName || `${data.pm.firstName} ${data.pm.lastName}`,
          },
        })
      } else {
        updateDraft({ pmFound: false, landlordSkipped: false, pmDetails: null })
      }
      setLookupDone(true)
    },
    onError: () => {
      toast.error('Unable to verify this detail. You can still enter details manually.', 'Check Failed')
      updateDraft({ pmFound: false, landlordSkipped: false, pmDetails: null })
      setLookupDone(true)
    },
  })

  const handleLookup = () => {
    const trimmed = draft.pmEmail.trim()
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
    const isPhone = /^\+234\d{10}$/.test(trimmed)
    if (!isEmail && !isPhone) {
      toast.error('Please enter a valid email or phone number (+2348030000000)', 'Invalid Format')
      return
    }
    verifyMutation.mutate(trimmed)
  }

  // Validation per step
  const validateLocationStep = () => {
    const { formData } = draft
    if (!formData.address.trim() || !formData.area.trim()) {
      toast.error('Please provide property address and area.', 'Required')
      return false
    }
    return true
  }

  const validateTenancyStep = () => {
    const { formData } = draft
    if (!formData.rentAmount) {
      toast.error('Please enter your rent amount.', 'Required')
      return false
    }
    const numAmount = parseFloat(formData.rentAmount.replace(/,/g, ''))
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid rent amount.', 'Invalid Amount')
      return false
    }
    if (!formData.rentStartDate || !formData.rentEndDate) {
      toast.error('Please select tenancy dates.', 'Required')
      return false
    }
    const dateError = validateRentDates(formData.rentStartDate, formData.rentEndDate)
    if (dateError) {
      toast.error(dateError, 'Invalid dates')
      return false
    }

    if (formData.tenancyStatus === 'PAYING_BALANCE') {
      if (!formData.amountAlreadyPaid) {
        toast.error('Please enter the amount already paid to your landlord.', 'Required')
        return false
      }
      const paid = parseFloat(formData.amountAlreadyPaid.replace(/,/g, ''))
      if (isNaN(paid) || paid < 0) {
        toast.error('Please enter a valid paid amount.', 'Invalid Amount')
        return false
      }
      if (paid >= numAmount) {
        toast.error('Amount already paid must be less than the total rent. Select "Already paid this period" if fully paid.', 'Invalid Amount')
        return false
      }
    }

    return true
  }

  const validateManagerStep = () => {
    if (draft.isManagedProperty) return true
    if (draft.paymentDetails.accountNumber && !isPaymentAccountResolved(draft.paymentDetails)) {
      toast.error('Please enter and verify a valid bank account.', 'Required Account')
      return false
    }
    if (!draft.pmEmail.trim() && !draft.formData.pmName.trim()) {
      toast.error('Please enter your landlord or manager contact details.', 'Landlord Contact Required')
      return false
    }
    if (draft.pmEmail.trim() && !lookupDone) {
      toast.error('Tap "Find manager" to verify contact details.', 'Verification Needed')
      return false
    }
    return true
  }

  const goToConfirm = () => {
    router.push(withMode(SETUP_PATHS.confirm))
  }

  const handleLocationContinue = () => {
    if (!validateLocationStep()) return
    setFormStep('tenancy')
  }

  const handleTenancyContinue = () => {
    if (!validateLocationStep()) {
      setFormStep('location')
      return
    }
    if (!validateTenancyStep()) return
    setFormStep('manager')
  }

  const handleManagerContinue = () => {
    if (!validateLocationStep()) {
      setFormStep('location')
      return
    }
    if (!validateTenancyStep()) {
      setFormStep('tenancy')
      return
    }
    if (!validateManagerStep()) return
    updateDraft({ landlordSkipped: false })
    goToConfirm()
  }

  const handleBack = () => {
    if (formStep === 'tenancy') {
      setFormStep('location')
      return
    }
    if (formStep === 'manager') {
      setFormStep('tenancy')
      return
    }
    if (returnTo) {
      router.push(returnTo)
      return
    }
    router.push(isEdit ? SETUP_PATHS.profile : SETUP_PATHS.dashboard)
  }

  const stepNumber = formStep === 'location' ? 1 : formStep === 'tenancy' ? 2 : 3

  const pageTitle =
    formStep === 'location'
      ? 'Where do you live?'
      : formStep === 'tenancy'
        ? 'Tenancy & rent details'
        : 'Landlord & payment details'

  const pageSubtitle =
    formStep === 'location'
      ? 'Enter your rental address so we can set up your profile.'
      : formStep === 'tenancy'
        ? 'Tell us about your rent cycle and payment status.'
        : 'Where should rent be paid? Enter your landlord or manager details.'

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
      updateDraft({
        formData: {
          ...draft.formData,
          proofFile: selected,
          proofFileMeta: { name: selected.name, size: selected.size, type: selected.type },
        },
      })
      toast.success(`Attached ${selected.name}`, 'Proof Uploaded')
    }
  }

  const handleRemoveProofFile = () => {
    updateDraft({
      formData: {
        ...draft.formData,
        proofFile: null,
        proofFileMeta: null,
      },
    })
    toast.success('Attached proof removed.', 'Removed')
  }

  // Calculations for balance pill
  const totalRentNum = parseFloat(draft.formData.rentAmount.replace(/,/g, '')) || 0
  const paidNum = parseFloat(draft.formData.amountAlreadyPaid.replace(/,/g, '')) || 0
  const remainingNum = Math.max(0, totalRentNum - paidNum)

  const footer = (
    <SetupPrimaryButton
      onClick={() => {
        if (formStep === 'location') handleLocationContinue()
        else if (formStep === 'tenancy') handleTenancyContinue()
        else handleManagerContinue()
      }}
    >
      Continue
      <ArrowRight size={18} aria-hidden />
    </SetupPrimaryButton>
  )

  const showInviteForm = lookupDone && !draft.pmFound
  const showManagerFound = lookupDone && draft.pmFound && draft.pmDetails
  const showFindOnly = !lookupDone

  return (
    <SetupPageShell
      title={pageTitle}
      subtitle={pageSubtitle}
      progress={{ step: stepNumber, total: 4 }}
      stepNames={STEP_NAMES}
      onBack={handleBack}
      footer={footer}
    >
      <div className="setup-page__fields">
        {/* STEP 1: LOCATION */}
        {formStep === 'location' && (
          <>
            <div className="setup-page__field">
              <label>Property address</label>
              <input
                className="setup-page__input"
                type="text"
                placeholder="e.g. 14 Admiralty Way, Lekki Phase 1"
                value={draft.formData.address}
                onChange={(e) =>
                  updateDraft({ formData: { ...draft.formData, address: e.target.value } })
                }
              />
            </div>

            <div className="setup-page__field-row">
              <div className="setup-page__field">
                <label>Area / Neighborhood</label>
                <input
                  className="setup-page__input"
                  type="text"
                  placeholder="e.g. Lekki"
                  value={draft.formData.area}
                  onChange={(e) =>
                    updateDraft({ formData: { ...draft.formData, area: e.target.value } })
                  }
                />
              </div>
              <div className="setup-page__field">
                <label>State</label>
                <select
                  className="setup-page__input"
                  value={draft.formData.state}
                  onChange={(e) =>
                    updateDraft({ formData: { ...draft.formData, state: e.target.value } })
                  }
                >
                  {(STATES[draft.formData.country] || []).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="setup-page__field">
              <label>Country</label>
              <select
                className="setup-page__input"
                value={draft.formData.country}
                onChange={(e) =>
                  updateDraft({
                    formData: {
                      ...draft.formData,
                      country: e.target.value,
                      state: STATES[e.target.value]?.[0] || '',
                    },
                  })
                }
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* STEP 2: TENANCY & RENT STATUS */}
        {formStep === 'tenancy' && (
          <>
            <div className="setup-page__field-row">
              <div className="setup-page__field">
                <label>Rent cycle</label>
                <select
                  className="setup-page__input"
                  value={draft.formData.rentType || 'Annually'}
                  onChange={(e) => {
                    updateDraft({
                      formData: {
                        ...draft.formData,
                        rentType: e.target.value,
                      },
                    })
                  }}
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Annually">Annually</option>
                  <option value="Lease">Lease</option>
                </select>
              </div>

              <div className="setup-page__field">
                <label>
                  {(draft.formData.rentType || 'Annually') === 'Monthly' ? 'Monthly' : 'Yearly'} rent amount
                </label>
                <div className="setup-page__input-row">
                  <span>₦</span>
                  <input
                    type="text"
                    placeholder="1,200,000"
                    value={draft.formData.rentAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '')
                      updateDraft({
                        formData: {
                          ...draft.formData,
                          rentAmount: val ? parseInt(val, 10).toLocaleString() : '',
                        },
                      })
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 3-State Rent Payment Status Selector (NO EMOJIS - Lucide Icons used) */}
            <div className="setup-page__field" style={{ marginTop: 10 }}>
              <label>What is your current rent payment status?</label>

              <div className="setup-page__status-grid">
                {/* Option 1: NEW_CYCLE */}
                <div
                  className={`setup-page__status-card ${
                    draft.formData.tenancyStatus === 'NEW_CYCLE' ? 'setup-page__status-card--selected' : ''
                  }`}
                  onClick={() =>
                    updateDraft({
                      formData: { ...draft.formData, tenancyStatus: 'NEW_CYCLE' },
                    })
                  }
                >
                  <div className="setup-page__status-card-header">
                    <CreditCard size={18} className="setup-page__status-icon" color="var(--skin-primary, #c2501f)" />
                    <strong className="setup-page__status-card-title">Starting new cycle</strong>
                  </div>
                  <p className="setup-page__status-card-desc">
                    I need to pay for my upcoming rent period on Upward.
                  </p>
                </div>

                {/* Option 2: PAYING_BALANCE */}
                <div
                  className={`setup-page__status-card ${
                    draft.formData.tenancyStatus === 'PAYING_BALANCE' ? 'setup-page__status-card--selected' : ''
                  }`}
                  onClick={() =>
                    updateDraft({
                      formData: { ...draft.formData, tenancyStatus: 'PAYING_BALANCE' },
                    })
                  }
                >
                  <div className="setup-page__status-card-header">
                    <Scale size={18} className="setup-page__status-icon" color="var(--skin-primary, #c2501f)" />
                    <strong className="setup-page__status-card-title">Paying rent balance</strong>
                  </div>
                  <p className="setup-page__status-card-desc">
                    I already paid a portion directly to my landlord before joining.
                  </p>
                </div>

                {/* Option 3: ALREADY_PAID */}
                <div
                  className={`setup-page__status-card ${
                    draft.formData.tenancyStatus === 'ALREADY_PAID' ? 'setup-page__status-card--selected' : ''
                  }`}
                  onClick={() =>
                    updateDraft({
                      formData: { ...draft.formData, tenancyStatus: 'ALREADY_PAID' },
                    })
                  }
                >
                  <div className="setup-page__status-card-header">
                    <FileText size={18} className="setup-page__status-icon" color="var(--skin-primary, #c2501f)" />
                    <strong className="setup-page__status-card-title">Already fully paid</strong>
                  </div>
                  <p className="setup-page__status-card-desc">
                    I paid my rent in full; I want to log proof & build my score.
                  </p>
                </div>
              </div>
            </div>

            {/* Dynamic Inputs for PAYING_BALANCE */}
            {draft.formData.tenancyStatus === 'PAYING_BALANCE' && (
              <div className="setup-page__status-section" style={{ background: '#fcfaf7', padding: 16, borderRadius: 14, border: '1px solid #eae2d7' }}>
                <div className="setup-page__field" style={{ marginBottom: 12 }}>
                  <label>Amount already paid to landlord</label>
                  <div className="setup-page__input-row">
                    <span>₦</span>
                    <input
                      type="text"
                      placeholder="300,000"
                      value={draft.formData.amountAlreadyPaid}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '')
                        updateDraft({
                          formData: {
                            ...draft.formData,
                            amountAlreadyPaid: val ? parseInt(val, 10).toLocaleString() : '',
                          },
                        })
                      }}
                    />
                  </div>
                </div>

                {totalRentNum > 0 && paidNum > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      color: '#166534',
                      fontSize: 13.5,
                      fontWeight: 600,
                      marginBottom: 14,
                    }}
                  >
                    <CheckCircle2 size={18} />
                    <span>
                      Remaining balance to pay on Upward: <strong>{formatCurrency(remainingNum, 'NGN')}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Dynamic Inputs for Proof of Payment (Single File Constraint) */}
            {(draft.formData.tenancyStatus === 'PAYING_BALANCE' || draft.formData.tenancyStatus === 'ALREADY_PAID') && (
              <div className="setup-page__field" style={{ marginTop: 12 }}>
                <label>
                  {draft.formData.tenancyStatus === 'PAYING_BALANCE'
                    ? 'Upload proof of previous partial payment'
                    : 'Upload proof of full rent payment'}
                </label>

                {draft.formData.proofFileMeta || draft.formData.proofFile ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: '#f4eee5',
                      border: '1px solid #e5dbcd',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <FileText size={22} color="var(--skin-primary, #c2501f)" />
                      <div>
                        <strong style={{ display: 'block', fontSize: 13.5, color: '#1a1714' }}>
                          {draft.formData.proofFileMeta?.name || draft.formData.proofFile?.name || 'Attached Proof'}
                        </strong>
                        <span style={{ fontSize: 11.5, color: '#7a7268' }}>
                          Ready for submission
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemoveProofFile}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#dc2626',
                        cursor: 'pointer',
                        padding: 6,
                      }}
                      title="Remove file"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '20px 14px',
                      borderRadius: 12,
                      border: '2px dashed #d1c7b8',
                      background: '#fff',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <UploadCloud size={28} color="var(--skin-primary, #c2501f)" style={{ marginBottom: 6 }} />
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1714' }}>
                      Tap to attach bank receipt or transfer slip
                    </span>
                    <span style={{ fontSize: 11.5, color: '#7a7268', marginTop: 2 }}>
                      PNG, JPG, or PDF up to 10MB
                    </span>
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png"
                      onChange={handleProofFileSelect}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>
            )}

            {/* Dynamic Date Labels */}
            <div className="setup-page__field-row" style={{ marginTop: 14 }}>
              <div className="setup-page__field">
                <label>
                  {draft.formData.tenancyStatus === 'ALREADY_PAID'
                    ? 'Period paid starts'
                    : draft.formData.tenancyStatus === 'PAYING_BALANCE'
                      ? 'Current cycle starts'
                      : 'Tenancy period starts'}
                </label>
                <input
                  className="setup-page__input"
                  type="date"
                  value={draft.formData.rentStartDate}
                  onChange={(e) => {
                    const rentStartDate = toDateInputValue(e.target.value)
                    const nextFormData = { ...draft.formData, rentStartDate }
                    if (
                      nextFormData.rentEndDate &&
                      !validateRentDates(rentStartDate, nextFormData.rentEndDate)
                    ) {
                      nextFormData.rentEndDate = ''
                    }
                    updateDraft({ formData: nextFormData })
                  }}
                />
              </div>
              <div className="setup-page__field">
                <label>
                  {draft.formData.tenancyStatus === 'ALREADY_PAID'
                    ? 'Period paid ends'
                    : draft.formData.tenancyStatus === 'PAYING_BALANCE'
                      ? 'Current cycle due date'
                      : 'Next rent due date'}
                </label>
                <input
                  className="setup-page__input"
                  type="date"
                  min={draft.formData.rentStartDate || undefined}
                  value={draft.formData.rentEndDate}
                  onChange={(e) =>
                    updateDraft({
                      formData: {
                        ...draft.formData,
                        rentEndDate: toDateInputValue(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </div>
          </>
        )}

        {formStep === 'manager' && (
          <>
            <PaymentAccountForm
              value={draft.paymentDetails}
              onChange={(paymentDetails) => updateDraft({ paymentDetails })}
              intro="Where do you pay your rent? Enter your landlord or manager's bank account details."
              disabled={draft.isManagedProperty}
            />

            <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid #eae2d7' }}>
              <label style={{ fontSize: 14, fontWeight: 700, display: 'block', marginBottom: 6 }}>
                Landlord or Manager Contact
              </label>
              <p style={{ fontSize: 12.5, color: '#7a7268', marginBottom: 12, lineHeight: 1.45 }}>
                Enter your landlord or manager&apos;s email or phone number to invite them to verify your tenancy records.
              </p>

              {showFindOnly && (
                <div className="setup-page__field">
                  <div className="setup-page__lookup-row">
                    <input
                      className="setup-page__input"
                      type="text"
                      placeholder="Email or phone (+23480...)"
                      value={draft.pmEmail}
                      onChange={(e) => updateDraft({ pmEmail: e.target.value })}
                    />
                    <button
                      type="button"
                      className="setup-page__lookup-btn"
                      onClick={handleLookup}
                      disabled={verifyMutation.isPending}
                    >
                      {verifyMutation.isPending ? 'Finding…' : 'Find manager'}
                    </button>
                  </div>
                </div>
              )}

              {showManagerFound && (
                <div className="setup-page__pm-card">
                  <div className="setup-page__pm-card-inner">
                    <CheckCircle2 size={24} className="setup-page__pm-check" aria-hidden />
                    <div className="setup-page__pm-details">
                      <strong className="setup-page__pm-name">{draft.pmDetails?.name}</strong>
                      {draft.pmDetails?.businessName ? (
                        <span className="setup-page__pm-meta">{draft.pmDetails.businessName}</span>
                      ) : null}
                    </div>
                  </div>
                  <button type="button" className="setup-page__change-contact" onClick={() => setLookupDone(false)}>
                    Change
                  </button>
                </div>
              )}

              {showInviteForm && (
                <div className="setup-page__invite-form">
                  <div className="setup-page__pm-not-found-card">
                    <div className="setup-page__pm-not-found-content">
                      <strong className="setup-page__pm-not-found-title">
                        Manager not on Upward yet
                      </strong>
                      <span className="setup-page__pm-not-found-desc">
                        Provide their details below to send a verification invitation.
                      </span>
                    </div>
                    <button
                      type="button"
                      className="setup-page__search-again-btn"
                      onClick={() => setLookupDone(false)}
                    >
                      Search again
                    </button>
                  </div>

                  <div className="setup-page__field-row" style={{ marginTop: 14 }}>
                    <div className="setup-page__field">
                      <label>Manager type</label>
                      <select
                        className="setup-page__input"
                        value={draft.pmType}
                        onChange={(e) => updateDraft({ pmType: e.target.value })}
                      >
                        <option value="Property Manager">Property Manager</option>
                        <option value="Landlord">Landlord</option>
                        <option value="Lawyer">Lawyer / Agent</option>
                      </select>
                    </div>
                    <div className="setup-page__field">
                      <label>Manager full name</label>
                      <input
                        className="setup-page__input"
                        type="text"
                        placeholder="e.g. Chief Adeleke"
                        value={draft.formData.pmName}
                        onChange={(e) =>
                          updateDraft({ formData: { ...draft.formData, pmName: e.target.value } })
                        }
                      />
                    </div>
                  </div>

                  <div className="setup-page__field-row" style={{ marginTop: 12 }}>
                    <div className="setup-page__field">
                      <label>Manager email (for invitation)</label>
                      <input
                        className="setup-page__input"
                        type="email"
                        placeholder="landlord@example.com"
                        value={draft.pmInviteEmail || draft.pmEmail}
                        onChange={(e) => updateDraft({ pmInviteEmail: e.target.value })}
                      />
                    </div>
                    <div className="setup-page__field">
                      <label>Company / Estate name (optional)</label>
                      <input
                        className="setup-page__input"
                        type="text"
                        placeholder="e.g. Haven Properties"
                        value={draft.companyName}
                        onChange={(e) => updateDraft({ companyName: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </SetupPageShell>
  )
}
