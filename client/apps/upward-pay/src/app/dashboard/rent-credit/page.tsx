'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, type RentCreditData } from '@/lib/api'
import { isLoggedIn } from '@/lib/auth'
import { formatCurrency } from '@/lib/utils'
import PoweredByUpward, { UpwardLogo } from '@/components/payment/PoweredByUpward'
import { ArrowLeft, Share2, Calendar, CheckCircle, TrendingUp, ShieldCheck } from 'lucide-react'

const mockMonthlyData = [
  { month: 'Oct', amount: 50 },
  { month: 'Nov', amount: 60 },
  { month: 'Dec', amount: 60 },
  { month: 'Jan', amount: 80 },
  { month: 'Feb', amount: 100 },
  { month: 'Mar', amount: 100 },
]

export default function AnalyticsPage() {
  const router = useRouter()
  const [credit, setCredit] = useState<RentCreditData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login?redirect=/dashboard/rent-credit')
      return
    }
    loadCredit()
  }, [router])

  async function loadCredit() {
    try {
      const data = await api.getMyDocuments()
      setCredit(data.rentCredit)
    } catch {
      /* silently fail */
    } finally {
      setLoading(false)
    }
  }

  function getScoreColor(score: number): string {
    if (score >= 750) return '#22c55e'
    if (score >= 600) return '#f59e0b'
    if (score >= 450) return '#f97316'
    return '#ef4444'
  }

  if (loading) {
    return (
      <div className="subpage">
        <div className="pay-page__splash">
          <div className="pay-page__logo-pulse">
            <UpwardLogo size={28} color="#fff" />
          </div>
        </div>
      </div>
    )
  }

  if (!credit) return null

  const scorePercent = (credit.score / credit.maxScore) * 100
  const circumference = 2 * Math.PI * 90
  const offset = circumference - (scorePercent / 100) * circumference

  return (
    <div className="dashboard dashboard--nav-offset" style={{ position: 'relative' }}>
      <header className="dashboard__header">
        <div className="dashboard__header-left">
           <button className="dashboard__back" onClick={() => router.push('/dashboard')}>
             <ArrowLeft size={20} />
           </button>
           <h2 className="dashboard__title">Analytics & Profile</h2>
        </div>
      </header>

      <div style={{ padding: '20px' }}>
        {/* Score Ring */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '24px', textAlign: 'center', marginBottom: '24px' }}>
          <div className="credit-score__ring" style={{ width: '160px', height: '160px', margin: '0 auto 16px' }}>
            <svg viewBox="0 0 200 200" className="credit-score__svg">
              <circle cx="100" cy="100" r="90" fill="none" stroke="var(--border-solid)" strokeWidth="8" />
              <circle
                cx="100" cy="100" r="90" fill="none"
                stroke={getScoreColor(credit.score)}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={offset}
                transform="rotate(-90 100 100)"
                style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
              />
            </svg>
            <div className="credit-score__inner">
              <span className="credit-score__number" style={{ fontSize: '32px' }}>{credit.score}</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <ShieldCheck size={20} color={getScoreColor(credit.score)} />
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: getScoreColor(credit.score) }}>
              {credit.grade} Tenant
            </h3>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Your renting credibility is stronger than 85% of users.
          </p>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <Calendar size={20} color="var(--clay)" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{credit.monthsTracked} mo</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tracked History</div>
          </div>
          <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <TrendingUp size={20} color="var(--success)" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{credit.streak}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>On-time Streak</div>
          </div>
          <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: 'var(--radius-md)', gridColumn: 'span 2' }}>
            <CheckCircle size={20} color="var(--clay)" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{credit.onTimeRate}%</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Historical On-time Accuracy</div>
          </div>
        </div>

        {/* CSS Chart */}
        <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-md)', marginBottom: '32px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '24px' }}>Recent Payments</h4>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '140px', paddingBottom: '10px', borderBottom: '1px solid var(--border-solid)' }}>
            {mockMonthlyData.map((d, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '12%' }}>
                <div 
                  style={{ 
                    width: '100%', 
                    height: `${d.amount}%`, 
                    background: 'linear-gradient(180deg, var(--clay) 0%, rgba(217, 119, 87, 0.4) 100%)', 
                    borderRadius: '4px 4px 0 0',
                    minHeight: '4px',
                    transition: 'height 1s ease'
                  }} 
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
            {mockMonthlyData.map((d, i) => (
              <span key={i} style={{ fontSize: '11px', color: 'var(--text-muted)', width: '12%', textAlign: 'center' }}>{d.month}</span>
            ))}
          </div>
        </div>

        <div className="credit-total" style={{ padding: '20px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
          <span className="credit-total__label" style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Verified Rent Paid</span>
          <span className="credit-total__amount" style={{ fontSize: '24px', fontWeight: 700 }}>{formatCurrency(credit.totalAmountPaid, 'NGN')}</span>
        </div>
      </div>

      <div style={{ position: 'fixed', bottom: '90px', right: '20px', left: '20px', zIndex: 40 }}>
        <button 
          className="btn btn--primary btn--full" 
          style={{ padding: '16px', display: 'flex', gap: '8px', fontSize: '16px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}
          onClick={() => router.push(`/share/profile?user=${encodeURIComponent('tenant-123')}`)}
        >
          <Share2 size={20} /> Share Tenant Profile
        </button>
      </div>

    </div>
  )
}
