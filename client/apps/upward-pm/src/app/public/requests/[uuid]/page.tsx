'use client'

import React from 'react'
import { RecordFulfillmentView } from '@/features/pm/components/records/RecordFulfillmentView'
import { UpwardLogo } from '@/components/common/UpwardLogo'

export default function UnguardedFulfillmentPage({ params }: { params: { uuid: string } }) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="w-full border-b border-border bg-surface px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <UpwardLogo size={32} color="var(--forest)" />
          <span className="font-bold tracking-widest uppercase text-forest">Upward</span>
        </div>
        <div className="text-sm font-medium text-text-muted">
          Past Tenancy Records Fulfillment Portal
        </div>
      </header>
      
      <main className="p-4 md:p-8">
        <RecordFulfillmentView uuid={params.uuid} isPublic={true} />
      </main>
    </div>
  )
}
