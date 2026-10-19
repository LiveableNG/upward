'use client'

import React from 'react'
import { RecordFulfillmentView } from '@/features/pm/components/records/RecordFulfillmentView'

export default function UnguardedFulfillmentPage({
  params,
}: {
  params: Promise<{ uuid: string }>
}) {
  const { uuid } = React.use(params)

  return <RecordFulfillmentView uuid={uuid} isPublic={true} />
}
