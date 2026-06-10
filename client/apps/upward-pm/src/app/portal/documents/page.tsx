'use client'

import React, { useState, Suspense } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { DocumentManagementView } from '@/features/pm/components/documents/DocumentManagementView'
import { DocumentEditorView } from '@/features/pm/components/documents/DocumentEditorView'
import { CreateTemplateView } from '@/features/pm/components/documents/CreateTemplateView'
import { Splash } from '@/components/common/Splash'

export default function LandlordDocumentManagementPage() {
  const router = useRouter()
  const [view, setView] = useState<'list' | 'editor' | 'create-template'>('list')
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
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
    setView('create-template')
  }

  const handleBack = () => {
    setView('list')
    setEditingTemplate(null)
    setInitialRecipient(null)
  }

  return (
    <Suspense fallback={<Splash />}>
      <div className="container" style={{ padding: '24px 40px' }}>
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
          />
        ) : view === 'create-template' ? (
          <CreateTemplateView
            onBack={() => setView('list')}
          />
        ) : (
          <DocumentEditorView 
            initialTemplate={editingTemplate}
            initialRecipient={initialRecipient}
            onBack={handleBack}
          />
        )}
      </div>
    </Suspense>
  )
}
