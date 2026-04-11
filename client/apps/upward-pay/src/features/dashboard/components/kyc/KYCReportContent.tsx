'use client'

import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ShieldCheck,
  Download,
  Share2,
  Award,
  CheckCircle2,
  MapPin,
  Home,
  TrendingUp,
  Star,
  Lock,
  Clock,
  Zap,
  BadgeCheck,
  Building2,
} from 'lucide-react'
import { UpwardLogo } from '@/components/PoweredByUpward'

import { useScoreProfile } from '../../services/scoreService'
import { formatCurrency } from '@/lib/utils'

export function KYCReportContent() {
  const router = useRouter()
  const { data: scoreProfile, isLoading } = useScoreProfile()

  if (isLoading || !scoreProfile) {
    return <div className="kyc-page dashboard--nav-offset animate-pulse" style={{ minHeight: '100vh', background: 'var(--bg)' }}>Loading...</div>
  }

  const { isScorable, score, rank, metrics, profile, cycles } = scoreProfile.data
  const initials = profile.name.split(' ').map(n => n[0]).join('').substring(0, 2)
  const isFaded = !isScorable

  const liveVerifications = [
    { label: 'Identity (BVN/NIN)', date: 'Verified' },
    { label: 'Work / Income', date: 'Verified' },
    { label: 'Previous Landlord', date: 'Verified' },
    { label: 'Phone Number', date: 'Verified' },
  ]

  const liveMetrics = [
    { label: 'On-time Rate', value: `${Math.round(metrics.ptPercentage)}%`, sub: 'All rent cycles' },
    { label: 'Rent-to-Income', value: 'N/A', sub: 'In progress' },
    { label: 'Lease Longevity', value: `${metrics.historyYears} yrs`, sub: 'Avg tenancy' },
    { label: 'Discipline', value: `${Math.round(metrics.discipline)}%`, sub: 'Full payments' },
  ]

  const liveAchievements = [
    { icon: <Star size={14} />, label: `${metrics.longestStreak}-Cycle Streak`, desc: 'Consecutive on-time payments' },
    { icon: <Zap size={14} />, label: 'Early Payer', desc: 'Consistently pays early' },
    { icon: <BadgeCheck size={14} />, label: `${profile.profileCompletion}% Profile`, desc: 'Profile completion' },
    { icon: <Building2 size={14} />, label: 'Stable Tenant', desc: `${metrics.historyYears}+ years` },
  ]

  return (
    <div className="kyc-page dashboard--nav-offset">
      <header className="dashboard__header">
        <div className="dashboard__header-left">
          <button className="dashboard__icon-btn" onClick={() => router.push('/dashboard')}>
            <ArrowLeft size={20} />
          </button>
          <h2 className="kyc-page__header-title">Credibility Profile</h2>
        </div>
        <div className="dashboard__header-right">
          <button className="btn btn--secondary btn--sm kyc-page__action-btn">
            <Download size={14} /> PDF
          </button>
          <button className="btn btn--primary btn--sm kyc-page__action-btn">
            <Share2 size={14} /> Share
          </button>
        </div>
      </header>

      <div className="kyc-report-container">
        <div className="kyc-report">
          <div className="kyc-report__watermark">
            <UpwardLogo size={240} color="var(--clay)" />
          </div>

          <div className="kyc-report__header">
            <div className="kyc-report__badge">
              <ShieldCheck size={12} /> Official Tenant Credential
            </div>

            <div className="kyc-report__avatar-wrap">
              <span>{initials}</span>
              <div className="kyc-report__avatar-verified">
                <CheckCircle2 size={12} strokeWidth={3} />
              </div>
            </div>

            <h1 className="kyc-report__name">{profile.name}</h1>

            <div className="kyc-report__meta">
              <MapPin size={13} />
              Address Verified
              <span className="kyc-report__meta-dot" />
              Verified Tenant
            </div>
            <span className="kyc-report__since">Member Email: {profile.email}</span>

            <div className={`kyc-report__score-box ${isFaded ? 'opacity-50' : ''}`}>
              <div className="kyc-report__score-left">
                <span className="kyc-report__score-label">{isScorable ? 'Rent Credibility Score' : 'Credit Invisible'}</span>
                <div className="kyc-report__score-value">{score}</div>
                <div className="kyc-report__score-tier">
                  <TrendingUp size={12} />
                  {isScorable ? `Class: ${rank}` : 'Not enough history'}
                </div>
              </div>
              <div className="kyc-report__score-gauge">
                <div className="kyc-report__score-gauge-inner">{Math.round((score/900)*100)}%</div>
              </div>
            </div>
          </div>

          <div className="kyc-report__body">
            <section className="kyc-report__section">
              <p className="kyc-report__section-title">
                <Award size={14} color="var(--clay)" />
                Achievements
              </p>
              <div className="kyc-report__achievements-grid">
                {liveAchievements.map((a, i) => (
                  <div key={i} className="kyc-report__achievement-item">
                    <div className="kyc-report__achievement-icon">{a.icon}</div>
                    <div className="kyc-report__achievement-info">
                      <p className="kyc-report__achievement-label">{a.label}</p>
                      <p className="kyc-report__achievement-desc">{a.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="kyc-report__section">
              <p className="kyc-report__section-title">
                <TrendingUp size={14} color="var(--clay)" />
                Rent Behaviour Metrics
              </p>
              <div className="kyc-report__metrics-grid">
                {liveMetrics.map((m, i) => (
                  <div key={i} className="kyc-report__metric">
                    <span className="kyc-report__metric-label">{m.label}</span>
                    <div className="kyc-report__metric-value">{m.value}</div>
                    <div className="kyc-report__metric-sub">{m.sub}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="kyc-report__section">
              <p className="kyc-report__section-title">
                <Lock size={14} color="var(--clay)" />
                Verified Documents
              </p>
              <div className="kyc-report__verif-grid">
                {liveVerifications.map((v, i) => (
                  <div key={i} className="kyc-report__verif-item">
                    <div className="kyc-report__verif-status">
                      <CheckCircle2 size={13} strokeWidth={2.5} />
                      Verified
                    </div>
                    <div className="kyc-report__verif-label">{v.label}</div>
                    <span className="kyc-report__verif-date">{v.date}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="kyc-report__section">
              <p className="kyc-report__section-title">
                <Clock size={14} color="var(--clay)" />
                Payment History
              </p>
              <div className="kyc-report__timeline">
                {cycles.length === 0 ? (
                  <p className="text-sm text-gray-500">No payment history available.</p>
                ) : (
                  cycles.map((t, i) => (
                    <div key={i} className="kyc-report__timeline-item">
                      <div className="kyc-report__timeline-dot">
                        <Home size={13} />
                      </div>
                      <div className="kyc-report__timeline-content">
                        <div className="kyc-report__timeline-row">
                          <div>
                            <p className="kyc-report__timeline-title">Invoice #{t.uuid.substring(0, 8)}</p>
                            <p className="kyc-report__timeline-sub">
                              {t.status} · Due: {new Date(t.dueDate).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={t.status === 'PAID' ? 'text-[var(--success)] font-bold text-sm' : 'text-sm font-bold opacity-70'}>
                            {formatCurrency(t.amount, 'NGN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <div className="kyc-report__insight-card">
              <div className="kyc-report__insight-header">
                <div className="kyc-report__insight-icon">
                  <Award size={18} />
                </div>
                <div>
                  <p className="kyc-report__insight-title">Tenant Legacy Summary</p>
                  <p className="kyc-report__insight-sub">Auto-generated · Updated monthly</p>
                </div>
              </div>
              <div className="kyc-report__insight-grid">
                {[
                  { label: 'Rent-to-Income', value: 'Hidden', sub: 'Privacy mode' },
                  { label: 'On-time Rate', value: `${Math.round(metrics.ptPercentage)}%`, sub: 'All-time' },
                  { label: 'Cycles', value: `${metrics.totalCycles}`, sub: 'Verified' },
                  { label: 'Streak', value: `${metrics.longestStreak} mo`, sub: 'Peak performance' },
                ].map((stat, i) => (
                  <div key={i} className="kyc-report__insight-item">
                    <span className="kyc-report__insight-item-label">{stat.label}</span>
                    <span className="kyc-report__insight-item-value">
                      {stat.value}{' '}
                      <span className="kyc-report__insight-item-sub">({stat.sub})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="kyc-report__footer">
            <div className="kyc-report__brand">
              <UpwardLogo size={14} color="var(--clay)" />
              <span>Powered by Upward Verified</span>
            </div>
            <p className="kyc-report__ref">
              Report Date: April 2, 2026 · Ref: UPW-882-SJ · Valid for 30 days
            </p>
          </div>
        </div>

        <div className="kyc-report-actions">
          <button className="btn btn--primary btn--full kyc-report-actions__share">
            <Share2 size={18} />
            Share with Landlord / Property Manager
          </button>
          <div className="kyc-report-actions__row">
            <button className="btn btn--secondary kyc-report-actions__btn">
              <Download size={16} /> Download PDF
            </button>
            <button
              className="btn btn--secondary kyc-report-actions__btn"
              onClick={() => router.push('/dashboard')}
            >
              <Home size={16} /> Dashboard
            </button>
          </div>
        </div>

        <p className="kyc-report-legal">
          Sharing grants 7-day read-only access to your verified credentials.{' '}
          <span className="kyc-report-legal__manage">Manage access →</span>
        </p>
      </div>
    </div>
  )
}
