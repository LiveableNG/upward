'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Smartphone, Gift, Wand2, Rocket } from 'lucide-react'

export default function ComingSoonPage() {
  const router = useRouter()

  const features = [
    {
      title: 'AI Housing Planner',
      desc: 'Smart financial planning for your next rent and housing goals.',
      icon: Wand2,
      color: 'var(--clay)',
    },
    {
      title: 'Advanced Property Search',
      desc: 'Browse verified listings and manage your lease details seamlessly.',
      icon: Smartphone,
      color: '#3b82f6',
    },
    {
      title: 'Tenant Rewards',
      desc: 'Earn points and unlock discounts for being a great tenant.',
      icon: Gift,
      color: '#10b981',
    },
  ]

  return (
    <div className="dashboard dashboard--nav-offset">
      <header className="dashboard__header">
        <div className="dashboard__header-left">
          <button className="dashboard__back" onClick={() => router.push('/dashboard')}>
            <ArrowLeft size={20} />
          </button>
          <h2 className="dashboard__title">Upcoming Features</h2>
        </div>
      </header>

      <div className="coming-soon">
        <div className="coming-soon__badge">
          <Rocket size={14} color="var(--clay)" />
          <span className="coming-soon__badge-text">Coming Very Soon</span>
        </div>

        <h1 className="coming-soon__title">Elevating Your Experience</h1>
        <p className="coming-soon__desc">
          We're building powerful new tools to help you manage your financial life and property
          journey.
        </p>

        <div className="coming-soon__grid">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div key={index} className="coming-soon__item">
                <div
                  className="coming-soon__icon-wrapper"
                  style={{
                    background: `${feature.color}15`,
                    color: feature.color,
                    borderColor: `${feature.color}30`,
                  }}
                >
                  <Icon size={24} strokeWidth={2.5} />
                </div>
                <div className="coming-soon__content">
                  <h3 className="coming-soon__item-title">{feature.title}</h3>
                  <p className="coming-soon__item-desc">{feature.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
