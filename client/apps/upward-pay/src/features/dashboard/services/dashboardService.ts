/* eslint-disable @typescript-eslint/no-explicit-any */

import { api } from '@/lib/api'
import {
  type DashboardData,
  type ContractData,
  type CompletedPayment,
  type SavedLandlord,
} from '../types'
import { type TenantProfile } from '@/features/auth/types'

export async function getDashboardData(): Promise<DashboardData> {
  const [profile, txs, landlords] = await Promise.all([
    api.getProfile(),
    api.getTransactions(),
    api.getSavedLandlords(),
  ])

  const completedPayments: CompletedPayment[] = (txs || []).map((t: any) => ({
    uuid: t.id,
    amount: t.amount,
    currency: 'NGN',
    status: t.status,
    channel: 'Card',
    paid_at: t.createdAt,
    paystack_reference: t.reference,
    company_name: t.narration || (t.type === 'RENT' ? 'Rent Payment' : 'Transfer'),
    type: 'debit',
  }))

  const savedLandlords: SavedLandlord[] = (landlords || []).map((l: any) => ({
    uuid: l.id,
    name: l.name,
    account_name: l.accountName,
    account_number: l.accountNumber,
    bank_name: l.bankName,
    bank_code: l.bankCode,
    last_paid: l.lastPaid,
    last_amount: l.lastAmount || 0,
  }))

  const tenant: TenantProfile = {
    ...profile,
    savingsBalance: profile.savingsBalance ?? 0,
    savingsGoal: profile.savingsGoal ?? 0,
  }

  return {
    tenant,
    pendingPayments: [],
    completedPayments,
    savedLandlords,
    contracts: [],
  }
}

export async function getMyDocuments(): Promise<{ contracts: ContractData[] }> {
  // Backend doesn't have a documents endpoint yet, returning empty for now
  return { contracts: [] }
}

export async function updateProfile(
  data: Partial<TenantProfile>,
): Promise<{ success: boolean; tenant: TenantProfile }> {
  return api.updateProfile(data)
}
