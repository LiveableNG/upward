'use client'

import React, { useState } from 'react'
import { UploadCloud, FileText, X, Image as ImageIcon, CheckCircle2 } from 'lucide-react'
import { uploadProofOfPayment } from '../../services/paymentService'
import { useToast } from '@/components/common/Toast'
import { PayFlowPrimaryButton } from '@/features/dashboard/components/payment/PayPageShell'

interface UploadProofOfPaymentProps {
  paymentRequestUuid?: string
  userPropertyUuid?: string
  amount?: number
  currency?: string
  lineItems?: any[]
  onSuccess?: () => void
  onCancel?: () => void
  bankName?: string
  accountName?: string
  accountNumber?: string
  hideAccountDetails?: boolean
}

export function UploadProofOfPayment({
  paymentRequestUuid,
  userPropertyUuid,
  amount,
  currency,
  lineItems,
  onSuccess,
  onCancel,
  bankName,
  accountName,
  accountNumber,
  hideAccountDetails = false,
}: UploadProofOfPaymentProps) {
  const { success, error } = useToast()

  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isUploaded, setIsUploaded] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0]
      if (selectedFile.size > 10 * 1024 * 1024) {
        error('File size must be less than 10MB')
        return
      }
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
    <div className="pay-flow__proof-upload">
      {!hideAccountDetails && bankName && accountNumber ? (
        <div className="pay-flow__transfer-account-summary">
          <p className="pay-flow__transfer-account-label">Transfer to</p>
          <p className="pay-flow__method-card-title">{accountName || 'Recipient'}</p>
          <p className="pay-flow__method-card-desc">
            {bankName ? `${bankName} · ` : ''}
            {accountNumber}
          </p>
        </div>
      ) : null}

      <p className="pay-flow__field-label">Upload receipt</p>
      <p className="pay-flow__field-hint pay-flow__proof-upload-hint">PDF, JPG, or PNG · max 10MB</p>

      {!file ? (
        <div className="pay-flow__proof-dropzone">
          <input
            type="file"
            className="pay-flow__proof-file-input"
            id="proof-upload"
            accept=".pdf,image/jpeg,image/png"
            onChange={handleFileSelect}
          />
          <label htmlFor="proof-upload" className="pay-flow__proof-dropzone-label">
            <UploadCloud size={28} />
            <span className="pay-flow__proof-dropzone-title">Choose a file</span>
            <span className="pay-flow__proof-dropzone-sub">Tap to select your payment receipt</span>
          </label>
        </div>
      ) : (
        <div className="pay-flow__proof-file">
          <div className="pay-flow__proof-file-icon">
            {file.type.includes('pdf') ? <FileText size={20} /> : <ImageIcon size={20} />}
          </div>
          <div className="pay-flow__proof-file-meta">
            <p className="pay-flow__proof-file-name" title={file.name}>
              {file.name}
            </p>
            <p className="pay-flow__proof-file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          {isUploaded ? (
            <CheckCircle2 size={20} className="pay-flow__proof-file-success" />
          ) : (
            <button
              type="button"
              className="pay-flow__proof-file-remove"
              onClick={handleRemove}
              disabled={isUploading}
              aria-label="Remove file"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {file && !isUploaded ? (
        <div className="pay-flow__cta-wrap">
          <PayFlowPrimaryButton onClick={handleUpload} disabled={isUploading} loading={isUploading}>
            Submit proof
          </PayFlowPrimaryButton>
          {onCancel ? (
            <button
              type="button"
              className="pay-flow__cancel-link pay-flow__transfer-back-link"
              onClick={onCancel}
              disabled={isUploading}
            >
              Cancel
            </button>
          ) : null}
        </div>
      ) : null}

      {isUploaded ? (
        <div className="pay-flow__proof-success">
          <CheckCircle2 size={18} />
          <span>Proof submitted — pending review</span>
        </div>
      ) : null}
    </div>
  )
}
