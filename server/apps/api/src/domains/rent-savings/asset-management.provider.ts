export interface YieldMetrics {
  annualNetYieldRate: number // e.g. 0.145 (14.5% p.a.)
  annualGrossYieldRate: number // e.g. 0.165 (16.5% p.a.)
  dailyYieldRate: number // e.g. 0.00039726
  productCode: string // e.g. "ARMMMF"
  canInvest: boolean
}

export interface InvestorOnboardingRequest {
  customerEmail: string
  personalDetails: {
    surname: string
    firstName: string
    middleName?: string
    dateOfBirth: string // YYYY-MM-DD
    gender: 'Male' | 'Female'
    nationality?: string
    stateOfOrigin?: string
    placeOfBirth?: string
    annualExpectedIncomeRange?: string
    riskAppetite?: string
    riskProfile?: string
    sourceOfFunds?: string
    occupation?: string
    mothersMaidenName?: string
    mobilePhone: string
  }
  address: {
    addressNumber?: string
    streetName: string
    town: string
    residentialCountry?: string
    residentialStateCode?: string
  }
  kycDetails?: {
    bvn: string
    idType?: string
    idNumber?: string
    nin?: string
  }
  bankDetails?: {
    bankName: string
    accountName: string
    accountNumber: string
    bankCode: string
  }
}

export interface InvestorOnboardingResponse {
  success: boolean
  status: 'Submitted' | 'Approved' | 'InProgress' | 'Failed'
  customerId?: string
  customerMembershipId?: string
  crmAccountNumber?: string
  failureReason?: string
}

export interface PurchaseSubscriptionRequest {
  membershipId: string
  productCode: string
  amountKobo: bigint
  reInvestDividends?: boolean
  reference: string
}

export interface PurchaseSubscriptionResponse {
  success: boolean
  transactionId?: string
  purchaseId?: string
  unitsAllocated?: number
  message?: string
}

export interface RedemptionRequest {
  membershipId: string
  productCode: string
  productAccountNumber: string
  amountKobo: bigint
  reference: string
}

export interface RedemptionResponse {
  success: boolean
  transactionId?: string
  withdrawalId?: string
  message?: string
}

export interface PortfolioSummary {
  membershipId: string
  productCode: string
  accountNumber: string
  units: number
  unitPrice: number
  marketValueKobo: bigint
  currentBalanceKobo: bigint
  accruedInterestKobo: bigint
}

export interface IAssetManagementProvider {
  readonly providerName: string

  getYieldMetrics(productCode?: string): Promise<YieldMetrics>

  onboardInvestor?(customer: InvestorOnboardingRequest): Promise<InvestorOnboardingResponse>

  subscribe(request: PurchaseSubscriptionRequest): Promise<PurchaseSubscriptionResponse>

  redeem(request: RedemptionRequest): Promise<RedemptionResponse>

  getPortfolio(membershipIdOrAccountId: string): Promise<PortfolioSummary>
}

export const ASSET_MANAGEMENT_PROVIDER = Symbol('ASSET_MANAGEMENT_PROVIDER')
