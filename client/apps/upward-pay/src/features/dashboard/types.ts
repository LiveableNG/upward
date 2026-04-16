import { type UserProfile } from '@/features/auth/types'

export type { UserProfile }

export interface PendingPayment {
  id: number
  uuid: string
  total_amount: number
  amountPaid: number
  currency: string
  status: string
  payment_link_token: string
  invoice_number: string
  description: string
  company_name?: string
  company_logo?: string
  allowPartial?: boolean
  property_address?: string
  userPropertyUuid?: string
  lineItemRecords?: any[]
  due_date?: string | Date
  dueDate?: string | Date
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
  transactionType?: 'PAYMENT' | 'FUTURE_CREDIT'
  property_address?: string
  lineItems?: any[]
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
  uuid: string
  fileName: string
  fileUrl: string
  createdAt: string
  fileSize: number
  fileType: string
  propertyName?: string
  leaseEnd?: string
}

export interface DashboardData {
  user: UserProfile
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
