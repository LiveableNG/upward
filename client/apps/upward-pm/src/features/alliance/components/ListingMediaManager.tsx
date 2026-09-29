'use client'

import React, { useState, useRef } from 'react'
import {
  UploadCloud,
  X,
  ArrowLeft,
  ArrowRight,
  Star,
  Loader2,
  AlertCircle,
  Plus,
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

  const coverImage = media.length > 0 ? media[0] : null
  const galleryImages = media.length > 1 ? media.slice(1) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        multiple
        disabled={isMutating || isArchived}
        onChange={(e) => handleFiles(e.target.files)}
        style={{ display: 'none' }}
      />

      {errorMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--error-bg)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            fontSize: '12.5px',
            color: 'var(--error)',
          }}
        >
          <AlertCircle size={15} />
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--error)',
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Upload in-progress indicators */}
      {uploadingFiles.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {uploadingFiles.map((filename, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                fontSize: '12px',
                color: 'var(--text)',
              }}
            >
              <Loader2 size={14} className="animate-spin" style={{ color: '#3b82f6' }} />
              <span>Uploading {filename}...</span>
            </div>
          ))}
        </div>
      )}

      {/* Media Content Display */}
      {isLoading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto 6px' }} />
          <div style={{ fontSize: '12.5px' }}>Loading photography...</div>
        </div>
      ) : media.length === 0 ? (
        /* Compact, refined empty state */
        <div
          onClick={() => !isArchived && fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            handleFiles(e.dataTransfer.files)
          }}
          style={{
            border: '1.5px dashed var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            padding: '20px 16px',
            textAlign: 'center',
            cursor: isArchived ? 'default' : 'pointer',
            background: 'var(--ivory-dim)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'rgba(22, 101, 52, 0.08)',
              color: 'var(--forest)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <UploadCloud size={20} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
              Add Listing Photography
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Drag & drop photos or click to browse (Max {MAX_IMAGES} photos)
            </div>
          </div>
          {!isArchived && (
            <button
              type="button"
              className="alliance-btn alliance-btn--secondary"
              style={{ height: '32px', padding: '0 12px', fontSize: '12px', marginLeft: 'auto' }}
            >
              <Plus size={13} /> Select Photos
            </button>
          )}
        </div>
      ) : (
        /* Gallery with Primary Cover & Thumbnails */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Primary Cover Image Preview */}
          {coverImage && (
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '240px',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                background: 'var(--ivory-dim)',
                border: '1.5px solid var(--forest)',
                boxShadow: '0 2px 10px var(--forest-glow)',
              }}
            >
              <img
                src={coverImage.publicUrl}
                alt="Primary listing cover"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />

              {/* Cover Badge */}
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  background: 'var(--forest)',
                  color: '#ffffff',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '9999px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                }}
              >
                <Star size={11} fill="#ffffff" />
                Cover Photo
              </div>

              {/* Delete Cover Button */}
              {!isArchived && (
                <button
                  type="button"
                  onClick={() => handleDelete(coverImage.uuid)}
                  disabled={isMutating}
                  title="Remove image"
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'rgba(0, 0, 0, 0.65)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isMutating ? 'not-allowed' : 'pointer',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {/* Secondary Photo Strip & Add Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {galleryImages.map((item, idx) => {
              const actualIndex = idx + 1
              return (
                <div
                  key={item.uuid}
                  style={{
                    position: 'relative',
                    width: '76px',
                    height: '76px',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    border: '1px solid var(--border)',
                    background: 'var(--ivory-dim)',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={item.publicUrl}
                    alt={`Photo ${actualIndex + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />

                  {/* Reorder Left */}
                  {!isArchived && (
                    <button
                      type="button"
                      onClick={() => handleMove(actualIndex, 'left')}
                      disabled={isMutating}
                      title="Move closer to cover"
                      style={{
                        position: 'absolute',
                        bottom: '2px',
                        left: '2px',
                        background: 'rgba(0, 0, 0, 0.6)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '3px',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <ArrowLeft size={10} />
                    </button>
                  )}

                  {/* Delete button */}
                  {!isArchived && (
                    <button
                      type="button"
                      onClick={() => handleDelete(item.uuid)}
                      disabled={isMutating}
                      title="Remove image"
                      style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        background: 'rgba(0, 0, 0, 0.6)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              )
            })}

            {/* Add More Photos Button */}
            {!isArchived && media.length < MAX_IMAGES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isMutating}
                style={{
                  width: '76px',
                  height: '76px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1.5px dashed var(--border-strong)',
                  background: 'var(--ivory-dim)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '3px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                }}
              >
                <Plus size={16} color="var(--forest)" />
                <span style={{ fontSize: '10.5px', fontWeight: 700 }}>Add</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
