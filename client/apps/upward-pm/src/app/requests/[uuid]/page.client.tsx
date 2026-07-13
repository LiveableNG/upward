'use client'

import React from 'react'
import { RecordFulfillmentView } from '@/features/pm/components/records/RecordFulfillmentView'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function RequestFulfillmentPage({ params }: { params: Promise<{ uuid: string }> }) {
  const router = useRouter()
  const { uuid } = React.use(params)
  
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
        <RecordFulfillmentView uuid={uuid} isPublic={false} />
      </main>
    </div>
  )
}
