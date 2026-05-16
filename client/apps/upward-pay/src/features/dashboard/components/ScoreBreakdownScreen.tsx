'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { 
  TrendingUp, 
  History, 
  Info, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  ShieldCheck, 
  Flame, 
  Target,
  ChevronRight,
  Plus
} from 'lucide-react'
import { useScoreProfile } from '../services/scoreService'
import { PageHeader } from '@/components/common/PageHeader'
import { formatCurrency } from '@/lib/utils'

export function ScoreBreakdownScreen() {
  const router = useRouter()
  const { data: scoreProfile, isLoading } = useScoreProfile()

  if (isLoading || !scoreProfile) {
    return (
      <div className="score-breakdown">
        <PageHeader title="Score Breakdown" showBack onBack={() => router.push('/dashboard')} />
        <div className="loading-state">
           <div className="spinner" />
           <p>Calculating your reputation...</p>
        </div>
        <style jsx>{`
          .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 60vh;
            color: var(--text-muted);
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(var(--clay-rgb), 0.1);
            border-top-color: var(--clay);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 1rem;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    )
  }

  const { isScorable, score, rank, band, metrics, cycles, properties = [] } = scoreProfile.data
  const isVerified = properties.some((p: any) => p.isManaged)

  const getRankColor = () => {
    if (!isScorable) return 'var(--text-muted)'
    if (rank === 'A') return 'var(--clay)'
    if (rank === 'B') return 'var(--success)'
    if (rank === 'C') return 'var(--info)'
    if (rank === 'D') return 'var(--warning)'
    return 'var(--error)'
  }

  const getStatusColor = (status: string) => {
    if (status === 'PAID_ON_TIME' || status === 'PAID_BEFORE_DUE') return 'var(--clay)'
    if (status === 'PAID_LATE' || status === 'PARTIAL_LATE' || status === 'MISSED') return 'var(--error)'
    if (status === 'PENDING') return 'var(--warning)'
    return 'var(--text-muted)'
  }

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, ' ')
  }

  const scoreFactors = [
    { label: 'Payment Timeliness', value: `${Math.round(metrics.ptPercentage)}%`, icon: Clock, desc: 'How often you pay on or before the due date.' },
    { label: 'Payment Consistency', value: `${metrics.longestStreak} mo`, icon: Flame, desc: 'Your longest continuous streak of on-time months.' },
    { label: 'Financial Discipline', value: `${Math.round(metrics.discipline)}%`, icon: Target, desc: 'The ratio of full payments vs partial payments.' },
    { label: 'Tenure', value: `${metrics.historyYears} yrs`, icon: History, desc: 'Length of your verified rent payment history.' },
  ]

  return (
    <div className="score-breakdown dashboard--nav-offset">
      <PageHeader title="Score Breakdown" showBack onBack={() => router.push('/dashboard')} />
      
      <div className="sb-container">
        {/* Main Score Header */}
        <section className="sb-header">
           <div className="sb-header__score-blob" style={{'--rank-color': isVerified ? getRankColor() : 'var(--text-muted)'} as any}>
              <div className="sb-header__score-circle">
                 <span className="sb-header__val" style={{ opacity: isVerified ? 1 : 0.5 }}>{score}</span>
                 <span className="sb-header__label">{isVerified ? 'UPWARD SCORE' : 'POTENTIAL SCORE'}</span>
              </div>
              <div className="sb-header__rank">
                 <strong>{rank}</strong>
                 <span>{band.toUpperCase()}</span>
              </div>
           </div>
           
           <div className="sb-header__intro">
              <h2>How your score works</h2>
              {!isVerified && (
                  <div className="unverified-warning">
                    <ShieldCheck size={16} />
                    <span>Unverified Profile: Connect with an Upward partner landlord to finalize this score.</span>
                  </div>
               )}
              <p>
                Your Upward Score is a dynamic indicator of your rental reliability. 
                It's calculated based on four key factors that help landlords trust your discipline and consistency.
              </p>
           </div>
        </section>

        {/* Score Factors Grid */}
        <section className="sb-factors">
           <div className="factors-grid">
              {scoreFactors.map((factor, idx) => {
                const Icon = factor.icon
                return (
                  <div key={idx} className="factor-card">
                     <div className="factor-card__top">
                        <div className="factor-card__icon"><Icon size={20} /></div>
                        <span className="factor-card__val">{factor.value}</span>
                     </div>
                     <div className="factor-card__info">
                        <strong>{factor.label}</strong>
                        <p>{factor.desc}</p>
                     </div>
                  </div>
                )
              })}
           </div>
        </section>

        {/* History Table */}
        <section className="sb-history">
           <div className="sb-history__header">
              <h3>Cycle History</h3>
              <p>Every logged payment affects your score in real-time.</p>
           </div>

           <div className="history-table-wrapper">
              <table className="history-table">
                 <thead>
                    <tr>
                       <th>Cycle Date</th>
                       <th>Source</th>
                       <th>Amount</th>
                       <th>Status</th>
                       <th>Impact</th>
                    </tr>
                 </thead>
                 <tbody>
                    {cycles.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="empty-history">
                           No payment history found yet.
                        </td>
                      </tr>
                    ) : (
                      cycles.sort((a,b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()).map((cycle, idx) => (
                        <tr key={idx}>
                           <td>
                              <div className="cycle-date">
                                 <strong>{new Date(cycle.dueDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</strong>
                                 <span>Due: {new Date(cycle.dueDate).toLocaleDateString()}</span>
                              </div>
                           </td>
                           <td>
                              <span className={`source-tag source-tag--${cycle.source.toLowerCase()}`}>
                                 {cycle.source.replace(/_/g, ' ')}
                              </span>
                           </td>
                           <td>{formatCurrency(cycle.amount, 'NGN')}</td>
                           <td>
                              <div className="status-badge" style={{'--status-color': getStatusColor(cycle.status)} as any}>
                                 <span className="dot" />
                                 {getStatusLabel(cycle.status)}
                              </div>
                           </td>
                           <td>
                              <div className="impact-cell">
                                 {(() => {
                                   if (cycle.excluded) return (
                                     <>
                                       <Info size={16} className="text--muted" />
                                       <span className="text--muted">No Impact</span>
                                     </>
                                   );
                                   if (cycle.status === 'PAID_ON_TIME') return (
                                     <>
                                       <TrendingUp size={16} className="text--clay" />
                                       <span>Positive</span>
                                     </>
                                   );
                                   if (cycle.status === 'PARTIAL_ON_TIME') return (
                                     <>
                                       <History size={16} className="text--info" />
                                       <span>Neutral</span>
                                     </>
                                   );
                                   if (cycle.status === 'PAID_LATE' || cycle.status === 'PARTIAL_LATE' || cycle.status === 'MISSED') return (
                                     <>
                                       <AlertCircle size={16} className="text--error" />
                                       <span>Negative</span>
                                     </>
                                   );
                                   // Fallback
                                   if (cycle.ptValue >= 0.85) return (
                                     <>
                                       <TrendingUp size={16} className="text--clay" />
                                       <span>Positive</span>
                                     </>
                                   );
                                   if (cycle.ptValue > 0) return (
                                     <>
                                       <History size={16} className="text--info" />
                                       <span>Neutral</span>
                                     </>
                                   );
                                   return (
                                     <>
                                       <AlertCircle size={16} className="text--error" />
                                       <span>Negative</span>
                                     </>
                                   );
                                 })()}
                              </div>
                           </td>
                        </tr>
                      ))
                    )}
                 </tbody>
              </table>
           </div>
        </section>

        {/* Action Call for Missing History */}
        <section className="sb-missing-hero">
           <div className="hero-content">
              <h3>Missing past records?</h3>
              <p>Add rent payments from previous years to instantly boost your tenure and streak metrics.</p>
              <button 
                className="btn btn--primary" 
                onClick={() => router.push('/dashboard/request-records')}
              >
                <Plus size={18} />
                <span>Request Past Records</span>
              </button>
           </div>
        </section>
      </div>

      <style jsx>{`
        .sb-container {
          max-width: 900px;
          margin: 0 auto;
          padding: 1.5rem 1rem 6rem;
        }

        .sb-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 2rem;
          margin-bottom: 3rem;
        }

        @media (min-width: 768px) {
          .sb-header {
            flex-direction: row;
            text-align: left;
            align-items: center;
            background: var(--surface);
            padding: 2.5rem;
            border-radius: 32px;
            border: 1px solid var(--border-solid);
          }
        }

        .sb-header__score-blob {
          position: relative;
          padding: 1rem;
        }

        .sb-header__score-circle {
          width: 180px;
          height: 180px;
          border-radius: 50%;
          border: 12px solid var(--bg);
          box-shadow: 0 10px 40px rgba(0,0,0,0.1), inset 0 0 0 10px var(--rank-color);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: var(--surface2);
          position: relative;
        }

        .sb-header__val {
          font-size: 4rem;
          font-weight: 900;
          color: var(--text);
          line-height: 1;
        }

        .sb-header__label {
          font-size: 0.7rem;
          font-weight: 800;
          color: var(--text-muted);
          letter-spacing: 1px;
        }

        .sb-header__rank {
          position: absolute;
          bottom: -10px;
          right: -10px;
          background: var(--bg);
          padding: 10px 15px;
          border-radius: 16px;
          box-shadow: 0 10px 20px rgba(0,0,0,0.1);
          border: 2px solid var(--rank-color);
          text-align: center;
          min-width: 80px;
        }

        .sb-header__rank strong {
          display: block;
          font-size: 1.5rem;
          color: var(--rank-color);
        }

        .sb-header__rank span {
          font-size: 0.6rem;
          font-weight: 800;
        }

        .sb-header__intro h2 {
          font-size: 1.75rem;
          font-weight: 800;
          margin-bottom: 1rem;
        }

        .sb-header__intro p {
          color: var(--text-muted);
          line-height: 1.6;
          font-size: 1.05rem;
          max-width: 500px;
        }

        .factors-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 4rem;
        }

        .factor-card {
          background: var(--surface);
          border: 1px solid var(--border-solid);
          border-radius: 24px;
          padding: 1.5rem;
          transition: transform 0.2s;
        }

        .factor-card:hover {
          transform: translateY(-5px);
          border-color: var(--clay);
        }

        .factor-card__top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .factor-card__icon {
          width: 40px;
          height: 40px;
          background: var(--surface2);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--clay);
        }

        .factor-card__val {
          font-size: 1.5rem;
          font-weight: 900;
          color: var(--text);
        }

        .factor-card__info strong {
          display: block;
          font-size: 1rem;
          margin-bottom: 0.5rem;
        }

        .factor-card__info p {
          font-size: 0.85rem;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .sb-history__header {
          margin-bottom: 1.5rem;
        }

        .sb-history__header h3 {
          font-size: 1.5rem;
          font-weight: 800;
        }

        .sb-history__header p {
          color: var(--text-muted);
        }

        .history-table-wrapper {
          background: var(--surface);
          border-radius: 24px;
          border: 1px solid var(--border-solid);
          overflow: hidden;
          margin-bottom: 3rem;
        }

        .history-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.95rem;
        }

        .history-table th {
          text-align: left;
          padding: 1.25rem 1.5rem;
          background: var(--surface2);
          font-weight: 800;
          color: var(--text-muted);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .history-table td {
          padding: 1.5rem;
          border-bottom: 1px solid var(--border-solid);
          vertical-align: middle;
        }

        .cycle-date {
          display: flex;
          flex-direction: column;
        }

        .cycle-date strong { font-size: 1rem; }
        .cycle-date span { font-size: 0.8rem; color: var(--text-muted); }

        .source-tag {
          font-size: 0.7rem;
          font-weight: 800;
          padding: 4px 8px;
          border-radius: 8px;
          text-transform: uppercase;
          background: var(--bg);
          border: 1px solid var(--border-solid);
          color: var(--text-muted);
        }

        .source-tag--past_record { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
        .source-tag--payment_request { background: #fdf2f8; color: #be185d; border-color: #fbcfe8; }
        .source-tag--manual { background: var(--clay-faint); color: var(--clay); border-color: rgba(var(--clay-rgb), 0.2); }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--status-color);
          font-weight: 700;
          font-size: 0.85rem;
        }

        .status-badge .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--status-color);
        }

        .impact-cell {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .sb-missing-hero {
          background: linear-gradient(135deg, var(--clay) 0%, #c46648 100%);
          border-radius: 32px;
          padding: 3rem;
          color: white;
          text-align: center;
        }

        .hero-content h3 {
          font-size: 2rem;
          font-weight: 900;
          margin-bottom: 1rem;
        }

        .hero-content p {
          font-size: 1.1rem;
          margin-bottom: 2rem;
          opacity: 0.9;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }

        .hero-content .btn--primary {
          background: white;
          color: var(--clay);
          padding: 1.25rem 2.5rem;
          border-radius: 18px;
        }

        .hero-content .btn--primary:hover {
          transform: scale(1.05);
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        .text--clay { color: var(--clay); }
        .text--info { color: var(--info); }
        .text--error { color: var(--error); }
        .text--muted { color: var(--text-muted); }

        .unverified-warning {
            display: flex;
            align-items: center;
            gap: 10px;
            background: var(--surface2);
            color: var(--text-muted);
            padding: 12px 16px;
            border-radius: 12px;
            font-size: 0.85rem;
            margin-bottom: 1rem;
            border: 1px dashed var(--border-solid);
        }
        .unverified-warning :global(svg) { color: var(--clay); }

        @media (max-width: 640px) {
          .sb-factors { margin-bottom: 2rem; }
          .history-table th:nth-child(2), .history-table td:nth-child(2),
          .history-table th:nth-child(3), .history-table td:nth-child(3) {
            display: none;
          }
          .sb-missing-hero { padding: 2rem 1.5rem; }
          .hero-content h3 { font-size: 1.5rem; }
        }
      `}</style>
    </div>
  )
}

const Clock = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clock"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
)
