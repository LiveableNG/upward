import { Award, Share2, Check, ExternalLink } from 'lucide-react'
import { useState } from 'react'

interface ShareCredibilityProps {
  profileSlug?: string | null
}

export function ShareCredibility({ profileSlug }: ShareCredibilityProps) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    if (!profileSlug) return

    const url = `${window.location.origin}/profile/${profileSlug}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Upward Rent Credibility',
          text: 'Check out my rent credibility score on Upward!',
          url,
        })
      } catch (err) {
        console.log('Error sharing:', err)
      }
    } else {
      // Fallback to copy
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!profileSlug) return null

  return (
    <section className="share-cred">
      <div className="share-cred__badge">
        <Award size={14} color="var(--clay)" />
        <span className="share-cred__badge-text">Tenant Legacy</span>
      </div>
      <h3 className="share-cred__title">Share Your Rent Credibility</h3>
      <p className="share-cred__desc">
        Showcase your commitment to housing excellence. Sharing your credibility helps you unlock
        better deals and housing opportunities.
      </p>
      <div className="share-cred__actions">
        <button className="share-cred__btn" onClick={handleShare} disabled={!profileSlug}>
          {copied ? <Check size={18} /> : <Share2 size={18} />}
          <span>{copied ? 'Link Copied!' : 'Share Profile'}</span>
        </button>
        <button 
          className="share-cred__btn share-cred__btn--outline" 
          onClick={() => window.open(`${window.location.origin}/profile/${profileSlug}`, '_blank')}
          disabled={!profileSlug}
        >
          <ExternalLink size={18} />
          <span>Preview</span>
        </button>
      </div>
    </section>
  )
}
