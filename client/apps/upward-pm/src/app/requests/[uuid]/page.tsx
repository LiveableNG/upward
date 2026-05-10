'use client'

import React from 'react'
import { RecordFulfillmentView } from '@/features/pm/components/records/RecordFulfillmentView'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function RequestFulfillmentPage({ params }: { params: { uuid: string } }) {
  const router = useRouter()
  
  return (
    <div className="min-h-screen">
      <header className="bg-surface border-b border-border py-4 px-6 mb-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => router.push('/requests')}
            className="flex items-center gap-2 text-sm font-medium text-text-muted hover:text-forest transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Requests
          </button>
          <div className="text-sm font-bold tracking-widest uppercase text-forest">
            Request Fulfillment
          </div>
        </div>
      </header>

      <main className="p-4 md:p-0">
        <RecordFulfillmentView uuid={params.uuid} isPublic={false} />
      </main>
    </div>
  )
}
