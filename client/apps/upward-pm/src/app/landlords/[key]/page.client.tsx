'use client'

import React, { Suspense, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useProperties, useUnits } from '@/features/pm/hooks/useProperties'
import { usePaymentRequests } from '@/features/pm/hooks/usePayments'
import { LandlordDetailView } from '@/features/pm/components/landlords/LandlordDetailView'
import { GenerateLandlordReportView } from '@/features/pm/components/landlords/GenerateLandlordReportView'
import { LandlordReportEditorView } from '@/features/pm/components/landlords/LandlordReportEditorView'
import { DetailSkeleton } from '@/components/skeletons'
import { useToast } from '@/components/common/Toast'

type ViewStep = 'detail' | 'configure' | 'edit'

function LandlordDetailPageContent() {
  const { key } = useParams()
  const router = useRouter()
  const { success } = useToast()
  
  const { data: properties = [] } = useProperties()
  const { data: allUnits = [] } = useUnits()
  const { data: paymentRequests = [] } = usePaymentRequests()
  const [step, setStep] = useState<ViewStep>('detail')
  const [reportContent, setReportContent] = useState('')

  // Find properties belonging to this virtual landlord
  const decodedKey = decodeURIComponent(key as string)
  
  const landlordProperties = properties.filter(prop => {
    if (!prop.landlordName) return false
    const propKey = `${prop.landlordName.toLowerCase()}-${(prop.landlordEmail || '').toLowerCase()}`
    return propKey === decodedKey
  })

  const landlordUnits = allUnits.filter(unit => {
    const prop = properties.find(p => p.id === unit.propertyId || p.uuid === (unit as any).propertyUuid)
    if (!prop || !prop.landlordName) return false
    const propKey = `${prop.landlordName.toLowerCase()}-${(prop.landlordEmail || '').toLowerCase()}`
    return propKey === decodedKey
  })

  if (landlordProperties.length === 0) {
    return (
      <div style={{ padding: 100, textAlign: 'center' }}>
        <h2>Landlord not found</h2>
        <button onClick={() => router.push('/landlords')} className="btn btn--secondary" style={{ marginTop: 20 }}>
          Back to Landlords
        </button>
      </div>
    )
  }

  const representativeProp = landlordProperties[0]



  if (step === 'configure') {
    return (
      <GenerateLandlordReportView 
        landlordName={representativeProp.landlordName || 'Unknown Landlord'}
        properties={landlordProperties}
        units={landlordUnits}
        onBack={() => setStep('detail')}
        onGenerate={(content) => {
          setReportContent(content)
          setStep('edit')
        }}
      />
    )
  }

  if (step === 'edit') {
    return (
      <LandlordReportEditorView 
        landlordName={representativeProp.landlordName || 'Unknown Landlord'}
        landlordEmail={representativeProp.landlordEmail || ''}
        initialContent={reportContent}
        onBack={() => setStep('configure')}
        onDone={() => setStep('detail')}
      />
    )
  }

  return (
    <LandlordDetailView 
      landlordName={representativeProp.landlordName || 'Unknown Landlord'}
      landlordEmail={representativeProp.landlordEmail || ''}
      landlordPhone={representativeProp.landlordPhone || ''}
      properties={landlordProperties}
      units={landlordUnits}
      paymentRequests={paymentRequests}
      onBack={() => router.push('/landlords')}
      onCreateReport={() => setStep('configure')}
    />
  )
}

export default function LandlordDetailPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <LandlordDetailPageContent />
    </Suspense>
  )
}
