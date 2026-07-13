'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DocumentManagementView } from '@/features/pm/components/documents/DocumentManagementView'
import { DocumentEditorView } from '@/features/pm/components/documents/DocumentEditorView'
import { CreateTemplateView } from '@/features/pm/components/documents/CreateTemplateView'
import { useTenants } from '@/features/pm/hooks/useTenants'
import { ListSkeleton } from '@/components/skeletons'
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
  const [templateToEdit, setTemplateToEdit] = useState<any>(null)
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
    setTemplateToEdit(null)
    setView('create-template')
  }

  const handleEditTemplate = (template: any) => {
    setTemplateToEdit(template)
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
    } else if (view === 'create-template') {
      setView('list')
      setTemplateToEdit(null)
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
      setTemplateToEdit(null)
      setInitialRecipient(null)
    }
  }

  return (
    <>
      <div className="documents-desktop-view">
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
              onEditTemplate={handleEditTemplate}
            />
          ) : view === 'create-template' ? (
            <CreateTemplateView
              template={templateToEdit}
              onBack={handleBack}
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
      </div>

      <div className="documents-mobile-view">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: 24, textAlign: 'center' }}>
          <div style={{ background: 'var(--surface-hover)', padding: 24, borderRadius: 24, marginBottom: 24 }}>
            <span style={{ fontSize: 48 }}>💻</span>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--dark)', marginBottom: 12 }}>Desktop Only Feature</h2>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Document management requires complex configuration that is best handled on a larger screen.
          </p>
          <div style={{ marginTop: 32, padding: 16, background: 'var(--ivory-dim)', borderRadius: 16, border: '1px dashed var(--border)' }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>Visit your dashboard on a computer at:</p>
            <p style={{ fontSize: 16, color: 'var(--forest)', fontWeight: 700, wordBreak: 'break-all' }}>{process.env.NEXT_PUBLIC_WEB_URL || 'upward.com'}</p>
          </div>
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

export default function DocumentManagementPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <DocumentManagementContent />
    </Suspense>
  )
}
