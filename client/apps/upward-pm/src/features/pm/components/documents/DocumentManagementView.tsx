
'use client'

import React, { useState } from 'react'
import { 
  Plus, 
  Search, 
  FileText, 
  MoreVertical, 
  Download,
  ChevronRight,
  Filter
} from 'lucide-react'
import { useDocuments } from '../../hooks/useDocuments'
import { format } from 'date-fns'
import { CreateTemplateModal } from './CreateTemplateModal'

interface DocumentManagementViewProps {
  onNewDocument: () => void
  onSelectTemplate: (template: any) => void
}

export function DocumentManagementView({ onNewDocument, onSelectTemplate }: DocumentManagementViewProps) {
  const { documents, templates, isLoading } = useDocuments()
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'dashboard' | 'all_templates'>('dashboard')

  const filteredHistory = documents.filter((doc:any) => 
    doc.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.recipientName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group templates by type
  const groupedTemplates = templates.reduce((acc: any, template: any) => {
    const type = template.type || 'CUSTOM';
    if (!acc[type]) acc[type] = [];
    acc[type].push(template);
    return acc;
  }, {});

  const formatTypeName = (type: string) => {
    return type.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ');
  };

  if (viewMode === 'all_templates') {
    return (
      <div className="document-management animate-fade-in">
        <header style={{ marginBottom: 40 }}>
           <button 
             onClick={() => setViewMode('dashboard')}
             style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 14, fontWeight: 500, marginBottom: 12, background: 'none', border: 'none', cursor: 'pointer' }}
           >
             <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} /> Back to Dashboard
           </button>
           <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--dark)' }}>All Document Templates</h1>
           <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>Browse and manage all your property management templates.</p>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
          {/* Default/System Templates Section */}
          <section>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 20, letterSpacing: '0.05em' }}>
              System Templates
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
              <TemplateCard 
                title="Rent Review" 
                type="RENT_REVIEW" 
                onClick={() => onSelectTemplate({ name: 'Rent Review', content: '<h1>Rent Review Notice</h1><p>Dear Tenant,</p><p>This is to inform you of a rent review for your unit...</p>' })} 
              />
              <TemplateCard 
                title="Rent Renewal" 
                type="RENT_RENEWAL" 
                onClick={() => onSelectTemplate({ name: 'Rent Renewal', content: '<h1>Rent Renewal Notice</h1><p>Dear Tenant,</p><p>Your lease is due for renewal...</p>' })} 
              />
            </div>
          </section>

          {/* Grouped Custom Templates */}
          {Object.entries(groupedTemplates).map(([type, items]: [string, any]) => (
            <section key={type}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)', textTransform: 'uppercase', marginBottom: 20, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 12 }}>
                {formatTypeName(type)}
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, background: 'var(--bg)', padding: '2px 8px', borderRadius: 6 }}>{items.length}</span>
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
                {items.map((t: any) => (
                  <TemplateCard 
                    key={t.uuid} 
                    title={t.name} 
                    type={t.type} 
                    onClick={() => onSelectTemplate(t)} 
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="document-management animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--dark)' }}>Document Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Manage your document templates and track sent items.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={() => document.getElementById('word-upload')?.click()}
            className="btn btn--secondary" 
            style={{ borderRadius: 12, padding: '0 24px', height: 48, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Download size={20} /> Import Word Doc
          </button>
          <input 
            id="word-upload" 
            type="file" 
            accept=".docx" 
            style={{ display: 'none' }} 
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              
              try {
                const mammoth = (await import('mammoth')).default
                const arrayBuffer = await file.arrayBuffer()
                const result = await mammoth.convertToHtml({ arrayBuffer })
                onSelectTemplate({ 
                  name: file.name.replace('.docx', ''), 
                  content: result.value 
                })
              } catch (err) {
                console.error('Failed to convert word doc:', err)
              }
            }}
          />
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn--primary" 
            style={{ borderRadius: 12, padding: '0 24px', height: 48, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Plus size={20} /> Create Custom Template
          </button>
        </div>
      </header>

      {/* Recent Templates */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--dark)' }}>Recent Templates</h2>
          <button 
            onClick={() => setViewMode('all_templates')}
            style={{ color: 'var(--clay)', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            View All Templates <ChevronRight size={16} />
          </button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
          {/* Static Default Templates */}
          <TemplateCard 
            title="Rent Review" 
            type="RENT_REVIEW" 
            onClick={() => onSelectTemplate({ name: 'Rent Review', content: '<h1>Rent Review Notice</h1><p>Dear Tenant,</p><p>This is to inform you of a rent review for your unit...</p>' })} 
          />
          <TemplateCard 
            title="Rent Renewal" 
            type="RENT_RENEWAL" 
            onClick={() => onSelectTemplate({ name: 'Rent Renewal', content: '<h1>Rent Renewal Notice</h1><p>Dear Tenant,</p><p>Your lease is due for renewal...</p>' })} 
          />
          
          {templates.slice(0, 4).map((t: any) => (
            <TemplateCard 
              key={t.uuid} 
              title={t.name} 
              type={t.type} 
              onClick={() => onSelectTemplate(t)} 
            />
          ))}
        </div>
      </section>

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--dark)' }}>Document History</h2>
          <div style={{ display: 'flex', gap: 12 }}>
             <button className="btn btn--secondary" style={{ borderRadius: 10, height: 40, padding: '0 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Download size={16} /> Download documents
             </button>
          </div>
        </div>

        <div className="glass" style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border)', background: 'white' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--ivory-dim)', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search sent documents by subject or recipient..." 
                className="form-input"
                style={{ paddingLeft: 40, background: 'white', borderRadius: 12, height: 44 }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn btn--secondary" style={{ borderRadius: 12, width: 44, height: 44, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Filter size={18} />
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '16px 24px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Recipient</th>
                <th style={{ padding: '16px 24px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Subject</th>
                <th style={{ padding: '16px 24px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Document Type</th>
                <th style={{ padding: '16px 24px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date Created</th>
                <th style={{ padding: '16px 24px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '16px 24px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((doc: any) => (
                <tr key={doc.uuid} style={{ borderBottom: '1px solid var(--border)' }} className="hover-bg-faint">
                  <td style={{ padding: '20px 24px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 14 }}>{doc.recipientName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{doc.recipientEmail}</div>
                  </td>
                  <td style={{ padding: '20px 24px', fontSize: 14, color: 'var(--text-secondary)' }}>{doc.subject}</td>
                  <td style={{ padding: '20px 24px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)' }}>{doc.documentType}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>(PDF)</div>
                  </td>
                  <td style={{ padding: '20px 24px', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {format(new Date(doc.createdAt), 'EEE, MMM d, yyyy')}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{format(new Date(doc.createdAt), 'hh:mm:ss a')}</div>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                    <span style={{ 
                      padding: '4px 12px', 
                      borderRadius: 100, 
                      fontSize: 12, 
                      fontWeight: 600, 
                      background: 'var(--forest-dim)', 
                      color: 'var(--forest)' 
                    }}>
                      Sent
                    </span>
                  </td>
                  <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                    <button style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <MoreVertical size={20} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 60, textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <FileText size={48} color="var(--border)" />
                      <p style={{ color: 'var(--text-muted)' }}>No documents sent yet.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <CreateTemplateModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <style jsx>{`
        .hover-bg-faint:hover {
          background-color: rgba(0, 0, 0, 0.02);
        }
      `}</style>
    </div>
  )
}

function TemplateCard({ title, type, onClick }: { title: string; type: string; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="glass hover-lift" 
      style={{ 
        padding: 24, 
        borderRadius: 20, 
        border: '1px solid var(--border)', 
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        background: 'white',
        transition: 'all 0.2s ease'
      }}
    >
      <div style={{ 
        width: 100, 
        height: 120, 
        background: '#f8fafc', 
        borderRadius: 8, 
        border: '1px solid var(--border)',
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 4
      }}>
        <div style={{ height: 4, width: '80%', background: '#e2e8f0', borderRadius: 2 }} />
        <div style={{ height: 4, width: '60%', background: '#e2e8f0', borderRadius: 2 }} />
        <div style={{ height: 4, width: '90%', background: '#e2e8f0', borderRadius: 2, marginTop: 4 }} />
        <div style={{ height: 4, width: '70%', background: '#e2e8f0', borderRadius: 2 }} />
        <div style={{ height: 4, width: '85%', background: '#e2e8f0', borderRadius: 2 }} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)' }}>{title}</div>
    </div>
  )
}
