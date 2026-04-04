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

const verifications = [
  { label: 'Identity (BVN/NIN)', date: 'Sep 2024' },
  { label: 'Work / Income', date: 'Jan 2025' },
  { label: 'Previous Landlord', date: 'Nov 2024' },
  { label: 'Phone Number', date: 'Sep 2024' },
]

const metrics = [
  { label: 'On-time Rate', value: '100%', sub: 'Last 12 months' },
  { label: 'Rent-to-Income', value: '24.2%', sub: 'Healthy range' },
  { label: 'Lease Longevity', value: '4.2 yrs', sub: 'Avg tenancy' },
  { label: 'Discipline Score', value: '912', sub: '+24 pts this month' },
]

const timeline = [
  {
    month: 'Jan 2025',
    landlord: 'Greenfield Properties Ltd',
    amount: '₦285,000',
    type: 'Annual Rent',
  },
  {
    month: 'Jul 2024',
    landlord: 'Mr. Babatunde Adeyemi',
    amount: '₦180,000',
    type: 'Agency + Caution',
  },
  {
    month: 'Jan 2024',
    landlord: 'Greenfield Properties Ltd',
    amount: '₦250,000',
    type: 'Annual Rent',
  },
  {
    month: 'Jul 2023',
    landlord: 'Greenfield Properties Ltd',
    amount: '₦220,000',
    type: 'Annual Rent',
  },
]

const achievements = [
  { icon: <Star size={14} />, label: '12-Month Streak', desc: 'No missed payments' },
  { icon: <Zap size={14} />, label: 'Early Payer', desc: 'Avg 3 days early' },
  { icon: <BadgeCheck size={14} />, label: 'Fully Verified', desc: 'All documents confirmed' },
  { icon: <Building2 size={14} />, label: 'Stable Tenant', desc: '4+ years at same address' },
]

export function KYCReportContent() {
  const router = useRouter()

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
              <span>S</span>
              <div className="kyc-report__avatar-verified">
                <CheckCircle2 size={12} strokeWidth={3} />
              </div>
            </div>

            <h1 className="kyc-report__name">Sarah Johnson</h1>

            <div className="kyc-report__meta">
              <MapPin size={13} />
              Lagos, Nigeria
              <span className="kyc-report__meta-dot" />
              Verified Tenant
            </div>
            <span className="kyc-report__since">Member since September 2023</span>

            <div className="kyc-report__score-box">
              <div className="kyc-report__score-left">
                <span className="kyc-report__score-label">Rent Credibility Score</span>
                <div className="kyc-report__score-value">882</div>
                <div className="kyc-report__score-tier">
                  <TrendingUp size={12} />
                  Top 1.2% of all tenants
                </div>
              </div>
              <div className="kyc-report__score-gauge">
                <div className="kyc-report__score-gauge-inner">88%</div>
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
                {achievements.map((a, i) => (
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
                {metrics.map((m, i) => (
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
                {verifications.map((v, i) => (
                  <div key={i} className="kyc-report__verif-item">
                    <div className="kyc-report__verif-status">
                      <CheckCircle2 size={13} strokeWidth={2.5} />
                      Verified
                    </div>
                    <div className="kyc-report__verif-label">{v.label}</div>
                    <span className="kyc-report__verif-date">Since {v.date}</span>
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
                {timeline.map((t, i) => (
                  <div key={i} className="kyc-report__timeline-item">
                    <div className="kyc-report__timeline-dot">
                      <Home size={13} />
                    </div>
                    <div className="kyc-report__timeline-content">
                      <div className="kyc-report__timeline-row">
                        <div>
                          <p className="kyc-report__timeline-title">{t.landlord}</p>
                          <p className="kyc-report__timeline-sub">
                            {t.type} · {t.month}
                          </p>
                        </div>
                        <span className="kyc-report__timeline-amount">{t.amount}</span>
                      </div>
                    </div>
                  </div>
                ))}
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
                  { label: 'Rent-to-Income', value: '24.2%', sub: 'Healthy' },
                  { label: 'On-time Rate', value: '100%', sub: 'All-time' },
                  { label: 'Total Paid', value: '₦935,000', sub: 'Verified' },
                  { label: 'Streak', value: '12 months', sub: 'No missed payments' },
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
