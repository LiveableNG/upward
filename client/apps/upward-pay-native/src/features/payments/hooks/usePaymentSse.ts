import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'

import { connectPaymentSse } from '@/lib/payment-sse'

const PAYMENT_SUCCEEDED_KEYS = [
  'dashboard',
  'scoreProfile',
  'score-profile',
  'notifications',
  'pending-payments',
  'pendingPayments',
  'transactions',
  'profile',
  'user-profile',
  'wallet',
  'dashboard-counts',
  'activeTenancy',
  'rentalDetails',
  'tenancies',
  'benefits-status',
  'rent-vault',
] as const

const PAYMENT_REQUEST_KEYS = [
  'dashboard',
  'notifications',
  'pending-payments',
  'pendingPayments',
  'dashboard-counts',
  'activeTenancy',
  'rentalDetails',
] as const

function invalidateKeys(queryClient: ReturnType<typeof useQueryClient>, keys: readonly string[]) {
  keys.forEach((key) => {
    void queryClient.invalidateQueries({ queryKey: [key] })
  })
}

export function usePaymentSse(userUuid: string | null | undefined) {
  const queryClient = useQueryClient()
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const disconnectRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!userUuid) return

    let cancelled = false

    const connect = () => {
      if (cancelled) return
      disconnectRef.current?.()
      disconnectRef.current = connectPaymentSse({
        userUuid,
        onEvent: (data) => {
          const type = data.type
          if (type === 'heartbeat') return

          if (type === 'payment.succeeded') {
            invalidateKeys(queryClient, PAYMENT_SUCCEEDED_KEYS)
            return
          }

          if (type === 'payment.request.created' || type === 'payment.request.updated') {
            invalidateKeys(queryClient, PAYMENT_REQUEST_KEYS)
          }
        },
        onDisconnect: () => {
          if (cancelled) return
          reconnectTimer.current = setTimeout(connect, 4000)
        },
      })
    }

    connect()

    const onAppState = (state: AppStateStatus) => {
      if (state !== 'active') return
      invalidateKeys(queryClient, PAYMENT_SUCCEEDED_KEYS)
      connect()
    }

    const sub = AppState.addEventListener('change', onAppState)

    return () => {
      cancelled = true
      sub.remove()
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      disconnectRef.current?.()
      disconnectRef.current = null
    }
  }, [userUuid, queryClient])
}
