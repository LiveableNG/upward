import { useAuth } from '@/features/auth/AuthProvider'
import { usePaymentSse } from '@/features/payments/hooks/usePaymentSse'

/** Keeps dashboard queries fresh when Paystack / DVA payments settle. */
export function PaymentEventsSync() {
  const { user, isLoggedIn } = useAuth()
  usePaymentSse(isLoggedIn ? user?.uuid : null)
  return null
}
