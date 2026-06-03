'use client'

import React, { useState, useEffect } from 'react'
import { FileText, Download, FileBadge, Upload, Trash2, Eye, X, ChevronDown, Check, Building } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import { formatDate } from '@/lib/utils'
import { useDashboard } from '@/features/dashboard/hooks/useDashboard'
import { Modal } from '@/components/common/Modal'

interface Contract {
  uuid: string
  fileName: string
  fileUrl: string
  createdAt: string
  fileSize: number
  fileType: string
  userProperty?: {
    uuid: string
    location?: {
      address?: string | null
      area?: string
      state?: string
      country?: string
    } | null
  } | null
}

export default function DocumentsPage() {
  const { success, error } = useToast()
  const { data: dashboardData } = useDashboard()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedPropertyUuid, setSelectedPropertyUuid] = useState<string>('')
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<Contract | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  const properties = dashboardData?.user?.properties || []

  useEffect(() => {
    fetchContracts()
  }, [])

  // Set default selected property if user has properties
  useEffect(() => {
    if (properties.length > 0 && !selectedPropertyUuid) {
      setSelectedPropertyUuid(properties[0].uuid || '')
    }
  }, [properties])

  const fetchContracts = async () => {
    try {
      const data = await api.getContracts()
      setContracts(data || [])
    } catch (err) {
      console.error('Failed to fetch documents:', err)
      setContracts([])
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 10MB limit (aligned with backend)
    if (file.size > 10 * 1024 * 1024) {
      error('File size must be less than 10MB')
      return
    }

    // PDF, Images or Word Docs
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ]
    if (!allowedTypes.includes(file.type)) {
      error('Only PDF, JPG/PNG, and Word documents (.doc/.docx) are allowed')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    if (selectedPropertyUuid) {
      formData.append('propertyUuid', selectedPropertyUuid)
    }

    try {
      const res = await api.uploadContract(formData)
      // Re-fetch list to include newly created contract with its resolved userProperty relation
      await fetchContracts()
      success('Document uploaded successfully')
    } catch (err: any) {
      console.error('Failed to upload contract:', err)
      error(err?.message || 'Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = (uuid: string) => {
    setDocumentToDelete(uuid)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!documentToDelete) return

    try {
      await api.deleteContract(documentToDelete)
      setContracts((prev) => prev.filter((c) => c.uuid !== documentToDelete))
      success('Document removed successfully')
    } catch {
      error('Failed to remove document')
    } finally {
      setIsDeleteModalOpen(false)
      setDocumentToDelete(null)
    }
  }

  const handleDownload = async (contract: Contract) => {
    try {
      success('Downloading...')
      const blob = await import('@/lib/api-client').then(m => 
        m.requestBlob(contract.fileUrl, { method: 'GET' })
      )
      const filename = contract.fileName || 'document.pdf'
      const file = new File([blob], filename, { type: contract.fileType || 'application/pdf' })

      if (require('@capacitor/core').Capacitor.isNativePlatform()) {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Tenancy Document',
            text: `Here is the document: ${filename}`,
          })
        } else {
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = filename
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)
        }
      } else {
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Download failed:', err)
      error('Failed to download document')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const isWordDoc = (fileType: string) => {
    return (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileType === 'application/msword'
    )
  }

  const getPropertyLabel = (property: any) => {
    if (property.location) {
      const loc = property.location
      return [loc.address, loc.area, loc.state].filter(Boolean).join(', ')
    }
    return property.address || 'Unnamed Property'
  }

  // Group contracts by property
  const groupedContracts = React.useMemo(() => {
    const groups: { [key: string]: { label: string; list: Contract[] } } = {}

    // Pre-initialize property groups
    properties.forEach((p: any) => {
      if (p.uuid) {
        groups[p.uuid] = {
          label: getPropertyLabel(p),
          list: [],
        }
      }
    })

    // General group
    const generalKey = 'general'
    groups[generalKey] = {
      label: 'General / Unlinked Documents',
      list: [],
    }

    contracts.forEach((c) => {
      const propUuid = c.userProperty?.uuid
      if (propUuid && groups[propUuid]) {
        groups[propUuid].list.push(c)
      } else {
        groups[generalKey].list.push(c)
      }
    })

    // Filter out empty groups, keeping the general one if it has items or if there are no properties
    return Object.keys(groups)
      .map((key) => ({
        id: key,
        ...groups[key],
      }))
      .filter((g) => g.list.length > 0 || (g.id !== 'general' && properties.length > 0))
  }, [contracts, properties])

  return (
    <div className="documents-page dashboard--nav-offset">
      <PageHeader
        title="My Documents"
        showBack
        backPath="/dashboard"
        showSettings={false}
      />

      <div className="dashboard__main-grid">
        <div className="dashboard__col--left">
          {/* Upload Button */}
          {properties.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem', padding: '0 1rem' }}>
              <button
                className="btn btn--primary"
                onClick={() => setIsUploadModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', background: 'var(--clay)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >
                <Upload size={18} /> Upload Document
              </button>
            </div>
          )}

          {/* List Section grouped by Property */}
          <div className="documents-list-section">
            {loading ? (
              <div className="list-loading">
                <div className="spinner" />
              </div>
            ) : groupedContracts.length === 0 ? (
              <div className="empty-state">
                <FileBadge size={48} color="var(--border-solid)" />
                <p>No documents uploaded yet</p>
              </div>
            ) : (
              groupedContracts.map((group) => (
                <div key={group.id} className="document-group">
                  <div className="document-group-header">
                    <Building size={16} className="document-group-header__icon" />
                    <h4 className="document-group-header__title">{group.label}</h4>
                  </div>

                  {group.list.length === 0 ? (
                    <div className="group-empty-state">
                      <p>No documents attached to this property</p>
                    </div>
                  ) : (
                    <div className="contracts-list">
                      {group.list.map((contract) => (
                        <div key={contract.uuid} className="contract-item theme-card">
                          <div className="contract-item__info">
                            <div className="contract-item__icon">
                              <FileText size={20} />
                            </div>
                            <div className="contract-item__details">
                              <span className="contract-item__name">{contract.fileName}</span>
                              <span className="contract-item__meta">
                                {formatDate(contract.createdAt)} • {formatFileSize(contract.fileSize)}
                              </span>
                            </div>
                          </div>
                          <div className="contract-item__actions">
                            <button
                              className="action-btn"
                              onClick={() => {
                                setPreviewFile(contract)
                                setShowPreviewModal(true)
                              }}
                              title="Preview"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              className="action-btn"
                              onClick={() => handleDownload(contract)}
                              title="Download"
                            >
                              <Download size={18} />
                            </button>
                            <button
                              className="action-btn action-btn--danger"
                              onClick={() => handleDelete(contract.uuid)}
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <Modal isOpen={showPreviewModal} onClose={() => setShowPreviewModal(false)} size="lg">
        <div className="preview-modal">
          <div className="preview-modal__header">
            <h3 className="preview-modal__title">{previewFile?.fileName}</h3>
            <button className="preview-modal__close" onClick={() => setShowPreviewModal(false)}>
              <X size={20} />
            </button>
          </div>

          <div className="preview-modal__body">
            {previewFile && (
              <>
                {previewFile.fileType === 'application/pdf' || previewFile.fileType === 'text/html' ? (
                  <div className="preview-container">
                    <iframe
                      src={previewFile.fileUrl}
                      title={previewFile.fileName}
                      className="preview-iframe"
                    />
                  </div>
                ) : previewFile.fileType.startsWith('image/') ? (
                  <div className="preview-container preview-container--image">
                    <img
                      src={previewFile.fileUrl}
                      alt={previewFile.fileName}
                      className="preview-img"
                    />
                  </div>
                ) : isWordDoc(previewFile.fileType) ? (
                  <div className="preview-fallback">
                    <div className="preview-fallback__icon-wrap">
                      <FileBadge size={64} className="preview-fallback__icon" />
                    </div>
                    <h4 className="preview-fallback__title">Word Document (.docx / .doc)</h4>
                    <p className="preview-fallback__desc">
                      Inline preview for Microsoft Word files is not supported. Please click the button below to download and view the document on your device.
                    </p>
                    <button
                      className="btn btn--primary preview-fallback__btn"
                      onClick={() => handleDownload(previewFile)}
                    >
                      <Download size={16} className="mr-2" /> Download & Open
                    </button>
                  </div>
                ) : (
                  <div className="preview-fallback">
                    <div className="preview-fallback__icon-wrap">
                      <FileText size={64} className="preview-fallback__icon" />
                    </div>
                    <h4 className="preview-fallback__title">Preview Not Supported</h4>
                    <p className="preview-fallback__desc">
                      Direct preview is not supported for this file type. Please download the document to open it.
                    </p>
                    <button
                      className="btn btn--primary preview-fallback__btn"
                      onClick={() => handleDownload(previewFile)}
                    >
                      <Download size={16} className="mr-2" /> Download Document
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Modal>

      {/* Upload Modal */}
      <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} size="md">
        <div className="upload-modal" style={{ padding: '1.5rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)' }}>Upload New Document</h3>
            <button 
              onClick={() => setIsUploadModalOpen(false)} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>
          </div>
          
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>PDF, Word, or Images (Max 10MB)</p>

          {properties.length > 0 && (
            <div className="property-select-group" style={{ marginBottom: '1.5rem' }}>
              <label className="property-select-label">Attach to Property</label>
              <div className="property-select-wrapper">
                <select
                  className="property-select"
                  value={selectedPropertyUuid}
                  onChange={(e) => setSelectedPropertyUuid(e.target.value)}
                >
                  {properties.map((p: any) => (
                    <option key={p.uuid} value={p.uuid}>
                      {getPropertyLabel(p)}
                    </option>
                  ))}
                  <option value="">General / Unlinked</option>
                </select>
                <ChevronDown className="property-select-icon" size={16} />
              </div>
            </div>
          )}

          <label className={`upload-zone ${uploading ? 'is-uploading' : ''}`}>
            <input
              type="file"
              className="upload-zone__input"
              onChange={async (e) => {
                await handleFileUpload(e);
                setIsUploadModalOpen(false);
              }}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              disabled={uploading}
            />
            <div className="upload-zone__content">
              {uploading ? (
                <div className="upload-loader">
                  <div className="spinner" />
                  <span>Uploading...</span>
                </div>
              ) : (
                <>
                  <div className="upload-icon-wrap">
                    <Upload size={24} />
                  </div>
                  <span className="upload-text">Tap to select file</span>
                </>
              )}
            </div>
          </label>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => {
        setIsDeleteModalOpen(false)
        setDocumentToDelete(null)
      }} size="md">
        <div style={{ padding: '1.5rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)', marginBottom: '1rem' }}>Delete Document</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '2rem' }}>
            Are you sure you want to delete this document? This action cannot be undone and will permanently remove it.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              className="btn btn--secondary"
              onClick={() => {
                setIsDeleteModalOpen(false)
                setDocumentToDelete(null)
              }}
              style={{ padding: '10px 24px', borderRadius: '10px' }}
            >
              Cancel
            </button>
            <button
              className="btn"
              onClick={confirmDelete}
              style={{
                padding: '10px 24px',
                borderRadius: '10px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      <style jsx>{`
        .documents-page {
          padding-bottom: 5rem;
        }
        .theme-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .upload-card {
          margin: 0 1rem 2rem 1rem;
        }
        .upload-card__header {
          margin-bottom: 1.5rem;
        }
        .upload-card__title {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text);
        }
        .upload-card__sub {
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        /* Property Selector Styles */
        .property-select-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 1.25rem;
        }
        .property-select-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .property-select-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .property-select {
          width: 100%;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid var(--border-solid);
          background: var(--bg);
          color: var(--text);
          font-size: 0.95rem;
          font-weight: 600;
          appearance: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .property-select:focus {
          outline: none;
          border-color: var(--clay);
        }
        .property-select-icon {
          position: absolute;
          right: 16px;
          pointer-events: none;
          color: var(--text-muted);
        }

        .upload-zone {
          display: block;
          border: 2px dashed var(--border-solid);
          border-radius: 20px;
          padding: 2rem;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }
        .upload-zone:hover {
          border-color: var(--clay);
          background: var(--clay-faint);
        }
        .upload-zone.is-uploading {
          opacity: 0.7;
          pointer-events: none;
        }
        .upload-zone__input {
          position: absolute;
          width: 0;
          height: 0;
          opacity: 0;
        }
        .upload-zone__content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }
        .upload-icon-wrap {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: var(--bg);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--clay);
        }
        .upload-text {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        /* Grouping Section */
        .documents-list-section {
          padding: 0 1rem;
        }
        .document-group {
          margin-bottom: 2rem;
        }
        .document-group-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 1rem;
          padding: 0 8px;
        }
        .document-group-header__icon {
          color: var(--clay);
        }
        .document-group-header__title {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-secondary);
          letter-spacing: -0.01em;
        }
        .group-empty-state {
          padding: 1.5rem;
          text-align: center;
          border: 1px dashed var(--border-solid);
          border-radius: 16px;
          color: var(--text-muted);
          font-size: 0.85rem;
        }

        .contracts-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .contract-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          margin-bottom: 0;
        }
        .contract-item__info {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
          min-width: 0;
        }
        .contract-item__icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: var(--clay-faint);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--clay);
          flex-shrink: 0;
        }
        .contract-item__details {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .contract-item__name {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .contract-item__meta {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .contract-item__actions {
          display: flex;
          gap: 0.5rem;
        }
        .action-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }
        .action-btn:hover {
          background: var(--surface2);
          color: var(--text);
        }
        .action-btn--danger:hover {
          color: #ef4444;
          background: #fef2f2;
          border-color: #fee2e2;
        }

        .spinner {
          width: 24px;
          height: 24px;
          border: 3px solid var(--border-solid);
          border-top-color: var(--clay);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          color: var(--text-muted);
          gap: 1rem;
          text-align: center;
        }

        /* Preview Modal Styles */
        .preview-modal {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .preview-modal__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border);
          margin-bottom: 1.5rem;
        }
        .preview-modal__title {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 80%;
        }
        .preview-modal__close {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }
        .preview-modal__close:hover {
          background: var(--surface2);
          color: var(--text);
        }
        .preview-modal__body {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 350px;
        }
        .preview-container {
          width: 100%;
          height: 70vh;
          border-radius: 12px;
          overflow: hidden;
          background: #ffffff;
          border: 1px solid var(--border);
        }
        .preview-iframe {
          width: 100%;
          height: 100%;
          border: none;
        }
        .preview-container--image {
          height: auto;
          max-height: 70vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
        }
        .preview-img {
          max-width: 100%;
          max-height: 70vh;
          object-fit: contain;
          border-radius: 12px;
          box-shadow: var(--shadow-md);
        }

        /* Fallback view for DOCX and unsupported types */
        .preview-fallback {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 2.5rem 1.5rem;
          max-width: 420px;
        }
        .preview-fallback__icon-wrap {
          width: 96px;
          height: 96px;
          border-radius: 24px;
          background: var(--clay-faint);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--clay);
          margin-bottom: 1.5rem;
        }
        .preview-fallback__title {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 0.75rem;
        }
        .preview-fallback__desc {
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 2rem;
        }
        .preview-fallback__btn {
          display: inline-flex;
          align-items: center;
          font-size: 0.9rem;
          font-weight: 600;
          padding: 12px 24px;
        }

        /* Desktop Optimization */
        @media (min-width: 1024px) {
          .documents-page {
            max-width: 860px;
            margin: 0 auto;
            padding-top: 2rem;
          }
          .dashboard__main-grid {
            grid-template-columns: 1fr;
          }
          .dashboard__col--left {
            margin: 0 auto;
            width: 100%;
          }
          .upload-card {
            margin: 0 0 2rem 0;
            box-shadow: var(--shadow-sm);
          }
          .documents-list-section {
            padding: 0;
          }
          .contract-item {
            box-shadow: var(--shadow-sm);
          }
        }
      `}</style>
    </div>
  )
}
