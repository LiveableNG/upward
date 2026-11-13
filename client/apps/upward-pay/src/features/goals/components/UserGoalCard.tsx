'use client'

import React from 'react'
import {
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  PauseCircle,
  PiggyBank,
  Sliders,
  Target,
  Wallet,
} from 'lucide-react'
import {
  type UserGoal,
  getGoalTitle,
  getCategoryTitle,
} from '../types/goals.types'
import { formatMinorUnitAmount } from '../utils/monetary'
import { formatDate } from '@/lib/utils'

interface UserGoalCardProps {
  goal: UserGoal
  onClick: () => void
}

export function UserGoalCard({ goal, onClick }: UserGoalCardProps) {
  const title = getGoalTitle(goal)
  const categoryTitle = getCategoryTitle(goal.category)
  const status = goal.status
  const progressSource = goal.progressSource || 'MILESTONES'
  const progressPct = Math.min(100, Math.max(0, goal.progressPct ?? 0))

  const statusLabel =
    status === 'ACTIVE'
      ? 'Active'
      : status === 'PAUSED'
        ? 'Paused'
        : status === 'COMPLETED'
          ? 'Completed'
          : 'Archived'

  const statusClass =
    status === 'ACTIVE'
      ? 'user-goal-card__status--active'
      : status === 'PAUSED'
        ? 'user-goal-card__status--paused'
        : status === 'COMPLETED'
          ? 'user-goal-card__status--completed'
          : 'user-goal-card__status--archived'

  return (
    <div
      className="user-goal-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <div className="user-goal-card__top">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="user-goal-card__badge-row">
            {categoryTitle && (
              <span className="user-goal-card__category">
                <Target size={11} />
                <span>{categoryTitle}</span>
              </span>
            )}
            <span className={`user-goal-card__status ${statusClass}`}>
              {status === 'ACTIVE' && <CheckCircle2 size={10} />}
              {status === 'PAUSED' && <PauseCircle size={10} />}
              {statusLabel}
            </span>
          </div>
          <h3 className="user-goal-card__title">{title}</h3>
          {goal.customDescription ? (
            <p className="user-goal-card__desc">{goal.customDescription}</p>
          ) : goal.catalogueGoal?.tagline ? (
            <p className="user-goal-card__desc">{goal.catalogueGoal.tagline}</p>
          ) : null}
        </div>
      </div>

      {/* Progress Presentation — tailored strictly to progressSource */}
      {progressSource === 'STATUS_ONLY' ? (
        <div className="user-goal-card__progress-wrap">
          <div className="user-goal-card__progress-info">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Clock size={12} />
              <span>Status Tracked</span>
            </span>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>{statusLabel}</span>
          </div>
        </div>
      ) : progressSource === 'TARGET_AMOUNT' ? (
        <div className="user-goal-card__progress-wrap">
          <div className="user-goal-card__progress-info">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Wallet size={12} />
              <span>Target Savings</span>
            </span>
            <span>
              {formatMinorUnitAmount(goal.currentAmountMinor, goal.currency)} of{' '}
              {formatMinorUnitAmount(goal.targetAmountMinor, goal.currency)}
            </span>
          </div>
          <div className="user-goal-card__progress-bar">
            <div
              className="user-goal-card__progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      ) : progressSource === 'RENT_VAULT' ? (
        <div className="user-goal-card__progress-wrap">
          <div className="user-goal-card__progress-info">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <PiggyBank size={12} />
              <span>Rent Vault Linked</span>
            </span>
            <span>{progressPct}% verified</span>
          </div>
          <div className="user-goal-card__progress-bar">
            <div
              className="user-goal-card__progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      ) : progressSource === 'MANUAL_PERCENT' ? (
        <div className="user-goal-card__progress-wrap">
          <div className="user-goal-card__progress-info">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Sliders size={12} />
              <span>Progress</span>
            </span>
            <span>{progressPct}%</span>
          </div>
          <div className="user-goal-card__progress-bar">
            <div
              className="user-goal-card__progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      ) : (
        /* Default: MILESTONES */
        <div className="user-goal-card__progress-wrap">
          <div className="user-goal-card__progress-info">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Target size={12} />
              <span>Milestones Progress</span>
            </span>
            <span>{progressPct}%</span>
          </div>
          <div className="user-goal-card__progress-bar">
            <div
              className="user-goal-card__progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Meta Bar: target date, notes */}
      {(goal.targetDate || goal.notes) && (
        <div className="user-goal-card__meta">
          {goal.targetDate && (
            <span className="user-goal-card__meta-item">
              <Calendar size={12} />
              <span>Target: {formatDate(goal.targetDate)}</span>
            </span>
          )}
          {goal.notes && (
            <span className="user-goal-card__meta-item" title={goal.notes}>
              <FileText size={12} />
              <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {goal.notes}
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
