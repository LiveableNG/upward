export interface ReceiptData {
  uuid: string
  title: string
  receiptNumber: string
  amount: number
  currency: string
  lineItems: { label: string; category: string; amount: number }[]
  tenantName: string
  companyName: string
  companyLogo: string
  propertyName: string
  propertyAddress: string
  paidAt: string
  channel: string
  paystackReference: string
  generatedAt: string
  type?: 'debit' | 'credit'
}

export interface ContractData {
  uuid: string
  title: string
  fileName: string
  companyName: string
  companyLogo: string
  propertyName: string
  propertyAddress: string
  leaseStart: string
  leaseEnd: string
  contractType: string
  createdAt: string
}

export interface RentCreditData {
  score: number
  maxScore: number
  grade: string
  totalPayments: number
  totalAmountPaid: number
  monthsTracked: number
  onTimeRate: number
  streak: number
}

export interface DocumentsData {
  receipts: ReceiptData[]
  contracts: ContractData[]
  rentCredit: RentCreditData
}
