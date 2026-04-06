import { type TenantProfile } from '@/features/auth/types'

export type { TenantProfile }

export interface PendingPayment {
  uuid: string
  total_amount: number
  currency: string
  status: string
  payment_link_token: string
  invoice_number: string
  notes: string
  company_name: string
  company_logo: string
}

export interface CompletedPayment {
  uuid: string
  amount: number
  currency: string
  status: string
  channel: string
  paid_at: string
  paystack_reference: string
  company_name: string
  type?: 'debit' | 'credit'
}

export interface SavedLandlord {
  uuid: string
  name: string
  account_name: string
  account_number: string
  bank_name: string
  bank_code: string
  last_paid: string | null
  last_amount: number
}

export interface ContractData {
  id: string
  name: string
  url: string
  createdAt: string
  size: number
  type: string
  propertyName?: string
  leaseEnd?: string
}

export interface DashboardData {
  tenant: TenantProfile
  pendingPayments: PendingPayment[]
  completedPayments: CompletedPayment[]
  savedLandlords: SavedLandlord[]
  contracts: ContractData[]
}

export interface Notification {
  id: string
  text: string
  iconType: 'sparkles' | 'clock' | 'target'
}
