'use client'

import { ShieldCheck, CheckCircle2, Flame, Clock } from 'lucide-react'
import { UpwardLogo } from '@/components/PoweredByUpward'

export interface ShareScoreStoryCardProps {
  id?: string
  name: string
  profilePic?: string | null
  initials: string
  score: number
  maxScore: number
  rank: string
  band: string
  isScorable: boolean
  onTimePct: number
  longestStreak: number
  profileUrl: string
  qrDataUrl: string
  profileRef: string
  rankColor: string
}

export function ShareScoreStoryCard({
  id,
  name,
  profilePic,
  initials,
  score,
  maxScore,
  rank,
  band,
  isScorable,
  onTimePct,
  longestStreak,
  profileUrl,
  qrDataUrl,
  profileRef,
  rankColor,
}: ShareScoreStoryCardProps) {
  const safeMaxScore = maxScore > 0 ? maxScore : 1
  const scorePct = Math.min(100, Math.max(0, (score / safeMaxScore) * 100))
  const displayUrl = profileUrl.replace(/^https?:\/\//, '')
  const updatedDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div id={id} className="share-score-story">
      <div className="share-score-story__watermark">
        <UpwardLogo size={480} color="#d97757" />
      </div>

      <div className="share-score-story__top-safe">
        <div className="share-score-story__brand">
          <UpwardLogo size={44} color="#d97757" />
          <div className="share-score-story__brand-text">
            <span className="share-score-story__brand-name">upward</span>
            <span className="share-score-story__brand-pay">PAY</span>
          </div>
        </div>
      </div>

      <div className="share-score-story__body">
        <div className="share-score-story__badge">
          <ShieldCheck size={20} strokeWidth={2.5} />
          Official Tenant Credential
        </div>

        <div className="share-score-story__avatar-wrap">
          {profilePic ? (
            <img
              src={profilePic}
              alt={name}
              className="share-score-story__avatar-img"
              crossOrigin="anonymous"
            />
          ) : (
            <span className="share-score-story__avatar-initials">{initials}</span>
          )}
          <div className="share-score-story__avatar-verified">
            <CheckCircle2 size={22} strokeWidth={3} />
          </div>
        </div>

        <h2 className="share-score-story__name">{name}</h2>

        <p className="share-score-story__verified">
          <ShieldCheck size={18} color="#22c55e" />
          Verified Tenant
        </p>

        <div className="share-score-story__score-hero">
          <div
            className="share-score-story__ring"
            style={{
              background: `conic-gradient(#ffffff 0% ${scorePct}%, rgba(255,255,255,0.22) ${scorePct}% 100%)`,
            }}
          >
            <div className="share-score-story__ring-inner">
              <span className="share-score-story__score-value">{score}</span>
              <span className="share-score-story__score-max">/ {maxScore}</span>
              <span className="share-score-story__score-pct">{Math.round(scorePct)}%</span>
            </div>
          </div>
        </div>

        <div className="share-score-story__tier" style={{ borderColor: rankColor }}>
          <span className="share-score-story__tier-rank" style={{ color: rankColor }}>
            {rank}
          </span>
          <span className="share-score-story__tier-band">
            {isScorable ? band : 'Building'}
          </span>
        </div>

        <div className="share-score-story__stats">
          <div className="share-score-story__stat">
            <Clock size={22} color="#c2501f" />
            <span className="share-score-story__stat-value">{Math.round(onTimePct)}%</span>
            <span className="share-score-story__stat-label">On-time</span>
          </div>
          <div className="share-score-story__stat">
            <Flame size={22} color="#c2501f" />
            <span className="share-score-story__stat-value">{longestStreak}</span>
            <span className="share-score-story__stat-label">Month streak</span>
          </div>
        </div>
      </div>

      <div className="share-score-story__footer">
        <div className="share-score-story__qr-row">
          <img src={qrDataUrl} alt="" className="share-score-story__qr" />
          <div className="share-score-story__qr-copy">
            <p className="share-score-story__qr-title">Scan to verify profile</p>
            <p className="share-score-story__qr-url">{displayUrl}</p>
          </div>
        </div>
        <p className="share-score-story__meta">
          As of {updatedDate} · Ref: {profileRef}
        </p>
        <p className="share-score-story__brand-footer">Verified by Upward</p>
      </div>
    </div>
  )
}
