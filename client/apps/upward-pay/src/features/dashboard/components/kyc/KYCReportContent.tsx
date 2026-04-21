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
  Calendar,
  Shield,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { useAuth } from '@/features/auth/AuthContext'
import { Capacitor } from '@capacitor/core'

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
  const [isApp, setIsApp] = useState(false)

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      setIsApp(true)
    }
  }, [])
  
  const privateProfile = useScoreProfile()
  const publicProfile = usePublicScoreProfile(publicSlug || '')
  
  const { data: scoreProfile, isLoading } = isPublic ? publicProfile : privateProfile
  
  const handleShare = () => {
    const p = scoreProfile?.data?.profile
    const u = scoreProfile?.data?.profile?.uuid || (scoreProfile as any)?.data?.uuid || ''
    
    const identifier = p?.profileSlug || u || 'not-found'
    
    const baseUrl = Capacitor.isNativePlatform() 
      ? 'https://upward-pay.vercel.app' 
      : (typeof window !== 'undefined' ? window.location.origin : 'https://upward-pay.vercel.app')

    const url = `${baseUrl}/profile/${identifier}`
    
    navigator.clipboard.writeText(url)
    success('Public profile link copied to clipboard!')
  }

  const handleDownloadPDF = async () => {
    try {
      success('Preparing report...')
      window.open('/api/user/credibility/pdf', '_blank')
    } catch (err) {
      toastError('Failed to download PDF')
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
    <div className={`kyc-page ${!isPublic ? 'kyc-page--dashboard' : 'public-cv'}`}>
      {!isPublic && (
        <>
          {/* Mobile Fixed Header */}
          <header className="mobile-header mobile-only">
            <button className="mobile-header__back" onClick={() => router.push('/dashboard')}>
              <ArrowLeft size={22} />
            </button>
            <h2 className="mobile-header__title">Credibility Profile</h2>
            <div className="mobile-header__actions">
              <button className="mobile-header__icon-btn" onClick={handleShare} title="Copy Link">
                <Share2 size={20} />
              </button>
            </div>
          </header>

          {/* Desktop Header removed for cleaner UI */}
        </>
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
            
            <div className="kyc-report__meta">
              {properties.some((p: any) => p.isManaged) ? (
                <>
                  <ShieldCheck size={13} color="var(--success)" />
                  Verified Tenant
                </>
              ) : (
                <>
                  <BadgeCheck size={13} color="var(--text-muted)" />
                  Unverified Tenant
                </>
              )}
              <span className="kyc-report__meta-dot" />
              Credibility Rating
            </div>
            
            {profile.bio && (
                <p className="kyc-report__bio">{profile.bio}</p>
            )}

            <div className={`kyc-report__score-box ${isFaded ? 'opacity-50' : ''}`}>
              <div className="kyc-report__score-left">
                <span className="kyc-report__score-label">{isScorable ? 'Rent Credibility Score' : 'Score Building'}</span>
                <div className="kyc-report__score-value-wrap">
                   <div className="kyc-report__score-value">{score}</div>
                   <div className="kyc-report__score-max">/ 800</div>
                </div>
                <div className="kyc-report__score-tier">
                  <Star size={12} fill="var(--clay)" color="var(--clay)" />
                  {isScorable ? `Tier: ${rank} (${band})` : 'New profile building history'}
                </div>
              </div>
              <div className="kyc-report__score-gauge">
                <svg viewBox="0 0 100 100" className="kyc-report__gauge-svg">
                  <circle className="kyc-report__gauge-bg" cx="50" cy="50" r="45" />
                  <circle 
                    className="kyc-report__gauge-fill" 
                    cx="50" cy="50" r="45" 
                    style={{ strokeDasharray: `${(score/800)*283} 283` }}
                  />
                </svg>
                <div className="kyc-report__score-gauge-inner">{Math.round((score/800)*100)}%</div>
              </div>
            </div>
          </div>

          <div className="kyc-report__body">
            {/* Real Properties Listing */}
            <section className="kyc-report__section">
              <p className="kyc-report__section-title">
                <Home size={14} color="var(--clay)" />
                Tenancy History
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
                          <span>
                            {p.rentStartDate ? new Date(p.rentStartDate).getFullYear() : 'N/A'}
                            {p.isPastTenancy || (p.rentEndDate && new Date(p.rentEndDate) < new Date()) 
                              ? ` — ${p.rentEndDate ? new Date(p.rentEndDate).getFullYear() : 'Present'}` 
                              : ' — Present'}
                          </span>
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
                    <div className="kyc-report__metric-icon-wrap">
                       {i === 0 && <Clock size={16} />}
                       {i === 1 && <Zap size={16} />}
                       {i === 2 && <Calendar size={16} />}
                       {i === 3 && <Shield size={16} />}
                    </div>
                    <div className="kyc-report__metric-content">
                       <span className="kyc-report__metric-label">{m.label}</span>
                       <div className="kyc-report__metric-value">{m.value}</div>
                       <div className="kyc-report__metric-sub">{m.sub}</div>
                    </div>
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
                {cycles.filter((c: any) => !c.excluded).length === 0 ? (
                  <p className="text-sm opacity-50 italic">No recent payment history observed on this profile.</p>
                ) : (
                  cycles.filter((c: any) => !c.excluded).slice(0, 5).map((t: any, i: number) => (
                    <div key={i} className="kyc-report__timeline-item">
                      <div className="kyc-report__timeline-dot">
                        <Home size={13} />
                      </div>
                      <div className="kyc-report__timeline-content">
                        <div className="kyc-report__timeline-row">
                          <div>
                            <p className="kyc-report__timeline-title">Performance: {t.status}</p>
                            <p className="kyc-report__timeline-sub">
                              Cycle Ended: {new Date(t.dueDate).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`${t.ptValue >= 1 ? 'status-tag--perfect' : t.ptValue >= 0.7 ? 'status-tag--grace' : 'status-tag--late'} kyc-report__status-tag`}>
                             {t.ptValue >= 1 ? 'On-Time' : t.ptValue >= 0.7 ? 'Grace' : 'Late'}
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

        {!isPublic && !isApp && (
            <div className="kyc-report-actions">
              <button className="btn btn--primary btn--full kyc-report-actions__share" onClick={handleShare}>
                <Share2 size={18} />
                Copy Credibility Portfolio Link
              </button>
              <div className="kyc-report-actions__row">
                <button className="btn btn--secondary kyc-report-actions__btn" onClick={handleDownloadPDF}>
                  <Download size={16} /> Download PDF
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
        .kyc-page--dashboard {
            padding-top: 0;
            padding-bottom: 2rem;
        }
        @media (min-width: 641px) {
            .kyc-page--dashboard {
                padding-top: 80px;
            }
        }
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
        .kyc-report {
           position: relative;
           overflow: hidden;
           background: var(--surface);
           border-radius: 40px;
           border: 1px solid var(--border-solid);
           box-shadow: 0 30px 60px -12px rgba(0,0,0,0.5);
           transition: transform 0.3s ease;
        }
        .kyc-report__watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 0.03;
            pointer-events: none;
            animation: rotateFull 20s linear infinite;
        }
        @keyframes rotateFull {
            from { transform: translate(-50%, -50%) rotate(0deg); }
            to { transform: translate(-50%, -50%) rotate(360deg); }
        }

        .kyc-report__score-box {
            background: linear-gradient(135deg, var(--surface2) 0%, var(--surface) 100%);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.05);
            border-radius: 24px;
            padding: 2rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin: 2rem 0;
            box-shadow: inset 0 0 20px rgba(0,0,0,0.2);
        }
        .kyc-report__score-value-wrap {
            display: flex;
            align-items: baseline;
            gap: 4px;
            margin: 0.5rem 0;
        }
        .kyc-report__score-value {
            font-size: 4rem;
            font-weight: 900;
            line-height: 1;
            color: var(--dark);
        }
        .kyc-report__score-max {
            font-size: 1.2rem;
            font-weight: 700;
            color: var(--text-muted);
            opacity: 0.6;
        }
        .kyc-report__score-gauge {
            position: relative;
            width: 120px;
            height: 120px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .kyc-report__gauge-svg {
            position: absolute;
            top: 0;
            left: 0;
            transform: rotate(-90deg);
        }
        .kyc-report__gauge-bg {
            fill: none;
            stroke: var(--border-solid);
            stroke-width: 6;
        }
        .kyc-report__gauge-fill {
            fill: none;
            stroke: var(--clay);
            stroke-width: 6;
            stroke-linecap: round;
            transition: stroke-dasharray 1s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .kyc-report__score-gauge-inner {
            font-size: 1.25rem;
            font-weight: 800;
            color: var(--clay);
        }

        .kyc-report__metrics-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1.2rem;
        }
        .kyc-report__metric {
            background: var(--surface2);
            padding: 1.25rem;
            border-radius: 20px;
            display: flex;
            gap: 1rem;
            border: 1px solid var(--border-solid);
            transition: all 0.2s ease;
        }
        .kyc-report__metric:hover {
            transform: translateY(-4px);
            border-color: var(--clay);
            background: var(--surface);
        }
        .kyc-report__metric-icon-wrap {
            width: 40px;
            height: 40px;
            background: var(--clay-faint);
            color: var(--clay);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .kyc-report__metric-label {
            font-size: 0.7rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            opacity: 0.5;
        }
        .kyc-report__metric-value {
            font-size: 1.5rem;
            font-weight: 800;
            margin-top: 2px;
        }
        .kyc-report__metric-sub {
            font-size: 0.65rem;
            opacity: 0.6;
        }

        .kyc-report__status-tag {
            background: rgba(255,255,255,0.03);
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.7rem;
            text-transform: uppercase;
        }

        .kyc-report__avatar-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 50%;
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
            transition: background 0.2s ease;
        }
        .kyc-report__property-item:hover {
            background: var(--surface);
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
        
        @media (max-width: 640px) {
            .kyc-report__metrics-grid {
                grid-template-columns: 1fr;
            }
            .kyc-report__score-box {
                flex-direction: column;
                gap: 2rem;
                text-align: center;
            }
            .kyc-report__score-value-wrap {
                justify-content: center;
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
        .mobile-header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 64px;
            background: var(--bg);
            display: flex;
            align-items: center;
            padding: 0 16px;
            z-index: 1000;
            border-bottom: 1px solid var(--border-solid);
        }
        .mobile-header__back {
            background: none;
            border: none;
            color: var(--text);
            padding: 8px;
            margin-left: -8px;
            display: flex;
            align-items: center;
        }
        .mobile-header__title {
            flex: 1;
            font-size: 1.1rem;
            font-weight: 700;
            margin-left: 12px;
            color: var(--text);
        }
        .mobile-header__actions {
            display: flex;
            gap: 12px;
        }
        .mobile-header__icon-btn {
            background: none;
            border: none;
            color: var(--text);
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
        }
        .mobile-header__icon-btn:active {
            background: var(--surface2);
        }

        .kyc-report-actions {
            max-width: 600px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        .kyc-report-actions__row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
        }
        .kyc-report-actions__btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-size: 0.9rem;
            padding: 12px;
            border-radius: 12px;
        }
        .kyc-report-actions__share {
            padding: 16px;
            border-radius: 16px;
            font-size: 1rem;
            font-weight: 700;
        }
        @media (max-width: 640px) {
            .kyc-report-container {
                padding: 64px 12px 100px !important;
            }
            .kyc-report-actions {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: var(--bg);
                padding: 16px 12px 24px;
                border-top: 1px solid var(--border-solid);
                z-index: 100;
                max-width: 100%;
            }
            .kyc-report-actions__share {
                order: 1;
            }
            .kyc-report-actions__row {
                order: 2;
                grid-template-columns: 1fr 1fr;
            }
        }
      `}</style>
    </div>
  )
}
