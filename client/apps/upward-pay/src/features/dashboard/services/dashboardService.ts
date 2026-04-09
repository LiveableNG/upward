/* eslint-disable @typescript-eslint/no-explicit-any */

import { api } from '@/lib/api'
import {
  type DashboardData,
  type ContractData,
  type CompletedPayment,
  type SavedLandlord,
} from '../types'
import { type UserProfile } from '@/features/auth/types'

export async function getDashboardData(): Promise<DashboardData> {
  const [profile, txs, landlords, pending] = await Promise.all([
    api.getProfile(),
    api.getTransactions(),
    api.getSavedLandlords(),
    api.getPendingPayments(),
  ])

  const pendingPayments = (pending || []).map((p: any) => ({
    uuid: p.uuid,
    amount: p.amount,
    currency: p.currency,
    total_amount: p.amount,
    status: p.status,
    company_name: p.companyName || null,
    manager_name: p.managerName || null,
    property_address: p.propertyLocation || null,
    description: p.description,
    due_date: p.dueDate,
    payment_link_token: p.uuid,
    invoice_number: p.reference || p.uuid.slice(0, 8),
    notes: p.description,
    subaccount_code: p.subaccountCode || null,
    company_logo: '',
  }))

  const completedPayments: CompletedPayment[] = (txs || []).map((t: any) => ({
    uuid: t.uuid,
    amount: t.amount,
    currency: 'NGN',
    status: t.status,
    channel: 'Paystack',
    paid_at: t.createdAt,
    paystack_reference: t.reference,
    company_name: t.narration || (t.type === 'RENT' ? 'Rent Payment' : 'Transfer'),
    type: 'debit',
  }))

  const savedLandlords: SavedLandlord[] = (landlords || []).map((l: any) => ({
    uuid: l.uuid,
    name: l.name,
    account_name: l.accountName,
    account_number: l.accountNumber,
    bank_name: l.bankName,
    bank_code: l.bankCode,
    last_paid: l.lastPaid,
    last_amount: l.lastAmount || 0,
  }))

  return {
    user: profile,
    pendingPayments,
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
  data: Partial<UserProfile>,
): Promise<{ success: boolean; user: UserProfile }> {
  return api.updateProfile(data)
}
