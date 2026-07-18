'use client'

import React, { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { RecordFulfillmentView } from '@/features/pm/components/records/RecordFulfillmentView'
import { ArrowLeft } from 'lucide-react'

function RequestContent() {
  const searchParams = useSearchParams()
  const uuid = searchParams.get('uuid')
  const router = useRouter()

  return (
    <div className="fulfillment-portal">
      <header className="fulfillment-header">
        <div className="fulfillment-header__container">
          <button
            onClick={() => router.push('/requests')}
            className="fulfillment-header__back"
          >
            <ArrowLeft size={18} />
            Back to Requests
          </button>
          <div className="fulfillment-header__tag">
            Request Fulfillment
          </div>
        </div>
      </header>

      <main className="fulfillment-content">
        <RecordFulfillmentView uuid={uuid as string} isPublic={false} />
      </main>
    </div>
  )
}

export default function ClientPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RequestContent />
    </Suspense>
  )
}
