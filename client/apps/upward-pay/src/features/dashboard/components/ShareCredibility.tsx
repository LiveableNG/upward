import { Award, Share2, Check, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ShareCredibilityProps {
  profileSlug?: string | null
}

export function ShareCredibility({ profileSlug }: ShareCredibilityProps) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  const handleShare = () => {
    router.push('/dashboard/kyc')
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
        <button className="btn btn--primary btn--full" onClick={handleShare}>
          <Share2 size={18} className="mr-2" />
          <span>Share Profile Page</span>
        </button>
      </div>
    </section>
  )
}
