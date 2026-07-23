'use client'

import { useRouter } from 'next/navigation'
import { Search, ChevronRight } from 'lucide-react'
import { HOME_REQUEST_PAGE_COPY } from '@/features/dashboard/constants/exclusiveHomeRequests'

export function ExclusiveHomesPromo() {
  const router = useRouter()

  return (
    <button
      type="button"
      className="exclusive-homes-promo home-req__dash-promo"
      onClick={() => router.push('/dashboard/exclusive-homes/request')}
    >
      <span className="exclusive-homes-promo__icon" aria-hidden>
        <Search size={22} />
      </span>
      <span className="exclusive-homes-promo__copy">
        <span className="exclusive-homes-promo__title">Find your next home</span>
        <span className="exclusive-homes-promo__desc">
          Tell us what you need — verified agents, scam-protected
        </span>
      </span>
      <ChevronRight size={18} className="exclusive-homes-promo__chevron" aria-hidden />
    </button>
  )
}

export function ExclusiveHomesBrowseLink() {
  const router = useRouter()

  return (
    <button
      type="button"
      className="home-req__browse-link home-req__browse-link--centered"
      onClick={() => router.push('/dashboard/exclusive-homes')}
    >
      {HOME_REQUEST_PAGE_COPY.browseLink}
    </button>
  )
}
