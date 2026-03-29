'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, Gift, Shield, Crown, Star, Trophy, Users, 
  MapPin, Home, Vote, Zap, Info, Check
} from 'lucide-react'
import { getTenant } from '@/lib/auth'
import type { TenantProfile } from '@/lib/api'

export default function RewardsPage() {
  const router = useRouter()
  const [tenant, setTenant] = useState<TenantProfile | null>(null)

  useEffect(() => {
    setTenant(getTenant())
  }, [])

  const tiers = [
    { title: 'Window Shopper', desc: 'Signed up for Upward', icon: Zap, color: '#94a3b8' },
    { title: 'General Member', desc: 'Completed your full profile', icon: Trophy, color: '#d97757' },
    { title: 'Contributor', desc: 'Invited 2 people to the community', icon: Star, color: '#22c55e' },
    { title: 'Club Member', desc: 'Paid Rent & invited 5 people', benefits: 'Exclusive physical club event discounts', icon: Crown, color: '#fbbf24' },
    { title: 'Senior Club Member', desc: 'Saving monthly for rent', benefits: 'Earn money as a rental agent', icon: Shield, color: '#3b82f6' },
    { title: 'Stakeholder', desc: 'Saving to own your house', icon: Home, color: '#a855f7' },
    { title: 'Voter', desc: 'Participate in community decisions', icon: Vote, color: '#ec4899' },
    { title: 'Stakeholder-General', desc: 'Top tier community leadership', icon: Crown, color: '#f43f5e' }
  ]

  if (!tenant) return null

  const level = tenant.membershipLevel || 'Window Shopper'
  const currentIdx = Math.max(0, tiers.findIndex(t => t.title === level))
  const score = (tenant.totalInvites * 200) + 100

  return (
    <div className="dashboard dashboard--nav-offset">
      <header className="dashboard__header dashboard__header--mobile">
        <div className="dashboard__header-left">
           <button className="dashboard__back" onClick={() => router.push('/dashboard')}>
             <ArrowLeft size={20} />
           </button>
           <h2 className="dashboard__title">Community Perks</h2>
        </div>
      </header>

      <header className="dashboard__header--desktop">
        <div className="dashboard__desktop-header-left">
          <h1 className="dashboard__desktop-title">Rewards & Community</h1>
          <p className="dashboard__desktop-subtitle">Level up to unlock exclusive physical and financial benefits</p>
        </div>
      </header>

      <div className="dashboard__main-grid">
        <div className="dashboard__col--left">
          
          <div className="dashboard__card xp-card" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--clay-faint)', color: 'var(--clay)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Gift size={32} />
              </div>
              <div>
                <h3 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px', color: 'var(--text)' }}>{score.toLocaleString()} XP</h3>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
                  Active Rank: <strong style={{ color: tiers[currentIdx]?.color || 'var(--clay)' }}>{level}</strong>
                </p>
              </div>
            </div>
            
            <div style={{ marginTop: 20, height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
               <div style={{ width: `${((currentIdx + 1) / tiers.length) * 100}%`, height: '100%', background: 'var(--clay)', boxShadow: '0 0 10px var(--clay-glow)' }} />
            </div>
          </div>

          <h3 className="dashboard__section-title" style={{ marginBottom: 16 }}>Your Community Journey</h3>
          
          <div className="tiers-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tiers.map((tier, idx) => {
              const isActive = idx === currentIdx
              const isDone = idx < currentIdx
              const Icon = tier.icon

              return (
                <div 
                  key={idx} 
                  className={`tier-card ${isActive ? 'is-active' : ''} ${isDone ? 'is-done' : ''}`}
                  style={{
                    background: isActive ? 'var(--clay-faint)' : 'var(--surface)',
                    border: `1px solid ${isActive ? 'rgba(217,119,87,0.3)' : 'var(--border-solid)'}`,
                    borderRadius: 16,
                    padding: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    opacity: isDone || isActive ? 1 : 0.45,
                    transition: 'all 0.3s'
                  }}
                >
                  <div style={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: 12, 
                    background: `${tier.color}20`, 
                    color: tier.color,
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Icon size={20} />
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                       <h4 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--text)' }}>{tier.title}</h4>
                       {isDone && <Check size={14} color="var(--success)" />}
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{tier.desc}</p>
                    
                    {tier.benefits && (
                      <div style={{ marginTop: 8, padding: '6px 10px', background: 'var(--clay-faint)', border: '1px solid rgba(217,119,87,0.12)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Zap size={12} color="var(--clay)" />
                        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--clay)' }}>Benefit: {tier.benefits}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="dashboard__col--right dashboard__col--desktop-only">
           <div className="dashboard__card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                 <Info size={18} color="var(--clay)" />
                 <h3 style={{ fontSize: 16, margin: 0, color: 'var(--text)' }}>How to Level Up</h3>
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Completing your profile, paying rent consistently with Upward, and inviting friends to join the community are the fastest ways to level up.
              </p>
           </div>
        </div>
      </div>
    </div>
  )
}