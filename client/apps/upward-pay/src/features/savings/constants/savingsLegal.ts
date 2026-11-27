import type { MeansOfIdentificationType } from '../services/savingsService'

/**
 * Approved legal disclosures for Upward by Goodtenants Limited Rent Savings
 * (ARM Money Market Fund — ARMMMF).
 */
export const SAVINGS_TERMS_VERSION = '2026-11-v1'
export const SAVINGS_CONSENT_DOC_VERSION = 'ARM-B2B2C-2026-v1'
export const SAVINGS_TERMS_EFFECTIVE_DATE = 'November, 2026'
export const SAVINGS_LEGAL_ENTITY = 'Upward by Goodtenants Limited'
export const SAVINGS_REGISTERED_ADDRESS =
  '2/4, Funsho Street Link, Sabo, Yaba, Lagos State, Nigeria'
export const SAVINGS_FUND_NAME = 'ARM Money Market Fund'
export const SAVINGS_FUND_CODE = 'ARMMMF'
export const SAVINGS_FUND_MANAGER =
  'Asset & Resource Management Holding Company (ARM)'

export interface LegalSection {
  heading: string
  paragraphs?: string[]
  bullets?: string[]
  /** Backwards-compatible flat string representation */
  body: string
}

export const MEANS_OF_ID_OPTIONS: Array<{
  value: MeansOfIdentificationType
  label: string
  hint: string
  requiresSeparateNumber: boolean
}> = [
  {
    value: 'NIN',
    label: 'NIN slip or card',
    hint: 'A clear photo or PDF.',
    requiresSeparateNumber: false,
  },
  {
    value: 'INTERNATIONAL_PASSPORT',
    label: 'International passport',
    hint: 'The photo page.',
    requiresSeparateNumber: true,
  },
  {
    value: 'DRIVERS_LICENSE',
    label: "Driver's licence",
    hint: 'The front of the card.',
    requiresSeparateNumber: true,
  },
]

export const UTILITY_BILL_GUIDANCE =
  'A recent bill, bank statement, or ID that shows this address.'

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

export const LETTER_OF_CONSENT = {
  title: 'LETTER OF CONSENT',
  to: [
    'Upward',
    'By Goodtenants Limited,',
    '2/4, Funsho Street Link, Sabo, Yaba, Lagos State, Nigeria',
  ],
  from: 'Participating Investor',
  intro:
    'By activating the housing savings and investment feature on the Goodtenants platform (“Platform”), I (“Participating Investor”) give my express, informed, and binding consent to Goodtenants Limited (“Goodtenants”) for savings and investments directed toward housing and housing-related products.',
  sections: [
    {
      heading: 'Fund Management',
      body: 'I understand that Goodtenants is a technology platform and not a licensed fund manager, and that funds invested toward housing savings goals are placed with Asset & Resource Management Holding Company (ARM) (“Fund Manager”) for investment management.',
    },
    {
      heading: 'Redemptions & Returns',
      body: 'I authorize and instruct Goodtenants to request, collect, and receive on my behalf all principal redemptions, liquidated savings balances, and accrued investment returns payable by the Fund Manager (ARM) in connection with my savings and investments on the Platform.',
    },
    {
      heading: 'Remittance',
      body: 'I consent to and authorize the Fund Manager (ARM) to remit all such redemption proceeds and accrued investment returns directly into Goodtenants Limited’s designated corporate bank account. Payment by ARM into Goodtenants’ designated corporate account constitutes a valid discharge of ARM’s payment obligation to me for the sum remitted.',
    },
    {
      heading: 'Application & Disbursement of Funds',
      body: 'I authorize Goodtenants to hold and apply the funds received on my behalf strictly for my designated housing obligations (including rent, housing deposits, or housing-related products on the Platform), or to remit them to my verified personal bank account upon a valid withdrawal request in accordance with the Upward Rent Savings Terms of Service.',
    },
    {
      heading: 'Digital Execution',
      body: 'By checking the consent box or clicking “I Agree”, I adopt this Consent as my valid electronic signature and legally binding authorization.',
    },
  ],
} as const

export const ARM_CONSENT_MANDATE_CLAUSES: string[] = [
  LETTER_OF_CONSENT.intro,
  ...LETTER_OF_CONSENT.sections.map((s) => `${s.heading}: ${s.body}`),
]

export const RENT_SAVINGS_TERMS_HEADER = {
  entity: 'UPWARD BY GOODTENANTS LTD',
  title: 'RENT SAVINGS TERMS OF SERVICE',
  effectiveDate: 'November, 2026',
  intro: [
    'This Rent Savings Terms of Service (“Terms”) constitute a legally binding agreement between you (“User,” “Tenant,” or “you”) and Upward by Goodtenants Limited ("Upward", “Goodtenants,”), a private limited liability company incorporated under the laws of the Federal Republic of Nigeria with its registered office at 2/4, Funsho Street Link, Sabo, Yaba, Lagos State, Nigeria. These Terms govern your access to and use of the housing savings and investment features available on the Upward software application and platform (“Platform”).',
    'By creating an account, checking the acceptance box, or clicking “I Agree”, you acknowledge that you have read, understood, and agreed to be bound by these Terms.',
  ],
  acceptanceCheckboxLabel:
    'I have read, understood, and agree to the Upward Rent Savings Terms of Service.',
} as const

function makeSection(
  heading: string,
  paragraphs?: string[],
  bullets?: string[],
): LegalSection {
  return {
    heading,
    paragraphs,
    bullets,
    body: [...(paragraphs || []), ...(bullets || [])].join('\n\n'),
  }
}

export const RENT_SAVINGS_TERMS_SECTIONS: LegalSection[] = [
  makeSection('Definitions', [
    '“Authorized Housing Purpose” means the payment of residential rent, security deposits, lease renewals, or the acquisition of housing-related products and services facilitated through the Platform.',
    '“Fund Manager” means Asset & Resource Management Holding Company (ARM) and its relevant Securities and Exchange Commission (SEC)-regulated asset management subsidiaries.',
    "“Net Yield” means the net annual percentage return payable to the User after the deduction of Upward's platform management commission.",
    '“Settlement Account” means Goodtenants Limited’s designated corporate commercial bank account maintained for the aggregation, receipt, and disbursement of customer savings redemptions and returns.',
  ]),
  makeSection(
    'Scope of Service & Eligibility',
    [
      'Role: Upward by Goodtenants is a real estate technology and financial enablement platform. Goodtenants Ltd is not a commercial bank, microfinance bank, or licensed fund manager. All underlying investment activities are executed and managed by the Fund Manager.',
      'Eligibility Criteria: To onboard onto the savings and investment feature, you must:',
    ],
    [
      'Be at least 18 years of age;',
      'Maintain an active, verified user profile on the Platform; and',
      'Provide valid Know Your Customer (KYC) documentation, including your Bank Verification Number (BVN), National Identification Number (NIN), and valid government-issued identification.',
    ],
  ),
  makeSection('Investment Structure, Indicative Returns & Commission', [
    'Fund Allocation: Upon funding your Upward savings wallet, you instruct and authorize Upward to remit your funds to the Fund Manager for investment in low-risk, SEC-regulated money market instruments and fixed-income securities tailored toward your housing goals.',
    'Indicative Rate of Return & Market Fluctuations: The underlying investment portfolio currently offers an indicative gross yield of 16% per annum. You expressly acknowledge and agree that this rate is indicative only and variable and may fluctuate upward or downward from time to time based on prevailing money market conditions, Central Bank of Nigeria (CBN) monetary policy rates, and macroeconomic factors. Historical or indicative yields do not guarantee future performance.',
    'Commission & Net Yield: In consideration for facilitating the technology infrastructure, automated savings aggregation, and housing disbursement services, Upward shall charge and retain a platform management and facilitation commission of 2% per annum deducted from the gross yield generated on your invested funds. Accordingly, based on the current indicative gross rate of 16% per annum, your indicative Net Yield shall be 14% per annum (subject to prevailing market variations as stated in Clause (B)).',
    "Transparency & Disclosures: Any material changes to the prevailing gross yield or Upward's commission structure shall be communicated to you via the Platform or registered email prior to taking effect on new or rolled-over investment cycles.",
  ]),
  makeSection(
    'Settlement Mandate & Consent',
    [
      'Appointment & Authorization: By accepting these Terms, you irrevocably appoint Goodtenants Limited as your lawful agent to administer, liquidate, and collect your savings proceeds and accrued returns from the Fund Manager.',
      'Direct Remittance to Goodtenants: You expressly consent to and authorize the Fund Manager (ARM) to remit all principal redemptions, liquidated savings balances, and accrued Net Yields directly into Goodtenants Limited’s designated corporate Settlement Account, rather than directly into your personal bank account.',
      'Application of Funds: Goodtenants shall hold your remitted proceeds in a fiduciary capacity and apply them strictly in accordance with your in-app instructions — specifically toward:',
    ],
    [
      'Direct disbursement to your designated landlord or property manager for rent or housing obligations;',
      'Payment for approved housing-related products on the Platform; or',
      'Onward transfer to your verified personal bank account upon a valid withdrawal request, subject to the terms and conditions communicated via the platform at the material time.',
    ],
  ),
  makeSection('Full Discharge of Fund Manager', [
    'Remittance of funds by ARM into Goodtenants’ designated Settlement Account pursuant to Goodtenants’ instructions shall constitute a valid, complete, and absolute discharge of ARM’s payment obligations to you with respect to the remitted sum.',
  ]),
  makeSection('Funding & Maturity', [
    'Funding: You may fund your savings plan via automated recurring debits or manual transfers using the payment channels integrated on the Platform.',
    'Maturity: Each savings plan is committed to a fixed tenure tied to your designated housing schedule. To ensure funds remain dedicated toward your housing goals and to maintain the integrity of the underlying investment portfolio, withdrawals or liquidations are not permitted prior to the agreed maturity date. All contributed funds and accrued returns shall remain invested until maturity, upon which proceeds will be made available for your Authorized Housing Purpose or settled in accordance with these Terms.',
    'Payout Timeline: Valid withdrawal or landlord disbursement requests shall be processed and settled within twenty-four (24) to seventy-two (72) hours (excluding weekends and public holidays), subject to standard banking settlement rails.',
  ]),
  makeSection('Anti-Money Laundering', [
    'Source of Funds: You represent and warrant that all funds contributed through the Platform are derived from legitimate, lawful sources and are not proceeds of crime, money laundering, or illicit activities.',
    'Monitoring & Restrictions: In compliance with Nigerian Anti-Money Laundering, Combating the Financing of Terrorism, and Counter-Proliferation Financing (AML/CFT/CPF) laws, Upward and ARM reserve the right to monitor transactions, request additional source-of-wealth documentation, suspend suspicious accounts, or file statutory reports with the Nigerian Financial Intelligence Unit (NFIU) and other regulators without prior notice.',
  ]),
  makeSection('Data Protection', [
    'Consent to Data Sharing: In accordance with the Nigeria Data Protection Act (NDPA) 2023, you expressly consent to Upward collecting, processing, and sharing your personal data, KYC records, BVN/NIN verification details, and transaction history with ARM and licensed payment processors solely for account opening, investment management, regulatory compliance, and settlement execution.',
    'Security: Upward maintains industry-standard encryption and technical safeguards to protect your personal and financial data against unauthorized access.',
  ]),
  makeSection(
    'Warranties & Indemnities',
    [
      'You warrant that all information and beneficiary bank/landlord details provided on the Platform are accurate and up to date.',
      'You agree to indemnify and hold harmless Goodtenants Limited, ARM, and their respective directors, officers, and affiliates from any claims, losses, damages, or liabilities arising out of:',
    ],
    [
      'Your breach of these Terms;',
      'Inaccurate payout details or inaccurate landlord account details submitted by you.',
    ],
  ),
  makeSection('Limitation of Liability & Disclaimers', [
    'Investment Risk: While funds are placed in regulated money market instruments, all investments carry inherent market and liquidity risks. Neither Goodtenants nor ARM guarantees a fixed return where market conditions fluctuate.',
    'Liability Cap: To the maximum extent permitted by Nigerian law, Goodtenants shall not be liable for any indirect, incidental, or consequential damages, or delays caused by third-party banking infrastructure or force majeure events. Goodtenants’ aggregate liability to you under these Terms shall not exceed the total commission earned by Goodtenants on your account in the twelve (12) months preceding the claim.',
  ]),
  makeSection('Suspension, Termination & Account Closure', [
    'You may close your savings account at any time upon liquidating your active plans and settling any pending obligations.',
    'Upward may suspend or terminate your access immediately if you violate these Terms, fail KYC verification, or engage in fraudulent activity. Upon closure, any undisputed balance due to you shall be remitted to your verified personal bank account.',
  ]),
  makeSection('Force Majeure', [
    'Neither Party shall be liable for any failure or delay in performing its obligations under these Terms where such failure or delay results from events beyond its reasonable control, including acts of God, war, terrorism, civil unrest, epidemics, strikes, power or telecommunications outages, third-party banking or payment gateway downtime, or changes in government regulations and monetary policies (“Force Majeure Event”).',
  ]),
  makeSection('Amendments & Modifications', [
    'Upward reserves the right to amend, update, or modify these Terms from time to time to reflect regulatory updates, operational changes, or adjustments to market yields. Material changes will be notified to you via in-app notification or your registered email at least seven (7) days prior to taking effect. Your continued use of the Platform after the effective date constitutes your binding acceptance of the revised Terms.',
  ]),
  makeSection('Notices', [
    'All formal notices from Upward to you shall be delivered electronically via in-app notifications, SMS, or your registered email address and shall be deemed received upon transmission. Notices from you to Upward must be sent in writing to 2/4, Funsho Street Link, Sabo, Yaba, Lagos State, Nigeria or via email to hello@goodtenants.africa.',
  ]),
  makeSection('Entire Agreement', [
    'These Terms, together with the Letter of Consent and Upward’s general Privacy Policy, constitute the entire agreement between you and Upward regarding the housing savings and investment service and supersede all prior representations, understandings, or agreements relating to the subject matter.',
  ]),
  makeSection('Severability', [
    'If any provision of these Terms is held to be invalid, illegal, or unenforceable by a court or tribunal of competent jurisdiction, such invalidity shall not affect the remaining provisions, which shall continue in full force and effect.',
  ]),
  makeSection('No Waiver', [
    'Any failure or delay by Upward in exercising any right, power, or remedy under these Terms shall not operate as a waiver thereof, nor shall any single or partial exercise preclude any further exercise of that or any other right.',
  ]),
  makeSection('Assignment', [
    'You may not assign or transfer any of your rights or obligations under these Terms without Upward’s prior written consent. Goodtenants may assign or transfer its rights and obligations to an affiliate, successor, or acquirer in connection with a merger, acquisition, or corporate restructuring upon sixty (60) days notice to you.',
  ]),
  makeSection('Relationship of Parties', [
    'Nothing in these Terms creates a partnership, joint venture, or employment relationship between you and Upward, except for the limited agency created under the Settlement Mandate & Consent clause.',
  ]),
  makeSection('Governing Law & Dispute Resolution', [
    'Governing Law: These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria.',
    'Dispute Resolution: Any dispute arising out of or in connection with these Terms shall first be resolved amicably through Upward’s internal customer resolution desk within fourteen (14) days. Failing amicable settlement, the dispute shall be referred to mediation at the Lagos Multi-Door Courthouse (LMDC) or final arbitration in Lagos, Nigeria, in accordance with the Arbitration and Mediation Act 2023.',
  ]),
  makeSection('Acceptance', [
    'By checking the acceptance box or clicking “I Agree” below, you confirm that you have read, understood, and agreed to be legally bound by these Housing Savings & Investment Terms of Service, and you adopt this electronic action as your valid, binding signature.',
  ]),
]
