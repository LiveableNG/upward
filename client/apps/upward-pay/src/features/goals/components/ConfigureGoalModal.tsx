'use client'

import React, { useState, useEffect } from 'react'
import {
  Calendar,
  Check,
  Plus,
  Trash2,
  Wallet,
  GraduationCap,
  FileText,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import { BottomSheetModal } from '@/components/common/BottomSheetModal'
import {
  type SelectedOnboardingGoal,
  useOnboardingGoals,
} from '../context/OnboardingGoalsContext'
import { PROFESSIONAL_QUALIFICATIONS } from '../data/presentationCatalogue'
import { useToast } from '@/components/common/Toast'
import { haptics } from '@/lib/haptics'

interface ConfigureGoalModalProps {
  goal: SelectedOnboardingGoal | null
  isOpen: boolean
  onClose: () => void
}

export function ConfigureGoalModal({ goal, isOpen, onClose }: ConfigureGoalModalProps) {
  const { configureGoal, addMilestone, deleteMilestone } = useOnboardingGoals()
  const { success } = useToast()

  const [targetDate, setTargetDate] = useState('')
  const [targetAmountMajor, setTargetAmountMajor] = useState('')
  const [qualification, setQualification] = useState('')
  const [customQualification, setCustomQualification] = useState('')
  const [isCustomQualSelected, setIsCustomQualSelected] = useState(false)
  const [notes, setNotes] = useState('')
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('')

  useEffect(() => {
    if (goal) {
      setTargetDate(goal.targetDate || '')
      setTargetAmountMajor(goal.targetAmountMajor || '')
      setNotes(goal.notes || '')

      const qual = goal.qualification || ''
      const isKnown = (PROFESSIONAL_QUALIFICATIONS as readonly string[]).includes(qual)
      if (isKnown) {
        setQualification(qual)
        setIsCustomQualSelected(false)
        setCustomQualification('')
      } else if (qual) {
        setQualification('OTHER')
        setIsCustomQualSelected(true)
        setCustomQualification(qual)
      } else {
        setQualification('')
        setIsCustomQualSelected(false)
        setCustomQualification('')
      }
    }
  }, [goal])

  if (!goal) return null

  const isCareer = goal.categoryId === 'career-professional'
  const isHousing = goal.categoryId === 'housing-living'
  const isFinancial = goal.categoryId === 'financial-income'
  const canSetAmount = isFinancial || isHousing || goal.supportsFinancialTarget

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()

    const finalQualification = isCustomQualSelected
      ? customQualification.trim()
      : qualification

    configureGoal(goal.id, {
      targetDate: targetDate || undefined,
      targetAmountMajor: canSetAmount && targetAmountMajor.trim() ? targetAmountMajor.trim() : undefined,
      qualification: finalQualification || undefined,
      notes: notes.trim() || undefined,
      progressSource: canSetAmount && targetAmountMajor.trim() ? 'TARGET_AMOUNT' : 'MILESTONES',
    })

    haptics.success()
    success('Goal configuration updated')
    onClose()
  }

  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMilestoneTitle.trim()) return
    addMilestone(goal.id, newMilestoneTitle.trim())
    setNewMilestoneTitle('')
    haptics.selection()
  }

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={onClose}
      title={goal.title}
      subtitle={`${goal.categoryTitle} · Personal Configuration`}
      maxWidth="md"
    >
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {goal.description && (
          <p style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--text-muted)', margin: 0 }}>
            {goal.description}
          </p>
        )}

        {/* 1. Target Date */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            <Calendar size={14} color="var(--clay)" />
            <span>Target Completion Date (Optional)</span>
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

        {/* 2. Target Financial Amount (if applicable) */}
        {canSetAmount && (
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              <Wallet size={14} color="var(--clay)" />
              <span>Target Amount (Optional, {goal.currency || 'NGN'})</span>
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
                fontSize: 13.5,
                fontFamily: 'inherit',
                color: 'var(--text)',
              }}
            />
            <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
              Setting a target amount will track savings or budget accumulation toward this ambition.
            </span>
          </div>
        )}

        {/* 3. Professional Qualification Selector (for Career Goals) */}
        {isCareer && (
          <div style={{ background: 'var(--surface2)', padding: '14px', borderRadius: 12, border: '1px solid var(--border)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--dark)', marginBottom: 6 }}>
              <GraduationCap size={15} color="var(--clay)" />
              <span>Professional Qualification / Examination</span>
            </label>
            <select
              value={isCustomQualSelected ? 'OTHER' : qualification}
              onChange={(e) => {
                if (e.target.value === 'OTHER') {
                  setIsCustomQualSelected(true)
                  setQualification('OTHER')
                } else {
                  setIsCustomQualSelected(false)
                  setQualification(e.target.value)
                }
              }}
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
            >
              <option value="">Select an examination / qualification (optional)</option>
              {PROFESSIONAL_QUALIFICATIONS.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
              <option value="OTHER">Other / Enter unlisted qualification...</option>
            </select>

            {isCustomQualSelected && (
              <div style={{ marginTop: 8 }}>
                <input
                  type="text"
                  placeholder="Enter qualification or examination title..."
                  value={customQualification}
                  onChange={(e) => setCustomQualification(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    color: 'var(--text)',
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 8, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
              <HelpCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                Upward helps you track your study and preparation milestones. Upward does not award, accredit, or administer these qualifications.
              </span>
            </div>
          </div>
        )}

        {/* 4. Action Milestones Checklist */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
              Action Milestones ({goal.milestones.length})
            </label>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              Key steps to complete
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
            {goal.milestones.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  fontSize: 13,
                  color: 'var(--text)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      border: '1.5px solid var(--clay)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: m.isCompleted ? 'var(--clay)' : 'transparent',
                      color: '#fff',
                    }}
                  >
                    {m.isCompleted && <Check size={11} strokeWidth={3} />}
                  </div>
                  <span style={{ textDecoration: m.isCompleted ? 'line-through' : 'none', opacity: m.isCompleted ? 0.6 : 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.title}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => deleteMilestone(goal.id, m.id)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 4,
                  }}
                  title="Remove milestone"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* Add milestone inline input */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Add another action milestone..."
              value={newMilestoneTitle}
              onChange={(e) => setNewMilestoneTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddMilestone(e)
                }
              }}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: 13,
                fontFamily: 'inherit',
                color: 'var(--text)',
              }}
            />
            <button
              type="button"
              onClick={handleAddMilestone}
              disabled={!newMilestoneTitle.trim()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '9px 14px',
                borderRadius: 8,
                background: newMilestoneTitle.trim() ? 'var(--dark)' : 'var(--surface2)',
                color: newMilestoneTitle.trim() ? '#fff' : 'var(--text-muted)',
                fontSize: 12.5,
                fontWeight: 700,
                border: 'none',
                cursor: newMilestoneTitle.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              <Plus size={13} />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* 5. Personal Notes */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            <FileText size={14} color="var(--clay)" />
            <span>Personal Notes & Motivation (Optional)</span>
          </label>
          <textarea
            rows={2}
            placeholder="Why this matters to you right now..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              fontSize: 13,
              fontFamily: 'inherit',
              color: 'var(--text)',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button
            type="submit"
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
            }}
          >
            Save Configuration
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
            Done
          </button>
        </div>
      </form>
    </BottomSheetModal>
  )
}
