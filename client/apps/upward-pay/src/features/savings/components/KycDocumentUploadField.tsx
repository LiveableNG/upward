'use client'

import React, { useRef, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  UploadCloud,
} from 'lucide-react'
import { useUploadSavingsKycDocument } from '../hooks/useRentSavings'
import type { SavingsKycDocumentKind, UploadedKycDocument } from '../services/savingsService'

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
const MAX_BYTES = 5 * 1024 * 1024

interface KycDocumentUploadFieldProps {
  kind: SavingsKycDocumentKind
  label: string
  hint: string
  value?: {
    doc_key: string
    file_name: string
    mime_type: string
  } | null
  error?: string
  disabled?: boolean
  onUploaded: (doc: UploadedKycDocument) => void
}

export function KycDocumentUploadField({
  kind,
  label,
  hint,
  value,
  error,
  disabled,
  onUploaded,
}: KycDocumentUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const uploadMutation = useUploadSavingsKycDocument()
  const [localError, setLocalError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setLocalError(null)

    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      setLocalError('Please upload a JPG, PNG, WEBP, or PDF file.')
      return
    }

    if (file.size > MAX_BYTES) {
      setLocalError('File size must be 5MB or less.')
      return
    }

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    } else {
      setPreviewUrl(null)
    }

    try {
      const uploaded = await uploadMutation.mutateAsync({ kind, file })
      onUploaded(uploaded)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed. Please try again.'
      setLocalError(message)
      setPreviewUrl(null)
    }
  }

  const isUploaded = Boolean(value?.doc_key)
  const isUploading = uploadMutation.isPending
  const activeError = localError || error
  const isPdf = value?.mime_type === 'application/pdf'

  return (
    <div className="savings-kyc-upload">
      <label className="savings-kyc-upload__label">{label}</label>
      <p className="savings-kyc-upload__hint">{hint}</p>

      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
        className="savings-kyc-upload__native-input"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />

      {isUploaded && value ? (
        <div className="savings-kyc-upload__card savings-kyc-upload__card--uploaded">
          <div className="savings-kyc-upload__file-meta">
            {previewUrl && !isPdf ? (
              <img
                src={previewUrl}
                alt={label}
                className="savings-kyc-upload__thumb"
              />
            ) : (
              <div className="savings-kyc-upload__icon-badge">
                {isPdf ? <FileText size={16} /> : <ImageIcon size={16} />}
              </div>
            )}
            <div className="savings-kyc-upload__file-text">
              <span className="savings-kyc-upload__file-name">{value.file_name}</span>
              <span className="savings-kyc-upload__status">
                <CheckCircle2 size={12} /> Uploaded securely
              </span>
            </div>
          </div>
          <button
            type="button"
            className="savings-kyc-upload__replace-btn"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || isUploading}
          >
            {isUploading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RefreshCw size={13} />
            )}
            <span>Replace</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={`savings-kyc-upload__dropzone ${
            activeError ? 'savings-kyc-upload__dropzone--error' : ''
          }`}
          onClick={() => inputRef.current?.click()}
          disabled={disabled || isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Uploading document...</span>
            </>
          ) : (
            <>
              <UploadCloud size={18} />
              <span className="savings-kyc-upload__cta">Tap to upload JPG, PNG, or PDF</span>
              <span className="savings-kyc-upload__limit">Max 5MB</span>
            </>
          )}
        </button>
      )}

      {activeError && (
        <div className="savings-kyc-upload__error" role="alert">
          <AlertCircle size={13} />
          <span>{activeError}</span>
        </div>
      )}
    </div>
  )
}
