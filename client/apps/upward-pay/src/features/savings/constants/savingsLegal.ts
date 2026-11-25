import type { MeansOfIdentificationType } from '../services/savingsService'

/**
 * Editable draft legal disclosures for Upward Rent Savings (ARM Money Market Fund - ARMMMF).
 * Replace these draft sections with final approved Legal wording before public launch.
 */
export const SAVINGS_TERMS_VERSION = '2026-11-v1-draft'
export const SAVINGS_CONSENT_DOC_VERSION = 'ARM-B2B2C-2026-v1-draft'
export const SAVINGS_FUND_NAME = 'ARM Money Market Fund'
export const SAVINGS_FUND_CODE = 'ARMMMF'
export const SAVINGS_FUND_MANAGER =
  'Asset & Resource Management Holding Company (ARM)'

export const MEANS_OF_ID_OPTIONS: Array<{
  value: MeansOfIdentificationType
  label: string
  hint: string
  requiresSeparateNumber: boolean
}> = [
  {
    value: 'NIN',
    label: 'National Identity Number (NIN Slip / Card)',
    hint: 'Upload a clear photo or PDF of your NIN slip or card.',
    requiresSeparateNumber: false,
  },
  {
    value: 'INTERNATIONAL_PASSPORT',
    label: 'International Passport (Bio Data Page)',
    hint: 'Upload a clear scan/photo of your International Passport bio data page.',
    requiresSeparateNumber: true,
  },
  {
    value: 'DRIVERS_LICENSE',
    label: "Driver's License",
    hint: "Upload a clear front image or PDF of your valid Nigerian Driver's License.",
    requiresSeparateNumber: true,
  },
]

export const UTILITY_BILL_GUIDANCE =
  'Upload any recent utility bill or document that proves your residential address (e.g., Electricity / NEPA bill, Waste bill, Bank statement showing your address, or Driver\'s license).'

export const NIGERIAN_STATES = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'FCT - Abuja',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
] as const

export const RENT_SAVINGS_TERMS_SECTIONS: Array<{ heading: string; body: string }> = [
  {
    heading: '1. Overview & Fund Structure',
    body: 'Upward Rent Savings is a goal-based rent savings feature offered by Liveable Smartcity Technologies Limited (Upward by GoodTenants). All rent savings deposits are invested in units of the SEC-regulated ARM Money Market Fund (ARMMMF), managed by Asset & Resource Management Holding Company (ARM).',
  },
  {
    heading: '2. Indicative Returns (16.0% p.a.)',
    body: 'Save & Earn vaults accrue daily compounding returns indicatively at 16.0% p.a. (or the live net yield rate of the ARM Money Market Fund). Rent Protec vaults earn 10.0% p.a. alongside eligible rent protection cover. Market yields may fluctuate in line with CBN/SEC money market conditions.',
  },
  {
    heading: '3. Regulatory KYC & Verification',
    body: 'In compliance with CBN and SEC KYC/AML regulations, every saving tenant must provide a verified 11-digit BVN, a verified 11-digit NIN, an uploaded valid Means of Identification (NIN slip/card, International Passport bio data page, or Driver\'s License), and Proof of Address (a utility bill confirming residential address).',
  },
  {
    heading: '4. Rent Lock Window & Early Withdrawal',
    body: 'Funds remain locked safely towards your rent target until 30 days before your contractual rent due date (T-30 unlock window), at which point they are redeemed from ARMMMF for landlord settlement. Early exits before T-30 are permitted under Upward\'s Fair Exit policy.',
  },
  {
    heading: '5. Data Protection (NDPR)',
    body: 'Your KYC identity numbers and uploaded documents are encrypted in transit and at rest and shared strictly with regulated verification partners (Prembly) and ARM solely for investor onboarding, subscription, and redemption administration.',
  },
]

export const ARM_CONSENT_MANDATE_CLAUSES: string[] = [
  'I expressly authorize Liveable Smartcity Technologies Limited (Upward / GoodTenants) to submit my verified KYC details (BVN, NIN, Valid Means of Identification, Residential Address, and Proof of Address) to ARM to open and maintain my B2B2C investor profile for the ARM Money Market Fund (ARMMMF).',
  'I grant Upward / GoodTenants authority to transact on my behalf under the ARM B2B2C scope — specifically to sweep and subscribe my rent savings deposits into ARM Money Market Fund (ARMMMF) units and to redeem units to settle my landlord at rent maturity (T-30) or process my authorized withdrawal.',
  'I confirm that all personal details, identification documents, and proof of address uploaded are accurate and authentic, and I acknowledge that an electronically timestamped copy of this Consent Mandate will be stored in my account and made available for regulatory audit.',
]
