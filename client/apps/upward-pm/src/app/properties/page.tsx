import { Suspense } from 'react'
import { PropertiesView } from '@/features/pm/components/properties/PropertiesView'
import { TableSkeleton } from '@/components/skeletons'

export default function Properties() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <PropertiesView />
    </Suspense>
  )
}
