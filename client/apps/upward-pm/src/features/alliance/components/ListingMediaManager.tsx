'use client'

import React, { useState, useRef } from 'react'
import {
  UploadCloud,
  X,
  ArrowLeft,
  ArrowRight,
  Star,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  Info,
} from 'lucide-react'
import {
  useListingMedia,
  useUploadListingMedia,
  useReorderListingMedia,
  useDeleteListingMedia,
} from '../hooks/useAlliance'
import { AllianceListingMedia } from '../types/alliance.types'

interface ListingMediaManagerProps {
  listingUuid: string
  isArchived?: boolean
}

const MAX_IMAGES = 15
const MAX_FILE_SIZE_MB = 10
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function ListingMediaManager({ listingUuid, isArchived = false }: ListingMediaManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([])

  const { data: media = [], isLoading } = useListingMedia(listingUuid)
  const uploadMutation = useUploadListingMedia()
  const reorderMutation = useReorderListingMedia()
  const deleteMutation = useDeleteListingMedia()

  const isMutating =
    uploadMutation.isPending || reorderMutation.isPending || deleteMutation.isPending

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || isArchived) return
    setErrorMessage(null)

    const fileList = Array.from(files)
    const currentTotal = media.length + uploadingFiles.length

    if (currentTotal + fileList.length > MAX_IMAGES) {
      setErrorMessage(`You can upload a maximum of ${MAX_IMAGES} images per listing.`)
      return
    }

    for (const file of fileList) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setErrorMessage(`"${file.name}" has an unsupported format. Allowed: JPG, PNG, WEBP.`)
        return
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setErrorMessage(`"${file.name}" exceeds the ${MAX_FILE_SIZE_MB}MB size limit.`)
        return
      }
    }

    for (const file of fileList) {
      setUploadingFiles((prev) => [...prev, file.name])
      try {
        await uploadMutation.mutateAsync({ listingUuid, file })
      } catch (err: any) {
        setErrorMessage(err.message || `Failed to upload ${file.name}`)
      } finally {
        setUploadingFiles((prev) => prev.filter((name) => name !== file.name))
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleMove = async (index: number, direction: 'left' | 'right') => {
    if (isArchived || isMutating) return
    const targetIndex = direction === 'left' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= media.length) return

    const newOrder = [...media]
    const temp = newOrder[index]
    newOrder[index] = newOrder[targetIndex]
    newOrder[targetIndex] = temp

    try {
      await reorderMutation.mutateAsync({
        listingUuid,
        mediaUuids: newOrder.map((m) => m.uuid),
      })
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reorder images')
    }
  }

  const handleDelete = async (mediaUuid: string) => {
    if (isArchived || isMutating) return
    try {
      await deleteMutation.mutateAsync({ listingUuid, mediaUuid })
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete image')
    }
  }

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
            Listing Media ({media.length} / {MAX_IMAGES})
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
            Upload up to {MAX_IMAGES} high-resolution photos. The first photo is your cover image.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '16px',
            fontSize: '13px',
            color: '#ef4444',
          }}
        >
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#ef4444',
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Upload Dropzone */}
      {!isArchived && media.length < MAX_IMAGES && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            handleFiles(e.dataTransfer.files)
          }}
          style={{
            border: '2px dashed var(--border)',
            borderRadius: '10px',
            padding: '24px',
            textAlign: 'center',
            cursor: isMutating ? 'not-allowed' : 'pointer',
            background: 'var(--bg-muted, rgba(255,255,255,0.02))',
            transition: 'border-color 0.2s',
            marginBottom: '20px',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            multiple
            disabled={isMutating || isArchived}
            onChange={(e) => handleFiles(e.target.files)}
            style={{ display: 'none' }}
          />
          <UploadCloud
            size={32}
            style={{ color: 'var(--clay)', margin: '0 auto 8px', display: 'block' }}
          />
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>
            Click to upload or drag & drop images
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Supported formats: JPG, PNG, WEBP (Max {MAX_FILE_SIZE_MB}MB per file)
          </div>
        </div>
      )}

      {/* Uploading In-Progress Placeholders */}
      {uploadingFiles.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginBottom: '16px',
          }}
        >
          {uploadingFiles.map((filename, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                fontSize: '13px',
                color: 'var(--text)',
              }}
            >
              <Loader2 size={16} className="animate-spin" style={{ color: '#3b82f6' }} />
              <span>Uploading {filename}...</span>
            </div>
          ))}
        </div>
      )}

      {/* Media Grid */}
      {isLoading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
          <div>Loading images...</div>
        </div>
      ) : media.length === 0 && uploadingFiles.length === 0 ? (
        <div
          style={{
            padding: '32px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            background: 'var(--bg-muted, rgba(255,255,255,0.01))',
            borderRadius: '8px',
            border: '1px solid var(--border)',
          }}
        >
          <ImageIcon size={36} style={{ opacity: 0.4, margin: '0 auto 8px', display: 'block' }} />
          <div style={{ fontSize: '14px', fontWeight: 500 }}>No images added yet</div>
          <p style={{ fontSize: '12px', marginTop: '4px', maxWidth: '300px', margin: '4px auto 0' }}>
            Images enhance your Alliance listing and make it more attractive to fellow PMs.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '16px',
          }}
        >
          {media.map((item: AllianceListingMedia, index: number) => {
            const isCover = index === 0

            return (
              <div
                key={item.uuid}
                style={{
                  position: 'relative',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: isCover ? '2px solid var(--clay)' : '1px solid var(--border)',
                  background: 'var(--dark, #1a1a1a)',
                  boxShadow: isCover ? '0 0 12px rgba(224, 90, 71, 0.2)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Image Preview */}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '130px',
                    background: '#000',
                  }}
                >
                  <img
                    src={item.publicUrl}
                    alt={`Listing photo ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />

                  {/* Cover Badge */}
                  {isCover && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        background: 'var(--clay)',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                      }}
                    >
                      <Star size={11} fill="#fff" />
                      Cover Image
                    </div>
                  )}

                  {/* Delete Button */}
                  {!isArchived && (
                    <button
                      onClick={() => handleDelete(item.uuid)}
                      disabled={isMutating}
                      title="Delete Image"
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'rgba(0,0,0,0.65)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '26px',
                        height: '26px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: isMutating ? 'not-allowed' : 'pointer',
                        transition: 'background 0.2s',
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Card Controls Footer */}
                <div
                  style={{
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--surface)',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    #{index + 1}
                  </span>

                  {!isArchived && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => handleMove(index, 'left')}
                        disabled={index === 0 || isMutating}
                        title="Move Left (Earlier in Order)"
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          padding: '4px',
                          cursor: index === 0 || isMutating ? 'not-allowed' : 'pointer',
                          color: index === 0 ? 'var(--text-muted)' : 'var(--text)',
                          opacity: index === 0 ? 0.3 : 1,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <ArrowLeft size={13} />
                      </button>

                      <button
                        onClick={() => handleMove(index, 'right')}
                        disabled={index === media.length - 1 || isMutating}
                        title="Move Right (Later in Order)"
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          padding: '4px',
                          cursor: index === media.length - 1 || isMutating ? 'not-allowed' : 'pointer',
                          color: index === media.length - 1 ? 'var(--text-muted)' : 'var(--text)',
                          opacity: index === media.length - 1 ? 0.3 : 1,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Canonical Isolation Footer Notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '20px',
          padding: '10px 14px',
          borderRadius: '8px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border)',
          fontSize: '12px',
          color: 'var(--text-muted)',
        }}
      >
        <Info size={14} style={{ color: 'var(--clay)', flexShrink: 0 }} />
        <span>
          <strong>Canonical Isolation:</strong> Media uploaded here belongs exclusively to this
          marketing listing and will never overwrite or modify photos in your PM property/unit inventory.
        </span>
      </div>
    </div>
  )
}
