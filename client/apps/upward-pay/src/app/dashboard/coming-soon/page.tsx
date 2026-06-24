'use client'

import { Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import {
  UPCOMING_FEATURES,
  UPCOMING_PAGE_INTRO,
} from '@/features/dashboard/constants/upcomingFeatures'

export default function ComingSoonPage() {
  const router = useRouter()

  return (
    <PayPageShell
      title={UPCOMING_PAGE_INTRO.title}
      subtitle={UPCOMING_PAGE_INTRO.subtitle}
      showBack
      onBack={() => router.push('/dashboard')}
    >
      <section className="upcoming-page__hero">
        <div className="upcoming-page__hero-icon">
          <Sparkles size={22} />
        </div>
        <h2 className="upcoming-page__hero-title">{UPCOMING_PAGE_INTRO.heroTitle}</h2>
        <p className="upcoming-page__hero-text">{UPCOMING_PAGE_INTRO.heroText}</p>
      </section>

      <section className="upcoming-page__section">
        <p className="upcoming-page__section-label">On the roadmap</p>
        <div className="upcoming-page__list">
          {UPCOMING_FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <article key={feature.id} className="upcoming-page__card">
                <div className={`upcoming-page__card-icon upcoming-page__card-icon--${feature.tone}`}>
                  <Icon size={20} />
                </div>
                <div className="upcoming-page__card-body">
                  <div className="upcoming-page__card-head">
                    <h3 className="upcoming-page__card-title">{feature.title}</h3>
                    <span className="upcoming-page__card-badge">Soon</span>
                  </div>
                  <p className="upcoming-page__card-desc">{feature.description}</p>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </PayPageShell>
  )
}
