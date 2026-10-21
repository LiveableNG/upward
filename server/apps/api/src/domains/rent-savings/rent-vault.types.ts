export type CadenceType = 'DAILY' | 'WEEKLY' | 'MONTHLY'
export type LockStatusType = 'LOCKED' | 'SETTLEMENT_READY' | 'SETTLED' | 'BROKEN_OUT'
export type FundingMethodType = 'DVA' | 'CARD_TOKEN'
export type AdvanceStatusType = 'ACTIVE' | 'REPAID' | 'DEFAULTED' | 'OFFSET_AT_SETTLEMENT'
export type SettlementStatusType = 'PAID' | 'DISBURSED_PENDING_PM_APPROVAL' | 'FAILED'

export type VaultTransactionType =
  | 'DEPOSIT'
  | 'YIELD_ACCRUAL'
  | 'ADVANCE_DISBURSEMENT'
  | 'ADVANCE_REPAYMENT'
  | 'LIQUIDATION_PENALTY'
  | 'SETTLEMENT_DISBURSEMENT'
  | 'CASHBACK'

export interface RentVault {
  id: number
  uuid: string
  userId: number
  targetAmountKobo: bigint
  currentPrincipalKobo: bigint
  accruedYieldKobo: bigint
  cadence: CadenceType
  contractualDueDate: Date
  unlockDate: Date
  lockStatus: LockStatusType
  preferredFundingMethod: FundingMethodType
  paydayDayOfMonth?: number | null
  cardAuthorizationCode?: string | null
  dvaBankName?: string | null
  dvaAccountNumber?: string | null
  dvaAccountName?: string | null
  dvaCustomerCode?: string | null
  dvaAssignmentStatus: string
  autoBypassPmApproval: boolean
  investmentProvider: string
  providerMembershipId?: string | null
  providerAccountNumber?: string | null
  providerCrmStatus?: string | null
  armPurchaseId?: string | null
  armWithdrawalId?: string | null
  lastYieldSyncAt?: Date | null
  createdAt: Date
  updatedAt: Date
  savingsScore?: RentSavingsScore | null
}

export interface RentVaultTransaction {
  id: number
  uuid: string
  vaultId: number
  userId: number
  type: VaultTransactionType
  amountKobo: bigint
  principalDeltaKobo: bigint
  yieldDeltaKobo: bigint
  balanceAfterKobo: bigint
  reference: string
  channel?: string | null
  narration?: string | null
  metadata?: Record<string, unknown> | null
  createdAt: Date
}

export interface RentAdvance {
  id: number
  uuid: string
  vaultId: number
  userId: number
  borrowedAmountKobo: bigint
  facilityFeeKobo: bigint
  totalRepayableKobo: bigint
  repaymentDueDate: Date
  latePenaltiesKobo: bigint
  amountRepaidKobo: bigint
  status: AdvanceStatusType
  destinationBankCode: string
  destinationAccountNumber: string
  destinationAccountName?: string | null
  payoutTransferReference?: string | null
  repaidAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface RentSettlement {
  id: number
  uuid: string
  vaultId: number
  userId: number
  landlordBankCode: string
  landlordAccountNumber: string
  landlordName: string
  propertyAddress?: string | null
  amountPaidToLandlordKobo: bigint
  cashbackCreditedKobo: bigint
  earlyBirdMultiplierApplied: boolean
  nipSessionId?: string | null
  settlementReference: string
  receiptPdfUrl?: string | null
  settlementStatus: SettlementStatusType
  smsAlertDispatched: boolean
  disburseSurplusToWallet: boolean
  createdAt: Date
  updatedAt: Date
}

export interface RentSavingsScore {
  id: number
  uuid: string
  vaultId: number
  userId: number
  cadencePoints: number
  velocityPoints: number
  loanDisciplinePoints: number
  totalScore: number
  historyLog?: Array<{
    reason: string
    delta: number
    timestamp: string
  }> | null
  createdAt: Date
  updatedAt: Date
}
