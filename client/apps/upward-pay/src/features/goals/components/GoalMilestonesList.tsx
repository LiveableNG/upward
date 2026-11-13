'use client'

import React, { useState } from 'react'
import {
  Check,
  Plus,
  Trash2,
  Calendar,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import {
  useGoalMilestones,
  useToggleGoalMilestone,
  useCreateGoalMilestone,
  useDeleteGoalMilestone,
} from '../hooks/useGoals'
import { haptics } from '@/lib/haptics'
import { useToast } from '@/components/common/Toast'
import { formatDate } from '@/lib/utils'

interface GoalMilestonesListProps {
  goalId: string | number
  readOnly?: boolean
}

export function GoalMilestonesList({ goalId, readOnly = false }: GoalMilestonesListProps) {
  const { data: milestones = [], isLoading, isError } = useGoalMilestones(goalId)
  const toggleMutation = useToggleGoalMilestone()
  const createMutation = useCreateGoalMilestone()
  const deleteMutation = useDeleteGoalMilestone()
  const { success, error: toastError } = useToast()

  const [isAdding, setIsAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState('')

  const handleToggle = async (milestoneId: string | number) => {
    if (readOnly) return
    haptics.selection()
    try {
      await toggleMutation.mutateAsync({
        goalIdentifier: goalId,
        milestoneId,
      })
    } catch {
      toastError('Failed to update milestone status')
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    try {
      await createMutation.mutateAsync({
        goalIdentifier: goalId,
        dto: {
          title: newTitle.trim(),
          targetDate: newDate ? new Date(newDate).toISOString() : undefined,
          sortOrder: milestones.length,
        },
      })
      haptics.success()
      success('Milestone added')
      setNewTitle('')
      setNewDate('')
      setIsAdding(false)
    } catch {
      toastError('Failed to add milestone')
    }
  }

  const handleDelete = async (milestoneId: string | number, title: string) => {
    if (readOnly) return
    const confirmed = window.confirm(`Delete milestone "${title}"?`)
    if (!confirmed) return

    try {
      await deleteMutation.mutateAsync({
        goalIdentifier: goalId,
        milestoneId,
      })
      haptics.selection()
      success('Milestone removed')
    } catch {
      toastError('Failed to delete milestone')
    }
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', color: 'var(--text-muted)' }}>
        <Loader2 size={20} className="animate-spin" color="var(--clay)" />
        <span style={{ fontSize: '13px', marginLeft: 8 }}>Loading milestones...</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px', background: 'var(--surface2)', borderRadius: 12, color: 'var(--text-muted)', fontSize: '13px' }}>
        <AlertCircle size={16} color="var(--error)" />
        <span>Unable to load milestones</span>
      </div>
    )
  }

  return (
    <div className="goal-milestones">
      {milestones.length === 0 && !isAdding ? (
        <div style={{ padding: '16px', background: 'var(--surface2, #faf6f0)', borderRadius: 12, textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '13px', margin: '0 0 10px' }}>No milestones added yet.</p>
          {!readOnly && (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                background: 'var(--clay)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Plus size={14} />
              <span>Add first milestone</span>
            </button>
          )}
        </div>
      ) : (
        milestones.map((m) => {
          const isDone = m.status === 'COMPLETED' || Boolean(m.completedAt)
          return (
            <div key={m.id} className="goal-milestone-item">
              <button
                type="button"
                className={`goal-milestone-item__check ${isDone ? 'goal-milestone-item__check--checked' : ''}`}
                onClick={() => handleToggle(m.id)}
                disabled={readOnly || toggleMutation.isPending}
                aria-label={isDone ? 'Mark milestone incomplete' : 'Mark milestone complete'}
              >
                {isDone && <Check size={14} strokeWidth={3} />}
              </button>

              <div className="goal-milestone-item__content">
                <p className={`goal-milestone-item__title ${isDone ? 'goal-milestone-item__title--done' : ''}`}>
                  {m.title}
                </p>
                {m.targetDate && (
                  <div className="goal-milestone-item__meta" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={11} />
                    <span>Target: {formatDate(m.targetDate)}</span>
                  </div>
                )}
              </div>

              {!readOnly && (
                <button
                  type="button"
                  className="goal-milestone-item__delete"
                  onClick={() => handleDelete(m.id, m.title)}
                  title="Delete milestone"
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          )
        })
      )}

      {/* Add Milestone Form */}
      {!readOnly && (
        isAdding ? (
          <form
            onSubmit={handleCreate}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              padding: '14px',
              background: 'var(--surface2, #faf6f0)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              marginTop: 4,
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--dark)' }}>
              New Milestone
            </div>
            <input
              type="text"
              placeholder="e.g. Complete module 1 / Save first ₦100,000"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '13.5px',
                color: 'var(--text)',
                fontFamily: 'inherit',
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  fontSize: '12.5px',
                  color: 'var(--text)',
                  fontFamily: 'inherit',
                }}
              />
              <button
                type="submit"
                disabled={createMutation.isPending || !newTitle.trim()}
                style={{
                  padding: '8px 16px',
                  background: 'var(--clay)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  opacity: createMutation.isPending || !newTitle.trim() ? 0.6 : 1,
                }}
              >
                {createMutation.isPending ? 'Adding...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false)
                  setNewTitle('')
                  setNewDate('')
                }}
                style={{
                  padding: '8px 12px',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: '12.5px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          milestones.length > 0 && (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 14px',
                background: 'transparent',
                border: '1px dashed var(--border)',
                borderRadius: 10,
                color: 'var(--clay)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                marginTop: 6,
                justifyContent: 'center',
              }}
            >
              <Plus size={15} />
              <span>Add Milestone</span>
            </button>
          )
        )
      )}
    </div>
  )
}
