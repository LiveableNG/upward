export type Landlord = {
  id: string
  name: string
  accountName: string
  accountNumber: string
  bankName: string
  bankCode: string
  avatar: string
  source?: string
  lastPaid: string | null
  lastAmount: number
  role?: string
  address?: string
}

export type PayRentStep = 'select' | 'new' | 'confirm' | 'checkout' | 'processing' | 'success'
export interface LineItem {
  label: string
  amount: number
}
