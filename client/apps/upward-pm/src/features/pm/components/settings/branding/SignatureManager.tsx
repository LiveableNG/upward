'use client'

import React, { useState, useEffect } from 'react'
import {
  PenTool,
  Plus,
  Loader2,
  Trash2,
  Star,
  Type,
  Upload,
  X,
  ChevronDown,
} from 'lucide-react'
import { useSignatures, useSignatureCanvas } from './branding.hooks'
import { useToast } from '@/components/common/Toast'
import { api } from '@/lib/api'
import type { SignatureConfig } from '../branding.types'
import { useSubscription } from '@/features/pm/hooks/useSubscription'
import { usePricingModal } from '@/features/pm/hooks/usePricingModal'
import { FeatureKey } from '@/features/pm/types/subscription'

type SigType = 'pad' | 'upload' | 'digital'

export function SignatureManager() {
  const { error: toastError } = useToast()
  const { signatures, signaturesLoading, saveSigMutation, setDefaultSigMutation, deleteSigMutation } =
    useSignatures()
  const { checkAccess } = useSubscription()
  const { openPricing } = usePricingModal()
  const hasBrandingAccess = checkAccess(FeatureKey.BRANDING).hasAccess

  const [showForm, setShowForm] = useState(false)
  const [sigType, setSigType] = useState<SigType | null>(null)
  const [sigName, setSigName] = useState('')
  const [typedText, setTypedText] = useState('')
  const [selectedFont, setSelectedFont] = useState("'Dancing Script', cursive")
  const [uploadedSigFile, setUploadedSigFile] = useState<File | null>(null)
  const [uploadedSigPreview, setUploadedSigPreview] = useState<string | null>(null)
  const [sigSaving, setSigSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const { canvasRef, startDrawing, draw, stopDrawing, clearCanvas, isCanvasBlank, getCanvasDataUrl } =
    useSignatureCanvas()

  // Inject cursive fonts
  useEffect(() => {
    if (typeof document === 'undefined') return
    const link = document.createElement('link')
    link.href =
      'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Pacifico&family=Great+Vibes&family=Caveat:wght@700&display=swap'
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }, [])

  const resetForm = () => {
    setShowForm(false)
    setSigType(null)
    setSigName('')
    setTypedText('')
    setUploadedSigFile(null)
    setUploadedSigPreview(null)
    clearCanvas()
  }

  const handleSignatureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toastError('Please choose a valid image file.')
      return
    }
    setUploadedSigFile(file)
    const reader = new FileReader()
    reader.onload = () => setUploadedSigPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sigName.trim()) { toastError('Please enter a signature name.'); return }
    if (!sigType) { toastError('Please choose a signature type.'); return }

    setSigSaving(true)
    try {
      if (sigType === 'pad') {
        if (isCanvasBlank()) { toastError('Please draw your signature first.'); return }
        const dataUrl = getCanvasDataUrl()!
        const uploadRes = await api.uploadSignature({ base64Data: dataUrl.split(',')[1], contentType: 'image/png' })
        await saveSigMutation.mutateAsync({ name: sigName, type: 'pad', fileKey: uploadRes.fileKey, isDefault: signatures.length === 0 })
      } else if (sigType === 'upload') {
        if (!uploadedSigPreview) { toastError('Please select a signature image file.'); return }
        const uploadRes = await api.uploadSignature({ base64Data: uploadedSigPreview.split(',')[1], contentType: uploadedSigFile?.type || 'image/png' })
        await saveSigMutation.mutateAsync({ name: sigName, type: 'upload', fileKey: uploadRes.fileKey, isDefault: signatures.length === 0 })
      } else if (sigType === 'digital') {
        if (!typedText.trim()) { toastError('Please type your signature text.'); return }
        const content = `<span style="font-family: ${selectedFont}; font-size: 28px; color: #1e3a8a; font-weight: bold; display: inline-block;">${typedText}</span>`
        await saveSigMutation.mutateAsync({ name: sigName, type: 'digital', content, isDefault: signatures.length === 0 })
      }
      resetForm()
    } catch (err: any) {
      toastError(err.message || 'Failed to save signature')
    } finally {
      setSigSaving(false)
    }
  }

  return (
    <div className="branding-manager">
      {/* Header */}
      <div className="branding-manager__header">
        <div>
          <h2 className="branding-manager__title">Signatures</h2>
          <p className="branding-manager__subtitle">
            Drawn, uploaded, or digital signatures for use in generated documents.
          </p>
        </div>
        {!showForm && (
          <button
            className="btn btn--primary branding-manager__add-btn"
            onClick={() => {
              if (!hasBrandingAccess) { openPricing(); return }
              setShowForm(true)
            }}
          >
            <Plus size={16} /> New Signature
          </button>
        )}
      </div>

      {/* Creation panel — progressive disclosure */}
      {showForm && (
        <div className="branding-sig-form">
          <div className="branding-sig-form__header">
            <h3 className="branding-sig-form__title">Create Signature</h3>
            <button className="branding-sig-form__close" onClick={resetForm} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          {/* Step 1: Name */}
          <div className="branding-sig-form__field">
            <label className="branding-sig-form__label">Signature Name</label>
            <input
              className="branding-sig-form__input"
              type="text"
              placeholder="e.g. CEO Signature"
              value={sigName}
              onChange={(e) => setSigName(e.target.value)}
            />
          </div>

          {/* Step 2: Type picker (always shown after name) */}
          <div className="branding-sig-form__field">
            <label className="branding-sig-form__label">Signature Type</label>
            <div className="branding-sig-form__type-picker">
              {([
                { key: 'pad', icon: <PenTool size={16} />, label: 'Draw' },
                { key: 'digital', icon: <Type size={16} />, label: 'Digital' },
                { key: 'upload', icon: <Upload size={16} />, label: 'Upload' },
              ] as { key: SigType; icon: React.ReactNode; label: string }[]).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={`branding-sig-form__type-btn ${sigType === opt.key ? 'branding-sig-form__type-btn--active' : ''}`}
                  onClick={() => setSigType(opt.key)}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Type-specific form (progressive disclosure) */}
          {sigType === 'pad' && (
            <div className="branding-sig-form__field">
              <label className="branding-sig-form__label">Draw Your Signature</label>
              <div className="branding-sig-form__canvas-wrap">
                <canvas
                  ref={canvasRef}
                  width={480}
                  height={160}
                  style={{ display: 'block', width: '100%', height: 160, cursor: 'crosshair' }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                <button
                  type="button"
                  className="branding-sig-form__canvas-clear"
                  onClick={clearCanvas}
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {sigType === 'digital' && (
            <div className="branding-sig-form__field">
              <label className="branding-sig-form__label">Type Your Signature</label>
              <input
                className="branding-sig-form__input"
                type="text"
                placeholder="Enter your name"
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
              />
              <label className="branding-sig-form__label" style={{ marginTop: 12 }}>Font Style</label>
              <select
                className="branding-sig-form__input"
                value={selectedFont}
                onChange={(e) => setSelectedFont(e.target.value)}
              >
                <option value="'Dancing Script', cursive">Dancing Script</option>
                <option value="'Pacifico', cursive">Pacifico</option>
                <option value="'Great Vibes', cursive">Great Vibes</option>
                <option value="'Caveat', cursive">Caveat</option>
              </select>
              {typedText && (
                <div
                  className="branding-sig-form__digital-preview"
                  style={{ fontFamily: selectedFont }}
                >
                  {typedText}
                </div>
              )}
            </div>
          )}

          {sigType === 'upload' && (
            <div className="branding-sig-form__field">
              <label className="branding-sig-form__label">Upload Signature Image</label>
              <label className="branding-sig-form__upload-zone">
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleSignatureFileChange}
                />
                {uploadedSigPreview ? (
                  <div className="branding-sig-form__upload-preview">
                    <img src={uploadedSigPreview} alt="Preview" />
                    <span>Click to replace</span>
                  </div>
                ) : (
                  <div className="branding-sig-form__upload-placeholder">
                    <Upload size={24} />
                    <span>Click to browse signature image</span>
                    <small>PNG, JPG · Max 5MB</small>
                  </div>
                )}
              </label>
            </div>
          )}

          {sigType && (
            <div className="branding-sig-form__footer">
              <button className="btn btn--secondary" onClick={resetForm}>
                Cancel
              </button>
              <button
                className="btn btn--primary"
                onClick={handleSave}
                disabled={sigSaving || saveSigMutation.isPending}
              >
                {sigSaving ? <Loader2 size={14} className="animate-spin" /> : 'Save Signature'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Signature list */}
      {signaturesLoading ? (
        <div className="branding-manager__loader">
          <Loader2 size={28} className="animate-spin" style={{ color: 'var(--forest)' }} />
        </div>
      ) : signatures.length === 0 && !showForm ? (
        <div className="branding-manager__empty">
          <PenTool size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
          <h4>No Signatures Yet</h4>
          <p>Create a drawn, digital, or uploaded signature for use in documents.</p>
          <button className="btn btn--primary" onClick={() => {
            if (!hasBrandingAccess) { openPricing(); return }
            setShowForm(true)
          }}>
            <Plus size={14} /> Create Your First Signature
          </button>
        </div>
      ) : (
        <div className="branding-sig-list">
          {(signatures as SignatureConfig[]).map((sig) => (
            <div
              key={sig.id}
              className={`branding-sig-card ${sig.isDefault ? 'branding-sig-card--default' : ''}`}
            >
              {/* Preview */}
              <div className="branding-sig-card__preview">
                {sig.type === 'digital' ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: sig.content || '' }}
                    style={{ transform: 'scale(0.75)', transformOrigin: 'center' }}
                  />
                ) : (
                  <img src={sig.fileUrl} alt={sig.name} />
                )}
              </div>

              {/* Info */}
              <div className="branding-sig-card__info">
                <div className="branding-sig-card__name-row">
                  <h5 className="branding-sig-card__name">{sig.name}</h5>
                  {sig.isDefault && (
                    <span className="branding-sig-card__badge">Default</span>
                  )}
                </div>
                <span className="branding-sig-card__type">
                  {sig.type === 'pad' ? 'Drawn' : sig.type === 'digital' ? 'Digital' : 'Uploaded'}
                </span>
              </div>

              {/* Actions */}
              <div className="branding-sig-card__actions">
                {!sig.isDefault && (
                  <button
                    className="branding-sig-card__action"
                    title="Set as default"
                    onClick={() => {
                      if (!hasBrandingAccess) { openPricing(); return }
                      setDefaultSigMutation.mutate(sig.id)
                    }}
                  >
                    <Star size={14} />
                  </button>
                )}
                {deleteConfirm === sig.id ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--clay)' }}>Delete?</span>
                    <button
                      className="branding-sig-card__action branding-sig-card__action--danger"
                      onClick={() => { deleteSigMutation.mutate(sig.id); setDeleteConfirm(null) }}
                    >
                      {deleteSigMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Yes'}
                    </button>
                    <button
                      className="branding-sig-card__action"
                      onClick={() => setDeleteConfirm(null)}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    className="branding-sig-card__action branding-sig-card__action--danger"
                    title="Delete signature"
                    onClick={() => {
                      if (!hasBrandingAccess) { openPricing(); return }
                      setDeleteConfirm(sig.id)
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
