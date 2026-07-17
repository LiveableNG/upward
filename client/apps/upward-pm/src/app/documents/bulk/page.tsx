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
    <>
      <div className="documents-desktop-view">
        <div className="container" style={{ padding: '40px' }}>
          {isReady ? (
            <BulkDocumentEditorView 
              initialRecipients={initialRecipients}
              onBack={handleBack}
            />
          ) : (
            <ListSkeleton />
          )}
        </div>
      </div>

      <div className="documents-mobile-view">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: 24, textAlign: 'center' }}>
          <div style={{ background: 'var(--surface-hover)', padding: 24, borderRadius: 24, marginBottom: 24 }}>
            <span style={{ fontSize: 48 }}>💻</span>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--dark)', marginBottom: 12 }}>Desktop Only Feature</h2>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Bulk Document management requires complex configuration that is best handled on a larger screen.
          </p>
        </div>
      </div>

      <style jsx>{`
        .documents-mobile-view {
          display: none;
        }
        @media (max-width: 768px) {
          .documents-desktop-view {
            display: none;
          }
          .documents-mobile-view {
            display: block;
          }
        }
      `}</style>
    </>
  )
}

export default function BulkDocumentPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <BulkDocumentContent />
    </Suspense>
  )
}
