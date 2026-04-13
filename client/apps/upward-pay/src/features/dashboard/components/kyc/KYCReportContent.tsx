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
import { useAuth } from '@/features/auth/AuthContext'

import { useToast } from '@/components/common/Toast'
import { useScoreProfile, usePublicScoreProfile } from '../../services/scoreService'
import { formatCurrency } from '@/lib/utils'

interface KYCReportContentProps {
  isPublic?: boolean
  publicSlug?: string
}

export function KYCReportContent({ isPublic = false, publicSlug }: KYCReportContentProps) {
  const router = useRouter()
  const { isLoggedIn } = useAuth()
  const { success, error: toastError } = useToast()
  
  // Conditionally fetch based on whether we are in public or private view
  const privateProfile = useScoreProfile()
  const publicProfile = usePublicScoreProfile(publicSlug || '')
  
  const { data: scoreProfile, isLoading } = isPublic ? publicProfile : privateProfile
  
  const handleShare = () => {
    const p = scoreProfile?.data?.profile
    if (p?.profileSlug) {
      const url = `https://upward-pay.vercel.app/profile/${p.profileSlug}`
      navigator.clipboard.writeText(url)
      success('Portfolio link copied to clipboard!')
    } else {
      toastError('Profile slug not found. Ensure your profile is complete.')
    }
  }

  if (isLoading || !scoreProfile) {
    return (
      <div className="kyc-page dashboard--nav-offset animate-pulse" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <div className="flex items-center justify-center h-full">Loading Credibility Profile...</div>
      </div>
    )
  }

  const { isScorable, score, rank, band, metrics, profile, cycles, properties = [] } = scoreProfile.data
  const initials = profile.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)
  const isFaded = !isScorable

  const liveVerifications = [
    { label: 'Identity Verified', date: 'Official' },
    { label: 'Work / Income', date: profile.occupation || 'Status Checked' },
    { label: 'Account Created', date: 'Member' },
    { label: 'Phone Number', date: 'Verified' },
  ]

  const liveMetrics = [
    { label: 'On-time Rate', value: `${Math.round(metrics.ptPercentage)}%`, sub: 'Payment reliability' },
    { label: 'Streak', value: `${metrics.longestStreak} mo`, sub: 'Current streak' },
    { label: 'History', value: `${metrics.historyYears} yrs`, sub: 'Tenancy with us' },
    { label: 'Discipline', value: `${Math.round(metrics.discipline)}%`, sub: 'Full payments' },
  ]

  return (
    <div className={`kyc-page ${!isPublic ? 'dashboard--nav-offset' : 'public-cv'}`}>
      {!isPublic && (
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
            <button className="btn btn--primary btn--sm kyc-page__action-btn" onClick={handleShare}>
              <Share2 size={14} /> Share
            </button>
          </div>
        </header>
      )}

      {isPublic && (
        <div className="public-header">
           <UpwardLogo size={100} color="var(--clay)" />
           {isLoggedIn ? (
              <button className="btn btn--secondary btn--sm px-6" onClick={() => router.push('/dashboard')}>
                Back to Dashboard
              </button>
           ) : (
              <button className="btn btn--primary btn--sm px-6" onClick={() => router.push('/signup')}>
                Join Upward
              </button>
           )}
        </div>
      )}

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
              {profile.profilePic ? (
                 <img src={profile.profilePic} alt={profile.name} className="kyc-report__avatar-img" />
              ) : (
                <span>{initials}</span>
              )}
              <div className="kyc-report__avatar-verified">
                <CheckCircle2 size={12} strokeWidth={3} />
              </div>
            </div>

            <h1 className="kyc-report__name">{profile.name}</h1>
            
            {profile.occupation && (
                <div className="kyc-report__occupation">
                    <Award size={13} /> {profile.occupation}
                </div>
            )}

            <div className="kyc-report__meta">
              <MapPin size={13} />
              Verified Tenant
              <span className="kyc-report__meta-dot" />
              Credibility Rating
            </div>
            
            {profile.bio && (
                <p className="kyc-report__bio">{profile.bio}</p>
            )}

            <div className={`kyc-report__score-box ${isFaded ? 'opacity-50' : ''}`}>
              <div className="kyc-report__score-left">
                <span className="kyc-report__score-label">{isScorable ? 'Rent Credibility Score' : 'Score Building'}</span>
                <div className="kyc-report__score-value">{score}</div>
                <div className="kyc-report__score-tier">
                  <TrendingUp size={12} />
                  {isScorable ? `Tier: ${rank} (${band})` : 'New profile building history'}
                </div>
              </div>
              <div className="kyc-report__score-gauge">
                <div className="kyc-report__score-gauge-inner">{Math.round((score/900)*100)}%</div>
              </div>
            </div>
          </div>

          <div className="kyc-report__body">
            {/* Real Properties Listing */}
            <section className="kyc-report__section">
              <p className="kyc-report__section-title">
                <Home size={14} color="var(--clay)" />
                Verified Properties
              </p>
              <div className="kyc-report__properties-list">
                {properties.length === 0 ? (
                  <div className="kyc-report__property-empty">No verified properties linked yet.</div>
                ) : (
                  properties.map((p: any, i: number) => (
                    <div key={i} className="kyc-report__property-item">
                       <div className="kyc-report__property-head">
                          <span className="kyc-report__property-addr">{p.location?.address}, {p.location?.area}</span>
                          {p.isManaged && (
                             <span className="kyc-report__property-badge">Verified</span>
                          )}
                       </div>
                       <div className="kyc-report__property-meta">
                          <span>{p.location?.state}, {p.location?.country}</span>
                          <span className="kyc-report__meta-dot" />
                          <span>Since {p.rentStartDate ? new Date(p.rentStartDate).getFullYear() : 'N/A'}</span>
                       </div>
                    </div>
                  ))
                )}
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
                <BadgeCheck size={14} color="var(--clay)" />
                Security & Verification
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
                Recent Observations
              </p>
              <div className="kyc-report__timeline">
                {cycles.length === 0 ? (
                  <p className="text-sm opacity-50 italic">No recent payment history observed on this profile.</p>
                ) : (
                  cycles.slice(0, 5).map((t: any, i: number) => (
                    <div key={i} className="kyc-report__timeline-item">
                      <div className="kyc-report__timeline-dot">
                        <Home size={13} />
                      </div>
                      <div className="kyc-report__timeline-content">
                        <div className="kyc-report__timeline-row">
                          <div>
                            <p className="kyc-report__timeline-title">Performance: {t.status}</p>
                            <p className="kyc-report__timeline-sub">
                              Period Ended: {new Date(t.dueDate).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`${t.ptValue >= 1 ? 'text-[var(--success)]' : 'text-gray-500'} font-bold text-sm`}>
                            {t.ptValue >= 1 ? 'On Time' : 'Late / Missed'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="kyc-report__footer">
            <div className="kyc-report__brand">
              <UpwardLogo size={14} color="var(--clay)" />
              <span>Verified Portolio by Upward</span>
            </div>
            <p className="kyc-report__ref">
              Updated: {new Date().toLocaleDateString()} · Ref: UPW-{profile.profileSlug || 'CORE'}
            </p>
          </div>
        </div>

        {!isPublic && (
            <div className="kyc-report-actions">
              <button className="btn btn--primary btn--full kyc-report-actions__share" onClick={handleShare}>
                <Share2 size={18} />
                Share Verified Portfolio Link
              </button>
              <div className="kyc-report-actions__row">
                <button className="btn btn--secondary kyc-report-actions__btn">
                  <Download size={16} /> Download
                </button>
                <button
                  className="btn btn--secondary kyc-report-actions__btn"
                  onClick={() => router.push('/dashboard')}
                >
                  <Home size={16} /> Finish
                </button>
              </div>
            </div>
        )}

        {isPublic && (
            <div className="kyc-report-legal text-center mt-12 mb-8">
              {!isLoggedIn ? (
                <div className="public-benefits animate-slide-up">
                  <h3 className="public-benefits__title">Why join Upward?</h3>
                  <div className="public-benefits__grid">
                    <div className="public-benefits__item">
                      <div className="public-benefits__icon"><TrendingUp size={16} /></div>
                      <p>Build your rent<br/>credibility score</p>
                    </div>
                    <div className="public-benefits__item">
                      <div className="public-benefits__icon"><BadgeCheck size={16} /></div>
                      <p>Verified tenant<br/>portfolio</p>
                    </div>
                    <div className="public-benefits__item">
                      <div className="public-benefits__icon"><Zap size={16} /></div>
                      <p>Unlock better<br/>leasing deals</p>
                    </div>
                  </div>
                  <button 
                    className="btn btn--primary btn--pill px-10 py-4 font-bold text-lg shadow-clay" 
                    onClick={() => router.push('/signup')}
                  >
                     Create Your Own Portfolio
                  </button>
                </div>
              ) : (
                <div className="logged-in-footer">
                  <p className="text-sm opacity-60 mb-4">Viewing verified profile: <strong>{profile.name}</strong></p>
                  <button 
                    className="btn btn--outline btn--pill px-8" 
                    onClick={() => router.push('/dashboard')}
                  >
                     Return to My Dashboard
                  </button>
                </div>
              )}
            </div>
        )}
      </div>

      <style jsx>{`
        .public-cv {
            background: var(--bg);
            min-height: 100vh;
            padding: 2rem 1rem;
        }
        .public-header {
            max-width: 800px;
            margin: 0 auto 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 1rem;
        }
        .kyc-report__avatar-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 50%;
        }
        .kyc-report__occupation {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--clay);
            margin: 0.5rem 0;
            text-transform: uppercase;
        }
        .kyc-report__bio {
            max-width: 460px;
            margin: 1rem auto;
            font-size: 0.85rem;
            line-height: 1.6;
            color: var(--text-muted);
            text-align: center;
        }
        .kyc-report__properties-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        .kyc-report__property-item {
            background: var(--surface2);
            padding: 1rem;
            border-radius: 12px;
            border: 1px solid var(--border-solid);
        }
        .kyc-report__property-head {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
        }
        .kyc-report__property-addr {
            font-weight: 700;
            font-size: 0.95rem;
        }
        .kyc-report__property-badge {
            background: var(--success);
            color: white;
            padding: 2px 8px;
            border-radius: 6px;
            font-size: 0.65rem;
            font-weight: 800;
            text-transform: uppercase;
        }
        .kyc-report__property-meta {
            font-size: 0.75rem;
            color: var(--text-muted);
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .kyc-report__property-empty {
            text-align: center;
            padding: 2rem;
            border: 1px dashed var(--border-solid);
            border-radius: 12px;
            font-size: 0.8rem;
            color: var(--text-muted);
        }
        
        @media (max-width: 640px) {
            .kyc-report-container {
                padding: 0;
            }
            .kyc-report {
                border-radius: 0;
                border-left: none;
                border-right: none;
            }
            .public-header {
                flex-direction: column;
                gap: 1.5rem;
                text-align: center;
            }
        }

        .public-benefits {
            background: var(--surface);
            border: 1px solid var(--border-solid);
            padding: 2.5rem 2rem;
            border-radius: 32px;
            max-width: 600px;
            margin: 0 auto;
        }
        .public-benefits__title {
            font-size: 1.25rem;
            font-weight: 800;
            margin-bottom: 2rem;
            color: var(--text);
        }
        .public-benefits__grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1.5rem;
            margin-bottom: 2.5rem;
        }
        .public-benefits__item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
        }
        .public-benefits__item p {
            font-size: 0.75rem;
            font-weight: 700;
            line-height: 1.3;
            color: var(--text-secondary);
        }
        .public-benefits__icon {
            width: 42px;
            height: 42px;
            background: var(--clay-faint);
            color: var(--clay);
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .animate-slide-up {
            animation: slideUp 0.5s ease-out;
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
