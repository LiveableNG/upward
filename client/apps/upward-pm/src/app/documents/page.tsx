
'use client'

import React, { useState, Suspense } from 'react'
import { DocumentManagementView } from '@/features/pm/components/documents/DocumentManagementView'
import { DocumentEditorView } from '@/features/pm/components/documents/DocumentEditorView'
import { Splash } from '@/components/common/Splash'

export default function DocumentManagementPage() {
  const [view, setView] = useState<'list' | 'editor'>('list')
  const [editingTemplate, setEditingTemplate] = useState<any>(null)

  const handleNewDocument = () => {
    setEditingTemplate(null)
    setView('editor')
  }

  const handleSelectTemplate = (template: any) => {
    setEditingTemplate(template)
    setView('editor')
  }

  const handleBack = () => {
    setView('list')
    setEditingTemplate(null)
  }

  return (
    <Suspense fallback={<Splash />}>
      <div className="container" style={{ padding: '40px' }}>
        {view === 'list' ? (
          <DocumentManagementView 
            onNewDocument={handleNewDocument}
            onSelectTemplate={handleSelectTemplate}
          />
        ) : (
          <DocumentEditorView 
            initialTemplate={editingTemplate}
            onBack={handleBack}
          />
        )}
      </div>
    </Suspense>
  )
}
