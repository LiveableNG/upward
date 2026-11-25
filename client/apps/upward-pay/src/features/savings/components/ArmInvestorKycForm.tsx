'use client'

import React, { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  AlertCircle,
  CheckCircle2,
  FileBadge2,
  Home,
  Loader2,
  Lock,
  ShieldCheck,
  UserCheck,
} from 'lucide-react'
import type {
  MeansOfIdentificationType,
  SavingsOnboardingPrefillData,
  UploadedKycDocument,
} from '../services/savingsService'
import {
  MEANS_OF_ID_OPTIONS,
  NIGERIAN_STATES,
  SAVINGS_CONSENT_DOC_VERSION,
  SAVINGS_FUND_NAME,
  SAVINGS_TERMS_VERSION,
  UTILITY_BILL_GUIDANCE,
} from '../constants/savingsLegal'
import { KycDocumentUploadField } from './KycDocumentUploadField'
import { SavingsConsentCard } from './SavingsConsentCard'

export interface ArmInvestorKycFormValues {
  bvn: string
  nin: string
  means_of_id_type: MeansOfIdentificationType
  means_of_id_number: string
  means_of_id_issue_date: string
  means_of_id_expiry_date: string
  means_of_id_doc_key: string
  means_of_id_mime_type: string
  means_of_id_file_name: string
  residential_address_number: string
  residential_street: string
  residential_town: string
  residential_state: string
  utility_bill_issue_date: string
  utility_bill_doc_key: string
  utility_bill_mime_type: string
  utility_bill_file_name: string
  mothers_maiden_name: string
  occupation: string
  source_of_funds: 'Salary' | 'Business' | 'Savings' | 'Investment'
  income_range: string
  next_of_kin_name: string
  next_of_kin_relationship: string
  next_of_kin_phone: string
  accepted_terms: boolean
  accepted_arm_mandate: boolean
}

export interface ArmInvestorKycSubmitData {
  bvn?: string
  nin?: string
  means_of_id_type: MeansOfIdentificationType
  means_of_id_number?: string
  means_of_id_issue_date?: string
  means_of_id_expiry_date?: string
  means_of_id_doc_key: string
  means_of_id_mime_type: string
  means_of_id_file_name: string
  residential_address_number: string
  residential_street: string
  residential_town: string
  residential_state: string
  utility_bill_issue_date?: string
  utility_bill_doc_key: string
  utility_bill_mime_type: string
  utility_bill_file_name: string
  mothers_maiden_name: string
  occupation: string
  source_of_funds: 'Salary' | 'Business' | 'Savings' | 'Investment'
  income_range: string
  next_of_kin_name: string
  next_of_kin_relationship: string
  next_of_kin_phone: string
  consent_accepted: true
  terms_version: string
  consent_doc_version: string
}

interface ArmInvestorKycFormProps {
  formId?: string
  prefill?: SavingsOnboardingPrefillData | null
  annualRatePct?: number
  fundName?: string
  serverError?: string | null
  isSubmitting?: boolean
  hideSubmitButton?: boolean
  submitLabel?: string
  onValidityChange?: (isValid: boolean) => void
  onSubmit: (data: ArmInvestorKycSubmitData) => void | Promise<void>
}

function buildSchema(hasVerifiedBvn: boolean, hasVerifiedNin: boolean) {
  return z
    .object({
      bvn: z.string(),
      nin: z.string(),
      means_of_id_type: z.enum(['NIN', 'INTERNATIONAL_PASSPORT', 'DRIVERS_LICENSE']),
      means_of_id_number: z.string(),
      means_of_id_issue_date: z.string(),
      means_of_id_expiry_date: z.string(),
      means_of_id_doc_key: z.string().min(1, 'Please upload a valid Means of Identification.'),
      means_of_id_mime_type: z.string(),
      means_of_id_file_name: z.string(),
      residential_address_number: z.string().trim().min(1, 'House / plot number is required.'),
      residential_street: z.string().trim().min(3, 'Street address is required.'),
      residential_town: z.string().trim().min(2, 'City / town is required.'),
      residential_state: z.string().trim().min(2, 'State is required.'),
      utility_bill_issue_date: z.string(),
      utility_bill_doc_key: z
        .string()
        .min(1, 'Please upload a utility bill or proof of address document.'),
      utility_bill_mime_type: z.string(),
      utility_bill_file_name: z.string(),
      mothers_maiden_name: z.string().trim().min(2, "Mother's maiden name is required."),
      occupation: z.string().trim().min(2, 'Occupation is required.'),
      source_of_funds: z.enum(['Salary', 'Business', 'Savings', 'Investment']),
      income_range: z.string().min(1),
      next_of_kin_name: z.string().trim().min(2, 'Next of kin full name is required.'),
      next_of_kin_relationship: z.string().min(1),
      next_of_kin_phone: z.string().trim().min(10, 'Valid Next of Kin phone number is required.'),
      accepted_terms: z.boolean().refine((v) => v === true, {
        message: 'Please accept the Rent Savings Terms & Conditions.',
      }),
      accepted_arm_mandate: z.boolean().refine((v) => v === true, {
        message: 'Please confirm the ARM Money Market Fund Consent Mandate.',
      }),
    })
    .superRefine((vals, ctx) => {
      if (!hasVerifiedBvn && !/^\d{11}$/.test(vals.bvn.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['bvn'],
          message: 'BVN must be exactly 11 digits.',
        })
      }
      if (!hasVerifiedNin && !/^\d{11}$/.test(vals.nin.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['nin'],
          message: 'NIN must be exactly 11 digits (compulsory alongside BVN).',
        })
      }
      if (
        vals.means_of_id_type !== 'NIN' &&
        vals.means_of_id_number.trim().length < 5
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['means_of_id_number'],
          message: 'Enter your valid ID number.',
        })
      }
    })
}

export function ArmInvestorKycForm({
  formId = 'arm-investor-kyc-form',
  prefill,
  annualRatePct = 16,
  fundName = SAVINGS_FUND_NAME,
  serverError,
  isSubmitting = false,
  hideSubmitButton = false,
  submitLabel = 'Verify & Activate Rent Savings',
  onValidityChange,
  onSubmit,
}: ArmInvestorKycFormProps) {
  const hasVerifiedBvn = Boolean(prefill?.has_verified_bvn)
  const hasVerifiedNin = Boolean(prefill?.has_verified_nin)

  const schema = useMemo(
    () => buildSchema(hasVerifiedBvn, hasVerifiedNin),
    [hasVerifiedBvn, hasVerifiedNin],
  )

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isValid },
  } = useForm<ArmInvestorKycFormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      bvn: prefill?.bvn || '',
      nin: prefill?.nin || '',
      means_of_id_type: prefill?.means_of_id_type || 'NIN',
      means_of_id_number: '',
      means_of_id_issue_date: prefill?.means_of_id_issue_date || '',
      means_of_id_expiry_date: prefill?.means_of_id_expiry_date || '',
      means_of_id_doc_key: prefill?.means_of_id_doc_key || '',
      means_of_id_mime_type: prefill?.means_of_id_mime_type || 'image/jpeg',
      means_of_id_file_name: prefill?.means_of_id_file_name || '',
      residential_address_number: prefill?.residential_address_number || '',
      residential_street: prefill?.residential_street || '',
      residential_town: prefill?.residential_town || '',
      residential_state: prefill?.residential_state || 'Lagos',
      utility_bill_issue_date: prefill?.utility_bill_issue_date || '',
      utility_bill_doc_key: prefill?.utility_bill_doc_key || '',
      utility_bill_mime_type: prefill?.utility_bill_mime_type || 'image/jpeg',
      utility_bill_file_name: prefill?.utility_bill_file_name || '',
      mothers_maiden_name: prefill?.mothers_maiden_name || '',
      occupation: prefill?.occupation || '',
      source_of_funds: prefill?.source_of_funds || 'Salary',
      income_range: prefill?.income_range || '1M-5M',
      next_of_kin_name: prefill?.next_of_kin_name || '',
      next_of_kin_relationship: prefill?.next_of_kin_relationship || 'Spouse',
      next_of_kin_phone: prefill?.next_of_kin_phone || '',
      accepted_terms: false,
      accepted_arm_mandate: false,
    },
  })

  // Hydrate prefill asynchronously when loaded
  useEffect(() => {
    if (!prefill) return
    reset((curr) => ({
      ...curr,
      bvn: curr.bvn || prefill.bvn || '',
      nin: curr.nin || prefill.nin || '',
      means_of_id_type: curr.means_of_id_type || prefill.means_of_id_type || 'NIN',
      means_of_id_doc_key: curr.means_of_id_doc_key || prefill.means_of_id_doc_key || '',
      means_of_id_mime_type: curr.means_of_id_mime_type || prefill.means_of_id_mime_type || 'image/jpeg',
      means_of_id_file_name: curr.means_of_id_file_name || prefill.means_of_id_file_name || '',
      residential_address_number:
        curr.residential_address_number || prefill.residential_address_number || '',
      residential_street: curr.residential_street || prefill.residential_street || '',
      residential_town: curr.residential_town || prefill.residential_town || '',
      residential_state: curr.residential_state || prefill.residential_state || 'Lagos',
      utility_bill_issue_date: curr.utility_bill_issue_date || prefill.utility_bill_issue_date || '',
      utility_bill_doc_key: curr.utility_bill_doc_key || prefill.utility_bill_doc_key || '',
      utility_bill_mime_type:
        curr.utility_bill_mime_type || prefill.utility_bill_mime_type || 'image/jpeg',
      utility_bill_file_name: curr.utility_bill_file_name || prefill.utility_bill_file_name || '',
      mothers_maiden_name: curr.mothers_maiden_name || prefill.mothers_maiden_name || '',
      occupation: curr.occupation || prefill.occupation || '',
      source_of_funds: curr.source_of_funds || prefill.source_of_funds || 'Salary',
      income_range: curr.income_range || prefill.income_range || '1M-5M',
      next_of_kin_name: curr.next_of_kin_name || prefill.next_of_kin_name || '',
      next_of_kin_relationship:
        curr.next_of_kin_relationship || prefill.next_of_kin_relationship || 'Spouse',
      next_of_kin_phone: curr.next_of_kin_phone || prefill.next_of_kin_phone || '',
    }))
  }, [prefill, reset])

  useEffect(() => {
    onValidityChange?.(isValid)
  }, [isValid, onValidityChange])

  const bvnVal = useWatch({ control, name: 'bvn' }) || ''
  const ninVal = useWatch({ control, name: 'nin' }) || ''
  const meansOfIdType = useWatch({ control, name: 'means_of_id_type' }) || 'NIN'
  const idDocKey = useWatch({ control, name: 'means_of_id_doc_key' }) || ''
  const idDocName = useWatch({ control, name: 'means_of_id_file_name' }) || ''
  const idDocMime = useWatch({ control, name: 'means_of_id_mime_type' }) || 'image/jpeg'
  const utilityDocKey = useWatch({ control, name: 'utility_bill_doc_key' }) || ''
  const utilityDocName = useWatch({ control, name: 'utility_bill_file_name' }) || ''
  const utilityDocMime = useWatch({ control, name: 'utility_bill_mime_type' }) || 'image/jpeg'
  const acceptedTerms = useWatch({ control, name: 'accepted_terms' })
  const acceptedArmMandate = useWatch({ control, name: 'accepted_arm_mandate' })

  const activeIdOption =
    MEANS_OF_ID_OPTIONS.find((opt) => opt.value === meansOfIdType) || MEANS_OF_ID_OPTIONS[0]

  const handleIdDocUploaded = (doc: UploadedKycDocument) => {
    setValue('means_of_id_doc_key', doc.doc_key, { shouldValidate: true })
    setValue('means_of_id_mime_type', doc.mime_type, { shouldValidate: true })
    setValue('means_of_id_file_name', doc.file_name, { shouldValidate: true })
  }

  const handleUtilityDocUploaded = (doc: UploadedKycDocument) => {
    setValue('utility_bill_doc_key', doc.doc_key, { shouldValidate: true })
    setValue('utility_bill_mime_type', doc.mime_type, { shouldValidate: true })
    setValue('utility_bill_file_name', doc.file_name, { shouldValidate: true })
  }

  const handleInternalSubmit = handleSubmit(async (vals) => {
    await onSubmit({
      bvn: vals.bvn.trim().length === 11 ? vals.bvn.trim() : undefined,
      nin: vals.nin.trim().length === 11 ? vals.nin.trim() : undefined,
      means_of_id_type: vals.means_of_id_type,
      means_of_id_number:
        vals.means_of_id_type === 'NIN'
          ? vals.nin.trim() || undefined
          : vals.means_of_id_number.trim(),
      means_of_id_issue_date: vals.means_of_id_issue_date || undefined,
      means_of_id_expiry_date: vals.means_of_id_expiry_date || undefined,
      means_of_id_doc_key: vals.means_of_id_doc_key,
      means_of_id_mime_type: vals.means_of_id_mime_type || 'image/jpeg',
      means_of_id_file_name: vals.means_of_id_file_name || 'id_card.jpg',
      residential_address_number: vals.residential_address_number.trim(),
      residential_street: vals.residential_street.trim(),
      residential_town: vals.residential_town.trim(),
      residential_state: vals.residential_state.trim(),
      utility_bill_issue_date: vals.utility_bill_issue_date || undefined,
      utility_bill_doc_key: vals.utility_bill_doc_key,
      utility_bill_mime_type: vals.utility_bill_mime_type || 'image/jpeg',
      utility_bill_file_name: vals.utility_bill_file_name || 'utility_bill.jpg',
      mothers_maiden_name: vals.mothers_maiden_name.trim(),
      occupation: vals.occupation.trim(),
      source_of_funds: vals.source_of_funds,
      income_range: vals.income_range || '1M-5M',
      next_of_kin_name: vals.next_of_kin_name.trim(),
      next_of_kin_relationship: vals.next_of_kin_relationship || 'Spouse',
      next_of_kin_phone: vals.next_of_kin_phone.trim(),
      consent_accepted: true,
      terms_version: SAVINGS_TERMS_VERSION,
      consent_doc_version: SAVINGS_CONSENT_DOC_VERSION,
    })
  })

  return (
    <form id={formId} onSubmit={handleInternalSubmit} className="arm-kyc-form" noValidate>
      {serverError && (
        <div className="arm-kyc-form__alert" role="alert">
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{serverError}</span>
        </div>
      )}

      {/* SECTION 1: IDENTITY VERIFICATION (BVN + NIN + MEANS OF ID UPLOAD) */}
      <section className="arm-kyc-form__section">
        <div className="arm-kyc-form__section-header">
          <FileBadge2 size={17} className="arm-kyc-form__section-icon" />
          <div>
            <h4 className="arm-kyc-form__section-title">1. Identity Verification (BVN &amp; NIN)</h4>
            <p className="arm-kyc-form__section-sub">
              Required by CBN &amp; SEC for {fundName} (ARMMMF)
            </p>
          </div>
        </div>

        {/* BVN */}
        {hasVerifiedBvn ? (
          <div className="arm-kyc-form__verified-pill">
            <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
            <span>BVN verified on file ({prefill?.masked_bvn || '*******'})</span>
          </div>
        ) : (
          <div className="rent-calculator__field">
            <label className="rent-calculator__label">Bank Verification Number (BVN)</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={11}
              placeholder="Enter 11-digit BVN"
              className="rent-calculator__input rent-calculator__input--no-prefix"
              value={bvnVal}
              onChange={(e) =>
                setValue('bvn', e.target.value.replace(/\D/g, '').slice(0, 11), {
                  shouldValidate: true,
                })
              }
              disabled={isSubmitting}
            />
            {errors.bvn ? (
              <span className="arm-kyc-form__field-error">{errors.bvn.message}</span>
            ) : (
              <span className="arm-kyc-form__field-hint">{bvnVal.length}/11 digits</span>
            )}
          </div>
        )}

        {/* NIN — Always Compulsory */}
        {hasVerifiedNin ? (
          <div className="arm-kyc-form__verified-pill">
            <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
            <span>NIN verified on file ({prefill?.masked_nin || '*******'})</span>
          </div>
        ) : (
          <div className="rent-calculator__field">
            <label className="rent-calculator__label">National Identity Number (NIN)</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={11}
              placeholder="Enter 11-digit NIN"
              className="rent-calculator__input rent-calculator__input--no-prefix"
              value={ninVal}
              onChange={(e) =>
                setValue('nin', e.target.value.replace(/\D/g, '').slice(0, 11), {
                  shouldValidate: true,
                })
              }
              disabled={isSubmitting}
            />
            {errors.nin ? (
              <span className="arm-kyc-form__field-error">{errors.nin.message}</span>
            ) : (
              <span className="arm-kyc-form__field-hint">
                Compulsory alongside BVN ({ninVal.length}/11 digits)
              </span>
            )}
          </div>
        )}

        {/* Valid Means of Identification */}
        <div className="rent-calculator__field">
          <label className="rent-calculator__label">Valid Means of Identification</label>
          <select
            className="rent-calculator__input rent-calculator__input--no-prefix"
            disabled={isSubmitting}
            {...register('means_of_id_type')}
          >
            {MEANS_OF_ID_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {activeIdOption.requiresSeparateNumber && (
          <>
            <div className="rent-calculator__field">
              <label className="rent-calculator__label">
                {meansOfIdType === 'INTERNATIONAL_PASSPORT'
                  ? 'International Passport Number'
                  : "Driver's License Number"}
              </label>
              <input
                type="text"
                placeholder={
                  meansOfIdType === 'INTERNATIONAL_PASSPORT'
                    ? 'e.g. A12345678'
                    : 'e.g. ABC123456789'
                }
                className="rent-calculator__input rent-calculator__input--no-prefix"
                disabled={isSubmitting}
                {...register('means_of_id_number')}
              />
              {errors.means_of_id_number && (
                <span className="arm-kyc-form__field-error">
                  {errors.means_of_id_number.message}
                </span>
              )}
            </div>

            <div className="arm-kyc-form__grid-2">
              <div className="rent-calculator__field">
                <label className="rent-calculator__label">Issue Date (Optional)</label>
                <input
                  type="date"
                  className="rent-calculator__input rent-calculator__input--no-prefix"
                  disabled={isSubmitting}
                  {...register('means_of_id_issue_date')}
                />
              </div>
              <div className="rent-calculator__field">
                <label className="rent-calculator__label">Expiry Date (Optional)</label>
                <input
                  type="date"
                  className="rent-calculator__input rent-calculator__input--no-prefix"
                  disabled={isSubmitting}
                  {...register('means_of_id_expiry_date')}
                />
              </div>
            </div>
          </>
        )}

        <KycDocumentUploadField
          kind="id_card"
          label={`Upload ${activeIdOption.label}`}
          hint={activeIdOption.hint}
          value={
            idDocKey
              ? {
                  doc_key: idDocKey,
                  file_name: idDocName || 'Identification Document',
                  mime_type: idDocMime,
                }
              : null
          }
          error={errors.means_of_id_doc_key?.message}
          disabled={isSubmitting}
          onUploaded={handleIdDocUploaded}
        />
      </section>

      {/* SECTION 2: RESIDENTIAL ADDRESS & PROOF OF ADDRESS (UTILITY BILL) */}
      <section className="arm-kyc-form__section">
        <div className="arm-kyc-form__section-header">
          <Home size={17} className="arm-kyc-form__section-icon" />
          <div>
            <h4 className="arm-kyc-form__section-title">
              2. Residential Address &amp; Proof of Address
            </h4>
            <p className="arm-kyc-form__section-sub">
              Your utility bill verifies that your residential address is valid
            </p>
          </div>
        </div>

        <div className="arm-kyc-form__grid-2">
          <div className="rent-calculator__field">
            <label className="rent-calculator__label">House / Flat No.</label>
            <input
              type="text"
              placeholder="e.g. Plot 14 / Flat 2B"
              className="rent-calculator__input rent-calculator__input--no-prefix"
              disabled={isSubmitting}
              {...register('residential_address_number')}
            />
            {errors.residential_address_number && (
              <span className="arm-kyc-form__field-error">
                {errors.residential_address_number.message}
              </span>
            )}
          </div>
          <div className="rent-calculator__field">
            <label className="rent-calculator__label">State</label>
            <select
              className="rent-calculator__input rent-calculator__input--no-prefix"
              disabled={isSubmitting}
              {...register('residential_state')}
            >
              {NIGERIAN_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rent-calculator__field">
          <label className="rent-calculator__label">Street Address</label>
          <input
            type="text"
            placeholder="e.g. Admiralty Way, Lekki Phase 1"
            className="rent-calculator__input rent-calculator__input--no-prefix"
            disabled={isSubmitting}
            {...register('residential_street')}
          />
          {errors.residential_street && (
            <span className="arm-kyc-form__field-error">{errors.residential_street.message}</span>
          )}
        </div>

        <div className="arm-kyc-form__grid-2">
          <div className="rent-calculator__field">
            <label className="rent-calculator__label">City / Town</label>
            <input
              type="text"
              placeholder="e.g. Lekki / Ikeja"
              className="rent-calculator__input rent-calculator__input--no-prefix"
              disabled={isSubmitting}
              {...register('residential_town')}
            />
            {errors.residential_town && (
              <span className="arm-kyc-form__field-error">{errors.residential_town.message}</span>
            )}
          </div>
          <div className="rent-calculator__field">
            <label className="rent-calculator__label">Bill Date (Optional)</label>
            <input
              type="date"
              className="rent-calculator__input rent-calculator__input--no-prefix"
              disabled={isSubmitting}
              {...register('utility_bill_issue_date')}
            />
          </div>
        </div>

        <KycDocumentUploadField
          kind="utility_bill"
          label="Upload Proof of Address (Utility Bill)"
          hint={UTILITY_BILL_GUIDANCE}
          value={
            utilityDocKey
              ? {
                  doc_key: utilityDocKey,
                  file_name: utilityDocName || 'Proof of Address Document',
                  mime_type: utilityDocMime,
                }
              : null
          }
          error={errors.utility_bill_doc_key?.message}
          disabled={isSubmitting}
          onUploaded={handleUtilityDocUploaded}
        />
      </section>

      {/* SECTION 3: INVESTOR PROFILE & NEXT OF KIN */}
      <section className="arm-kyc-form__section">
        <div className="arm-kyc-form__section-header">
          <UserCheck size={17} className="arm-kyc-form__section-icon" />
          <div>
            <h4 className="arm-kyc-form__section-title">3. Investor Profile &amp; Next of Kin</h4>
            <p className="arm-kyc-form__section-sub">Required SEC suitability details</p>
          </div>
        </div>

        <div className="rent-calculator__field">
          <label className="rent-calculator__label">Mother&apos;s Maiden Name</label>
          <input
            type="text"
            placeholder="Mother's birth family name"
            className="rent-calculator__input rent-calculator__input--no-prefix"
            disabled={isSubmitting}
            {...register('mothers_maiden_name')}
          />
          {errors.mothers_maiden_name && (
            <span className="arm-kyc-form__field-error">{errors.mothers_maiden_name.message}</span>
          )}
        </div>

        <div className="arm-kyc-form__grid-2">
          <div className="rent-calculator__field">
            <label className="rent-calculator__label">Occupation</label>
            <input
              type="text"
              placeholder="e.g. Software Engineer"
              className="rent-calculator__input rent-calculator__input--no-prefix"
              disabled={isSubmitting}
              {...register('occupation')}
            />
            {errors.occupation && (
              <span className="arm-kyc-form__field-error">{errors.occupation.message}</span>
            )}
          </div>
          <div className="rent-calculator__field">
            <label className="rent-calculator__label">Source of Funds</label>
            <select
              className="rent-calculator__input rent-calculator__input--no-prefix"
              disabled={isSubmitting}
              {...register('source_of_funds')}
            >
              <option value="Salary">Salary</option>
              <option value="Business">Business</option>
              <option value="Savings">Savings</option>
              <option value="Investment">Investment</option>
            </select>
          </div>
        </div>

        <div className="arm-kyc-form__grid-2">
          <div className="rent-calculator__field">
            <label className="rent-calculator__label">Next of Kin Name</label>
            <input
              type="text"
              placeholder="Full legal name"
              className="rent-calculator__input rent-calculator__input--no-prefix"
              disabled={isSubmitting}
              {...register('next_of_kin_name')}
            />
            {errors.next_of_kin_name && (
              <span className="arm-kyc-form__field-error">{errors.next_of_kin_name.message}</span>
            )}
          </div>
          <div className="rent-calculator__field">
            <label className="rent-calculator__label">Relationship</label>
            <select
              className="rent-calculator__input rent-calculator__input--no-prefix"
              disabled={isSubmitting}
              {...register('next_of_kin_relationship')}
            >
              <option value="Spouse">Spouse</option>
              <option value="Parent">Parent</option>
              <option value="Sibling">Sibling</option>
              <option value="Child">Child</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="rent-calculator__field">
          <label className="rent-calculator__label">Next of Kin Phone Number</label>
          <input
            type="tel"
            placeholder="e.g. 0801 234 5678"
            className="rent-calculator__input rent-calculator__input--no-prefix"
            disabled={isSubmitting}
            {...register('next_of_kin_phone')}
          />
          {errors.next_of_kin_phone && (
            <span className="arm-kyc-form__field-error">{errors.next_of_kin_phone.message}</span>
          )}
        </div>
      </section>

      {/* SECTION 4: TERMS & CONDITIONS + ARM CONSENT MANDATE */}
      <SavingsConsentCard
        acceptedTerms={Boolean(acceptedTerms)}
        acceptedArmMandate={Boolean(acceptedArmMandate)}
        onAcceptedTermsChange={(checked) =>
          setValue('accepted_terms', checked, { shouldValidate: true })
        }
        onAcceptedArmMandateChange={(checked) =>
          setValue('accepted_arm_mandate', checked, { shouldValidate: true })
        }
        annualRatePct={annualRatePct}
        fundName={fundName}
        disabled={isSubmitting}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          borderRadius: 10,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          fontSize: '0.73rem',
          color: 'var(--text-muted)',
        }}
      >
        <Lock size={13} color="var(--clay)" style={{ flexShrink: 0 }} />
        <span>
          Your BVN, NIN, and uploaded documents are encrypted and verified via Prembly for SEC /
          ARM compliance.
        </span>
      </div>

      {!hideSubmitButton && (
        <button
          type="submit"
          className="vault-btn-primary"
          disabled={!isValid || isSubmitting}
          style={{ width: '100%' }}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Verifying Identity &amp; Activating...</span>
            </>
          ) : (
            <>
              <ShieldCheck size={16} />
              <span>{submitLabel}</span>
            </>
          )}
        </button>
      )}
    </form>
  )
}
