'use client'

import React from 'react'
import { RecordFulfillmentView } from '@/features/pm/components/records/RecordFulfillmentView'
import { UpwardLogo } from '@/components/common/UpwardLogo'

export default function UnguardedFulfillmentPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = React.use(params)

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
        <RecordFulfillmentView uuid={uuid} isPublic={true} />
      </main>
    </div>
  )
}
