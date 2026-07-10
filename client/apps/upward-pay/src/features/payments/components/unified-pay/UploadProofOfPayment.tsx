'use client'

import React, { useState } from 'react'
import { UploadCloud, FileText, X, Image as ImageIcon, CheckCircle2, Loader2, Edit3 } from 'lucide-react'
import { uploadProofOfPayment, uploadManualProofOfPayment } from '../../services/paymentService'
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
  
  const [mode, setMode] = useState<'upload' | 'manual'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isUploaded, setIsUploaded] = useState(false)

  // Manual entry state
  const [senderName, setSenderName] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')

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
    if (mode === 'upload' && !file) return
    if (mode === 'manual' && (!senderName || !paymentDate)) {
      error('Sender Name and Payment Date are required for manual entry.')
      return
    }

    setIsUploading(true)
    try {
      if (mode === 'upload') {
        await uploadProofOfPayment({
          paymentRequestUuid,
          userPropertyUuid,
          amount,
          currency,
          lineItems,
          file: file!,
        })
      } else {
        await uploadManualProofOfPayment({
          paymentRequestUuid,
          userPropertyUuid,
          amount,
          currency,
          lineItems,
          senderName,
          paymentDate,
          referenceNumber,
        })
      }

      setIsUploaded(true)
      success('Proof of payment submitted successfully! It is now pending review.')
      if (onSuccess) {
        setTimeout(onSuccess, 1500)
      }
    } catch (err: any) {
      console.error('Submit error:', err)
      error(err.message || 'Failed to submit document. Please try again.')
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--clay-faint)] rounded-xl">
            {mode === 'upload' ? <UploadCloud size={24} className="text-[var(--clay)]" /> : <Edit3 size={24} className="text-[var(--clay)]" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text)]">Submit Proof of Payment</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {mode === 'upload' ? 'Supported formats: PDF, JPG, PNG (Max 10MB)' : 'Enter your transfer details manually'}
            </p>
          </div>
        </div>
      </div>

      <div className="buttons-container-selector">
        <button
          className={`button-selector ${mode === 'upload' ? 'active' : 'inactive'}`}
          onClick={() => setMode('upload')}
        >
          Upload Receipt
        </button>
        <button
          className={`button-selector ${mode === 'manual' ? 'active' : 'inactive'}`}
          onClick={() => setMode('manual')}
        >
          Enter Details Manually
        </button>
      </div>

      {mode === 'upload' ? (
        <>
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
                  type="button"
                  className="remove-file-btn"
                  onClick={handleRemove}
                  disabled={isUploading}
                  aria-label="Remove file"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Sender Name (Required)</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="E.g. John Doe"
              value={senderName}
              onChange={e => setSenderName(e.target.value)}
              disabled={isUploading || isUploaded}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Date Sent (Required)</label>
            <input 
              type="date" 
              className="form-input" 
              value={paymentDate}
              onChange={e => setPaymentDate(e.target.value)}
              disabled={isUploading || isUploaded}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Reference Number (Optional)</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Session ID or Ref"
              value={referenceNumber}
              onChange={e => setReferenceNumber(e.target.value)}
              disabled={isUploading || isUploaded}
            />
          </div>
          {isUploaded && (
            <div className="flex items-center gap-2 text-[var(--success)] mt-2">
              <CheckCircle2 size={20} />
              <span className="text-sm font-medium">Details submitted successfully!</span>
            </div>
          )}
        </div>
      )}

      {((mode === 'upload' && file) || mode === 'manual') && !isUploaded && (
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
                <Loader2 size={18} className="animate-spin" /> Submitting...
              </span>
            ) : (
              'Submit Details'
            )}
          </button>
        </div>
      )}

      <style jsx>{`
        /* Segmented control container for toggle buttons */
        .buttons-container-selector {
          background-color: var(--surface);
          padding: 4px;
          border-radius: 12px;
          display: flex;
          gap: 4px;
          margin-bottom: 24px;
        }

        /* Individual toggle buttons */
        .button-selector {
          border: none;
          flex: 1;
          padding: 10px 0;
          font-weight: 600;
          font-size: 14px;
          border-radius: 8px;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .button-selector.active {
          background-color: #ffffff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          color: var(--text);
        }

        .button-selector.inactive {
          background-color: transparent;
          color: var(--text-muted);
        }

        .button-selector.inactive:hover {
          color: var(--text);
        }

        .upload-proof-card {
          background: transparent;
          border: none;
          border-radius: 0;
          padding: 0;
          box-shadow: none;
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
        .remove-file-btn {
          background: transparent;
          border: none;
          padding: 8px;
          border-radius: 8px;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .remove-file-btn:hover:not(:disabled) {
          color: #ef4444;
          background-color: #fef2f2;
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
        .form-input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid var(--border-solid);
          background: var(--surface);
          font-size: 14px;
          color: var(--text);
          transition: border-color 0.2s;
        }
        .form-input:focus {
          outline: none;
          border-color: var(--clay);
        }
        .form-input:disabled {
          background: var(--surface2);
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .flex-1 { flex: 1; }
        .items-center { align-items: center; }
        .justify-center { justify-content: center; }
        .justify-between { justify-content: space-between; }
        .gap-2 { gap: 8px; }
        .gap-3 { gap: 12px; }
        .gap-4 { gap: 16px; }
        .mb-1 { margin-bottom: 4px; }
        .mb-2 { margin-bottom: 8px; }
        .mb-4 { margin-bottom: 16px; }
        .mb-6 { margin-bottom: 24px; }
        .mt-2 { margin-top: 8px; }
        .mt-6 { margin-top: 24px; }
        .p-1 { padding: 4px; }
        .p-2 { padding: 8px; }
        .py-2 { padding-top: 8px; padding-bottom: 8px; }
        .py-3 { padding-top: 12px; padding-bottom: 12px; }
        .block { display: block; }
        .font-bold { font-weight: 700; }
        .font-medium { font-weight: 500; }
        .text-sm { font-size: 14px; }
        .text-xs { font-size: 12px; }
        .text-lg { font-size: 18px; }
        .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .overflow-hidden { overflow: hidden; }
        .rounded-xl { border-radius: 12px; }
        .rounded-lg { border-radius: 8px; }
        .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
      `}</style>
    </div>
  )
}
