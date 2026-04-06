'use client'

import React, { useState, useEffect } from 'react'
import { FileText, Download, Eye, FileBadge, Upload } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import { formatDate } from '@/lib/utils'

interface Contract {
  id: string
  name: string
  url: string
  createdAt: string
  size: number
  type: string
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

    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      error('File size must be less than 5MB')
      return
    }

    // PDF or DOCX
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ]
    if (!allowedTypes.includes(file.type)) {
      error('Only PDF or DOCX files are allowed')
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
        backPath="/dashboard/me"
        showSettings={false}
      />

      <div className="dashboard__main-grid">
        <div className="dashboard__col--left">
          {/* Upload Section */}
          <div className="upload-card theme-card">
            <div className="upload-card__header">
              <h3 className="upload-card__title">Upload New Contract</h3>
              <p className="upload-card__sub">PDF or DOCX (Max 5MB)</p>
            </div>

            <label className={`upload-zone ${uploading ? 'is-uploading' : ''}`}>
              <input
                type="file"
                className="upload-zone__input"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx"
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
            <h3 className="contracts-list-header__title">Active Documents</h3>
          </div>

          <div className="contracts-list">
            {loading ? (
              <div className="list-loading">
                <div className="spinner" />
              </div>
            ) : contracts.length === 0 ? (
              <div className="empty-state">
                <FileBadge size={48} color="var(--border-solid)" />
                <p>No contracts uploaded yet</p>
              </div>
            ) : (
              contracts.map((contract) => (
                <div key={contract.id} className="contract-item theme-card">
                  <div className="contract-item__info">
                    <div className="contract-item__icon">
                      <FileText size={20} />
                    </div>
                    <div className="contract-item__details">
                      <span className="contract-item__name">{contract.name}</span>
                      <span className="contract-item__meta">
                        {formatDate(contract.createdAt)} • {formatFileSize(contract.size)}
                      </span>
                    </div>
                  </div>
                  <div className="contract-item__actions">
                    <button
                      className="action-btn"
                      onClick={() => window.open(contract.url, '_blank')}
                      title="View"
                    >
                      <Eye size={18} />
                    </button>
                    <a
                      href={contract.url}
                      download={contract.name}
                      className="action-btn"
                      title="Download"
                    >
                      <Download size={18} />
                    </a>
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
      `}</style>
    </div>
  )
}
