import type { EmploymentType } from './types'

export const RSI_PRODUCT_NAME = 'Rent Support Insurance'
export const RSI_TERMS_VERSION = '2026-07-15'
export const RSI_STORAGE_KEY = 'upward_rsi_enrolment'
export const RSI_ANNUAL_RATE = 0.012
export const RSI_MAX_SUM_ASSURED = 20_000_000
export const RSI_MAX_ENTRY_AGE = 60
export const RSI_INTRO_PERIOD_DAYS = 30
export const RSI_JOL_WAIT_DAYS = 30
export const RSI_JOL_MAX_MONTHS = 5

export const RSI_COVERED_BENEFITS = [
  {
    title: 'Death',
    description: 'Full sum assured payable to your landlord for the following rental year.',
  },
  {
    title: 'Critical illness',
    description: 'Full sum assured payable after diagnosis of a covered critical illness.',
  },
  {
    title: 'Permanent disability',
    description: 'Benefit paid according to the applicable disability scale of benefits.',
  },
  {
    title: 'Involuntary loss of job',
    description:
      'Up to five months’ rent for qualifying corporate employees, subject to waiting periods and eligibility rules.',
  },
] as const

export const RSI_EXCLUSIONS = [
  'Voluntary resignation or self-initiated job departure',
  'Self-employed persons, business owners, contract workers, and informal workers (for loss-of-job cover)',
  'Claims within the first 30 days, except death caused by accident',
  'Loss of job occurring less than six months into the current rental year',
  'Any event not listed in the policy wording',
] as const

export const RSI_KEY_LIMITS = [
  { label: 'Maximum sum assured', value: '₦20,000,000' },
  { label: 'Maximum entry age', value: '60 years' },
  { label: 'Annual premium rate', value: '1.20% of sum assured (paid by landlord)' },
  { label: 'Introductory period', value: '30 days (accidental death exempt)' },
  { label: 'Loss of job waiting period', value: '30 days after unemployment' },
  { label: 'Maximum loss-of-job benefit', value: '5 months’ rent' },
] as const

export const RSI_CONSENT_ITEMS = [
  {
    id: 'life_policy',
    label:
      'I understand that an insurance policy will be taken on my life for the benefit of my landlord.',
  },
  {
    id: 'landlord_recipient',
    label:
      'I understand that qualifying claim benefits will be paid to my landlord for rent-related obligations, not to me.',
  },
  {
    id: 'not_guarantee',
    label:
      'I understand this is an insurance policy with specific insured events — not a rent guarantee or promise of rent payment.',
  },
  {
    id: 'terms',
    label: 'I have read and accept the policy terms, waiting periods, exclusions, and benefit limits.',
  },
] as const

export const EMPLOYMENT_TYPE_OPTIONS: Array<{
  value: EmploymentType
  label: string
  jolEligible: boolean
}> = [
  { value: 'corporate_salaried', label: 'Corporate salaried employee', jolEligible: true },
  { value: 'self_employed', label: 'Self-employed', jolEligible: false },
  { value: 'business_owner', label: 'Business owner', jolEligible: false },
  { value: 'contract', label: 'Contract worker', jolEligible: false },
  { value: 'informal', label: 'Informal worker', jolEligible: false },
  { value: 'unemployed', label: 'Not currently employed', jolEligible: false },
]

export const GENDER_OPTIONS = ['Male', 'Female'] as const
