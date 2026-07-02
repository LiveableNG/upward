import { EXCLUSIVE_HOMES_PAGE_COPY } from '@/features/dashboard/constants/exclusiveHomes'

export function ExclusiveHomesInfoBanner() {
  return (
    <div className="exclusive-homes__banner">
      <span className="exclusive-homes__banner-star" aria-hidden>
        ✦
      </span>
      <p className="exclusive-homes__banner-text">{EXCLUSIVE_HOMES_PAGE_COPY.bannerText}</p>
    </div>
  )
}
