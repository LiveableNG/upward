export type VoucherCampaignType = 'SIGNUP_LINK' | 'GAMING_REWARD' | 'ADMIN_GRANT' | 'PROMO'

export type VoucherLedgerEntryType =
  | 'CREDIT_SIGNUP_LINK'
  | 'CREDIT_GAMING_REWARD'
  | 'CREDIT_ADMIN_GRANT'
  | 'RESERVE_ORDER'
  | 'REDEEM_ORDER'
  | 'RELEASE_ORDER'
  | 'ADMIN_REVERSAL'

export interface VoucherCampaign {
  id: number
  uuid: string
  code: string
  name: string
  description?: string | null
  type: VoucherCampaignType
  defaultAmountKobo: bigint
  maxBudgetKobo?: bigint | null
  spentKobo: bigint
  isActive: boolean
  startsAt?: Date | null
  expiresAt?: Date | null
  emailTemplateKey?: string | null
  metadata?: any
  createdAt: Date
  updatedAt: Date
}

export interface VoucherWallet {
  id: number
  uuid: string
  userId: number
  currency: string
  availableBalanceKobo: bigint
  reservedBalanceKobo: bigint
  lifetimeEarnedKobo: bigint
  lifetimeRedeemedKobo: bigint
  version: number
  createdAt: Date
  updatedAt: Date
}

export interface VoucherLedgerEntry {
  id: number
  uuid: string
  walletId: number
  userId: number
  type: VoucherLedgerEntryType
  amountKobo: bigint
  balanceAfterKobo: bigint
  idempotencyKey: string
  campaignId?: number | null
  orderId?: number | null
  grantedByAdminId?: string | null
  reason?: string | null
  metadata?: any
  createdAt: Date
  campaign?: {
    id: number
    code: string
    name: string
    type: VoucherCampaignType
  } | null
  grantedByAdmin?: {
    id: string
    email: string
  } | null
  order?: {
    id: number
    uuid: string
    orderNumber: string
  } | null
}

export interface CreditVoucherParams {
  userId: number
  amountKobo: bigint
  type: 'CREDIT_SIGNUP_LINK' | 'CREDIT_GAMING_REWARD' | 'CREDIT_ADMIN_GRANT'
  idempotencyKey: string
  campaignId?: number | null
  grantedByAdminId?: string | null
  reason?: string | null
  metadata?: Record<string, any> | null
}

export interface CreditVoucherResult {
  wallet: VoucherWallet
  entry: VoucherLedgerEntry
  alreadyApplied: boolean
}

export interface ReserveVoucherResult {
  reservedKobo: bigint
  wallet: VoucherWallet
  entry: VoucherLedgerEntry | null
  alreadyReserved: boolean
}

export interface VoucherRepository {
  findCampaignByCode(code: string): Promise<VoucherCampaign | null>
  listCampaigns(): Promise<VoucherCampaign[]>
  getWalletByUserId(userId: number): Promise<VoucherWallet | null>
  getAvailableBalanceKobo(userId: number): Promise<bigint>
  listLedgerByUserId(userId: number, limit?: number): Promise<VoucherLedgerEntry[]>
  creditVoucher(params: CreditVoucherParams): Promise<CreditVoucherResult>
  reserveVoucherForOrder(params: {
    userId: number
    orderId: number
    maxAmountKobo: bigint
    idempotencyKey: string
    reason?: string
  }): Promise<ReserveVoucherResult>
  redeemReservedVoucherForOrder(orderId: number): Promise<{ redeemedKobo: bigint; alreadyRedeemed: boolean }>
  releaseReservedVoucherForOrder(orderId: number, reason: string): Promise<{ releasedKobo: bigint; alreadyReleased: boolean }>
}

export const VOUCHER_REPOSITORY = Symbol('VOUCHER_REPOSITORY')
