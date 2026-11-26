'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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

export type KycFormStep = 1 | 2 | 3

const KYC_DRAFT_STORAGE_KEY = 'upward_arm_kyc_draft_v1'

interface ArmInvestorKycFormProps {
  formId?: string
  nextTriggerId?: string
  prefill?: SavingsOnboardingPrefillData | null
  annualRatePct?: number
  fundName?: string
  serverError?: string | null
  isSubmitting?: boolean
  hideSubmitButton?: boolean
  submitLabel?: string
  step?: KycFormStep
  onStepChange?: (step: KycFormStep) => void
  onStepValidityChange?: (isStepValid: boolean) => void
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
      if (vals.means_of_id_type !== 'NIN') {
        if (vals.means_of_id_number.trim().length < 5) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['means_of_id_number'],
            message: 'Enter your valid ID number.',
          })
        }
        const expiry = vals.means_of_id_expiry_date.trim()
        const todayIso = new Date().toISOString().slice(0, 10)
        if (!expiry) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['means_of_id_expiry_date'],
            message: 'Expiry date is required to confirm your ID is valid.',
          })
        } else if (expiry < todayIso) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['means_of_id_expiry_date'],
            message: 'This ID is expired. Please use a valid, unexpired ID.',
          })
        }
      }
    })
}

function readKycDraft(): Partial<ArmInvestorKycFormValues> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.sessionStorage.getItem(KYC_DRAFT_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Partial<ArmInvestorKycFormValues>) : {}
  } catch {
    return {}
  }
}

export function ArmInvestorKycForm({
  formId = 'arm-investor-kyc-form',
  nextTriggerId = 'arm-investor-kyc-next',
  prefill,
  annualRatePct = 16,
  fundName = SAVINGS_FUND_NAME,
  serverError,
  isSubmitting = false,
  hideSubmitButton = false,
  submitLabel = 'Verify & Activate Rent Savings',
  step: controlledStep,
  onStepChange,
  onStepValidityChange,
  onValidityChange,
  onSubmit,
}: ArmInvestorKycFormProps) {
  const hasVerifiedBvn = Boolean(prefill?.has_verified_bvn)
  const hasVerifiedNin = Boolean(prefill?.has_verified_nin)

  const [internalStep, setInternalStep] = useState<KycFormStep>(1)
  const activeStep: KycFormStep = controlledStep ?? internalStep
  const setStep = (next: KycFormStep) => {
    if (controlledStep === undefined) {
      setInternalStep(next)
    }
    onStepChange?.(next)
  }

  const [showIdDates, setShowIdDates] = useState(false)
  const [showBillDate, setShowBillDate] = useState(false)
  const [draft] = useState<Partial<ArmInvestorKycFormValues>>(() => readKycDraft())

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
    trigger,
    formState: { errors, isValid },
  } = useForm<ArmInvestorKycFormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      bvn: prefill?.bvn || '',
      nin: prefill?.nin || '',
      means_of_id_type: draft.means_of_id_type || prefill?.means_of_id_type || 'NIN',
      means_of_id_number: draft.means_of_id_number || '',
      means_of_id_issue_date: draft.means_of_id_issue_date || prefill?.means_of_id_issue_date || '',
      means_of_id_expiry_date:
        draft.means_of_id_expiry_date || prefill?.means_of_id_expiry_date || '',
      means_of_id_doc_key: draft.means_of_id_doc_key || prefill?.means_of_id_doc_key || '',
      means_of_id_mime_type:
        draft.means_of_id_mime_type || prefill?.means_of_id_mime_type || 'image/jpeg',
      means_of_id_file_name: draft.means_of_id_file_name || prefill?.means_of_id_file_name || '',
      residential_address_number:
        draft.residential_address_number || prefill?.residential_address_number || '',
      residential_street: draft.residential_street || prefill?.residential_street || '',
      residential_town: draft.residential_town || prefill?.residential_town || '',
      residential_state: draft.residential_state || prefill?.residential_state || 'Lagos',
      utility_bill_issue_date:
        draft.utility_bill_issue_date || prefill?.utility_bill_issue_date || '',
      utility_bill_doc_key: draft.utility_bill_doc_key || prefill?.utility_bill_doc_key || '',
      utility_bill_mime_type:
        draft.utility_bill_mime_type || prefill?.utility_bill_mime_type || 'image/jpeg',
      utility_bill_file_name: draft.utility_bill_file_name || prefill?.utility_bill_file_name || '',
      mothers_maiden_name: draft.mothers_maiden_name || prefill?.mothers_maiden_name || '',
      occupation: draft.occupation || prefill?.occupation || '',
      source_of_funds: draft.source_of_funds || prefill?.source_of_funds || 'Salary',
      income_range: draft.income_range || prefill?.income_range || '1M-5M',
      next_of_kin_name: draft.next_of_kin_name || prefill?.next_of_kin_name || '',
      next_of_kin_relationship:
        draft.next_of_kin_relationship || prefill?.next_of_kin_relationship || 'Spouse',
      next_of_kin_phone: draft.next_of_kin_phone || prefill?.next_of_kin_phone || '',
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

  const allWatched = useWatch({ control })
  const bvnVal = allWatched.bvn || ''
  const ninVal = allWatched.nin || ''
  const meansOfIdType = allWatched.means_of_id_type || 'NIN'
  const meansOfIdNumber = allWatched.means_of_id_number || ''
  const idDocKey = allWatched.means_of_id_doc_key || ''
  const idDocName = allWatched.means_of_id_file_name || ''
  const idDocMime = allWatched.means_of_id_mime_type || 'image/jpeg'
  const utilityDocKey = allWatched.utility_bill_doc_key || ''
  const utilityDocName = allWatched.utility_bill_file_name || ''
  const utilityDocMime = allWatched.utility_bill_mime_type || 'image/jpeg'
  const acceptedTerms = allWatched.accepted_terms
  const acceptedArmMandate = allWatched.accepted_arm_mandate

  // Persist non-sensitive form fields & uploaded document keys in sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const safeDraft: Partial<ArmInvestorKycFormValues> = {
        means_of_id_type: allWatched.means_of_id_type,
        means_of_id_number: allWatched.means_of_id_number,
        means_of_id_issue_date: allWatched.means_of_id_issue_date,
        means_of_id_expiry_date: allWatched.means_of_id_expiry_date,
        means_of_id_doc_key: allWatched.means_of_id_doc_key,
        means_of_id_mime_type: allWatched.means_of_id_mime_type,
        means_of_id_file_name: allWatched.means_of_id_file_name,
        residential_address_number: allWatched.residential_address_number,
        residential_street: allWatched.residential_street,
        residential_town: allWatched.residential_town,
        residential_state: allWatched.residential_state,
        utility_bill_issue_date: allWatched.utility_bill_issue_date,
        utility_bill_doc_key: allWatched.utility_bill_doc_key,
        utility_bill_mime_type: allWatched.utility_bill_mime_type,
        utility_bill_file_name: allWatched.utility_bill_file_name,
        mothers_maiden_name: allWatched.mothers_maiden_name,
        occupation: allWatched.occupation,
        source_of_funds: allWatched.source_of_funds,
        income_range: allWatched.income_range,
        next_of_kin_name: allWatched.next_of_kin_name,
        next_of_kin_relationship: allWatched.next_of_kin_relationship,
        next_of_kin_phone: allWatched.next_of_kin_phone,
      }
      window.sessionStorage.setItem(KYC_DRAFT_STORAGE_KEY, JSON.stringify(safeDraft))
    } catch {
      // ignore storage quota errors
    }
  }, [allWatched])

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const meansOfIdExpiryDate = (allWatched.means_of_id_expiry_date || '').trim()

  const isStep1Valid = useMemo(() => {
    const bvnOk = hasVerifiedBvn || /^\d{11}$/.test(bvnVal.trim())
    const ninOk = hasVerifiedNin || /^\d{11}$/.test(ninVal.trim())
    const idNumOk = meansOfIdType === 'NIN' || meansOfIdNumber.trim().length >= 5
    const idExpiryOk =
      meansOfIdType === 'NIN' ||
      (meansOfIdExpiryDate.length > 0 && meansOfIdExpiryDate >= todayIso)
    const idDocOk = idDocKey.trim().length > 0
    return bvnOk && ninOk && idNumOk && idExpiryOk && idDocOk
  }, [
    hasVerifiedBvn,
    hasVerifiedNin,
    bvnVal,
    ninVal,
    meansOfIdType,
    meansOfIdNumber,
    meansOfIdExpiryDate,
    todayIso,
    idDocKey,
  ])

  const isStep2Valid = useMemo(() => {
    return (
      (allWatched.residential_address_number || '').trim().length >= 1 &&
      (allWatched.residential_street || '').trim().length >= 3 &&
      (allWatched.residential_town || '').trim().length >= 2 &&
      (allWatched.residential_state || '').trim().length >= 2 &&
      utilityDocKey.trim().length > 0 &&
      (allWatched.mothers_maiden_name || '').trim().length >= 2 &&
      (allWatched.occupation || '').trim().length >= 2 &&
      (allWatched.next_of_kin_name || '').trim().length >= 2 &&
      (allWatched.next_of_kin_phone || '').trim().length >= 10
    )
  }, [allWatched, utilityDocKey])

  const isStep3Valid = Boolean(acceptedTerms) && Boolean(acceptedArmMandate) && isValid

  const currentStepValid =
    activeStep === 1 ? isStep1Valid : activeStep === 2 ? isStep2Valid : isStep3Valid

  useEffect(() => {
    onStepValidityChange?.(currentStepValid)
  }, [currentStepValid, onStepValidityChange])

  const handleAdvanceStep = async () => {
    if (activeStep === 1) {
      const ok = await trigger([
        'bvn',
        'nin',
        'means_of_id_type',
        'means_of_id_number',
        'means_of_id_expiry_date',
        'means_of_id_doc_key',
      ])
      if (ok && isStep1Valid) setStep(2)
    } else if (activeStep === 2) {
      const ok = await trigger([
        'residential_address_number',
        'residential_street',
        'residential_town',
        'residential_state',
        'utility_bill_doc_key',
        'mothers_maiden_name',
        'occupation',
        'source_of_funds',
        'next_of_kin_name',
        'next_of_kin_relationship',
        'next_of_kin_phone',
      ])
      if (ok && isStep2Valid) setStep(3)
    }
  }

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
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(KYC_DRAFT_STORAGE_KEY)
      } catch {}
    }
  })

  const stepMeta: Record<
    KycFormStep,
    { label: string; pct: number; hint: string }
  > = {
    1: {
      label: 'Identity',
      pct: 33,
      hint: 'Takes under a minute — verify once to unlock your dedicated rent account.',
    },
    2: {
      label: 'Address & Profile',
      pct: 67,
      hint: 'Almost there — your entries save automatically if you switch apps for a utility bill.',
    },
    3: {
      label: 'Review & Activate',
      pct: 100,
      hint: `Final step — confirm consent to start earning ${annualRatePct}% p.a. in ${fundName}.`,
    },
  }

  return (
    <form id={formId} onSubmit={handleInternalSubmit} className="arm-kyc-form" noValidate>
      {/* COMPACT FRAMELESS PROGRESS BAR + SINGLE-LINE TEXT */}
      <div className="arm-kyc-stepper" aria-label={`Step ${activeStep} of 3`}>
        <div className="arm-kyc-stepper__top">
          <span className="arm-kyc-stepper__count">
            Step {activeStep} of 3 · {stepMeta[activeStep].label}
          </span>
          <span className="arm-kyc-stepper__pct">{stepMeta[activeStep].pct}%</span>
        </div>
        <div className="arm-kyc-stepper__bar">
          <div
            className="arm-kyc-stepper__fill"
            style={{ width: `${stepMeta[activeStep].pct}%` }}
          />
        </div>
        <p className="arm-kyc-stepper__hint">{stepMeta[activeStep].hint}</p>
      </div>

      {serverError && (
        <div className="arm-kyc-form__alert" role="alert">
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{serverError}</span>
        </div>
      )}

      {/* STEP 1: IDENTITY VERIFICATION (BVN + NIN + MEANS OF ID UPLOAD) */}
      {activeStep === 1 && (
      <section className="arm-kyc-form__section">

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

            <div className="rent-calculator__field">
              <label className="rent-calculator__label">Expiry Date</label>
              <input
                type="date"
                min={todayIso}
                className="rent-calculator__input rent-calculator__input--no-prefix"
                disabled={isSubmitting}
                {...register('means_of_id_expiry_date')}
              />
              {errors.means_of_id_expiry_date ? (
                <span className="arm-kyc-form__field-error">
                  {errors.means_of_id_expiry_date.message}
                </span>
              ) : (
                <span className="arm-kyc-form__field-hint">
                  Required to confirm your ID has not expired
                </span>
              )}
            </div>

            <button
              type="button"
              className="arm-kyc-optional-toggle"
              onClick={() => setShowIdDates((v) => !v)}
            >
              <span>{showIdDates ? 'Hide issue date' : 'Add issue date (optional)'}</span>
              {showIdDates ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showIdDates && (
              <div className="rent-calculator__field">
                <label className="rent-calculator__label">Issue Date (Optional)</label>
                <input
                  type="date"
                  className="rent-calculator__input rent-calculator__input--no-prefix"
                  disabled={isSubmitting}
                  {...register('means_of_id_issue_date')}
                />
              </div>
            )}
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
      )}

      {/* STEP 2: RESIDENTIAL ADDRESS, UTILITY BILL & SEC INVESTOR PROFILE */}
      {activeStep === 2 && (
      <>
      <section className="arm-kyc-form__section">

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

        <button
          type="button"
          className="arm-kyc-optional-toggle"
          onClick={() => setShowBillDate((v) => !v)}
        >
          <span>{showBillDate ? 'Hide utility bill date' : 'Add utility bill date (optional)'}</span>
          {showBillDate ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showBillDate && (
          <div className="rent-calculator__field">
            <label className="rent-calculator__label">Bill Date (Optional)</label>
            <input
              type="date"
              className="rent-calculator__input rent-calculator__input--no-prefix"
              disabled={isSubmitting}
              {...register('utility_bill_issue_date')}
            />
          </div>
        )}

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
      </>
      )}

      {/* STEP 3: READY SUMMARY + TERMS & CONDITIONS + ARM CONSENT MANDATE */}
      {activeStep === 3 && (
      <>
      <div className="arm-kyc-summary">
        <div className="arm-kyc-summary__row">
          <CheckCircle2 size={15} className="arm-kyc-summary__icon" />
          <span>
            <strong>Identity ready:</strong> BVN, NIN &amp; {activeIdOption.label} attached
          </span>
          <button
            type="button"
            className="arm-kyc-summary__edit"
            onClick={() => setStep(1)}
          >
            Edit
          </button>
        </div>
        <div className="arm-kyc-summary__row">
          <CheckCircle2 size={15} className="arm-kyc-summary__icon" />
          <span>
            <strong>Address ready:</strong> {allWatched.residential_town || 'Verified'},{' '}
            {allWatched.residential_state || 'Nigeria'} &amp; Proof of Address
          </span>
          <button
            type="button"
            className="arm-kyc-summary__edit"
            onClick={() => setStep(2)}
          >
            Edit
          </button>
        </div>
      </div>

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
      </>
      )}

      {/* Hidden trigger for external pinned footer buttons (RentCalculatorView) */}
      <button
        id={nextTriggerId}
        type="button"
        onClick={handleAdvanceStep}
        style={{ display: 'none' }}
        aria-hidden
      />

      {!hideSubmitButton && (
        <div className="arm-kyc-form__nav-actions">
          {activeStep > 1 && (
            <button
              type="button"
              className="vault-btn-secondary"
              disabled={isSubmitting}
              onClick={() => setStep((activeStep - 1) as KycFormStep)}
            >
              <ArrowLeft size={15} />
              <span>Back</span>
            </button>
          )}

          {activeStep < 3 ? (
            <button
              type="button"
              className="vault-btn-primary"
              disabled={!currentStepValid || isSubmitting}
              onClick={handleAdvanceStep}
              style={{ flex: 1 }}
            >
              <span>{activeStep === 1 ? 'Continue to Address' : 'Review & Finalize'}</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="submit"
              className="vault-btn-primary"
              disabled={!isValid || isSubmitting}
              style={{ flex: 1 }}
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
        </div>
      )}
    </form>
  )
}
