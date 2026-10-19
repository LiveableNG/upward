'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { RecordFulfillmentView } from '@/features/pm/components/records/RecordFulfillmentView'

function RequestContent() {
  const searchParams = useSearchParams()
  const uuid = searchParams.get('uuid') || ''

  return <RecordFulfillmentView uuid={uuid} isPublic={false} />
}

export default function ClientPage() {
  return (
    <Suspense
      fallback={
        <div className="public-fulfillment">
          <div className="public-fulfillment__container">Loading...</div>
        </div>
      }
    >
      <RequestContent />
    </Suspense>
  )
}
