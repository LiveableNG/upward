'use client'

import React, { Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useProperty, useUnits } from '@/features/pm/hooks/useProperties'
import { PropertyDetailView } from '@/features/pm/components/properties/PropertyDetailView'
import { Splash } from '@/components/common/Splash'

function PropertyDetailContent() {
  const { uuid } = useParams()
  const router = useRouter()
  
  const { data: property } = useProperty(uuid as string)
  const { data: units = [] } = useUnits(uuid as string)

  if (!property) return null

  return (
    <div className="animate-fade-in" style={{ padding: '0 0 40px 0' }}>
      <PropertyDetailView 
        property={property} 
        units={units} 
        onBack={() => router.push('/properties')}
        onViewUnit={(unit) => router.push(`/properties/units/${unit.uuid}`)}
      />
    </div>
  )
}

export default function PropertyDetailPage() {
  return (
    <Suspense fallback={<Splash />}>
      <PropertyDetailContent />
    </Suspense>
  )
}
