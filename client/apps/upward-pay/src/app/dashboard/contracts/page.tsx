'use client'

import React, { useState, useEffect } from 'react'
import { FileText, Download, FileBadge, Upload, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import { formatDate } from '@/lib/utils'

interface Contract {
  uuid: string
  fileName: string
  fileUrl: string
  createdAt: string
  fileSize: number
  fileType: string
  propertyName?: string
  leaseEnd?: string
}

export default function ContractsPage() {
  const { success, error } = useToast()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchContracts()
  }, [])

  const fetchContracts = async () => {
    try {
      const data = await api.getContracts()
      setContracts(data || [])
    } catch (err) {
      console.error('Failed to fetch contracts:', err)
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

    // PDF or Images
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
    ]
    if (!allowedTypes.includes(file.type)) {
      error('Only PDF or JPG/PNG images are allowed')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await api.uploadContract(formData)
      setContracts((prev) => [res, ...prev])
      success('Contract uploaded successfully')
    } catch {
      error('Failed to upload contract')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (uuid: string) => {
    if (!confirm('Are you sure you want to remove this document?')) return

    try {
      await api.deleteContract(uuid)
      setContracts((prev) => prev.filter((c) => c.uuid !== uuid))
      success('Document removed successfully')
    } catch {
      error('Failed to remove document')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="contracts-page dashboard--nav-offset">
      <PageHeader
        title="Tenancy Agreement"
        showBack
        backPath="/dashboard"
        showSettings={false}
      />

      <div className="dashboard__main-grid">
        <div className="dashboard__col--left">
          {/* Upload Section */}
          <div className="upload-card theme-card">
            <div className="upload-card__header">
              <h3 className="upload-card__title">Upload New Document</h3>
              <p className="upload-card__sub">PDF, JPG, or PNG (Max 10MB)</p>
            </div>

            <label className={`upload-zone ${uploading ? 'is-uploading' : ''}`}>
              <input
                type="file"
                className="upload-zone__input"
                onChange={handleFileUpload}
                accept=".pdf,.jpg,.jpeg,.png"
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

          {/* List Section */}
          <div className="contracts-list-header">
            <h3 className="contracts-list-header__title">My Documents</h3>
          </div>

          <div className="contracts-list">
            {loading ? (
              <div className="list-loading">
                <div className="spinner" />
              </div>
            ) : contracts.length === 0 ? (
              <div className="empty-state">
                <FileBadge size={48} color="var(--border-solid)" />
                <p>No documents uploaded yet</p>
              </div>
            ) : (
              contracts.map((contract) => (
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
                      onClick={() => window.open(contract.fileUrl, '_blank')}
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
              ))
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .contracts-page {
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

        .contracts-list-header {
          padding: 0 1.5rem;
          margin-bottom: 1rem;
        }
        .contracts-list-header__title {
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
        }

        .contracts-list {
          padding: 0 1rem;
        }
        .contract-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          margin-bottom: 1rem;
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

        /* Desktop Optimization */
        @media (min-width: 1024px) {
          .contracts-page {
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
          .contracts-list-header {
            padding: 0;
          }
          .contracts-list {
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
