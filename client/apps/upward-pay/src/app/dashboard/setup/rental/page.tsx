'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/features/auth/AuthContext'
import FallbackSuspense from '@/components/FallbackSuspense'
import { RentalFormView } from '@/features/dashboard/setup/components/RentalFormView'
import { RentalPropertiesListView } from '@/features/dashboard/setup/components/RentalPropertiesListView'
import { useSetupMode } from '@/features/dashboard/setup/setupPaths'

function SetupRentalPageInner() {
  const { user } = useAuth()
  const { isEdit } = useSetupMode()
  const searchParams = useSearchParams()

  const propertyUuid = searchParams.get('property')
  const isNew = searchParams.get('new') === '1'
  const returnTo = searchParams.get('returnTo')

  const activeProperties = (user?.properties || []).filter((p) => !p.isPastTenancy)

  if (isEdit && !propertyUuid && !isNew && !returnTo && activeProperties.length > 0) {
    return <RentalPropertiesListView properties={activeProperties} />
  }

  return <RentalFormView />
}

export default function SetupRentalPage() {
  return (
    <Suspense fallback={<FallbackSuspense message="Loading rental details..." />}>
      <SetupRentalPageInner />
    </Suspense>
  )
}
