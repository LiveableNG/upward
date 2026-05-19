'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function PaymentRedirectHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const prop = searchParams.get('prop') || searchParams.get('propertyUuid')
    if (prop) {
      router.replace(`/dashboard/pay-rent?propertyUuid=${prop}`)
    } else {
      router.replace('/dashboard/pay-rent')
    }
  }, [router, searchParams])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <style jsx>{`
        .redirect-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          text-align: center;
          font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, sans-serif);
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--border-solid, #e5e7eb);
          border-top-color: var(--clay, #d97757);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }
        .text {
          color: var(--text-muted, #6b7280);
          font-size: 0.95rem;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div className="redirect-container">
        <div className="spinner" />
        <p className="text">Redirecting to payment portal...</p>
      </div>
    </div>
  )
}

export default function PaymentRedirectPage() {
  return (
    <Suspense fallback={null}>
      <PaymentRedirectHandler />
    </Suspense>
  )
}
