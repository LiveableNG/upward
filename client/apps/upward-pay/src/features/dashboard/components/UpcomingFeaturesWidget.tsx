'use client'

import { useRouter } from 'next/navigation'
import { Wand2, Smartphone, Gift, ArrowRight, Sparkles, TrendingUp } from 'lucide-react'

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
      title: 'Future Savings',
      desc: 'Save for rent (+100 Score)',
      icon: TrendingUp,
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.1)',
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
          <Sparkles size={18} className="text--clay" />
          <h3>Coming Soon</h3>
        </div>
        <button className="upcoming-widget__btn">
          <ArrowRight size={18} />
        </button>
      </div>

      <div className="upcoming-widget__list">
        {features.map((item, i) => (
          <div key={i} className="upcoming-item">
            <div className="upcoming-item__icon" style={{ backgroundColor: item.bg, color: item.color }}>
              <item.icon size={18} />
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
          border: 1px solid var(--border-solid);
          border-radius: 24px;
          padding: 24px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .upcoming-widget:hover {
          border-color: var(--clay);
          box-shadow: 0 12px 32px rgba(0,0,0,0.06);
          transform: translateY(-4px);
        }

        :global(.theme--dark) .upcoming-widget:hover {
          box-shadow: 0 12px 32px rgba(0,0,0,0.2);
        }

        .upcoming-widget__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .upcoming-widget__title {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .upcoming-widget__title h3 {
          font-size: 16px;
          font-weight: 800;
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
          gap: 20px;
        }

        .upcoming-item {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .upcoming-item__icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .upcoming-item__info h4 {
          font-size: 14px;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 4px;
        }

        .upcoming-item__info p {
          font-size: 12px;
          color: var(--text-muted);
          margin: 0;
        }
      `}</style>
    </div>
  )
}
