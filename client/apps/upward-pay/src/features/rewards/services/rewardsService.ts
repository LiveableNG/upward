import { request } from '@/lib/api-client'

export interface PromotionalVoucherItem {
  id: number
  uuid: string
  code: string
  userId: number
  amountKobo: string
  amountNaira: number
  redeemedAmountKobo: string
  redeemedAmountNaira: number
  remainingAmountKobo: string
  remainingAmountNaira: number
  currency: string
  status: 'ACTIVE' | 'PARTIALLY_REDEEMED' | 'REDEEMED' | 'EXPIRED' | 'REVOKED'
  sourceType: 'FORM_COMPLETION' | 'GAME_WINNER' | 'CAMPAIGN_SIGNUP' | 'ADMIN_MANUAL' | 'OTHER'
  triggerKey: string | null
  campaignTag: string | null
  reason: string
  notes: string | null
  expiresAt: string | null
  redeemedAt: string | null
  createdAt: string
}

export interface VoucherRedemptionItem {
  id: number
  uuid: string
  voucherId: number
  userId: number
  orderId: number | null
  orderNumber: string | null
  amountDeductedKobo: string
  amountDeductedNaira: number
  status: 'APPLIED' | 'CONFIRMED' | 'RELEASED'
  createdAt: string
}

export interface CashbackRewardItem {
  id: number
  uuid: string
  userId: number
  vaultId: number | null
  amountKobo: string
  amountNaira: number
  currency: string
  triggerKey: string
  qualifyingActivityAmountKobo: string | null
  qualifyingActivityAmountNaira: number | null
  reason: string
  status: string
  reference: string
  createdAt: string
}

export interface AvailableRewardActivity {
  id: number
  uuid: string
  triggerKey: string
  name: string
  description: string | null
  rewardCategory: 'VOUCHER' | 'CASHBACK'
  rewardAmountKobo: string
  rewardAmountNaira: number
  minQualifyingAmountKobo: string
  minQualifyingAmountNaira: number
  maxPerUser: number
  isActive: boolean
  isCompleted: boolean
}

export interface UserRewardsSummary {
  userId: number
  availableBalanceKobo: string
  availableBalanceNaira: number
  totalEarnedKobo: string
  totalEarnedNaira: number
  totalRedeemedKobo: string
  totalRedeemedNaira: number
  totalExpiredKobo: string
  totalExpiredNaira: number
  activeVouchersCount: number
  totalCashbackKobo: string
  totalCashbackNaira: number
  vouchers: PromotionalVoucherItem[]
  redemptions: VoucherRedemptionItem[]
  cashbackRewards: CashbackRewardItem[]
  availableActivities: AvailableRewardActivity[]
}

export async function fetchUserRewardsSummary(): Promise<UserRewardsSummary> {
  const res = await request<{ data: UserRewardsSummary }>('/user/rewards/summary', {
    method: 'GET',
  })
  return (res as any)?.data || (res as unknown as UserRewardsSummary)
}

export async function completeRewardActivity(input: {
  triggerKey: string
  qualifyingAmountNaira?: number
  campaignTag?: string
  notes?: string
}) {
  const res = await request<{ data: any }>('/user/rewards/complete-activity', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return (res as any)?.data || res
}
