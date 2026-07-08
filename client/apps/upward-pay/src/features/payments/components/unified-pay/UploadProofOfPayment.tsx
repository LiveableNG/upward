'use client'

import React, { useState } from 'react'
import { UploadCloud, FileText, X, Image as ImageIcon, CheckCircle2, Loader2 } from 'lucide-react'
import { uploadProofOfPayment } from '../../services/paymentService'
import { useToast } from '@/components/common/Toast'

interface UploadProofOfPaymentProps {
  paymentRequestUuid?: string
  userPropertyUuid?: string
  amount?: number
  currency?: string
  lineItems?: any[]
  onSuccess?: () => void
  onCancel?: () => void
}

export function UploadProofOfPayment({ paymentRequestUuid, userPropertyUuid, amount, currency, lineItems, onSuccess, onCancel }: UploadProofOfPaymentProps) {
  const { success, error } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isUploaded, setIsUploaded] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0]
      // Validate file size (10MB limit)
      if (selectedFile.size > 10 * 1024 * 1024) {
        error('File size must be less than 10MB')
        return
      }
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
      if (!allowedTypes.includes(selectedFile.type)) {
        error('Only PDF, JPG, and PNG files are allowed')
        return
      }
      setFile(selectedFile)
      setIsUploaded(false)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    try {
      await uploadProofOfPayment({
        paymentRequestUuid,
        userPropertyUuid,
        amount,
        currency,
        lineItems,
        file,
      })

      setIsUploaded(true)
      success('Proof of payment uploaded successfully! It is now pending review.')
      if (onSuccess) {
        setTimeout(onSuccess, 1500)
      }
    } catch (err: any) {
      console.error('Upload error:', err)
      error(err.message || 'Failed to upload document. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = () => {
    setFile(null)
    setIsUploaded(false)
  }

  return (
    <div className="upload-proof-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-[var(--clay-faint)] rounded-xl">
          <UploadCloud size={24} className="text-[var(--clay)]" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[var(--text)]">Upload Proof of Payment</h3>
          <p className="text-sm text-[var(--text-secondary)]">Supported formats: PDF, JPG, PNG (Max 10MB)</p>
        </div>
      </div>

      {!file ? (
        <div className="upload-dropzone">
          <input 
            type="file" 
            className="hidden-input" 
            id="proof-upload" 
            accept=".pdf,image/jpeg,image/png"
            onChange={handleFileSelect}
          />
          <label htmlFor="proof-upload" className="upload-label">
            <UploadCloud size={32} className="text-[var(--text-muted)] mb-2" />
            <span className="font-medium">Click to select file</span>
            <span className="text-xs text-[var(--text-muted)]">or drag and drop here</span>
          </label>
        </div>
      ) : (
        <div className="file-preview-box">
          <div className="flex items-center gap-3 flex-1">
            <div className="file-icon bg-[var(--surface)] p-2 rounded-lg text-[var(--clay)]">
              {file.type.includes('pdf') ? <FileText size={20} /> : <ImageIcon size={20} />}
            </div>
            <div className="overflow-hidden">
              <p className="font-medium text-sm truncate">{file.name}</p>
              <p className="text-xs text-[var(--text-muted)]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
          
          {isUploaded ? (
            <CheckCircle2 size={20} className="text-[var(--success)]" />
          ) : (
            <button 
              className="p-2 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              onClick={handleRemove}
              disabled={isUploading}
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {file && !isUploaded && (
        <div className="mt-6 flex gap-3">
          {onCancel && (
            <button 
              className="btn btn--secondary btn--pill flex-1 py-3"
              onClick={onCancel}
              disabled={isUploading}
            >
              Cancel
            </button>
          )}
          <button 
            className="btn btn--primary btn--pill flex-1 py-3"
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" /> Uploading...
              </span>
            ) : (
              'Upload Document'
            )}
          </button>
        </div>
      )}

      <style jsx>{`
        .upload-proof-card {
          background: var(--bg);
          border: 1px solid var(--border-solid);
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }
        .upload-dropzone {
          border: 2px dashed var(--border-solid);
          border-radius: 16px;
          background: var(--surface);
          transition: all 0.2s ease;
        }
        .upload-dropzone:hover {
          border-color: var(--clay);
          background: var(--clay-faint);
        }
        .hidden-input {
          display: none;
        }
        .upload-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          cursor: pointer;
          width: 100%;
          height: 100%;
          color: var(--text);
        }
        .file-preview-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border: 1px solid var(--border-solid);
          border-radius: 16px;
          background: var(--surface2);
        }
        
        .flex { display: flex; }
        .flex-1 { flex: 1; }
        .items-center { align-items: center; }
        .justify-center { justify-content: center; }
        .justify-between { justify-content: space-between; }
        .gap-2 { gap: 8px; }
        .gap-3 { gap: 12px; }
        .mb-2 { margin-bottom: 8px; }
        .mb-4 { margin-bottom: 16px; }
        .mt-6 { margin-top: 24px; }
        .p-2 { padding: 8px; }
        .py-3 { padding-top: 12px; padding-bottom: 12px; }
        .font-bold { font-weight: 700; }
        .font-medium { font-weight: 500; }
        .text-sm { font-size: 14px; }
        .text-xs { font-size: 12px; }
        .text-lg { font-size: 18px; }
        .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .overflow-hidden { overflow: hidden; }
        .rounded-xl { border-radius: 12px; }
        .rounded-lg { border-radius: 8px; }
      `}</style>
    </div>
  )
}
