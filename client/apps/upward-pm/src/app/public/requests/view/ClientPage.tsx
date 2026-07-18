'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { RecordFulfillmentView } from '@/features/pm/components/records/RecordFulfillmentView'
import { UpwardLogo } from '@/components/common/UpwardLogo'

function PublicRequestContent() {
  const searchParams = useSearchParams()
  const uuid = searchParams.get('uuid')

  return (
    <div className="fulfillment-portal">
      <header className="fulfillment-header">
        <div className="fulfillment-header__container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UpwardLogo size={32} color="var(--forest)" />
            <span style={{ fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--forest)' }}>Upward</span>
          </div>
          <div className="fulfillment-header__tag">
            Records Fulfillment Portal
          </div>
        </div>
      </header>

      <main className="fulfillment-content">
        <RecordFulfillmentView uuid={uuid as string} isPublic={true} />
      </main>
    </div>
  )
}

export default function ClientPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PublicRequestContent />
    </Suspense>
  )
}
