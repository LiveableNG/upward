'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Sparkles, Smartphone, Gift, Wand2, Rocket } from 'lucide-react'

export default function ComingSoonPage() {
  const router = useRouter()

  const features = [
    {
      title: 'AI Housing Planner',
      desc: 'Smart financial planning for your the next rent and housing goals.',
      icon: Wand2,
      color: 'var(--clay)'
    },
    {
      title: 'Advanced Property Search',
      desc: 'Browse verified listings and manage your lease details seamlessly.',
      icon: Smartphone,
      color: '#3b82f6'
    },
    {
      title: 'Tenant Rewards',
      desc: 'Earn points and unlock discounts for being a great tenant.',
      icon: Gift,
      color: '#10b981'
    }
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

      <div className="coming-soon-hero" style={{ padding: '40px 20px', textAlign: 'center', animation: 'fadeInUp 0.8s ease-out' }}>
        <div className="coming-soon-badge" style={{ display: 'inline-flex', padding: '8px 16px', background: 'var(--clay-faint)', borderRadius: '99px', marginBottom: '24px', border: '1px solid var(--clay-glow)' }}>
          <Rocket size={16} color="var(--clay)" style={{ marginRight: '8px' }} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--clay)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coming Very Soon</span>
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text)', marginBottom: '16px', lineHeight: 1.1 }}>Elevating Your Experience</h1>
        <p style={{ fontSize: '16px', color: 'var(--text-secondary)', maxWidth: '320px', margin: '0 auto 40px' }}>
          We're building powerful new tools to help you manage your financial life and property journey.
        </p>

        <div className="coming-soon-grid" style={{ display: 'grid', gap: '16px', textAlign: 'left' }}>
          {features.map((f, i) => {
            const Icon = f.icon
            return (
              <div key={i} className="update-item" style={{ animation: `fadeInUp 0.5s ease-out ${0.2 + i * 0.1}s backwards` }}>
                <div className="update-item__icon" style={{ background: `${f.color}10`, color: f.color, borderColor: `${f.color}20` }}>
                  <Icon size={22} />
                </div>
                <div className="update-item__content">
                  <div className="update-item__title">{f.title}</div>
                  <p className="update-item__desc">{f.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
