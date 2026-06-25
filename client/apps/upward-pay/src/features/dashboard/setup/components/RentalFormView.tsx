'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { ArrowRight, CheckCircle2, Search, UserPlus, UserX } from 'lucide-react'
import { api } from '@/lib/api'
import { COUNTRIES, STATES } from '@/lib/location-data'
import { useToast } from '@/components/common/Toast'
import { useSetupDraft } from '../SetupDraftContext'
import { SETUP_PATHS, setupRentalListPath, useSetupMode } from '../setupPaths'
import { SetupPageShell, SetupPrimaryButton } from './SetupPageShell'
import { PayFlowPrimaryButton, PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import { type SetupDraft } from '../setupDraft'
import {
  PaymentAccountForm,
  isPaymentAccountResolved,
} from '@/features/dashboard/components/payment/PaymentAccountForm'
import { toDateInputValue, validateRentDates } from '../rentalDates'

type RentalFormStep = 'property' | 'payment' | 'manager'

function shouldRestoreLookup(draft: SetupDraft, isEdit: boolean): boolean {
  if (!draft.pmEmail.trim()) return false
  if (draft.pmFound && draft.pmDetails) return true
  if (isEdit) return true
  if (!draft.pmFound && draft.formData.pmName.trim()) return true
  return false
}

function initialFormStep(draft: SetupDraft, isEdit: boolean, isNew: boolean): RentalFormStep {
  if (isEdit && draft.formData.uuid && !isNew) return 'property'
  return 'property'
}

export function RentalFormView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const { draft, updateDraft } = useSetupDraft()
  const { isEdit, withMode, returnTo } = useSetupMode()
  const isNew = searchParams.get('new') === '1'
  const isEditingExisting = isEdit && !!draft.formData.uuid && !isNew

  const [lookupDone, setLookupDone] = useState(() => shouldRestoreLookup(draft, isEdit))
  const [formStep, setFormStep] = useState<RentalFormStep>(() =>
    initialFormStep(draft, isEdit, isNew),
  )
  const editHydratedUuid = useRef<string | null>(null)

  useEffect(() => {
    if (!isEdit || !draft.formData.uuid || isNew) return
    if (editHydratedUuid.current === draft.formData.uuid) return

    editHydratedUuid.current = draft.formData.uuid
    setFormStep('property')
    if (draft.pmEmail) {
      setLookupDone(shouldRestoreLookup(draft, isEdit))
    }
  }, [isEdit, isNew, draft.formData.uuid, draft.pmEmail, draft.pmFound, draft.pmDetails])

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

  const validatePropertyStep = () => {
    const { formData } = draft
    if (!formData.address.trim() || !formData.area.trim()) {
      toast.error('Please provide property address and area.', 'Required')
      return false
    }
    if (!formData.rentAmount || !formData.rentStartDate || !formData.rentEndDate) {
      toast.error('Please complete rent amount and tenancy dates.', 'Required')
      return false
    }
    const dateError = validateRentDates(formData.rentStartDate, formData.rentEndDate)
    if (dateError) {
      toast.error(dateError, 'Invalid dates')
      return false
    }
    return true
  }

  const validatePaymentStep = () => {
    if (!isPaymentAccountResolved(draft.paymentDetails)) {
      toast.error('Please enter and verify a valid bank account.', 'Required')
      return false
    }
    return true
  }

  const validateManagerStep = () => {
    if (!draft.pmEmail.trim()) {
      toast.error('Please enter your manager or landlord contact.', 'Required')
      return false
    }
    if (!lookupDone) {
      toast.error('Tap “Find manager” to verify their contact.', 'Required')
      return false
    }
    if (!draft.pmFound && !draft.formData.pmName.trim()) {
      toast.error('Please enter the manager or landlord name.', 'Required')
      return false
    }
    if (draft.pmFound && !draft.pmDetails) {
      toast.error('Property manager details are missing.', 'Required')
      return false
    }
    return true
  }

  const goToConfirm = () => {
    router.push(withMode(SETUP_PATHS.confirm))
  }

  const handlePropertyContinue = () => {
    if (!validatePropertyStep()) return
    setFormStep('payment')
  }

  const handlePaymentContinue = () => {
    if (!validatePropertyStep()) {
      setFormStep('property')
      return
    }
    if (!validatePaymentStep()) return
    setFormStep('manager')
  }

  const handleManagerContinue = () => {
    if (!validatePropertyStep()) {
      setFormStep('property')
      return
    }
    if (!validatePaymentStep()) {
      setFormStep('payment')
      return
    }
    if (!validateManagerStep()) return
    updateDraft({ landlordSkipped: false })
    goToConfirm()
  }

  const handleSkipLandlord = () => {
    if (!validatePropertyStep()) {
      setFormStep('property')
      return
    }
    if (!validatePaymentStep()) {
      setFormStep('payment')
      return
    }
    updateDraft({ landlordSkipped: true })
    goToConfirm()
  }

  const handleBack = () => {
    if (formStep === 'payment') {
      setFormStep('property')
      return
    }
    if (formStep === 'manager') {
      setFormStep('payment')
      return
    }
    if (formStep === 'property' && isEditingExisting) {
      router.push(setupRentalListPath())
      return
    }
    if (formStep === 'property' && isEdit && !returnTo) {
      router.push(setupRentalListPath())
      return
    }
    if (returnTo) {
      router.push(returnTo)
      return
    }
    router.push(isEdit ? SETUP_PATHS.profile : SETUP_PATHS.dashboard)
  }

  const showInviteForm = lookupDone && !draft.pmFound
  const showManagerFound = lookupDone && draft.pmFound && draft.pmDetails
  const showFindOnly = !lookupDone

  const handleChangeContact = () => {
    setLookupDone(false)
    updateDraft({
      pmFound: false,
      pmDetails: null,
      landlordSkipped: false,
      pmInviteEmail: '',
      companyName: '',
      formData: { ...draft.formData, pmName: '' },
    })
  }

  const pageTitle =
    formStep === 'property'
      ? isEditingExisting
        ? 'Property details'
        : 'Where do you live?'
      : formStep === 'payment'
        ? 'Payment details'
        : isEditingExisting
          ? 'Manager details'
          : isEdit
            ? 'Add property'
            : 'Landlord or manager (optional)'

  const pageSubtitle =
    formStep === 'property'
      ? isEditingExisting
        ? 'Update address, rent amount, and tenancy dates for this property.'
        : 'We use this to verify your tenancy and track on-time payments.'
      : formStep === 'payment'
        ? 'Where should your rent be paid? We verify the account before you continue.'
        : isEditingExisting
          ? 'Change who manages this property, or skip if you do not know them yet.'
          : "Optional — invite your landlord, lawyer, or manager if you'd like."

  const handlePrimaryContinue = () => {
    if (formStep === 'property') handlePropertyContinue()
    else if (formStep === 'payment') handlePaymentContinue()
    else handleManagerContinue()
  }

  const footer = isEdit ? (
  <>
    {formStep === 'manager' ? (
      <button
        type="button"
        className="setup-page__change-contact"
        onClick={handleSkipLandlord}
        style={{ marginBottom: 12, width: '100%' }}
      >
        Skip for now
      </button>
    ) : null}
    <PayFlowPrimaryButton onClick={handlePrimaryContinue}>
      {formStep === 'manager' ? 'Continue' : 'Continue'}
    </PayFlowPrimaryButton>
  </>
  ) : (
    <>
      {formStep === 'manager' ? (
        <button
          type="button"
          className="setup-page__change-contact"
          onClick={handleSkipLandlord}
          style={{ marginBottom: 12, width: '100%' }}
        >
          Skip for now
        </button>
      ) : null}
      <SetupPrimaryButton onClick={handlePrimaryContinue}>
        Continue
        <ArrowRight size={18} aria-hidden />
      </SetupPrimaryButton>
    </>
  )

  const content = (
    <>
      {formStep === 'property' && (
        <div className="setup-page__fields">
          <div className="setup-page__field">
            <label>Property address</label>
            <input
              className="setup-page__input"
              type="text"
              placeholder="14 Admiralty Way, Lekki"
              value={draft.formData.address}
              onChange={(e) =>
                updateDraft({ formData: { ...draft.formData, address: e.target.value } })
              }
            />
          </div>

          <div className="setup-page__field-row">
            <div className="setup-page__field">
              <label>Area</label>
              <input
                className="setup-page__input"
                type="text"
                placeholder="Lekki"
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

          <div className="setup-page__field">
            <label>Yearly rent amount</label>
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

          <div className="setup-page__field-row">
            <div className="setup-page__field">
              <label>Lease start</label>
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
              <label>Next rent due</label>
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
        </div>
      )}

      {formStep === 'payment' && (
        <PaymentAccountForm
          value={draft.paymentDetails}
          onChange={(paymentDetails) => updateDraft({ paymentDetails })}
          intro=""
        />
      )}

      {formStep === 'manager' && (
        <div className="setup-page__fields">
          {showFindOnly && (
            <div className="setup-page__field">
              <label>Manager&apos;s email or phone</label>
              <div className="setup-page__lookup-row">
                <input
                  className="setup-page__input"
                  type="text"
                  placeholder="manager@email.com or +2348030000000"
                  value={draft.pmEmail}
                  onChange={(e) =>
                    updateDraft({ pmEmail: e.target.value, landlordSkipped: false })
                  }
                />
                <button
                  type="button"
                  className="setup-page__lookup-btn"
                  onClick={handleLookup}
                  disabled={verifyMutation.isPending || !draft.pmEmail.trim()}
                >
                  {verifyMutation.isPending ? (
                    '…'
                  ) : (
                    <>
                      <Search size={16} aria-hidden />
                      Find
                    </>
                  )}
                </button>
              </div>
              <p className="setup-page__hint">International format for phone (e.g. +2348030000000)</p>
            </div>
          )}

          {showManagerFound && draft.pmDetails && (
            <div className="setup-page__status setup-page__status--success">
              <CheckCircle2 size={20} />
              <div>
                <p className="setup-page__status-label">Manager found on Upward</p>
                <p className="setup-page__status-value">{draft.pmDetails.businessName}</p>
                <button type="button" className="setup-page__change-contact" onClick={handleChangeContact}>
                  Use a different contact
                </button>
              </div>
            </div>
          )}

          {showInviteForm && (
            <>
              <div className="setup-page__contact-chip">
                <span>{draft.pmEmail}</span>
                <button type="button" onClick={handleChangeContact}>
                  Change
                </button>
              </div>

              <div className="setup-page__status setup-page__status--not-found">
                <UserX size={20} />
                <div>
                  <p className="setup-page__status-label">Manager not found on Upward</p>
                  <p className="setup-page__status-value">
                    We couldn&apos;t find a manager with this contact. Add their details below and
                    we&apos;ll send them an invite.
                  </p>
                </div>
              </div>
            </>
          )}

          {showInviteForm && (
            <div className="setup-page__invite-card">
              <div className="setup-page__invite-header">
                <span className="setup-page__invite-icon" aria-hidden>
                  <UserPlus size={20} />
                </span>
                <div>
                  <p className="setup-page__invite-title">Invite your manager</p>
                  <p className="setup-page__invite-desc">
                    Tell us who they are so we can get them set up on Upward.
                  </p>
                </div>
              </div>

              <div className="setup-page__invite-fields">
                <div className="setup-page__field">
                  <label>Contact type</label>
                  <select
                    className="setup-page__input"
                    value={draft.pmType}
                    onChange={(e) => updateDraft({ pmType: e.target.value })}
                  >
                    <option value="Property Manager">Property Manager</option>
                    <option value="Lawyer">Lawyer</option>
                    <option value="Caretaker">Caretaker</option>
                    <option value="Landlord">Landlord</option>
                  </select>
                </div>
                <div className="setup-page__field">
                  <label>{draft.pmType === 'Landlord' ? 'Landlord name' : 'Manager name'}</label>
                  <input
                    className="setup-page__input"
                    type="text"
                    placeholder="Full name"
                    value={draft.formData.pmName}
                    onChange={(e) =>
                      updateDraft({ formData: { ...draft.formData, pmName: e.target.value } })
                    }
                  />
                </div>
                {draft.pmType === 'Property Manager' && (
                  <div className="setup-page__field">
                    <label>Company name (optional)</label>
                    <input
                      className="setup-page__input"
                      type="text"
                      placeholder="Company name"
                      value={draft.companyName}
                      onChange={(e) => updateDraft({ companyName: e.target.value })}
                    />
                  </div>
                )}
                {/^\+234\d{10}$/.test(draft.pmEmail.trim()) && (
                  <div className="setup-page__field">
                    <label>Manager email</label>
                    <input
                      className="setup-page__input"
                      type="email"
                      placeholder="manager@email.com"
                      value={draft.pmInviteEmail}
                      onChange={(e) => updateDraft({ pmInviteEmail: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )

  if (isEdit) {
    return (
      <PayPageShell
        title={pageTitle}
        subtitle={pageSubtitle}
        showBack
        onBack={handleBack}
        footer={footer}
      >
        {content}
      </PayPageShell>
    )
  }

  return (
    <SetupPageShell
      title={pageTitle}
      subtitle={pageSubtitle}
      onBack={handleBack}
      footer={footer}
    >
      {content}
    </SetupPageShell>
  )
}
