'use client'

import { sessionTracker } from '@/lib/sessionTracker'

export function openPaystackInline(accessCode: string, amount?: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const scriptId = 'paystack-inline-js'
    let script = document.getElementById(scriptId) as HTMLScriptElement | null

    const launch = () => {
      try {
        sessionTracker.trackEvent(
          'INITIATE_PAYSTACK',
          { accessCode, amount, flow: 'COMMERCE_ORDER' },
          'PAYSTACK_POPUP',
        )
        const popup = new (window as any).PaystackPop()
        popup.resumeTransaction(accessCode, {
          onSuccess: (transaction: any) => {
            sessionTracker.trackEvent(
              'PAYMENT_SUCCESS',
              {
                reference: transaction.reference,
                amount,
                flow: 'COMMERCE_ORDER',
              },
              'PAYMENT_COMPLETE',
            )
            resolve(transaction.reference)
          },
          onCancel: () => {
            sessionTracker.trackEvent(
              'PAYSTACK_CLOSED_UNPAID',
              { accessCode, amount, flow: 'COMMERCE_ORDER' },
              'PAYSTACK_CANCELLED',
            )
            reject(new Error('Payment cancelled'))
          },
        })
      } catch (err: any) {
        sessionTracker.trackEvent(
          'PAYMENT_ERROR',
          { error: err?.message, flow: 'COMMERCE_ORDER' },
          'PAYMENT_ERROR',
        )
        reject(err)
      }
    }

    if (!script) {
      script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://js.paystack.co/v2/inline.js'
      script.async = true
      script.onload = launch
      script.onerror = () => {
        sessionTracker.trackEvent(
          'PAYMENT_ERROR',
          { error: 'Failed to load Paystack script', flow: 'COMMERCE_ORDER' },
          'PAYMENT_ERROR',
        )
        reject(new Error('Failed to load Paystack payment gateway'))
      }
      document.body.appendChild(script)
      return
    }

    if ((window as any).PaystackPop) launch()
    else script.addEventListener('load', launch)
  })
}
