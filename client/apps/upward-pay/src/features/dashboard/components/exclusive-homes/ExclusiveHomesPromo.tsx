'use client'

import { useRouter } from 'next/navigation'
import { Building2, ChevronRight } from 'lucide-react'
import { EXCLUSIVE_HOMES_PAGE_COPY } from '@/features/dashboard/constants/exclusiveHomes'

export function ExclusiveHomesPromo() {
  const router = useRouter()

  return (
    <button
      type="button"
      className="exclusive-homes-promo"
      onClick={() => router.push('/dashboard/exclusive-homes')}
    >
      <span className="exclusive-homes-promo__icon" aria-hidden>
        <Building2 size={22} />
      </span>
      <span className="exclusive-homes-promo__copy">
        <span className="exclusive-homes-promo__title">{EXCLUSIVE_HOMES_PAGE_COPY.promoTitle}</span>
        <span className="exclusive-homes-promo__desc">{EXCLUSIVE_HOMES_PAGE_COPY.promoSubtitle}</span>
      </span>
      <ChevronRight size={18} className="exclusive-homes-promo__chevron" aria-hidden />
    </button>
  )
}
