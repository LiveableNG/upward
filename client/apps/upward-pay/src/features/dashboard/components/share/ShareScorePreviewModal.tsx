'use client'

import { useEffect, useState } from 'react'
import { X, Share2, Download, Loader2 } from 'lucide-react'
import { ShareScoreStoryCard, type ShareScoreStoryCardProps } from './ShareScoreStoryCard'
import {
  SHARE_SCORE_CAPTURE_ID,
  generateQrDataUrl,
  generateScoreShareImage,
  getProfileShareUrl,
  shareScoreImageBlob,
  downloadBlob,
} from './shareScoreImage'

interface ShareScorePreviewModalProps {
  open: boolean
  onClose: () => void
  cardProps: Omit<ShareScoreStoryCardProps, 'qrDataUrl' | 'profileUrl'> & {
    profileUuid: string
  }
  onShared?: (mode: 'shared' | 'downloaded') => void
  onError?: (message: string) => void
}

export function ShareScorePreviewModal({
  open,
  onClose,
  cardProps,
  onShared,
  onError,
}: ShareScorePreviewModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [profileUrl, setProfileUrl] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!open) {
      setQrDataUrl('')
      setProfileUrl('')
      setIsReady(false)
      return
    }

    let cancelled = false

    async function prepare() {
      try {
        const url = getProfileShareUrl(cardProps.profileUuid)
        const qr = await generateQrDataUrl(url)
        if (cancelled) return
        setProfileUrl(url)
        setQrDataUrl(qr)
        setIsReady(true)
      } catch {
        if (!cancelled) onError?.('Could not prepare share image. Please try again.')
      }
    }

    prepare()

    return () => {
      cancelled = true
    }
  }, [open, cardProps.profileUuid, onError])

  const fullCardProps: ShareScoreStoryCardProps | null =
    isReady && qrDataUrl && profileUrl
      ? {
          ...cardProps,
          qrDataUrl,
          profileUrl,
        }
      : null

  async function handleShare() {
    if (!fullCardProps) return
    setIsGenerating(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 150))
      const blob = await generateScoreShareImage(SHARE_SCORE_CAPTURE_ID)
      const slug = cardProps.profileRef.replace('UPW-', '') || 'score'
      const filename = `upward-score-${slug}.png`
      const shareText = `Check out my Rent Credibility Score on Upward: ${profileUrl}`
      const mode = await shareScoreImageBlob(blob, filename, shareText)
      onShared?.(mode)
      onClose()
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return
      onError?.('Could not share image. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleSave() {
    if (!fullCardProps) return
    setIsGenerating(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 150))
      const blob = await generateScoreShareImage(SHARE_SCORE_CAPTURE_ID)
      const slug = cardProps.profileRef.replace('UPW-', '') || 'score'
      const filename = `upward-score-${slug}.png`
      downloadBlob(blob, filename)
      onShared?.('downloaded')
      onClose()
    } catch {
      onError?.('Could not save image. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  if (!open) return null

  return (
    <div className="share-score-preview-overlay" onClick={onClose}>
      <div className="share-score-preview" onClick={(e) => e.stopPropagation()}>
        <div className="share-score-preview__header">
          <div>
            <h4>Share your score</h4>
            <p>Post to WhatsApp Status, Instagram Story, or send to a contact.</p>
          </div>
          <button type="button" className="share-score-preview__close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="share-score-preview__viewport">
          {!fullCardProps ? (
            <div className="share-score-preview__loading">
              <Loader2 size={28} className="share-score-preview__spinner" />
              <span>Preparing preview…</span>
            </div>
          ) : (
            <div className="share-score-preview__scale">
              <ShareScoreStoryCard {...fullCardProps} />
            </div>
          )}
        </div>

        <div className="share-score-preview__actions">
          <button
            type="button"
            className="btn btn--primary btn--full"
            onClick={handleShare}
            disabled={!fullCardProps || isGenerating}
          >
            {isGenerating ? <Loader2 size={18} className="share-score-preview__spinner" /> : <Share2 size={18} />}
            {isGenerating ? 'Generating…' : 'Share image'}
          </button>
          <button
            type="button"
            className="btn btn--outline btn--full"
            onClick={handleSave}
            disabled={!fullCardProps || isGenerating}
          >
            <Download size={18} />
            Save to device
          </button>
        </div>
      </div>

      {fullCardProps ? (
        <div className="share-score-story-capture-host" aria-hidden>
          <ShareScoreStoryCard {...fullCardProps} id={SHARE_SCORE_CAPTURE_ID} />
        </div>
      ) : null}
    </div>
  )
}
