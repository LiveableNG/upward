export type Landlord = {
  id: string
  uuid: string
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
  subaccountCode?: string
  isVerified?: boolean
}

export type PayRentStep =
  | 'select'
  | 'property-select'
  | 'new'
  | 'confirm'
  | 'payment-method'
  | 'bank-transfer'
  | 'upload-proof'
export interface LineItem {
  label: string
  amount: number
  name?: string
  totalAmount?: number
  amountPaid?: number
}
