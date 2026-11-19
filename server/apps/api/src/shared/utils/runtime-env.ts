export function isProductionRuntime(paystackSecretKey?: string): boolean {
  const secret = paystackSecretKey || process.env.PAYSTACK_SECRET_KEY

  if (secret?.startsWith('sk_live_')) {
    return true
  }
  if (secret?.startsWith('sk_test_')) {
    return false
  }
  return process.env.NODE_ENV === 'production'
}
