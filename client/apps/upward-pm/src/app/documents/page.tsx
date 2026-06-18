'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DocumentManagementView } from '@/features/pm/components/documents/DocumentManagementView'
import { DocumentEditorView } from '@/features/pm/components/documents/DocumentEditorView'
import { CreateTemplateView } from '@/features/pm/components/documents/CreateTemplateView'
import { useTenants } from '@/features/pm/hooks/useTenants'
import { Splash } from '@/components/common/Splash'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

function DocumentManagementContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const unitUuid = searchParams.get('unitUuid')
  const tenantUuid = searchParams.get('tenantUuid')
  
  const { data: tenants = [] } = useTenants()

  // Fetch unit details if unitUuid is provided to display context
  const { data: unit } = useQuery({
    queryKey: ['pm-unit-detail', unitUuid],
    queryFn: () => api.getUnit(unitUuid as string),
    enabled: !!unitUuid
  })

  const [view, setView] = useState<'list' | 'editor' | 'create-template'>('list')
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
  const [initialRecipient, setInitialRecipient] = useState<any>(null)

  // Resolve recipient from query parameters
  useEffect(() => {
    if (unitUuid && tenantUuid && tenants.length > 0 && !initialRecipient) {
      const tenant = tenants.find(t => t.uuid === tenantUuid)
      setInitialRecipient({
        type: 'existing',
        uuid: tenantUuid,
        name: tenant ? (tenant.commercialName || `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim() || 'Tenant') : 'Tenant',
        email: tenant?.email || '',
        deliveryMode: 'pdf'
      })
    }
  }, [unitUuid, tenantUuid, tenants, initialRecipient])

  const handleNewDocument = () => {
    setEditingTemplate(null)
    if (!unitUuid || !tenantUuid) {
      setInitialRecipient(null)
    }
    setView('editor')
  }

  const handleCreateTemplate = () => {
    setView('create-template')
  }

  const handleSelectTemplate = (template: any) => {
    setEditingTemplate(template)
    if (!unitUuid || !tenantUuid) {
      setInitialRecipient(null)
    }
    setView('editor')
  }

  const handleResendDocument = (doc: any) => {
    setEditingTemplate({
      name: doc.subject,
      content: doc.content
    })
    setInitialRecipient({
      type: doc.tenant?.uuid ? 'existing' : 'new',
      uuid: doc.tenant?.uuid,
      name: doc.recipientName,
      email: doc.recipientEmail,
      deliveryMode: doc.documentType?.toLowerCase() === 'pdf' ? 'pdf' : 'email'
    })
    setView('editor')
  }

  const handleBack = () => {
    if (view === 'editor') {
      setView('list')
      setEditingTemplate(null)
      // Only clear recipient if we are not in unit attachment flow
      if (!unitUuid || !tenantUuid) {
        setInitialRecipient(null)
      }
    } else if (unitUuid) {
      router.push(`/properties/units/${unitUuid}`)
    }
  }

  const handleEditorBack = () => {
    if (unitUuid) {
      router.push(`/properties/units/${unitUuid}`)
    } else {
      setView('list')
      setEditingTemplate(null)
      setInitialRecipient(null)
    }
  }

  return (
    <div className="container" style={{ padding: '40px' }}>
      {view === 'list' && unit && (
        <div style={{
          background: 'var(--ivory-dim)',
          border: '1px solid var(--border)',
          padding: '16px 24px',
          borderRadius: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 32,
          animation: 'fade-in 0.2s ease'
        }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--forest)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Unit Attachment Context</span>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark)', marginTop: 4 }}>
              Attaching document to unit: <strong>{unit.unitName}</strong> at <strong>{unit.property?.name || 'Property'}</strong>
            </h3>
          </div>
          <button 
            className="btn btn--secondary" 
            onClick={handleBack}
            style={{ height: 40, borderRadius: 10 }}
          >
            ← Return to Unit
          </button>
        </div>
      )}

      {view === 'list' ? (
        <DocumentManagementView 
          onNewDocument={handleNewDocument}
          onSelectTemplate={handleSelectTemplate}
          onResendDocument={handleResendDocument}
          onCreateTemplate={handleCreateTemplate}
        />
      ) : view === 'create-template' ? (
        <CreateTemplateView
          onBack={() => setView('list')}
        />
      ) : (
        <DocumentEditorView 
          initialTemplate={editingTemplate}
          initialRecipient={initialRecipient}
          unitUuid={unitUuid || undefined}
          onBack={handleEditorBack}
        />
      )}
    </div>
  )
}

export default function DocumentManagementPage() {
  return (
    <Suspense fallback={<Splash />}>
      <DocumentManagementContent />
    </Suspense>
  )
}
