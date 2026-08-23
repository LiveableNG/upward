'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, Trash2, Video } from 'lucide-react'
import { Modal } from '@/components/common/Modal'
import { useToast } from '@/components/common/Toast'
import { disputeComplaint, uploadHomeFile } from '../services/myHomeService'
import type { Complaint, UploadedHomeFile } from '../types'

type Props = {
  isOpen: boolean
  onClose: () => void
  propertyUuid: string | null
  complaint: Complaint | null
}

const MAX_FILES = 2
const MAX_FILE_BYTES = 20 * 1024 * 1024

export function DisputeComplaintForm({ isOpen, onClose, propertyUuid, complaint }: Props) {
  const { success, error } = useToast()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [reason, setReason] = useState('')
  const [preferredResolution, setPreferredResolution] = useState('')
  const [triedToSubmit, setTriedToSubmit] = useState(false)
  const [files, setFiles] = useState<UploadedHomeFile[]>([])
  const [uploadingCount, setUploadingCount] = useState(0)

  const mutation = useMutation({
    mutationFn: (input: { reason: string; preferredResolution: string; file_ids?: string[] }) =>
      disputeComplaint(propertyUuid as string, complaint!.complaint_id, input),
    onSuccess: () => {
      success('Dispute submitted successfully.')
      queryClient.invalidateQueries({ queryKey: ['my-home', 'complaints'] })
      queryClient.invalidateQueries({ queryKey: ['my-home', 'complaint'] })
      onClose()
    },
    onError: (err: { message?: string }) => {
      error(err?.message || 'Could not submit dispute')
    },
  })

  useEffect(() => {
    if (!isOpen) {
      setReason('')
      setPreferredResolution('')
      setTriedToSubmit(false)
      setFiles([])
      setUploadingCount(0)
      mutation.reset()
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [isOpen])

  const slotsLeft = MAX_FILES - files.length - uploadingCount

  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || [])
    event.target.value = ''
    if (!propertyUuid || selected.length === 0) return

    const remaining = MAX_FILES - files.length - uploadingCount
    if (remaining <= 0) {
      error('Maximum two files allowed')
      return
    }

    const toUpload = selected.slice(0, remaining)
    if (selected.length > remaining) {
      error('Maximum two files allowed')
    }

    for (const file of toUpload) {
      const kind = file.type.split('/')[0]
      if (kind !== 'image' && kind !== 'video') {
        error('Only photos and videos can be attached')
        continue
      }
      if (file.size > MAX_FILE_BYTES) {
        error('Each file must be 20MB or smaller')
        continue
      }

      setUploadingCount((count) => count + 1)
      try {
        const response = await uploadHomeFile(propertyUuid, file)
        setFiles((current) => [...current, response.data])
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Could not upload file'
        error(message)
      } finally {
        setUploadingCount((count) => Math.max(0, count - 1))
      }
    }
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!propertyUuid || !complaint) {
      error('Select a home before submitting a dispute')
      return
    }
    if (!reason.trim() || !preferredResolution.trim()) {
      setTriedToSubmit(true)
      return
    }
    if (uploadingCount > 0) {
      error('Wait for uploads to finish before submitting')
      return
    }

    mutation.mutate({
      reason: reason.trim(),
      preferredResolution: preferredResolution.trim(),
      file_ids: files.map((file) => file.id),
    })
  }

  const isBusy = mutation.isPending || uploadingCount > 0

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <form className="my-home-form" onSubmit={handleSubmit}>
        <h3 className="my-home-detail__title">Dispute Resolution</h3>

        <label className="my-home-form__field">
          <span className="my-home-form__label">Why isn&apos;t this issue resolved?</span>
          <textarea
            className={`my-home-form__input my-home-form__input--area${triedToSubmit && !reason.trim() ? ' my-home-form__input--error' : ''}`}
            placeholder="Please explain the current status..."
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            disabled={mutation.isPending}
          />
          {triedToSubmit && !reason.trim() ? (
            <span className="my-home-form__error">Please provide a reason for the dispute</span>
          ) : null}
        </label>

        <label className="my-home-form__field">
          <span className="my-home-form__label">What resolution are you seeking?</span>
          <textarea
            className={`my-home-form__input my-home-form__input--area${triedToSubmit && !preferredResolution.trim() ? ' my-home-form__input--error' : ''}`}
            placeholder="What would you like to happen?"
            value={preferredResolution}
            onChange={(event) => setPreferredResolution(event.target.value)}
            rows={4}
            disabled={mutation.isPending}
          />
          {triedToSubmit && !preferredResolution.trim() ? (
            <span className="my-home-form__error">Please describe the resolution you want</span>
          ) : null}
        </label>

        <div className="my-home-form__field">
          <span className="my-home-form__label">Supporting Evidence (Optional)</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="my-home-form__file-input"
            onChange={handleFilesSelected}
            disabled={isBusy || slotsLeft <= 0}
          />
          <button
            type="button"
            className="my-home-form__upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy || slotsLeft <= 0}
          >
            <ImagePlus size={16} />
            {slotsLeft <= 0 ? 'Maximum two files' : 'Add photo or video'}
          </button>

          {files.length > 0 || uploadingCount > 0 ? (
            <div className="my-home-form__media">
              {files.map((file) => (
                <div key={file.id} className="my-home-form__media-item">
                  {file.type?.startsWith('video') ? (
                    <span className="my-home-form__media-video">
                      <Video size={22} />
                      <span>{file.caption}</span>
                    </span>
                  ) : (
                    <img src={file.source} alt={file.caption} />
                  )}
                  <button
                    type="button"
                    className="my-home-form__media-remove"
                    onClick={() => setFiles((current) => current.filter((item) => item.id !== file.id))}
                    disabled={mutation.isPending}
                    aria-label="Remove file"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {Array.from({ length: uploadingCount }).map((_, index) => (
                <div key={`uploading-${index}`} className="my-home-form__media-item my-home-form__media-item--busy">
                  Uploading…
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="my-home-confirm__actions">
          <button type="button" className="my-home-detail__secondary-btn" onClick={onClose} disabled={isBusy}>
            Cancel
          </button>
          <button type="submit" className="my-home-detail__copy-btn" disabled={isBusy}>
            {mutation.isPending ? 'Submitting…' : 'Submit Dispute'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
