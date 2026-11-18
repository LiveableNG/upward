import { Award, Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/components/common/Toast'
import { getPublicWebUrl, copyTextToClipboard } from '@/lib/utils'

interface ShareCredibilityProps {
  profileSlug?: string | null
}

export function ShareCredibility({ profileSlug }: ShareCredibilityProps) {
  const { success, error: toastError } = useToast()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const identifier = profileSlug || 'me'
    const url = getPublicWebUrl(`/profile/${identifier}`)

    const copiedSuccess = await copyTextToClipboard(url)
    if (copiedSuccess) {
      setCopied(true)
      success('Profile link copied to clipboard!')
      setTimeout(() => setCopied(false), 2500)
    } else {
      toastError('Failed to copy link')
    }
  }

  return (
    <section className="share-cred">
      <div className="share-cred__badge">
        <Award size={14} color="var(--clay)" />
        <span className="share-cred__badge-text">Tenant Legacy</span>
      </div>
      <h3 className="share-cred__title">Share Your Rent Credibility</h3>
      <p className="share-cred__desc">
        Showcase your commitment to housing excellence. Verify your identity and share your verified
        credibility report with landlords.
      </p>
      <div className="share-cred__actions">
        <button className="btn btn--primary btn--full" onClick={handleCopy}>
          {copied ? <Check size={18} className="mr-2" /> : <Copy size={18} className="mr-2" />}
          <span>{copied ? 'Link Copied!' : 'Copy Profile Link'}</span>
        </button>
      </div>
    </section>
  )
}
