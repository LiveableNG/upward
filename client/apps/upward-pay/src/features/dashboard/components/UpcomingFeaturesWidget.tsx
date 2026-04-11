'use client'

import { useRouter } from 'next/navigation'
import { Wand2, Smartphone, Gift, ArrowRight, Sparkles } from 'lucide-react'

export function UpcomingFeaturesWidget() {
  const router = useRouter()
  
  const features = [
    {
      title: 'AI Housing Planner',
      desc: 'Smart financial planning',
      icon: Wand2,
      color: 'var(--clay)',
      bg: 'rgba(217, 119, 87, 0.1)',
    },
    {
      title: 'Advanced Property Search',
      desc: 'Browse verified listings',
      icon: Smartphone,
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.1)',
    },
    {
      title: 'Tenant Rewards',
      desc: 'Earn points & discounts',
      icon: Gift,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.1)',
    },
  ]

  return (
    <div className="upcoming-widget" onClick={() => router.push('/dashboard/coming-soon')}>
      <div className="upcoming-widget__header">
        <div className="upcoming-widget__title">
          <Sparkles size={16} className="text--clay" />
          <h3>Coming Soon</h3>
        </div>
        <button className="upcoming-widget__btn">
          <ArrowRight size={16} />
        </button>
      </div>

      <div className="upcoming-widget__list">
        {features.map((item, i) => (
          <div key={i} className="upcoming-item">
            <div className="upcoming-item__icon" style={{ backgroundColor: item.bg, color: item.color }}>
              <item.icon size={16} />
            </div>
            <div className="upcoming-item__info">
              <h4>{item.title}</h4>
              <p>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .upcoming-widget {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .upcoming-widget:hover {
          border-color: var(--clay);
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
          transform: translateY(-2px);
        }

        :global(.theme--dark) .upcoming-widget:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        }

        .upcoming-widget__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .upcoming-widget__title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .upcoming-widget__title h3 {
          font-size: 15px;
          font-weight: 700;
          color: var(--text);
          margin: 0;
        }

        .text--clay {
          color: var(--clay);
        }

        .upcoming-widget__btn {
          color: var(--text-muted);
          background: transparent;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          transition: color 0.2s;
        }

        .upcoming-widget:hover .upcoming-widget__btn {
          color: var(--clay);
        }

        .upcoming-widget__list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .upcoming-item {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .upcoming-item__icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .upcoming-item__info h4 {
          font-size: 13px;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 2px;
        }

        .upcoming-item__info p {
          font-size: 11px;
          color: var(--text-muted);
          margin: 0;
        }
      `}</style>
    </div>
  )
}
