export interface PaystackWebhookPayload {
  event: string
  data: {
    id: number
    domain: string
    status: string
    reference: string
    amount: number
    message: string | null
    gateway_response: string
    paid_at: string
    created_at: string
    channel: string
    currency: string
    ip_address: string
    metadata: any
    fees: number
    customer: {
      id: number
      first_name: string
      last_name: string
      email: string
      customer_code: string
      phone: string | null
      metadata: any
      risk_action: string
    }
    authorization: {
      authorization_code: string
      bin: string
      last4: string
      exp_month: string
      exp_year: string
      channel: string
      card_type: string
      bank: string
      country_code: string
      brand: string
      reusable: boolean
      signature: string
    }
    plan: any
    subaccount?: {
      subaccount_code: string
      business_name: string
      description: string
      primary_contact_name: string | null
      primary_contact_email: string | null
      primary_contact_phone: string | null
      metadata: any
      percentage_charge: number
      settlement_bank: string
      account_number: string
    }
  }
}
