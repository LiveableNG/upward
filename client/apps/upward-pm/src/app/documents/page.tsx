
'use client'

import React, { useState, Suspense } from 'react'
import { DocumentManagementView } from '@/features/pm/components/documents/DocumentManagementView'
import { DocumentEditorView } from '@/features/pm/components/documents/DocumentEditorView'
import { Splash } from '@/components/common/Splash'

export default function DocumentManagementPage() {
  const [view, setView] = useState<'list' | 'editor'>('list')
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

  const handleBack = () => {
    setView('list')
    setEditingTemplate(null)
    setInitialRecipient(null)
  }

  return (
    <Suspense fallback={<Splash />}>
      <div className="container" style={{ padding: '40px' }}>
        {view === 'list' ? (
          <DocumentManagementView 
            onNewDocument={handleNewDocument}
            onSelectTemplate={handleSelectTemplate}
            onResendDocument={handleResendDocument}
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
