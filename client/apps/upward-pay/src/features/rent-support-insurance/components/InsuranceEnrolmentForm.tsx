'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useToast } from '@/components/common/Toast'
import { formatCurrency } from '@/lib/utils'
import {
  EMPLOYMENT_TYPE_OPTIONS,
  GENDER_OPTIONS,
  RSI_MAX_ENTRY_AGE,
  RSI_MAX_SUM_ASSURED,
} from '../constants'
import type { RsiEnrolmentFormData } from '../types'
import {
  calculateAnnualPremium,
  isWithinEntryAge,
  parseAnnualRent,
} from '../utils'

interface InsuranceEnrolmentFormProps {
  initialData: RsiEnrolmentFormData
  onSubmit: (data: RsiEnrolmentFormData) => void
}

function Field({
  label,
  children,
  hint,
  error,
}: {
  label: string
  children: React.ReactNode
  hint?: string
  error?: string
}) {
  return (
    <div className="pay-flow__field">
      <label className="pay-flow__field-label">{label}</label>
      {children}
      {hint ? <p className="pay-flow__field-hint">{hint}</p> : null}
      {error ? <p className="pay-flow__field-error">{error}</p> : null}
    </div>
  )
}

export function InsuranceEnrolmentForm({
  initialData,
  onSubmit,
}: InsuranceEnrolmentFormProps) {
  const toast = useToast()
  const [form, setForm] = useState<RsiEnrolmentFormData>(initialData)

  const annualRent = parseAnnualRent(form.annualRent)
  const premium = calculateAnnualPremium(annualRent)
  const rentCapped = annualRent > RSI_MAX_SUM_ASSURED

  const selectedEmployment = EMPLOYMENT_TYPE_OPTIONS.find(
    (option) => option.value === form.employmentType,
  )

  const ageError = useMemo(() => {
    if (!form.dateOfBirth) return ''
    if (!isWithinEntryAge(form.dateOfBirth)) {
      return `Maximum entry age is ${RSI_MAX_ENTRY_AGE} years.`
    }
    return ''
  }, [form.dateOfBirth])

  const update = <K extends keyof RsiEnrolmentFormData>(key: K, value: RsiEnrolmentFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.fullName.trim()) {
      toast.error('Please enter your full name.', 'Required')
      return
    }
    if (!form.dateOfBirth) {
      toast.error('Please enter your date of birth.', 'Required')
      return
    }
    if (ageError) {
      toast.error(ageError, 'Not eligible')
      return
    }
    if (!form.gender) {
      toast.error('Please select your gender.', 'Required')
      return
    }
    if (!form.address.trim()) {
      toast.error('Please enter your address.', 'Required')
      return
    }
    if (!form.occupation.trim()) {
      toast.error('Please enter your occupation.', 'Required')
      return
    }
    if (!form.employmentType) {
      toast.error('Please select your employment type.', 'Required')
      return
    }
    if (!form.rentStartDate) {
      toast.error('Please enter your rent start date.', 'Required')
      return
    }
    if (!annualRent) {
      toast.error('Please enter your annual rent amount.', 'Required')
      return
    }
    if (!form.landlordName.trim()) {
      toast.error('Please enter your landlord or policyholder name.', 'Required')
      return
    }

    onSubmit(form)
  }

  return (
    <form className="rsi-flow" onSubmit={handleSubmit}>
      <section className="rsi-flow__card">
        <h3 className="rsi-flow__card-title">Personal details</h3>

        <Field label="Full name">
          <div className="pay-flow__input-wrap">
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)}
              placeholder="As on your ID"
            />
          </div>
        </Field>

        <Field label="Date of birth" error={ageError}>
          <div className="pay-flow__input-wrap">
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => update('dateOfBirth', e.target.value)}
            />
          </div>
        </Field>

        <Field label="Gender">
          <div className="pay-flow__input-wrap">
            <select
              value={form.gender}
              onChange={(e) => update('gender', e.target.value)}
              className="rsi-flow__select"
            >
              <option value="">Select gender</option>
              {GENDER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </Field>

        <Field label="Phone number">
          <div className="pay-flow__input-wrap">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="+234..."
            />
          </div>
        </Field>

        <Field label="Address">
          <div className="pay-flow__input-wrap">
            <input
              type="text"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              placeholder="Your residential address"
            />
          </div>
        </Field>
      </section>

      <section className="rsi-flow__card">
        <h3 className="rsi-flow__card-title">Employment</h3>

        <Field label="Occupation">
          <div className="pay-flow__input-wrap">
            <input
              type="text"
              value={form.occupation}
              onChange={(e) => update('occupation', e.target.value)}
              placeholder="e.g. Software Engineer"
            />
          </div>
        </Field>

        <Field
          label="Employment type"
          hint="Involuntary loss of job cover applies only to corporate salaried employees."
        >
          <div className="pay-flow__input-wrap">
            <select
              value={form.employmentType}
              onChange={(e) =>
                update('employmentType', e.target.value as RsiEnrolmentFormData['employmentType'])
              }
              className="rsi-flow__select"
            >
              <option value="">Select employment type</option>
              {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </Field>

        {selectedEmployment && !selectedEmployment.jolEligible ? (
          <div className="rsi-flow__warning">
            <AlertTriangle size={15} />
            <p>
              Involuntary loss of job cover does not apply to your employment type. Other benefits
              may still apply.
            </p>
          </div>
        ) : null}
      </section>

      <section className="rsi-flow__card">
        <h3 className="rsi-flow__card-title">Rental details</h3>

        <Field label="Landlord / policyholder">
          <div className="pay-flow__input-wrap">
            <input
              type="text"
              value={form.landlordName}
              onChange={(e) => update('landlordName', e.target.value)}
              placeholder="Landlord or company name"
            />
          </div>
        </Field>

        <Field label="Property address">
          <div className="pay-flow__input-wrap">
            <input
              type="text"
              value={form.propertyAddress}
              onChange={(e) => update('propertyAddress', e.target.value)}
              placeholder="Rental property address"
            />
          </div>
        </Field>

        <Field label="Rent start date">
          <div className="pay-flow__input-wrap">
            <input
              type="date"
              value={form.rentStartDate}
              onChange={(e) => update('rentStartDate', e.target.value)}
            />
          </div>
        </Field>

        <Field
          label="Annual rent / sum assured"
          hint={`Maximum sum assured is ${formatCurrency(RSI_MAX_SUM_ASSURED)}.`}
        >
          <div className="pay-flow__input-wrap">
            <input
              type="text"
              inputMode="numeric"
              value={form.annualRent}
              onChange={(e) => update('annualRent', e.target.value.replace(/[^\d,]/g, ''))}
              placeholder="e.g. 3,000,000"
            />
          </div>
        </Field>

        {rentCapped ? (
          <div className="rsi-flow__warning">
            <AlertTriangle size={15} />
            <p>
              Your rent exceeds the maximum sum assured. Cover will be calculated on{' '}
              {formatCurrency(RSI_MAX_SUM_ASSURED)}.
            </p>
          </div>
        ) : null}

        {annualRent > 0 ? (
          <div className="rsi-flow__premium-box">
            <span>Estimated annual premium (paid by landlord)</span>
            <strong>{formatCurrency(premium)}</strong>
          </div>
        ) : null}
      </section>

      <div className="rsi-flow__step-cta">
        <button type="submit" className="pay-flow__cta">
          Submit enrolment
        </button>
      </div>
    </form>
  )
}
