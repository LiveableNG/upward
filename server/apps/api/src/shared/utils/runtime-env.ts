export function isProductionRuntime(paystackSecretKey?: string): boolean {
  if (paystackSecretKey?.startsWith('sk_live_')) {
    return true
  }
  if (paystackSecretKey?.startsWith('sk_test_')) {
    return false
  }
  return process.env.NODE_ENV === 'production'
}
