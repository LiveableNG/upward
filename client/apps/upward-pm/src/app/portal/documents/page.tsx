'use client'

import React, { useState, Suspense } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { DocumentManagementView } from '@/features/pm/components/documents/DocumentManagementView'
import { DocumentEditorView } from '@/features/pm/components/documents/DocumentEditorView'
import { CreateTemplateView } from '@/features/pm/components/documents/CreateTemplateView'
import { ListSkeleton } from '@/components/skeletons'
import { FeatureGate } from '@/features/pm/components/subscription/FeatureGate'
import { FeatureKey } from '@/features/pm/types/subscription'

export default function LandlordDocumentManagementPage() {
  const router = useRouter()
  const [view, setView] = useState<'list' | 'editor' | 'create-template'>('list')
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
  const [templateToEdit, setTemplateToEdit] = useState<any>(null)
  const [initialRecipient, setInitialRecipient] = useState<any>(null)

  const handleNewDocument = () => {
    setEditingTemplate(null)
    setInitialRecipient(null)
    setView('editor')
  }

  const handleSelectTemplate = (template: any) => {
    setEditingTemplate(template)
    setInitialRecipient(null)
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

  const handleCreateTemplate = () => {
    setTemplateToEdit(null)
    setView('create-template')
  }

  const handleEditTemplate = (template: any) => {
    setTemplateToEdit(template)
    setView('create-template')
  }

  const handleBack = () => {
    setView('list')
    setEditingTemplate(null)
    setTemplateToEdit(null)
    setInitialRecipient(null)
  }

  return (
    <Suspense fallback={<ListSkeleton />}>
      <div className="container" style={{ padding: '24px 40px' }}>
        <FeatureGate feature={FeatureKey.DOCUMENT_MANAGEMENT}>
          {view === 'list' && (
            <button 
              onClick={() => router.push('/portal')} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                background: 'none', 
                border: 'none', 
                color: 'var(--text-muted)', 
                cursor: 'pointer', 
                fontWeight: 600, 
                fontSize: '14px', 
                marginBottom: '24px', 
                padding: 0 
              }}
            >
              <ArrowLeft size={18} /> Back to Dashboard
            </button>
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
              onBack={handleBack}
            />
          )}
        </FeatureGate>
      </div>
    </Suspense>
  )
}
