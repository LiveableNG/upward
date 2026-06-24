'use client'

import { useRouter } from 'next/navigation'
import {
  ShieldCheck,
  Share2,
  CheckCircle2,
  Home,
  TrendingUp,
  Star,
  Clock,
  Zap,
  BadgeCheck,
  Calendar,
  Shield,
  Mail,
  MessageCircle,
  MessageSquare,
  Copy,
  X,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { useAuth } from '@/features/auth/AuthContext'
import { Capacitor } from '@capacitor/core'
import FallbackSuspense from '@/components/FallbackSuspense'
import { PayFlowPrimaryButton, PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import { useToast } from '@/components/common/Toast'
import { useScoreProfile, usePublicScoreProfile } from '../../services/scoreService'

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
  
  const [showShareMenu, setShowShareMenu] = useState(false)

  const handleShare = () => {
    setShowShareMenu(true)
  }

  const handleShareSocial = async (platform: 'whatsapp' | 'email' | 'sms' | 'copy') => {
    const p = scoreProfile?.data?.profile
    const identifier = p?.uuid
    const defaultWebUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'
    const baseUrl = Capacitor.isNativePlatform() 
      ? defaultWebUrl 
      : (typeof window !== 'undefined' ? window.location.origin : defaultWebUrl)

    const url = `${baseUrl}/profile/${identifier}`
    const shareText = `Check out my Rent Credibility Portfolio on Upward: ${url}`

    setShowShareMenu(false)

    if (platform === 'copy') {
      navigator.clipboard.writeText(url)
      success('Link copied to clipboard!')
      return
    }

    let shareUrl = ''
    if (platform === 'whatsapp') {
      if (Capacitor.isNativePlatform()) {
        shareUrl = `whatsapp://send?text=${encodeURIComponent(shareText)}`
      } else {
        shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`
      }
    } else if (platform === 'email') {
      shareUrl = `mailto:?subject=${encodeURIComponent('Rent Credibility Portfolio')}&body=${encodeURIComponent(shareText)}`
    } else if (platform === 'sms') {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
      if (isIOS) {
        shareUrl = `sms:&body=${encodeURIComponent(shareText)}`
      } else {
        shareUrl = `sms:?body=${encodeURIComponent(shareText)}`
      }
    }

    if (shareUrl) {
      if (Capacitor.isNativePlatform()) {
        try {
          const { Share } = await import('@capacitor/share')
          await Share.share({
            title: 'Rent Credibility Portfolio',
            text: shareText,
            url: url
          })
        } catch (e) {
          window.open(shareUrl, '_system')
        }
      } else {
        window.open(shareUrl, '_blank')
      }
    }
  }



  if (isLoading || !scoreProfile) {
    if (isPublic) return <FallbackSuspense />
    return (
      <PayPageShell
        title="Credibility Profile"
        showBack
        onBack={() => router.push('/dashboard')}
      >
        <FallbackSuspense />
      </PayPageShell>
    )
  }

  const { isScorable, score, rank, band, metrics, profile, cycles, properties = [] } = scoreProfile.data
  const isFaded = !isScorable
  const paidPaymentsCount = cycles.filter((c: any) => c.status && (c.status.includes('PAID') || c.status.includes('PARTIAL'))).length
  const hasVerifiedPmProperty = properties.some((p: any) => p.isVerified && (p.isPmVerified || p.isPlatformLinked || p.pm?.isVerified || !!p.company?.platformId))
  const verificationOn = profile?.verificationOn ?? true
  const isVerified = (verificationOn === false || !!profile.isIdentityVerified) && paidPaymentsCount > 0 && hasVerifiedPmProperty
  const initials = profile.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)

  const getRankColor = () => {
    if (!isScorable || !isVerified) return '#928e89'
    if (rank === 'A') return '#d97757'
    if (rank === 'B') return '#22c55e'
    if (rank === 'C') return '#3b82f6'
    if (rank === 'D') return '#f59e0b'
    return '#ef4444'
  }

  const liveMetrics = [
    { label: 'On-time Rate', value: `${Math.round(metrics.ptPercentage)}%`, sub: 'Payment reliability' },
    { label: 'Top Streak', value: `${metrics.longestStreak} mo`, sub: 'Consecutive on-time' },
    { label: 'History', value: `${metrics.historyYears} yrs`, sub: 'Tenancy with us' },
    { label: 'Discipline', value: `${Math.round(metrics.discipline)}%`, sub: 'Full payments' },
  ]

  const shareHeaderButton = (
    <button
      type="button"
      className="pay-flow__icon-btn"
      onClick={handleShare}
      title={isVerified ? 'Share portfolio' : 'Verification required to share profile'}
      disabled={!isVerified}
      aria-label="Share portfolio"
      style={{ opacity: isVerified ? 1 : 0.45 }}
    >
      <Share2 size={18} />
    </button>
  )

  const shareModal = showShareMenu ? (
    <div className="share-overlay" onClick={() => setShowShareMenu(false)}>
      <div className="share-menu" onClick={(e) => e.stopPropagation()}>
        <div className="share-menu__header">
          <h4>Share Portfolio</h4>
          <button type="button" className="share-menu__close" onClick={() => setShowShareMenu(false)}>
            <X size={16} />
          </button>
        </div>
        <div className="share-menu__options">
          <button type="button" className="share-menu__option" onClick={() => handleShareSocial('whatsapp')}>
            <div className="share-menu__icon whatsapp-color">
              <MessageCircle size={20} />
            </div>
            <span className="share-menu__text">WhatsApp</span>
          </button>
          <button type="button" className="share-menu__option" onClick={() => handleShareSocial('email')}>
            <div className="share-menu__icon email-color">
              <Mail size={20} />
            </div>
            <span className="share-menu__text">Email</span>
          </button>
          <button type="button" className="share-menu__option" onClick={() => handleShareSocial('sms')}>
            <div className="share-menu__icon sms-color">
              <MessageSquare size={20} />
            </div>
            <span className="share-menu__text">SMS</span>
          </button>
          <button type="button" className="share-menu__option" onClick={() => handleShareSocial('copy')}>
            <div className="share-menu__icon copy-color">
              <Copy size={20} />
            </div>
            <span className="share-menu__text">Copy Link</span>
          </button>
        </div>
      </div>
    </div>
  ) : null

  const reportCard = (
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
              {isVerified ? (
                <>
                  <ShieldCheck size={13} color="var(--success)" />
                  Verified Score
                </>
              ) : (
                <>
                  <BadgeCheck size={13} color="var(--text-muted)" />
                  Unverified Tenant
                </>
              )}
              <span className="kyc-report__meta-dot" />
              Credibility Rating
              <span className="kyc-report__meta-dot" />
              {paidPaymentsCount} Payments Made
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
                  <Star size={12} fill={getRankColor()} color={getRankColor()} />
                  {isScorable ? `Tier: ${rank} (${band})` : 'New profile building history'}
                </div>
              </div>
              <div className="kyc-report__score-gauge">
                <svg viewBox="0 0 100 100" className="kyc-report__gauge-svg">
                  <circle className="kyc-report__gauge-bg" cx="50" cy="50" r="45" />
                  <circle 
                    className="kyc-report__gauge-fill" 
                    cx="50" cy="50" r="45" 
                    style={{ 
                      strokeDasharray: `${(score/800)*283} 283`,
                      stroke: getRankColor()
                    }}
                  />
                </svg>
                <div className="kyc-report__score-gauge-inner" style={{ color: getRankColor() }}>
                  {Math.round((score/800)*100)}%
                </div>
              </div>
            </div>
          </div>

          <div className="kyc-report__body">
            {/* Real Properties Listing */}
            <section className="kyc-report__section">
              <p className="kyc-report__section-title">
                <Home size={14} color={isVerified ? "var(--clay)" : "#928e89"} />
                Tenancy History
              </p>
              <div className="kyc-report__properties-list">
                {properties.length === 0 ? (
                  <div className="kyc-report__property-empty">No verified properties linked yet.</div>
                ) : (
                  properties.map((p: any, i: number) => {
                    const isPmVerified = p.isPmVerified || p.pm?.isVerified;
                    const isPlatformLinked = p.isPlatformLinked || !!p.company?.platformId;
                    
                    return (
                      <div key={i} className="kyc-report__property-item">
                         <div className="kyc-report__property-head">
                            <span className="kyc-report__property-addr">{p.location?.address || 'Property Address'}, {p.location?.area || 'Area'}</span>
                            <div className="kyc-report__property-badges">
                              {p.isVerified ? (
                                 <span className="kyc-report__property-badge kyc-report__property-badge--verified">Verified Connection</span>
                              ) : (
                                 <span className="kyc-report__property-badge kyc-report__property-badge--pending">Pending Connection</span>
                              )}
                              
                              {isPlatformLinked && (
                                 <span className="kyc-report__property-badge kyc-report__property-badge--platform">Platform Synced</span>
                              )}
                              
                              {!isPlatformLinked && p.isVerified && (
                                 isPmVerified ? (
                                    <span className="kyc-report__property-badge kyc-report__property-badge--pm">Verified PM</span>
                                 ) : (
                                    <span className="kyc-report__property-badge kyc-report__property-badge--muted">Unverified PM</span>
                                 )
                              )}
                            </div>
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
                    )
                  })
                )}
              </div>
            </section>

            <section className="kyc-report__section">
              <p className="kyc-report__section-title">
                <TrendingUp size={14} color={isVerified ? "var(--clay)" : "#928e89"} />
                Rent Behaviour Metrics
              </p>
              <div className="kyc-report__metrics-grid">
                {liveMetrics.map((m, i) => (
                    <div key={i} className="kyc-report__metric">
                    <div className={`kyc-report__metric-icon-wrap ${isVerified ? 'kyc-report__metric-icon-wrap--active' : 'kyc-report__metric-icon-wrap--muted'}`}>
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
                <Clock size={14} color={isVerified ? "var(--clay)" : "#928e89"} />
                Recent Observations
              </p>
              <div className="kyc-report__timeline">
                {cycles.filter((c: any) => !c.excluded).length === 0 ? (
                  <p className="kyc-report__timeline-empty">No recent payment history observed on this profile.</p>
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
                              {t.paidDate && ` · Paid: ${new Date(t.paidDate).toLocaleDateString()}`}
                            </p>

                          </div>
                          <span className={`${t.ptValue >= 1 ? 'status-tag--perfect' : t.ptValue >= 0.7 ? 'status-tag--grace' : 'status-tag--late'} kyc-report__status-tag`}>
                             {(() => {
                               const isPerfect = t.ptValue >= 1;
                               const isGrace = t.ptValue >= 0.7 && t.ptValue < 1;
                               const isLate = t.ptValue < 0.7;
                               if (isGrace) return 'Grace';
                               if (t.paidDate && t.dueDate) {
                                 const dueDate = new Date(t.dueDate);
                                 const paidDate = new Date(t.paidDate);
                                 const diffTime = dueDate.getTime() - paidDate.getTime();
                                 const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                                 if (isPerfect && diffDays > 0) return `${diffDays} days before due date`;
                                 if (isLate && diffDays < 0) return `${Math.abs(diffDays)} days after due date`;
                               }
                               return isPerfect ? 'On-Time' : 'Late';
                             })()}
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
  )

  const unverifiedNotice = !isVerified ? (
    <div className="credibility-page__notice">
      <ShieldCheck size={16} />
      <span>
        <strong>Profile not fully verified.</strong> Connect with an Upward partner landlord and complete payments to unlock sharing and your live score.
      </span>
    </div>
  ) : null

  if (isPublic) {
    return (
      <div className="kyc-page public-cv">
        <div className="public-header">
          <UpwardLogo size={100} color="var(--clay)" />
          {isLoggedIn ? (
            <button type="button" className="btn btn--secondary btn--sm px-6" onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </button>
          ) : (
            <button type="button" className="btn btn--primary btn--sm px-6" onClick={() => router.push('/signup')}>
              Join Upward
            </button>
          )}
        </div>

        <div className="kyc-report-container">
          <div className="credibility-page">{reportCard}</div>

          <div className="kyc-report-legal">
            {!isLoggedIn ? (
              <div className="public-benefits animate-slide-up">
                <h3 className="public-benefits__title">Why join Upward?</h3>
                <div className="public-benefits__grid">
                  <div className="public-benefits__item">
                    <div className="public-benefits__icon"><TrendingUp size={16} /></div>
                    <p>Build your rent<br />credibility score</p>
                  </div>
                  <div className="public-benefits__item">
                    <div className="public-benefits__icon"><BadgeCheck size={16} /></div>
                    <p>Verified tenant<br />portfolio</p>
                  </div>
                  <div className="public-benefits__item">
                    <div className="public-benefits__icon"><Zap size={16} /></div>
                    <p>Unlock better<br />leasing deals</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn--primary btn--pill px-10 py-4 font-bold text-lg shadow-clay"
                  onClick={() => router.push('/signup')}
                >
                  Create Your Own Portfolio
                </button>
              </div>
            ) : (
              <div className="logged-in-footer">
                <p>Viewing verified profile: <strong>{profile.name}</strong></p>
                <button type="button" className="btn btn--outline btn--pill px-8" onClick={() => router.push('/dashboard')}>
                  Return to My Dashboard
                </button>
              </div>
            )}
          </div>
        </div>

        {shareModal}
      </div>
    )
  }

  return (
    <PayPageShell
      title="Credibility Profile"
      subtitle="Your rent credibility score and verified tenancy portfolio."
      showBack
      onBack={() => router.push('/dashboard')}
      rightElement={shareHeaderButton}
      footer={
        !isApp ? (
          <PayFlowPrimaryButton onClick={handleShare} disabled={!isVerified}>
            <Share2 size={18} />
            {isVerified ? 'Share portfolio link' : 'Verify to share portfolio'}
          </PayFlowPrimaryButton>
        ) : undefined
      }
    >
      <div className="credibility-page">
        {unverifiedNotice}
        {reportCard}
      </div>
      {shareModal}
    </PayPageShell>
  )
}
