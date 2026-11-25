export interface YieldMetrics {
  annualNetYieldRate: number // e.g. 0.1655 (16.55% p.a.)
  annualGrossYieldRate: number // e.g. 0.1855 (18.55% p.a.)
  dailyYieldRate: number // e.g. 0.0004535
  productCode: string // e.g. "ARMMMF"
  productName?: string
  netAssetValue?: string
  valuationDate?: string
  rateUpdatedAtUtc?: string
  minimumInvestmentNaira?: number
  factSheetLink?: string
  canInvest: boolean
  isLive?: boolean
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
  nextOfKin?: {
    name: string
    gender?: 'Male' | 'Female'
    dateOfBirth?: string
    relationshipType: string
    phone: string
    email?: string
    address?: string
  }
  documents?: {
    passport?: string
    bvn_passport?: string
    id_card?: string
    utility_bill?: string
  }
}

export interface InvestorOnboardingResponse {
  success: boolean
  status: 'Submitted' | 'Approved' | 'InProgress' | 'Failed'
  customerId?: string
  trackingId?: string
  customerMembershipId?: string
  crmAccountNumber?: string
  crmApprovalStatus?: string
  completedSections?: number
  failureReason?: string
}

export interface ArmVirtualAccountSummary {
  accountNumber: string
  bankName: string
  bankCode?: string
  customerName: string
  currency: string
  active: boolean
}

export interface ArmOnboardedCustomerSummary {
  customerId: string
  customerFirstName: string
  customerSurname: string
  customerEmail: string
  crmAccountNumber: string | null
  customerMembershipId: string | null
  status: string
  createdAt: string
}

export interface ArmTransactionStatusItem {
  status: boolean
  purchaseId?: string
  withdrawalId?: string
  transactionId?: string
  message?: string
  amount?: number
  productCode?: string
  membershipId?: string
  transactionReference?: string
}

export interface ArmMerchantOverview {
  connected: boolean
  baseUrl: string
  merchantId: string | null
  businessName: string | null
  merchantMembershipId: string | null
  merchantType: string | null
  cashWalletBalanceNaira: number
  virtualAccounts: ArmVirtualAccountSummary[]
  customers: ArmOnboardedCustomerSummary[]
  yieldMetrics: YieldMetrics
  masterPortfolio: PortfolioSummary
  fetchedAt: string
}

export class ArmOperationError extends Error {
  constructor(
    message: string,
    public readonly httpStatus?: number,
    public readonly retryable: boolean = true,
  ) {
    super(message)
    this.name = 'ArmOperationError'
  }
}

export interface PurchaseSubscriptionRequest {
  membershipId: string
  productCode: string
  amountKobo: bigint
  reInvestDividends?: boolean
  reference: string
  transactionId?: string
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
  transactionId?: string
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

  getMerchantOverview?(forceRefresh?: boolean): Promise<ArmMerchantOverview>

  getOnboardingStatus?(trackingId: string): Promise<InvestorOnboardingResponse>

  getTransactionStatus?(params: {
    purchaseId?: string
    transactionId?: string
  }): Promise<ArmTransactionStatusItem[]>
}

export const ASSET_MANAGEMENT_PROVIDER = Symbol('ASSET_MANAGEMENT_PROVIDER')
