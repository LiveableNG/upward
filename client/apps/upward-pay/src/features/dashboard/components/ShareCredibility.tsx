'use client'

import { Award, Share2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function ShareCredibility() {
  const router = useRouter()

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
      <button className="share-cred__btn" onClick={() => router.push('/dashboard/kyc')}>
        <Share2 size={18} />
        <span>Share My Report</span>
      </button>
    </section>
  )
}
