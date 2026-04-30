import { TrendingUp, FileText, Zap, ShieldCheck, Flame, History } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type UserProfile } from '@/features/auth/types'
import { useScoreProfile } from '../services/scoreService'

interface RentCredibilityScoreProps {
  user: UserProfile
  onShowPayRent: () => void
}

export function RentCredibilityScore({ user }: RentCredibilityScoreProps) {
  const router = useRouter()
  const { data: scoreProfile, isLoading } = useScoreProfile()

  if (isLoading || !scoreProfile) {
    return <div className="credibility-hub animate-pulse" style={{ height: '300px', background: 'var(--surface)', borderRadius: '24px' }}></div>
  }

  const { isScorable, score: credScore, rank, band, metrics } = scoreProfile.data
  const isVerified = user.properties?.some((p: any) => p.isManaged) || false
  const credPercentage = isScorable ? (credScore / 800) * 100 : (400 / 800) * 100
  const streak = metrics.longestStreak
  const onTime = Math.round(metrics.ptPercentage)
  const profileCompletion = scoreProfile.data.profile.profileCompletion

  const getRankColor = () => {
    if (!isScorable || !isVerified) return 'var(--text-muted)'
    if (rank === 'A') return 'var(--clay)'
    if (rank === 'B') return 'var(--success)'
    if (rank === 'C') return 'var(--info)'
    if (rank === 'D') return 'var(--warning)'
    return 'var(--error)'
  }

  const isFaded = !isScorable
  const profileSlug = scoreProfile.data.profile?.profileSlug

  return (
    <section className="credibility-hub">
      <div className="hub-header">
        <div className="hub-header__title">
          <h2>Rent Credibility</h2>
          <p>Your verified reputation across the network.</p>
        </div>
        <button 
          className="share-btn" 
          onClick={() => router.push(`/dashboard/request-records`)}
        >
          <History size={16} />
          <span>Records</span>
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
                <span className="score-val" style={{ color: isVerified ? '' : 'var(--text-muted)' }}>{credScore}</span>
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
              <Flame size={20} className={(streak > 0 && isVerified) ? 'text--orange' : 'text--muted'} />
              <div className="q-stat__info">
                <span className="q-val">{streak}</span>
                <span className="q-lbl">STREAK</span>
              </div>
            </div>
            <div className="q-stat">
              <ShieldCheck size={20} className={isVerified ? "text--clay" : "text--muted"} />
              <div className="q-stat__info">
                <span className="q-val">{onTime}%</span>
                <span className="q-lbl">ON-TIME</span>
              </div>
            </div>
            <div className="q-stat">
              <Zap size={20} className={isVerified ? "text--green" : "text--muted"} />
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
                <div className="insight-progress__fill" style={{ width: `${onTime}%`, background: isVerified ? 'var(--clay)' : 'var(--text-muted)' }} />
              </div>
            </div>
            <div className="insight-item">
              <div className="insight-item__top">
                <span>Score Band</span>
                <span>{band.toUpperCase()}</span>
              </div>
              <div className="insight-progress">
                <div className="insight-progress__fill" style={{ width: `${(credScore / 800) * 100}%`, background: getRankColor() }} />
              </div>
            </div>
          </div>

          <div className="hub-actions">
            <button className="hub-btn hub-btn--primary" onClick={() => router.push('/dashboard/pay-rent')}>
              <TrendingUp size={18} />
              <span>Boost Your Score</span>
            </button>
            <button className="hub-btn hub-btn--outline" onClick={() => router.push('/dashboard/score-breakdown')}>
              <FileText size={18} />
              <span>View Score Breakdown</span>
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

        @media (max-width: 640px) {
          .hub-header {
            align-items: center;
            gap: var(--space-3);
          }
          .hub-header__title h2 {
            font-size: 1.2rem;
          }
          .hub-header__title p {
            font-size: 0.75rem;
            max-width: 180px;
          }
          .share-btn {
            padding: 0.4rem 0.8rem;
            font-size: 0.75rem;
            flex-shrink: 0;
            border-radius: 10px;
          }
        }

        /* Fully flexible Hub Grid */
        .hub-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }

        @media (min-width: 1024px) {
          .hub-grid {
            grid-template-columns: 1.2fr 1fr;
            gap: 2rem;
          }
          .score-circle {
            width: 200px !important;
            height: 200px !important;
          }
          .score-val {
            font-size: 4rem !important;
          }
        }

        @media (min-width: 1440px) {
          .hub-grid {
            grid-template-columns: 1.4fr 1fr;
            gap: 2.5rem;
          }
          .score-circle {
            width: 240px !important;
            height: 240px !important;
          }
          .score-val {
            font-size: 4.5rem !important;
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

        .score-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
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

        :global(.theme--light) .score-val { color: var(--text); }
        .hub-main-card.is-faded .score-val { color: var(--text-muted) !important; }

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
          min-width: 58px;
          padding: 6px 8px;
          height: 62px;
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

        .rank-tier {
          font-size: 0.5rem;
          font-weight: 800;
          letter-spacing: 1px;
        }

        .quick-stats {
          display: flex;
          justify-content: center;
          width: 100%;
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

        .q-val { font-size: 1.1rem; font-weight: 800; }
        .q-lbl { font-size: 0.55rem; font-weight: 700; color: var(--text-muted); letter-spacing: 1px; }

        .hub-details-card {
          background: var(--surface);
          border-radius: 24px;
          padding: 2.5rem 2rem;
          border: 1px solid var(--border);
          display: flex;
          flex-direction: column;
        }

        .hub-details-card h3 {
          font-size: 1.25rem;
          font-weight: 800;
          margin: 0 0 1.5rem;
        }

        .insight-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-bottom: 2.5rem;
        }

        .insight-item__top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.95rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
        }

        .insight-progress {
          height: 10px;
          background: var(--bg);
          border-radius: 6px;
          overflow: hidden;
        }

        .insight-progress__fill {
          height: 100%;
          background: var(--clay);
          border-radius: 6px;
          transition: width 1s ease-in-out;
        }

        .hub-actions {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        @media (min-width: 640px) {
          .hub-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }
        }

        .hub-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 1rem;
          border-radius: 16px;
          font-size: 0.95rem;
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
          box-shadow: 0 8px 24px rgba(217, 119, 87, 0.3);
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

        .text--orange { color: #FF8C00; }
        .text--green { color: var(--green); }
      `}</style>
    </section>
  )
}
