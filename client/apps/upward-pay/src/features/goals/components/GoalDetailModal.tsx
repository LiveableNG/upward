'use client'

import React, { useState } from 'react'
import {
  Archive,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  FileText,
  Loader2,
  PauseCircle,
  PiggyBank,
  PlayCircle,
  Target,
  Wallet,
} from 'lucide-react'
import { BottomSheetModal } from '@/components/common/BottomSheetModal'
import {
  useUserGoalDetail,
  useActivateGoal,
  usePauseGoal,
  useCompleteGoal,
  useArchiveGoal,
} from '../hooks/useGoals'
import {
  type UserGoal,
  getGoalTitle,
  getCategoryTitle,
} from '../types/goals.types'
import { formatMinorUnitAmount } from '../utils/monetary'
import { formatDate } from '@/lib/utils'
import { GoalMilestonesList } from './GoalMilestonesList'
import { EditGoalModal } from './EditGoalModal'
import { useToast } from '@/components/common/Toast'
import { haptics } from '@/lib/haptics'

interface GoalDetailModalProps {
  goalId: string | number | null
  isOpen: boolean
  onClose: () => void
}

export function GoalDetailModal({ goalId, isOpen, onClose }: GoalDetailModalProps) {
  const { data: goalDetail, isLoading } = useUserGoalDetail(isOpen && goalId ? goalId : undefined)

  const activateMutation = useActivateGoal()
  const pauseMutation = usePauseGoal()
  const completeMutation = useCompleteGoal()
  const archiveMutation = useArchiveGoal()
  const { success, error: toastError } = useToast()

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isActionPending, setIsActionPending] = useState(false)

  if (!isOpen || !goalId) return null

  const goal = goalDetail || null
  const title = goal ? getGoalTitle(goal) : 'Goal Details'
  const categoryTitle = goal ? getCategoryTitle(goal.category) : null
  const status = goal?.status || 'ACTIVE'
  const progressSource = goal?.progressSource || 'MILESTONES'
  const progressPct = Math.min(100, Math.max(0, goal?.progressPct ?? 0))

  const handleActivate = async () => {
    if (!goal) return
    setIsActionPending(true)
    try {
      await activateMutation.mutateAsync(goal.id)
      haptics.success()
      success('Goal activated')
    } catch {
      toastError('Failed to activate goal')
    } finally {
      setIsActionPending(false)
    }
  }

  const handlePause = async () => {
    if (!goal) return
    setIsActionPending(true)
    try {
      await pauseMutation.mutateAsync(goal.id)
      haptics.selection()
      success('Goal paused')
    } catch {
      toastError('Failed to pause goal')
    } finally {
      setIsActionPending(false)
    }
  }

  const handleComplete = async () => {
    if (!goal) return
    const confirmed = window.confirm(`Mark goal "${title}" as completed?`)
    if (!confirmed) return

    setIsActionPending(true)
    try {
      await completeMutation.mutateAsync(goal.id)
      haptics.success()
      success('Congratulations! Goal marked as completed.')
    } catch {
      toastError('Failed to complete goal')
    } finally {
      setIsActionPending(false)
    }
  }

  const handleArchive = async () => {
    if (!goal) return
    const confirmed = window.confirm(
      `Archive "${title}"?\n\nArchiving moves this goal out of your active workspace. Your progress and milestone history are preserved and accessible in the Archived tab.`,
    )
    if (!confirmed) return

    setIsActionPending(true)
    try {
      await archiveMutation.mutateAsync(goal.id)
      haptics.selection()
      success('Goal archived')
      onClose()
    } catch {
      toastError('Failed to archive goal')
    } finally {
      setIsActionPending(false)
    }
  }

  return (
    <>
      <BottomSheetModal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        subtitle={categoryTitle ? `${categoryTitle} · ${status}` : status}
        maxWidth="md"
      >
        {isLoading && !goal ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 12, color: 'var(--text-muted)' }}>
            <Loader2 size={24} className="animate-spin" color="var(--clay)" />
            <span style={{ fontSize: 13 }}>Loading goal details...</span>
          </div>
        ) : goal ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Status & Category Pills */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {categoryTitle && (
                  <span className="user-goal-card__category">
                    <Target size={11} />
                    <span>{categoryTitle}</span>
                  </span>
                )}
                <span className={`user-goal-card__status user-goal-card__status--${status.toLowerCase()}`}>
                  {status}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--text-muted)',
                    background: 'var(--surface2)',
                    padding: '2.5px 8px',
                    borderRadius: 999,
                  }}
                >
                  {progressSource.replace('_', ' ')}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsEditOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 12px',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: 'var(--text)',
                  cursor: 'pointer',
                }}
              >
                <Edit3 size={13} />
                <span>Edit</span>
              </button>
            </div>

            {/* Description */}
            {(goal.customDescription || goal.catalogueGoal?.description) && (
              <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--text-muted)', margin: 0 }}>
                {goal.customDescription || goal.catalogueGoal?.description}
              </p>
            )}

            {/* Progress Display */}
            <div
              style={{
                background: 'var(--surface2, #faf6f0)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: 'var(--dark)' }}>
                <span>Overall Progress</span>
                {progressSource !== 'STATUS_ONLY' && (
                  <span style={{ color: 'var(--clay)' }}>{progressPct}%</span>
                )}
              </div>

              {progressSource === 'TARGET_AMOUNT' && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Target Amount</span>
                  <span style={{ fontWeight: 700, color: 'var(--text)' }}>
                    {formatMinorUnitAmount(goal.currentAmountMinor, goal.currency)} of{' '}
                    {formatMinorUnitAmount(goal.targetAmountMinor, goal.currency)}
                  </span>
                </div>
              )}

              {progressSource !== 'STATUS_ONLY' && (
                <div className="user-goal-card__progress-bar" style={{ height: 8 }}>
                  <div className="user-goal-card__progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
              )}

              {goal.targetDate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  <Calendar size={13} />
                  <span>Target completion: {formatDate(goal.targetDate)}</span>
                </div>
              )}

              {goal.notes && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  <FileText size={13} style={{ marginTop: 2, flexShrink: 0 }} />
                  <span>{goal.notes}</span>
                </div>
              )}
            </div>

            {/* Milestones Section */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Action Milestones</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                  Break goals into steps
                </span>
              </div>
              <GoalMilestonesList goalId={goal.id} />
            </div>

            {/* Lifecycle Action Bar */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                paddingTop: 16,
                borderTop: '1px solid var(--border)',
              }}
            >
              {status === 'ACTIVE' && (
                <>
                  <button
                    type="button"
                    onClick={handlePause}
                    disabled={isActionPending}
                    style={{
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '11px 16px',
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--text)',
                      cursor: 'pointer',
                    }}
                  >
                    <PauseCircle size={15} />
                    <span>Pause</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleComplete}
                    disabled={isActionPending}
                    style={{
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '11px 16px',
                      background: 'var(--clay)',
                      border: 'none',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <CheckCircle2 size={15} />
                    <span>Complete</span>
                  </button>
                </>
              )}

              {status === 'PAUSED' && (
                <>
                  <button
                    type="button"
                    onClick={handleActivate}
                    disabled={isActionPending}
                    style={{
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '11px 16px',
                      background: 'var(--clay)',
                      border: 'none',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <PlayCircle size={15} />
                    <span>Resume</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleComplete}
                    disabled={isActionPending}
                    style={{
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '11px 16px',
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--text)',
                      cursor: 'pointer',
                    }}
                  >
                    <CheckCircle2 size={15} />
                    <span>Complete</span>
                  </button>
                </>
              )}

              {status === 'COMPLETED' && (
                <button
                  type="button"
                  onClick={handleActivate}
                  disabled={isActionPending}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '11px 16px',
                    background: 'var(--clay)',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <PlayCircle size={15} />
                  <span>Reactivate Goal</span>
                </button>
              )}

              {status !== 'ARCHIVED' && (
                <button
                  type="button"
                  onClick={handleArchive}
                  disabled={isActionPending}
                  title="Archive goal from active workspace"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '11px 16px',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  <Archive size={15} />
                  <span>Archive</span>
                </button>
              )}
            </div>
          </div>
        ) : null}
      </BottomSheetModal>

      {/* Embedded Edit Modal */}
      {goal && (
        <EditGoalModal
          goal={goal}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
        />
      )}
    </>
  )
}
