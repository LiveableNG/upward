export type LineItemRecord = {
  id: number
  name: string
  totalAmount: number
  amountPaid: number
  status: 'PENDING' | 'PARTIAL' | 'PAID'
}

export type LineItemAllocation = {
  id: number
  name: string
  totalAmount: number
  amountPaid: number
  allocated: number
  remaining: number
}

export type PaymentInitResult =
  | {
      type: 'PAYSTACK'
      accessCode: string
      reference: string
      amount: number
    }
  | {
      type: 'DVA'
      reference: string
      amount: number
      dva: {
        accountNumber: string
        accountName: string
        bankName: string
      }
    }

export type PaymentRequestPayload = {
  payment: {
    uuid: string
    amount: number
    amountPaid: number
    status: string
    lineItemRecords: LineItemRecord[]
    processingRates?: {
      transactionFee: number
      benefitsFee: number
      benefitsPaid: boolean
      benefitsPaidForRequest: boolean
    }
    company_name?: string
    property_address?: string
    description?: string
  }
  user?: {
    uuid?: string
    email: string
    firstName?: string
    lastName?: string
    phone?: string
    hasPassword?: boolean
  }
  inviteToken?: string
  hasPassword?: boolean
}
