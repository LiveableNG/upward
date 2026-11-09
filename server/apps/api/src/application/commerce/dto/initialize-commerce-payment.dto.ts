export interface InitializeCommercePaymentResponse {
  authorizationUrl: string
  accessCode?: string
  reference: string
  orderNumber: string
  amountKobo: string
  currency: string
}
