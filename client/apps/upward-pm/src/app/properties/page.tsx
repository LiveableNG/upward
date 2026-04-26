import { Suspense } from 'react'
import { PropertiesView } from '@/features/pm/components/properties/PropertiesView'
import { Splash } from '@/components/common/Splash'

export default function PropertiesPage() {
  return (
    <Suspense fallback={<Splash />}>
      <PropertiesView />
    </Suspense>
  )
}
