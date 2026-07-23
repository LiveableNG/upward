'use client'

import { useRouter } from 'next/navigation'
import { ChevronRight, Search } from 'lucide-react'
import { HOME_REQUEST_PAGE_COPY } from '@/features/dashboard/constants/exclusiveHomeRequests'

export function HomeRequestPromoCard({ compact = false }: { compact?: boolean }) {
  const router = useRouter()

  if (compact) {
    return (
      <div className="home-req__inline-card">
        <div className="home-req__inline-copy">
          <h3 className="home-req__inline-title">Don&apos;t see what you want?</h3>
          <p className="home-req__inline-text">
            Submit a brief and a verified agent will match you — no browsing needed.
          </p>
        </div>
        <button
          type="button"
          className="exclusive-homes__primary-btn home-req__inline-cta"
          onClick={() => router.push('/dashboard/exclusive-homes/request')}
        >
          Request a home
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      className="home-req__hero-card"
      onClick={() => router.push('/dashboard/exclusive-homes/request')}
    >
      <span className="home-req__hero-icon" aria-hidden>
        <Search size={22} />
      </span>
      <span className="home-req__hero-copy">
        <span className="home-req__hero-title">Request a home</span>
        <span className="home-req__hero-desc">{HOME_REQUEST_PAGE_COPY.formSubtitle}</span>
      </span>
      <ChevronRight size={18} className="home-req__hero-chevron" aria-hidden />
    </button>
  )
}
