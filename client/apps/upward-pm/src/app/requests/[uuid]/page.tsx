'use client'

import React from 'react'
import { RecordFulfillmentView } from '@/features/pm/components/records/RecordFulfillmentView'

export default function GuardedFulfillmentPage({ params }: { params: { uuid: string } }) {
  return (
    <>
      <RecordFulfillmentView uuid={params.uuid} isPublic={false} />
    </>
  )
}
