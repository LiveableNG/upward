export interface PaymentRequestData {
  paymentRequest: {
    uuid: string
    totalAmount: number
    currency: string
    status: string
    invoiceNumber: string
    notes: string
    createdAt: string
  }
  company: {
    uuid: string
    name: string
    logoUrl: string
    email: string
  }
  property: {
    uuid: string
    name: string
    address: string
  } | null
  tenant: {
    uuid: string
    fullName: string
    email: string
    signupStatus: string
  } | null
  lineItems: {
    uuid: string
    name: string
    category: string
    amount: number
  }[]
}

export interface PaymentInitResponse {
  status: boolean
  message: string
  data: {
    type?: 'DVA' | 'STANDARD'
    reference: string
    amount: number
    currency: string
    authorization_url?: string
    access_code?: string
    dva?: {
      accountNumber: string
      accountName: string
      bankName: string
      bankCode: string
    }
  }
}

export interface PaymentVerifyResponse {
  status: boolean
  message: string
  data: {
    reference: string
    transactionUuid?: string
    isVerified?: boolean
    status: string
    amount: number
    paidAt?: string
    receipt?: {
      invoiceNumber: string
      message: string
    }
  }
}
