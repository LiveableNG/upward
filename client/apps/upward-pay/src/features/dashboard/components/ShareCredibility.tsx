import { Award, Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/components/common/Toast'

interface ShareCredibilityProps {
  profileSlug?: string | null
}

export function ShareCredibility({ profileSlug }: ShareCredibilityProps) {
  const { success, error: toastError } = useToast()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const identifier = profileSlug || 'me'
    const defaultWebUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : defaultWebUrl
    const url = `${baseUrl}/profile/${identifier}`

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = url
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      setCopied(true)
      success('Profile link copied to clipboard!')
      setTimeout(() => setCopied(false), 2500)
    } catch {
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
