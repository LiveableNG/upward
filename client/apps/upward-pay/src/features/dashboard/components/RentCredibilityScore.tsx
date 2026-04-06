import { TrendingUp, FileText, Zap, ShieldCheck, Crown } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface RentCredibilityScoreProps {
  isNewUser: boolean
  credScore: number
  credPercentage: number
  onShowPayRent: () => void
  onShowSavingsGoal: () => void
}

export function RentCredibilityScore({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isNewUser,
  credScore,
  credPercentage,
}: RentCredibilityScoreProps) {
  const router = useRouter()

  return (
    <section className="score-card score-card--premium">
      <div className="score-card__header">
        <div className="score-card__status">
          <Zap size={14} className="text--clay animate-pulse" />
          <span className="live-indicator">CONNECTING LIVE</span>
        </div>
        <div className="score-card__rank">
          {credScore > 800 ? (
            <Crown size={16} color="var(--clay)" />
          ) : (
            <ShieldCheck size={16} color="var(--clay)" />
          )}
          <span className="rank-text">{credScore > 800 ? 'Platinum Tier' : 'Verified Member'}</span>
        </div>
      </div>

      <div className="kd-ratio">
        <div className="kd-ratio__main">
          <div className="kd-ratio__label">RENT LEGACY</div>
          <div className="kd-ratio__value">{(credScore / 100).toFixed(2)}</div>
          <div className="kd-ratio__sub">SCORE: {credScore}</div>
        </div>
        <div className="kd-ratio__gauge">
          <div className="kd-ratio__fill" style={{ width: `${credPercentage}%` }} />
        </div>
      </div>

      <div className="score-metrics">
        <div className="metric-item">
          <span className="metric-item__val">100%</span>
          <span className="metric-item__label">RELIABILITY</span>
        </div>
        <div className="metric-item">
          <span className="metric-item__val">Elite</span>
          <span className="metric-item__label">STANDING</span>
        </div>
        <div className="metric-item">
          <span className="metric-item__val">+{Math.floor(credScore / 10)}</span>
          <span className="metric-item__label">GROWTH</span>
        </div>
      </div>

      <div className="quick-actions">
        <button className="q-action" onClick={() => router.push('/dashboard/pay-rent')}>
          <TrendingUp size={16} />
          <span>Boost Score</span>
        </button>
        <button className="q-action" onClick={() => router.push('/dashboard/kyc')}>
          <FileText size={16} />
          <span>KYC Status</span>
        </button>
      </div>

      <style jsx>{`
        .score-card--premium {
          background: var(--dark);
          color: white;
          border-radius: 24px;
          padding: 1.5rem;
          border: 1px solid rgba(var(--clay-rgb), 0.3);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          position: relative;
          overflow: hidden;
        }

        .score-card--premium::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(
            circle at 30% 30%,
            rgba(var(--clay-rgb), 0.1) 0%,
            transparent 50%
          );
          pointer-events: none;
        }

        .score-card__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .score-card__status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(var(--clay-rgb), 0.1);
          padding: 0.3rem 0.7rem;
          border-radius: 20px;
          border: 1px solid rgba(var(--clay-rgb), 0.2);
        }

        .live-indicator {
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 1px;
          color: var(--clay);
        }

        .score-card__rank {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
        }

        .kd-ratio {
          margin-bottom: 2rem;
        }

        .kd-ratio__main {
          text-align: center;
          margin-bottom: 1rem;
        }

        .kd-ratio__label {
          font-size: 0.7rem;
          letter-spacing: 3px;
          color: var(--text-muted);
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .kd-ratio__value {
          font-size: 4rem;
          font-weight: 900;
          line-height: 1;
          color: white;
          text-shadow: 0 0 20px rgba(var(--clay-rgb), 0.5);
        }

        .kd-ratio__sub {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--clay);
          margin-top: 0.2rem;
        }

        .kd-ratio__gauge {
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
        }

        .kd-ratio__fill {
          height: 100%;
          background: linear-gradient(90deg, var(--clay), var(--clay-hover));
          box-shadow: 0 0 10px var(--clay);
          transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .score-metrics {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
          background: rgba(255, 255, 255, 0.03);
          padding: 1rem;
          border-radius: 16px;
        }

        .metric-item {
          text-align: center;
        }

        .metric-item__val {
          display: block;
          font-weight: 800;
          font-size: 1.1rem;
          color: white;
        }

        .metric-item__label {
          display: block;
          font-size: 0.6rem;
          color: var(--text-muted);
          font-weight: 700;
          margin-top: 0.2rem;
        }

        .quick-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .q-action {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          padding: 0.6rem;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          font-weight: 600;
          transition: all 0.2s;
          cursor: pointer;
        }

        .q-action:hover {
          background: rgba(var(--clay-rgb), 0.2);
          border-color: var(--clay);
        }

        @keyframes animate-pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        .animate-pulse {
          animation: animate-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </section>
  )
}
