import { type TenantProfile } from '@/features/auth/types'

export interface DashboardData {
  tenant: TenantProfile
  pendingPayments: Array<{
    uuid: string
    total_amount: number
    currency: string
    status: string
    payment_link_token: string
    invoice_number: string
    notes: string
    company_name: string
    company_logo: string
  }>
  completedPayments: Array<{
    uuid: string
    amount: number
    currency: string
    status: string
    channel: string
    paid_at: string
    paystack_reference: string
    company_name: string
  }>
  savedLandlords: Array<{
    uuid: string
    name: string
    account_name: string
    account_number: string
    bank_name: string
    bank_code: string
    last_paid: string | null
    last_amount: number
  }>
}
