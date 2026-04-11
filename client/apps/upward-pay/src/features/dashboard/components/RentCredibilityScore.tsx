import { TrendingUp, FileText, Zap, ShieldCheck, Crown, Flame, Target, Share2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type UserProfile } from '@/features/auth/types'

import { useScoreProfile } from '../services/scoreService'

interface RentCredibilityScoreProps {
  user: UserProfile
  onShowPayRent: () => void
}

export function RentCredibilityScore({
  user,
}: RentCredibilityScoreProps) {
  const router = useRouter()
  const { data: scoreProfile, isLoading } = useScoreProfile()

  if (isLoading || !scoreProfile) {
    return <div className="credibility-hub animate-pulse" style={{ height: '300px', background: 'var(--surface)', borderRadius: '24px' }}></div>
  }

  const { isScorable, score: credScore, rank, band, metrics } = scoreProfile.data
  const credPercentage = isScorable ? (credScore / 900) * 100 : (500 / 900) * 100
  const streak = metrics.longestStreak
  const onTime = Math.round(metrics.ptPercentage)
  const profileCompletion = scoreProfile.data.profile.profileCompletion

  const getRankColor = () => {
    if (!isScorable) return 'var(--text-muted)'
    if (rank === 'A') return 'var(--clay)' // Elite
    if (rank === 'B') return 'var(--success)' // Strong
    if (rank === 'C') return 'var(--info)' // Improving
    if (rank === 'D') return 'var(--warning)' // Risky
    return 'var(--error)' // High Risk
  }

  const isFaded = !isScorable
  const profile = scoreProfile.data.profile
  const profileSlug = profile?.profileSlug

  return (
    <section className="credibility-hub">
      <div className="hub-header">
        <div className="hub-header__title">
          <h2>Rent Credibility</h2>
          <p>Your verified reputation across the network.</p>
        </div>
        <button 
          className="share-btn" 
          onClick={() => {
            if (profileSlug) {
              router.push(`/profile/${profileSlug}`)
            } else {
              // Fallback to UUID if slug is somehow missing but they want to share
              // Or just show a toast? For now let's just use the user uuid if available safely
              router.push(`/profile/${user.uuid || 'me'}`)
            }
          }}
        >
          <Share2 size={16} />
          <span>{profileSlug ? 'Public Profile' : 'Share Profile'}</span>
        </button>
      </div>

      <div className="hub-grid">
        <div className={`hub-main-card ${isFaded ? 'is-faded' : ''}`}>
          <div className="score-display">
            <div className="score-circle">
              <svg viewBox="0 0 100 100">
                <circle className="score-circle__bg" cx="50" cy="50" r="45" />
                <circle 
                  className="score-circle__fill" 
                  cx="50" cy="50" r="45" 
                  style={{ 
                    strokeDasharray: `${credPercentage * 2.82} 282`,
                    stroke: getRankColor()
                  }}
                />
              </svg>
              <div className="score-content">
                <span className="score-val">{credScore}</span>
                <span className="score-label">{isScorable ? 'UPWARD SCORE' : 'NOT SCORE-ABLE YET'}</span>
              </div>
            </div>
            
            <div className="rank-badge" style={{ borderColor: getRankColor() }}>
              <span className="rank-letter">{rank}</span>
              <span className="rank-tier">{band.toUpperCase()}</span>
            </div>
          </div>

          <div className="quick-stats">
            <div className="q-stat">
              <Flame size={20} className={streak > 0 ? 'text--orange' : 'text--muted'} />
              <div className="q-stat__info">
                <span className="q-val">{streak}</span>
                <span className="q-lbl">STREAK</span>
              </div>
            </div>
            <div className="q-stat">
              <ShieldCheck size={20} className="text--clay" />
              <div className="q-stat__info">
                <span className="q-val">{onTime}%</span>
                <span className="q-lbl">ON-TIME</span>
              </div>
            </div>
            <div className="q-stat">
              <Zap size={20} className="text--green" />
              <div className="q-stat__info">
                <span className="q-val">{profileCompletion}%</span>
                <span className="q-lbl">PROFILE</span>
              </div>
            </div>
          </div>
        </div>

        <div className="hub-details-card">
          <h3>Performance Insights</h3>
          <div className="insight-list">
            <div className="insight-item">
              <div className="insight-item__top">
                <span>Reliability Rating</span>
                <span>{onTime}%</span>
              </div>
              <div className="insight-progress">
                <div className="insight-progress__fill" style={{ width: `${onTime}%` }} />
              </div>
            </div>
            <div className="insight-item">
              <div className="insight-item__top">
                <span>Profile Completion</span>
                <span>{profileCompletion}%</span>
              </div>
              <div className="insight-progress">
                <div className="insight-progress__fill" style={{ width: `${profileCompletion}%`, background: 'var(--success)' }} />
              </div>
            </div>
          </div>

          <div className="hub-actions">
            <button className="hub-btn hub-btn--primary" onClick={() => router.push('/dashboard/pay-rent')}>
              <TrendingUp size={18} />
              <span>Boost Your Score</span>
            </button>
            <button className="hub-btn hub-btn--outline" onClick={() => router.push('/dashboard/settings')}>
              <FileText size={18} />
              <span>Complete Profile</span>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .credibility-hub {
          margin-bottom: 2rem;
          width: 100%;
        }

        .hub-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 1.5rem;
        }

        .hub-header__title h2 {
          font-size: 1.5rem;
          font-weight: 800;
          margin: 0;
          color: var(--text);
        }

        .hub-header__title p {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin: 0.25rem 0 0;
        }

        .share-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(var(--clay-rgb), 0.1);
          color: var(--clay);
          padding: 0.6rem 1rem;
          border-radius: 12px;
          border: 1px solid rgba(var(--clay-rgb), 0.2);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .share-btn:hover {
          background: var(--clay);
          color: white;
        }

        .hub-grid {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 1.5rem;
        }

        @media (max-width: 768px) {
          .hub-grid {
            grid-template-columns: 1fr;
          }
        }

        .hub-main-card {
          background: #1a1a1a;
          background: linear-gradient(135deg, #1a1a1a 0%, #111111 100%);
          color: white;
          border-radius: 28px;
          padding: 2.5rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.15);
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          border: 1px solid rgba(255,255,255,0.05);
        }

        :global(.theme--light) .hub-main-card {
           background: #ffffff;
           color: var(--text);
           border: 1px solid var(--border-solid);
           box-shadow: 0 10px 30px rgba(0,0,0,0.03);
        }

        :global(.theme--light) .hub-main-card.is-faded {
          background: var(--bg);
        }

        .hub-main-card.is-faded {
          background: var(--surface);
          color: var(--text);
          box-shadow: none;
          border: 1px solid var(--border);
        }

        .hub-main-card::before {
          content: '';
          position: absolute;
          top: -20%;
          right: -20%;
          width: 60%;
          height: 60%;
          background: radial-gradient(circle, rgba(var(--clay-rgb), 0.15) 0%, transparent 70%);
          pointer-events: none;
        }

        .hub-main-card.is-faded::before {
          display: none;
        }

        .score-display {
          position: relative;
          margin-bottom: 2rem;
        }

        .score-circle {
          width: 180px;
          height: 180px;
          position: relative;
        }

        .score-circle svg {
          transform: rotate(-90deg);
        }

        .score-circle__bg {
          fill: none;
          stroke: rgba(255,255,255,0.05);
          stroke-width: 8;
        }

        :global(.theme--light) .score-circle__bg {
          stroke: var(--border-solid);
        }

        .score-circle__fill {
          fill: none;
          stroke: var(--clay);
          stroke-width: 8;
          stroke-linecap: round;
          transition: stroke-dasharray 1s ease-in-out;
        }

        .score-content {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }

        .score-val {
          display: block;
          font-size: 3.5rem;
          font-weight: 900;
          line-height: 1;
          color: white;
        }

        :global(.theme--light) .score-val {
          color: var(--text);
        }

        .hub-main-card.is-faded .score-val {
          color: var(--text-muted) !important;
        }

        .score-label {
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 2px;
          color: var(--text-muted);
        }

        .rank-badge {
          position: absolute;
          bottom: -10px;
          right: -10px;
          background: var(--bg);
          border: 2px solid var(--clay);
          width: 58px;
          height: 58px;
          border-radius: 18px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 20px rgba(0,0,0,0.2);
          z-index: 2;
        }

        .rank-letter {
          font-size: 1.8rem;
          font-weight: 900;
          line-height: 1;
          color: var(--clay);
        }

        :global(.theme--light) .rank-letter {
           color: var(--clay);
        }

        .rank-tier {
          font-size: 0.5rem;
          font-weight: 800;
          letter-spacing: 1px;
        }

        .quick-stats {
          display: flex;
          gap: 2rem;
          margin-top: auto;
        }

        .q-stat {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .q-stat__info {
          display: flex;
          flex-direction: column;
        }

        .q-val {
          font-size: 1.1rem;
          font-weight: 800;
        }

        .q-lbl {
          font-size: 0.55rem;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 1px;
        }

        .hub-details-card {
          background: var(--surface);
          border-radius: 24px;
          padding: 2rem;
          border: 1px solid var(--border);
          display: flex;
          flex-direction: column;
        }

        :global(.theme--dark) .hub-details-card {
          background: var(--surface2);
          border-color: var(--border);
        }

        .hub-details-card h3 {
          font-size: 1.1rem;
          font-weight: 700;
          margin: 0 0 1.5rem;
        }

        .insight-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .insight-item__top {
          display: flex;
          justify-content: space-between;
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .insight-progress {
          height: 8px;
          background: var(--bg);
          border-radius: 4px;
          overflow: hidden;
        }

        .insight-progress__fill {
          height: 100%;
          background: var(--clay);
          border-radius: 4px;
        }

        .hub-actions {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        @media (min-width: 640px) {
          .hub-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
          }
        }

        .hub-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 1rem;
          border-radius: 16px;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .hub-btn--primary {
          background: var(--clay);
          color: white;
          border: none;
        }

        .hub-btn--primary:hover {
          background: var(--clay-hover);
          transform: translateY(-2px);
        }

        .hub-btn--outline {
          background: transparent;
          border: 1px solid var(--border-solid);
          color: var(--text);
        }

        .hub-btn--outline:hover {
          background: rgba(var(--clay-rgb), 0.05);
          border-color: var(--clay);
          color: var(--clay);
          transform: translateY(-2px);
        }

        :global(.theme--light) .hub-btn--outline {
          background: #f8f9fa;
        }

        .text--orange { color: #FF8C00; }
        .text--green { color: var(--green); }
      `}</style>
    </section>
  )
}
