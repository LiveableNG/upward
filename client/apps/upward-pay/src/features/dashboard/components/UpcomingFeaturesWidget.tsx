'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight, Sparkles } from 'lucide-react'
import { UPCOMING_FEATURES } from '@/features/dashboard/constants/upcomingFeatures'

export function UpcomingFeaturesWidget() {
  const router = useRouter()
  const preview = UPCOMING_FEATURES.slice(0, 3)

  return (
    <button
      type="button"
      className="upcoming-widget"
      onClick={() => router.push('/dashboard/coming-soon')}
    >
      <div className="upcoming-widget__header">
        <div className="upcoming-widget__title">
          <span className="upcoming-widget__title-icon">
            <Sparkles size={16} />
          </span>
          <h3>Coming soon</h3>
        </div>
        <span className="upcoming-widget__link">
          See all
          <ArrowRight size={16} />
        </span>
      </div>

      <div className="upcoming-widget__list">
        {preview.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.id} className="upcoming-widget__item">
              <div className={`upcoming-widget__item-icon upcoming-widget__item-icon--${item.tone}`}>
                <Icon size={16} />
              </div>
              <div className="upcoming-widget__item-text">
                <span className="upcoming-widget__item-title">{item.title}</span>
                <span className="upcoming-widget__item-desc">{item.preview}</span>
              </div>
            </div>
          )
        })}
      </div>
    </button>
  )
}
