/**
 * Runtime environment helpers for strictly isolating simulations, mock fallbacks,
 * and unsigned webhook testing from production environments.
 */

/**
 * Returns true when the server is running in production (or holding live Paystack credentials).
 * Staging/Vercel preview deployments (`VERCEL_ENV=preview`) and local/test runtimes return false
 * unless live Paystack credentials (`sk_live_`) or `APP_ENV=production` are explicitly active.
 */
export function isProductionRuntime(paystackSecretKey?: string): boolean {
  if (paystackSecretKey?.startsWith('sk_live_')) {
    return true
  }
  const vercelEnv = process.env.VERCEL_ENV
  if (vercelEnv === 'production') {
    return true
  }
  if (process.env.APP_ENV === 'production') {
    return true
  }
  if (process.env.NODE_ENV === 'production' && vercelEnv !== 'preview' && vercelEnv !== 'development') {
    return true
  }
  return false
}
