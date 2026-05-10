'use client'

import React from 'react'
import { RecordFulfillmentView } from '@/features/pm/components/records/RecordFulfillmentView'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function RequestFulfillmentPage({ params }: { params: { uuid: string } }) {
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
        <RecordFulfillmentView uuid={params.uuid} isPublic={false} />
      </main>
    </div>
  )
}
