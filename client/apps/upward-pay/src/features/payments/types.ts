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
    label: string
    category: string
    amount: number
  }[]
}

export interface PaymentInitResponse {
  status: boolean
  message: string
  data: {
    reference: string
    amount: number
    currency: string
    authorization_url: string
    access_code: string
  }
}

export interface PaymentVerifyResponse {
  status: boolean
  message: string
  data: {
    reference: string
    transactionUuid: string
    status: string
    amount: number
    paidAt: string
    receipt: {
      invoiceNumber: string
      message: string
    }
  }
}
