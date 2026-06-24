'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { ArrowRight, CheckCircle2, Search, UserPlus, UserX } from 'lucide-react'
import { api } from '@/lib/api'
import { COUNTRIES, STATES } from '@/lib/location-data'
import { useToast } from '@/components/common/Toast'
import { useSetupDraft } from '../SetupDraftContext'
import { SETUP_PATHS, useSetupMode } from '../setupPaths'
import { SetupPageShell, SetupPrimaryButton } from './SetupPageShell'
import { type SetupDraft } from '../setupDraft'

type RentalFormStep = 'manager' | 'property'

function shouldRestoreLookup(draft: SetupDraft, isEdit: boolean): boolean {
  if (!draft.pmEmail.trim()) return false
  if (draft.pmFound && draft.pmDetails) return true
  if (isEdit) return true
  // Mid-flow restore: invite path only after a prior not-found lookup
  if (!draft.pmFound && draft.formData.pmName.trim()) return true
  return false
}

export function RentalFormView() {
  const router = useRouter()
  const toast = useToast()
  const { draft, updateDraft } = useSetupDraft()
  const { isEdit, withMode, returnTo } = useSetupMode()
  const [lookupDone, setLookupDone] = useState(() => shouldRestoreLookup(draft, isEdit))
  const [formStep, setFormStep] = useState<RentalFormStep>('manager')

  const verifyMutation = useMutation({
    mutationFn: async (identifier: string) => {
      const res = await api.post('/user/pm-connection/verify', { identifier })
      return res.data
    },
    onSuccess: (data) => {
      if (data.found && data.pm) {
        updateDraft({
          pmFound: true,
          pmDetails: {
            id: data.pm.id,
            name: `${data.pm.firstName} ${data.pm.lastName}`,
            businessName: data.pm.businessName || `${data.pm.firstName} ${data.pm.lastName}`,
          },
        })
      } else {
        updateDraft({ pmFound: false, pmDetails: null })
      }
      setLookupDone(true)
    },
    onError: () => {
      toast.error('Unable to verify this detail. You can still enter details manually.', 'Check Failed')
      updateDraft({ pmFound: false, pmDetails: null })
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

  const handleManagerContinue = () => {
    if (!validateManagerStep()) return
    setFormStep('property')
  }

  const handlePropertyContinue = () => {
    if (!validateManagerStep()) {
      setFormStep('manager')
      return
    }

    const { formData, pmFound, pmDetails } = draft
    if (!formData.address.trim() || !formData.area.trim()) {
      toast.error('Please provide property address and area.', 'Required')
      return
    }
    if (!formData.rentAmount || !formData.rentStartDate || !formData.rentEndDate) {
      toast.error('Please complete rent amount and tenancy dates.', 'Required')
      return
    }
    if (pmFound && !pmDetails) {
      toast.error('Property manager details are missing.', 'Required')
      return
    }
    router.push(withMode(SETUP_PATHS.confirm))
  }

  const handleBack = () => {
    if (formStep === 'property') {
      setFormStep('manager')
      return
    }
    if (returnTo) {
      router.push(returnTo)
      return
    }
    router.push(isEdit ? SETUP_PATHS.profile : SETUP_PATHS.dashboard)
  }

  const isManagerStep = formStep === 'manager'
  const showInviteForm = lookupDone && !draft.pmFound
  const showManagerFound = lookupDone && draft.pmFound && draft.pmDetails
  const showFindOnly = !lookupDone

  const handleChangeContact = () => {
    setLookupDone(false)
    updateDraft({
      pmFound: false,
      pmDetails: null,
      pmInviteEmail: '',
      companyName: '',
      formData: { ...draft.formData, pmName: '' },
    })
  }

  return (
    <SetupPageShell
      onBack={handleBack}
      footer={
        <SetupPrimaryButton onClick={isManagerStep ? handleManagerContinue : handlePropertyContinue}>
          Continue
          <ArrowRight size={18} aria-hidden />
        </SetupPrimaryButton>
      }
    >
      {isManagerStep ? (
        <>
          <h2 className="setup-page__title">Who manages your home?</h2>
          <p className="setup-page__subtitle">
            Search by email or phone. If they&apos;re not on Upward yet, we&apos;ll invite them for you.
          </p>

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
                    onChange={(e) => updateDraft({ pmEmail: e.target.value })}
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
        </>
      ) : (
        <>
          <h2 className="setup-page__title">Where do you live?</h2>
          <p className="setup-page__subtitle">
            We use this to verify your tenancy and track on-time payments.
          </p>

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
                  onChange={(e) =>
                    updateDraft({
                      formData: { ...draft.formData, rentStartDate: e.target.value },
                    })
                  }
                />
              </div>
              <div className="setup-page__field">
                <label>Next rent due</label>
                <input
                  className="setup-page__input"
                  type="date"
                  value={draft.formData.rentEndDate}
                  onChange={(e) =>
                    updateDraft({
                      formData: { ...draft.formData, rentEndDate: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          </div>
        </>
      )}
    </SetupPageShell>
  )
}
