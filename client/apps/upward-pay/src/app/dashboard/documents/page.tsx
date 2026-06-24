'use client'

import React, { useState, useEffect } from 'react'
import { FileText, Download, FileBadge, Upload, Trash2, Eye, X, ChevronDown, Building, Plus } from 'lucide-react'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import { formatDate } from '@/lib/utils'
import { useDashboard } from '@/features/dashboard/hooks/useDashboard'
import { Modal } from '@/components/common/Modal'
import { AddPropertyModal } from '@/features/dashboard/components/profile/AddPropertyModal'
import { useRouter } from 'next/navigation'

interface Contract {
  uuid: string
  fileName: string
  fileUrl: string
  createdAt: string
  fileSize: number
  fileType: string
  source?: string  // 'TENANT' | 'PM'
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
  const router = useRouter()
  const { success, error, info } = useToast()
  const { data: dashboardData, reload: reloadDashboard } = useDashboard()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedPropertyUuid, setSelectedPropertyUuid] = useState<string>('')
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isAddPropertyModalOpen, setIsAddPropertyModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<Contract | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [customDocName, setCustomDocName] = useState<string>('')

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
    } catch (err: any) {
      console.error('Failed to fetch documents:', err)
      setContracts([])
      if (
        err?.message?.toLowerCase().includes('expired') ||
        err?.message?.toLowerCase().includes('session') ||
        err?.status === 401
      ) {
        router.push('/login')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setSelectedFile(file)
    // Prefill custom document name with file name (excluding extension)
    const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
    setCustomDocName(nameWithoutExt)
  }

  const handleFileUpload = async () => {
    if (!selectedFile) return

    setUploading(true)

    try {
      // 1. Resolve and format filename
      let fileName = customDocName.trim() || selectedFile.name
      const originalExt = selectedFile.name.split('.').pop()
      if (originalExt && !fileName.toLowerCase().endsWith(`.${originalExt.toLowerCase()}`)) {
        fileName = `${fileName}.${originalExt}`
      }

      const fileToUpload = new File([selectedFile], fileName, { type: selectedFile.type })
      await api.uploadContract(
        fileToUpload,
        selectedPropertyUuid || undefined,
        fileName
      )

      // Re-fetch list to include newly created contract with its resolved userProperty relation
      await fetchContracts()
      success('Document uploaded successfully')
      setIsUploadModalOpen(false)
      setSelectedFile(null)
      setCustomDocName('')
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
      info('Preparing your download...', 'Downloading')
      const blob = await import('@/lib/api-client').then(m => 
        m.requestBlob(`/user/contracts/${contract.uuid}/download`, { method: 'GET' })
      )
      const filename = contract.fileName || 'document.pdf'

      if (require('@capacitor/core').Capacitor.isNativePlatform()) {
        try {
          const { Filesystem, Directory } = await import('@capacitor/filesystem')
          const { Share } = await import('@capacitor/share')

          // Convert Blob to Base64 for Capacitor Filesystem
          const reader = new FileReader()
          const base64Data = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
              const result = reader.result as string
              if (result) {
                resolve(result.split(',')[1]) // Extract pure base64
              } else {
                reject(new Error('Failed to convert blob to base64'))
              }
            }
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })

          const cleanFileName = filename.replace(/\//g, '-')
          const writeResult = await Filesystem.writeFile({
            path: cleanFileName,
            data: base64Data,
            directory: Directory.Cache,
          })

          // Trigger native share sheet
          await Share.share({
            title: filename,
            text: `Here is the document: ${filename}`,
            url: writeResult.uri,
          })
          
          success('Document shared successfully')
          return
        } catch (err) {
          console.error('Native download/sharing failed:', err)
          error('Failed to share document')
          return
        }
      }

      // Fallback for Web/Non-native
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      success('Document downloaded successfully')
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
    <PayPageShell title="My Documents" showBack onBack={() => router.push('/dashboard/me')}>
      {properties.length > 0 ? (
        <div className="documents-page__upload-bar">
          <button
            type="button"
            className="documents-page__upload-btn"
            onClick={() => setIsUploadModalOpen(true)}
          >
            <Upload size={18} />
            Upload Document
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="documents-page__loading">
          <div className="documents-page__spinner" />
        </div>
      ) : properties.length === 0 ? (
        <div className="documents-page__empty documents-page__empty--properties">
          <div className="documents-page__empty-icon">
            <Building size={28} />
          </div>
          <h4 className="documents-page__empty-title">No Properties Linked</h4>
          <p className="documents-page__empty-desc">
            To upload and manage tenancy documents, you need to add your rented property first.
          </p>
          <button
            type="button"
            className="documents-page__empty-btn"
            onClick={() => setIsAddPropertyModalOpen(true)}
          >
            <Plus size={16} />
            Add Property
          </button>
        </div>
      ) : groupedContracts.length === 0 ? (
        <div className="documents-page__empty">
          <FileBadge size={32} color="#c9bfb1" />
          <p>No documents uploaded yet</p>
        </div>
      ) : (
        groupedContracts.map((group) => (
          <div key={group.id} className="documents-page__group">
            <h4 className="documents-page__group-label">
              <Building size={14} />
              {group.label}
            </h4>

            {group.list.length === 0 ? (
              <div className="documents-page__group-empty">
                <p>No documents attached to this property</p>
              </div>
            ) : (
              <div className="documents-page__card">
                {group.list.map((contract) => (
                  <div key={contract.uuid} className="documents-page__row">
                    <div className="documents-page__row-main">
                      <div
                        className={`documents-page__row-icon ${contract.source === 'PM' ? 'documents-page__row-icon--pm' : ''}`}
                      >
                        <FileText size={18} />
                      </div>
                      <div className="documents-page__row-info">
                        <div className="documents-page__row-title-wrap">
                          <span className="documents-page__row-title">{contract.fileName}</span>
                          {contract.source === 'PM' ? (
                            <span className="documents-page__row-badge">From PM</span>
                          ) : null}
                        </div>
                        <div className="documents-page__row-meta">
                          {formatDate(contract.createdAt)} · {formatFileSize(contract.fileSize)}
                        </div>
                      </div>
                    </div>
                    <div className="documents-page__row-actions">
                      {contract.fileType === 'application/pdf' ? (
                        <button
                          type="button"
                          className="documents-page__action-btn"
                          onClick={() => {
                            setPreviewFile(contract)
                            setShowPreviewModal(true)
                          }}
                          title="Preview"
                        >
                          <Eye size={18} />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="documents-page__action-btn"
                        onClick={() => handleDownload(contract)}
                        title="Download"
                      >
                        <Download size={18} />
                      </button>
                      {contract.source !== 'PM' ? (
                        <button
                          type="button"
                          className="documents-page__action-btn documents-page__action-btn--danger"
                          onClick={() => handleDelete(contract.uuid)}
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}

      {/* Preview Modal */}
      <Modal isOpen={showPreviewModal} onClose={() => setShowPreviewModal(false)} size="lg">
        <div className="documents-preview">
          <h3 className="documents-preview__title">{previewFile?.fileName}</h3>

          <div className="documents-preview__body">
            {previewFile ? (
              <>
                {previewFile.fileType === 'application/pdf' || previewFile.fileType === 'text/html' ? (
                  <div className="documents-preview__frame-wrap">
                    <iframe
                      src={previewFile.fileUrl}
                      title={previewFile.fileName}
                      className="documents-preview__iframe"
                    />
                  </div>
                ) : previewFile.fileType.startsWith('image/') ? (
                  <div className="documents-preview__image-wrap">
                    <img
                      src={previewFile.fileUrl}
                      alt={previewFile.fileName}
                      className="documents-preview__image"
                    />
                  </div>
                ) : isWordDoc(previewFile.fileType) ? (
                  <div className="documents-preview__fallback">
                    <div className="documents-preview__fallback-icon">
                      <FileBadge size={40} />
                    </div>
                    <h4 className="documents-preview__fallback-title">Word Document</h4>
                    <p className="documents-preview__fallback-desc">
                      Inline preview for Microsoft Word files is not supported. Download the
                      document to view it on your device.
                    </p>
                    <button
                      type="button"
                      className="documents-page__upload-btn"
                      onClick={() => handleDownload(previewFile)}
                    >
                      <Download size={16} />
                      Download &amp; Open
                    </button>
                  </div>
                ) : (
                  <div className="documents-preview__fallback">
                    <div className="documents-preview__fallback-icon">
                      <FileText size={40} />
                    </div>
                    <h4 className="documents-preview__fallback-title">Preview Not Supported</h4>
                    <p className="documents-preview__fallback-desc">
                      Direct preview is not supported for this file type. Please download the
                      document to open it.
                    </p>
                    <button
                      type="button"
                      className="documents-page__upload-btn"
                      onClick={() => handleDownload(previewFile)}
                    >
                      <Download size={16} />
                      Download Document
                    </button>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </Modal>

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false)
          setSelectedFile(null)
          setCustomDocName('')
        }}
        size="md"
      >
        <div style={{ padding: '1.5rem 1.25rem' }}>
          <h3 className="documents-upload__title">Upload New Document</h3>
          <p className="documents-upload__hint">PDF, Word, or Images (Max 10MB)</p>

          {properties.length > 0 ? (
            <div className="documents-upload__field">
              <label htmlFor="propertySelect">Attach to Property</label>
              <div className="documents-upload__select-wrap">
                <select
                  id="propertySelect"
                  className="documents-upload__select"
                  value={selectedPropertyUuid}
                  onChange={(e) => setSelectedPropertyUuid(e.target.value)}
                >
                  {properties.map((p: any) => (
                    <option key={p.uuid} value={p.uuid}>
                      {getPropertyLabel(p)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="documents-upload__select-icon" size={16} />
              </div>
            </div>
          ) : null}

          {selectedFile ? (
            <>
              <div className="documents-upload__file-card">
                <div className="documents-upload__file-main">
                  <FileText size={20} color="var(--skin-primary, #c2501f)" />
                  <div style={{ minWidth: 0 }}>
                    <p className="documents-upload__file-name">{selectedFile.name}</p>
                    <p className="documents-upload__file-size">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="documents-upload__clear"
                  onClick={() => {
                    setSelectedFile(null)
                    setCustomDocName('')
                  }}
                  title="Remove file"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="documents-upload__field">
                <label htmlFor="docName">Document Name</label>
                <input
                  id="docName"
                  type="text"
                  className="documents-upload__input"
                  value={customDocName}
                  onChange={(e) => setCustomDocName(e.target.value)}
                  placeholder="e.g. Tenancy Agreement"
                />
              </div>

              <div className="documents-upload__actions">
                <button
                  type="button"
                  className="documents-upload__actions-secondary"
                  onClick={() => {
                    setSelectedFile(null)
                    setCustomDocName('')
                  }}
                  disabled={uploading}
                >
                  Clear Selection
                </button>
                <button
                  type="button"
                  className="documents-upload__actions-primary"
                  onClick={handleFileUpload}
                  disabled={uploading || !customDocName.trim()}
                >
                  {uploading ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </>
          ) : (
            <label className={`documents-upload__zone ${uploading ? 'is-uploading' : ''}`}>
              <input
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                disabled={uploading}
              />
              <div className="documents-upload__zone-content">
                <div className="documents-upload__zone-icon">
                  <Upload size={22} />
                </div>
                <span className="documents-upload__zone-text">Tap to select file</span>
              </div>
            </label>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setDocumentToDelete(null)
        }}
        size="md"
      >
        <div className="documents-delete-modal">
          <h3>Delete Document</h3>
          <p>
            Are you sure you want to delete this document? This action cannot be undone and will
            permanently remove it.
          </p>
          <div className="documents-delete-modal__actions">
            <button
              type="button"
              className="documents-delete-modal__cancel"
              onClick={() => {
                setIsDeleteModalOpen(false)
                setDocumentToDelete(null)
              }}
            >
              Cancel
            </button>
            <button type="button" className="documents-delete-modal__confirm" onClick={confirmDelete}>
              Delete
            </button>
          </div>
        </div>
      </Modal>

      <AddPropertyModal
        isOpen={isAddPropertyModalOpen}
        onClose={() => setIsAddPropertyModalOpen(false)}
        onSuccess={() => {
          reloadDashboard()
        }}
      />
    </PayPageShell>
  )
}
