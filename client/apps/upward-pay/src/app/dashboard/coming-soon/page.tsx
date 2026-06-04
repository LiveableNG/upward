'use client'

import { Smartphone, Gift, Wand2, Rocket, TrendingUp } from 'lucide-react'

export default function ComingSoonPage() {
  const features = [
    {
      title: 'AI Housing Planner',
      desc: 'Smart financial planning for your next rent and housing goals.',
      icon: Wand2,
      color: 'var(--clay)',
    },
    {
      title: 'Future Savings',
      desc: 'Automated rent savings with credibility score boosts.',
      icon: TrendingUp,
      color: '#8b5cf6',
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
      {/* Unified Custom Header */}
      <header className="profile-header animate-slide-up">
        <div className="profile-header__title-wrap">
          <h1 className="profile-header__title">Upcoming Features</h1>
          <p className="profile-header__subtitle">Explore new tools and experiences</p>
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

      <style jsx>{`
        .profile-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 0.25rem 1.5rem;
          border-bottom: none;
        }

        .profile-header__title-wrap {
          display: flex;
          flex-direction: column;
          gap: 2px;
          text-align: left;
        }

        .profile-header__title {
          font-size: 1.85rem;
          font-weight: 800;
          color: var(--text);
          letter-spacing: -0.02em;
          margin: 0;
        }

        .profile-header__subtitle {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin: 0;
        }

        @media (min-width: 1024px) {
          .profile-header {
            padding: 1.5rem 0;
            margin-bottom: 24px;
          }
        }
      `}</style>
    </div>
  )
}
