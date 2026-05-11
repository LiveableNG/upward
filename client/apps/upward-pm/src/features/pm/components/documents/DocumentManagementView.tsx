'use client'

import React, { useState } from 'react'
import {
  Plus,
  Search,
  FileText,
  MoreVertical,
  Download,
  ChevronRight,
  Filter,
  Mail
} from 'lucide-react'
import { useDocuments } from '../../hooks/useDocuments'
import { format } from 'date-fns'
import { CreateTemplateModal } from './CreateTemplateModal'
import { DataTable, Column } from '@/components/common/DataTable'

interface DocumentManagementViewProps {
  onNewDocument: () => void
  onSelectTemplate: (template: any) => void
  onResendDocument: (document: any) => void
}

export function DocumentManagementView({ onNewDocument, onSelectTemplate, onResendDocument }: DocumentManagementViewProps) {
  const { documents, templates, isLoading, generatePdf } = useDocuments()
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'dashboard' | 'all_templates'>('dashboard')
  const [previewDocument, setPreviewDocument] = useState<any>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState<string | null>(null)

  const filteredHistory = documents.filter((doc: any) =>
    doc.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.recipientName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDownload = async (doc: any) => {
    setIsDownloading(doc.uuid)
    try {
      const blob = await generatePdf.mutateAsync({
        content: doc.content,
        tenantUuid: doc.tenant?.uuid,
        recipientName: doc.recipientName
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${doc.subject || 'document'}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Failed to download PDF:', err)
    } finally {
      setIsDownloading(null)
      setActiveMenu(null)
    }
  }

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

  const columns: Column<any>[] = [
    {
      header: 'Recipient',
      render: (doc) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 14 }}>{doc.recipientName}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{doc.recipientEmail}</div>
        </div>
      )
    },
    {
      header: 'Subject',
      render: (doc) => <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{doc.subject}</div>
    },
    {
      header: 'Document Type',
      render: (doc) => (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)' }}>{doc.documentType}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>(PDF)</div>
        </div>
      )
    },
    {
      header: 'Date Created',
      render: (doc) => (
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {format(new Date(doc.createdAt), 'EEE, MMM d, yyyy')}
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{format(new Date(doc.createdAt), 'hh:mm:ss a')}</div>
        </div>
      )
    },
    {
      header: 'Status',
      render: () => (
        <span style={{
          padding: '4px 12px',
          borderRadius: 100,
          fontSize: 12,
          fontWeight: 600,
          background: 'var(--forest-faint)',
          color: 'var(--forest)'
        }}>
          Sent
        </span>
      )
    },
    {
      header: 'Action',
      align: 'right',
      render: (doc) => (
        <div style={{ position: 'relative' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenu(activeMenu === doc.uuid ? null : doc.uuid);
            }}
            style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}
          >
            <MoreVertical size={20} />
          </button>

          {activeMenu === doc.uuid && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                onClick={(e) => { e.stopPropagation(); setActiveMenu(null); }}
              />
              <div className="glass" style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                background: 'white',
                borderRadius: 12,
                boxShadow: 'var(--shadow-lg)',
                zIndex: 11,
                minWidth: 180,
                overflow: 'hidden',
                border: '1px solid var(--border)',
                textAlign: 'left'
              }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setPreviewDocument(doc); setActiveMenu(null); }}
                  className="dropdown-item"
                >
                  <Mail size={16} /> View Email
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}
                  className="dropdown-item"
                  disabled={isDownloading === doc.uuid}
                >
                  <Download size={16} /> {isDownloading === doc.uuid ? 'Downloading...' : 'Download PDF'}
                </button>
                <div style={{ height: 1, background: 'var(--border)' }} />
                <button
                  onClick={(e) => { e.stopPropagation(); onResendDocument(doc); setActiveMenu(null); }}
                  className="dropdown-item"
                  style={{ color: 'var(--clay)' }}
                >
                  <Plus size={16} /> Edit & Resend
                </button>
              </div>
            </>
          )}
        </div>
      )
    }
  ];

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
                const arrayBuffer = await file.arrayBuffer()
                const mammoth = (await import('mammoth')).default
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

        <div className="glass" style={{ borderRadius: 24, overflow: 'hidden', border: '1px solid var(--border)', background: 'white', marginBottom: 32 }}>
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

          <DataTable
            columns={columns}
            data={filteredHistory}
            isLoading={isLoading}
            emptyMessage="No documents sent yet."
            pageSize={8}
            keyExtractor={(doc) => doc.uuid}
          />
        </div>
      </section>

      <CreateTemplateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {previewDocument && (
        <div className="preview-overlay" onClick={() => setPreviewDocument(null)}>
          <div className="preview-modal" onClick={e => e.stopPropagation()}>
            <header className="preview-header">
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>Email Preview</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sent to {previewDocument.recipientName} ({previewDocument.recipientEmail})</p>
              </div>
              <button className="btn-close" onClick={() => setPreviewDocument(null)}>×</button>
            </header>
            <div className="preview-meta">
              <div className="preview-meta-row">
                <span className="label">Subject:</span>
                <span className="value">{previewDocument.subject}</span>
              </div>
              <div className="preview-meta-row">
                <span className="label">Sent On:</span>
                <span className="value">{format(new Date(previewDocument.createdAt), 'MMMM d, yyyy @ hh:mm a')}</span>
              </div>
            </div>
            <div className="preview-body" dangerouslySetInnerHTML={{ __html: previewDocument.content }} />
            <footer className="preview-footer">
              <button className="btn btn--secondary" onClick={() => setPreviewDocument(null)}>Close</button>
              <button className="btn btn--primary" onClick={() => { onResendDocument(previewDocument); setPreviewDocument(null); }}>
                Edit & Resend
              </button>
            </footer>
          </div>
        </div>
      )}

      <style jsx>{`
        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 12px 16px;
          border: none;
          background: none;
          text-align: left;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          transition: background 0.2s;
        }
        .dropdown-item:hover {
          background: var(--bg);
        }
        .dropdown-item:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .preview-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .preview-modal {
          background: white;
          width: 100%;
          max-width: 800px;
          max-height: 90vh;
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: var(--shadow-lg);
        }
        .preview-header {
          padding: 24px;
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .btn-close {
          background: var(--bg);
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          cursor: pointer;
          color: var(--text-muted);
        }
        .preview-meta {
          padding: 16px 24px;
          background: var(--ivory-dim);
          border-bottom: 1px solid var(--border);
        }
        .preview-meta-row {
          display: flex;
          gap: 8px;
          font-size: 13px;
          margin-bottom: 4px;
        }
        .preview-meta-row .label {
          color: var(--text-muted);
          font-weight: 600;
          width: 80px;
        }
        .preview-meta-row .value {
          color: var(--dark);
          font-weight: 500;
        }
        .preview-body {
          padding: 40px;
          overflow-y: auto;
          flex: 1;
          background: white;
          font-size: 15px;
          line-height: 1.6;
          color: var(--text-secondary);
        }
        .preview-footer {
          padding: 20px 24px;
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          background: white;
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
