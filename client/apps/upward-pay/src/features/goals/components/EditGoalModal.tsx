'use client'

import React, { useState } from 'react'
import { BottomSheetModal } from '@/components/common/BottomSheetModal'
import { useUpdateUserGoal } from '../hooks/useGoals'
import { type UserGoal, getGoalTitle } from '../types/goals.types'
import { majorToMinorString, minorToMajorDecimal } from '../utils/monetary'
import { useToast } from '@/components/common/Toast'
import { haptics } from '@/lib/haptics'

interface EditGoalModalProps {
  goal: UserGoal | null
  isOpen: boolean
  onClose: () => void
}

export function EditGoalModal({ goal, isOpen, onClose }: EditGoalModalProps) {
  const updateMutation = useUpdateUserGoal()
  const { success, error: toastError } = useToast()

  const [title, setTitle] = useState(goal?.customTitle || getGoalTitle(goal) || '')
  const [description, setDescription] = useState(goal?.customDescription || '')
  const [targetDate, setTargetDate] = useState(
    goal?.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : '',
  )
  const [notes, setNotes] = useState(goal?.notes || '')
  const [manualPct, setManualPct] = useState<number>(goal?.progressPct ?? 0)
  const [targetAmountMajor, setTargetAmountMajor] = useState<string>(
    goal?.targetAmountMinor ? minorToMajorDecimal(goal.targetAmountMinor) : '',
  )

  // Synchronize on goal change
  React.useEffect(() => {
    if (goal) {
      setTitle(goal.customTitle || getGoalTitle(goal) || '')
      setDescription(goal.customDescription || '')
      setTargetDate(
        goal.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : '',
      )
      setNotes(goal.notes || '')
      setManualPct(goal.progressPct ?? 0)
      setTargetAmountMajor(
        goal.targetAmountMinor ? minorToMajorDecimal(goal.targetAmountMinor) : '',
      )
    }
  }, [goal])

  if (!goal) return null

  const isManualPercent = goal.progressSource === 'MANUAL_PERCENT'
  const isTargetAmount = goal.progressSource === 'TARGET_AMOUNT'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isTargetAmount) {
      if (!targetAmountMajor.trim()) {
        toastError('Please enter a target amount')
        return
      }
      const minor = majorToMinorString(targetAmountMajor)
      if (BigInt(minor) <= BigInt(0)) {
        toastError('Target amount must be greater than zero')
        return
      }
    }

    const targetAmountMinor = isTargetAmount && targetAmountMajor
      ? majorToMinorString(targetAmountMajor)
      : undefined

    try {
      await updateMutation.mutateAsync({
        goalId: goal.id,
        data: {
          customTitle: title.trim() || undefined,
          customDescription: description.trim() || undefined,
          targetDate: targetDate ? new Date(targetDate).toISOString() : undefined,
          notes: notes.trim() || undefined,
          progressPct: isManualPercent ? manualPct : undefined,
          targetAmountMinor,
        },
      })
      haptics.success()
      success('Goal updated successfully')
      onClose()
    } catch {
      toastError('Failed to update goal')
    }
  }

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Goal"
      subtitle="Update goal parameters, targets, or personal notes"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>
            Goal Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              fontSize: 14,
              fontFamily: 'inherit',
              color: 'var(--text)',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              fontSize: 13.5,
              fontFamily: 'inherit',
              color: 'var(--text)',
              resize: 'vertical',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>
            Target Completion Date
          </label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              fontSize: 13.5,
              fontFamily: 'inherit',
              color: 'var(--text)',
            }}
          />
        </div>

        {isManualPercent && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                Manual Progress Percentage
              </label>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--clay)' }}>
                {manualPct}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={manualPct}
              onChange={(e) => setManualPct(parseInt(e.target.value, 10))}
              style={{ width: '100%', accentColor: 'var(--clay)' }}
            />
          </div>
        )}

        {isTargetAmount && (
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>
              Target Amount ({goal.currency || 'NGN'})
            </label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="e.g. 500,000"
              value={targetAmountMajor}
              onChange={(e) => setTargetAmountMajor(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: 14,
                fontFamily: 'inherit',
                color: 'var(--text)',
              }}
            />
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>
            Personal Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Key reminders, motivation or links..."
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              fontSize: 13.5,
              fontFamily: 'inherit',
              color: 'var(--text)',
              resize: 'vertical',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            style={{
              flex: 1,
              padding: '12px 18px',
              background: 'var(--clay)',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              opacity: updateMutation.isPending ? 0.6 : 1,
            }}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '12px 18px',
              background: 'transparent',
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </BottomSheetModal>
  )
}
