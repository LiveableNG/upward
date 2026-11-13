'use client'

import React, { useState } from 'react'
import {
  Plus,
  Trash2,
  Calendar,
  Wallet,
  Tag,
  HelpCircle,
} from 'lucide-react'
import { BottomSheetModal } from '@/components/common/BottomSheetModal'
import { useOnboardingGoals } from '../context/OnboardingGoalsContext'
import { PRESENTATION_CATALOGUE } from '../data/presentationCatalogue'
import { useToast } from '@/components/common/Toast'
import { haptics } from '@/lib/haptics'

interface CreateCustomGoalModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated?: (goalId: string) => void
}

export function CreateCustomGoalModal({
  isOpen,
  onClose,
  onCreated,
}: CreateCustomGoalModalProps) {
  const { addCustomGoal } = useOnboardingGoals()
  const { success, error: toastError } = useToast()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('personal-goals')
  const [customCategoryName, setCustomCategoryName] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [hasFinancialTarget, setHasFinancialTarget] = useState(false)
  const [targetAmountMajor, setTargetAmountMajor] = useState('')
  const [notes, setNotes] = useState('')
  const [milestones, setMilestones] = useState<string[]>([
    'Define the outcome clearly',
    'Take the first step',
  ])
  const [newMilestone, setNewMilestone] = useState('')
  const [suggestCategory, setSuggestCategory] = useState(false)
  const [suggestedCategoryText, setSuggestedCategoryText] = useState('')

  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMilestone.trim()) return
    setMilestones((prev) => [...prev, newMilestone.trim()])
    setNewMilestone('')
    haptics.selection()
  }

  const handleRemoveMilestone = (index: number) => {
    setMilestones((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toastError('Please enter a goal title')
      return
    }

    if (hasFinancialTarget && targetAmountMajor.trim()) {
      const cleaned = targetAmountMajor.replace(/,/g, '').trim()
      const num = parseFloat(cleaned)
      if (isNaN(num) || num <= 0) {
        toastError('Target amount must be greater than zero')
        return
      }
    }

    const resolvedCategoryTitle =
      categoryId === 'custom'
        ? customCategoryName.trim() || 'Personal Ambition'
        : PRESENTATION_CATALOGUE.find((c) => c.id === categoryId)?.title || 'Personal Goals'

    const goalId = addCustomGoal({
      title: title.trim(),
      description: description.trim() || undefined,
      categoryId: categoryId === 'custom' ? 'personal-goals' : categoryId,
      categoryTitle: resolvedCategoryTitle,
      targetDate: targetDate || undefined,
      targetAmountMajor: hasFinancialTarget && targetAmountMajor.trim() ? targetAmountMajor.trim() : undefined,
      notes: notes.trim() || undefined,
      milestones: milestones.length > 0 ? milestones : undefined,
    })

    haptics.success()
    success('Personal goal added to your onboarding list')

    // Reset form
    setTitle('')
    setDescription('')
    setCategoryId('personal-goals')
    setCustomCategoryName('')
    setTargetDate('')
    setHasFinancialTarget(false)
    setTargetAmountMajor('')
    setNotes('')
    setMilestones(['Define the outcome clearly', 'Take the first step'])
    setSuggestCategory(false)
    setSuggestedCategoryText('')

    onClose()
    if (onCreated) {
      onCreated(goalId)
    }
  }

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create My Own Goal"
      subtitle="Define a personal ambition with bespoke targets and milestones"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Title */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            Goal Title *
          </label>
          <input
            type="text"
            placeholder="e.g. Run a half-marathon / Write a novel / Launch a podcast"
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

        {/* Category Picker */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            <Tag size={13} color="var(--clay)" />
            <span>Category</span>
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
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
            {PRESENTATION_CATALOGUE.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.title}
              </option>
            ))}
            <option value="custom">Other / Custom Category...</option>
          </select>

          {categoryId === 'custom' && (
            <div style={{ marginTop: 8 }}>
              <input
                type="text"
                placeholder="Enter personal category name (e.g. Health & Fitness, Spirituality)..."
                value={customCategoryName}
                onChange={(e) => setCustomCategoryName(e.target.value)}
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
        </div>

        {/* Desired Outcome Description */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            Desired Outcome / Description (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="What does success look like when this goal is accomplished?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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

        {/* Target Date */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            <Calendar size={13} color="var(--clay)" />
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

        {/* Financial Target Toggle */}
        <div style={{ background: 'var(--surface2)', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--dark)' }}>
            <input
              type="checkbox"
              checked={hasFinancialTarget}
              onChange={(e) => setHasFinancialTarget(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--clay)' }}
            />
            <span>This goal involves a financial savings or budget target</span>
          </label>

          {hasFinancialTarget && (
            <div style={{ marginTop: 10 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                Target Amount (NGN)
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="e.g. 250,000"
                value={targetAmountMajor}
                onChange={(e) => setTargetAmountMajor(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  fontSize: 13.5,
                  fontFamily: 'inherit',
                  color: 'var(--text)',
                }}
              />
            </div>
          )}
        </div>

        {/* Milestones / Action Steps */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
              Action Steps / Milestones
            </label>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              Break down your goal
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
            {milestones.map((m, idx) => (
              <div
                key={idx}
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
                <span>{m}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveMilestone(idx)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 4,
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Add next action step..."
              value={newMilestone}
              onChange={(e) => setNewMilestone(e.target.value)}
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
              disabled={!newMilestone.trim()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '9px 14px',
                borderRadius: 8,
                background: newMilestone.trim() ? 'var(--dark)' : 'var(--surface2)',
                color: newMilestone.trim() ? '#fff' : 'var(--text-muted)',
                fontSize: 12.5,
                fontWeight: 700,
                border: 'none',
                cursor: newMilestone.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              <Plus size={13} />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Suggest Category Field */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12.5, color: 'var(--text-muted)' }}>
            <input
              type="checkbox"
              checked={suggestCategory}
              onChange={(e) => setSuggestCategory(e.target.checked)}
              style={{ width: 14, height: 14, accentColor: 'var(--clay)' }}
            />
            <span>Suggest a new public catalogue category for future Upward releases</span>
          </label>

          {suggestCategory && (
            <div style={{ marginTop: 8 }}>
              <input
                type="text"
                placeholder="What new category would you like Upward to support?"
                value={suggestedCategoryText}
                onChange={(e) => setSuggestedCategoryText(e.target.value)}
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
        </div>

        {/* Submit Buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
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
            Create Goal
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
