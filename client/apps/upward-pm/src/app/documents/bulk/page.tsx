'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BulkDocumentEditorView } from '@/features/pm/components/documents/BulkDocumentEditorView'
import { useTenants } from '@/features/pm/hooks/useTenants'
import { ListSkeleton } from '@/components/skeletons'

function BulkDocumentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tenantUuids = searchParams.get('tenants')?.split(',') || []
  
  const { data: tenants = [], isLoading } = useTenants()
  const [initialRecipients, setInitialRecipients] = useState<any[]>([])
  const [isReady, setIsReady] = useState(false)

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])


  useEffect(() => {
    if (!isLoading && tenants.length > 0) {
      if (tenantUuids.length > 0) {
        const selected = tenants
          .filter(t => tenantUuids.includes(t.uuid))
          .map(t => ({
            uuid: t.uuid,
            name: t.commercialName || `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Tenant',
            email: t.email || '',
            phone: t.phone
          }))
        setInitialRecipients(selected)
      }
      setIsReady(true)
    } else if (!isLoading && tenants.length === 0) {
      setIsReady(true)
    }
  }, [isLoading, tenants, searchParams]) // Need searchParams in deps to trigger effect if it changes

  const handleBack = () => {
    // If they came from /tenants, router.back() is better, but router.push is safer for generic back
    const referer = document.referrer
    if (referer && referer.includes('/tenants')) {
      router.push('/tenants')
    } else {
      router.push('/documents')
    }
  }

  return (
    <div className="container" style={{ padding: isMobile ? '16px' : '40px' }}>
      {isReady ? (
        <BulkDocumentEditorView 
          initialRecipients={initialRecipients}
          onBack={handleBack}
        />
      ) : (
        <ListSkeleton />
      )}
    </div>
  )
}


export default function BulkDocumentPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <BulkDocumentContent />
    </Suspense>
  )
}
