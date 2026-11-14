'use client'

import React, { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, Plus, Check, Trash2, X } from 'lucide-react'
import {
  useUserGoals,
  useGoalCategories,
  useCreateCustomGoal,
  useToggleGoalAction,
  useRemoveUserGoal,
} from '../hooks/useGoals'
import { type UserGoal, type GoalCategory, type GoalTargetType } from '../types/goals.types'
import { useToast } from '@/components/common/Toast'

function renderGoalRing(pct: number, size = 42) {
  const strokeWidth = 3.5
  const radius = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * radius
  const filled = circ * (Math.min(100, Math.max(0, pct)) / 100)
  const isFilled = pct > 0

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)', display: 'block' }}
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#ede8e2"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isFilled ? 'var(--clay, #c2501f)' : '#ede8e2'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
        />
      </svg>
      <span
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          fontSize: '10px',
          fontWeight: 800,
          color: 'var(--text, #111)',
        }}
      >
        {pct}%
      </span>
    </div>
  )
}

export function AllGoalsScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialNew = searchParams.get('new') === 'true'

  const { success, error: toastError } = useToast()

  const { data: userGoals = [], isLoading: isGoalsLoading } = useUserGoals()
  const { data: categories = [], isLoading: isCategoriesLoading } = useGoalCategories()

  const createGoalMutation = useCreateCustomGoal()
  const toggleActionMutation = useToggleGoalAction()
  const removeGoalMutation = useRemoveUserGoal()

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(initialNew)
  const [activeDetailGoal, setActiveDetailGoal] = useState<UserGoal | null>(null)

  // New goal form state
  const [newTitle, setNewTitle] = useState('')
  const [newCatSlug, setNewCatSlug] = useState('wellness-lifestyle')
  const [newIcon, setNewIcon] = useState('🎯')
  const [newTimelineDays, setNewTimelineDays] = useState(90)
  const [newTargetAmount, setNewTargetAmount] = useState('')
  const [actionsList, setActionsList] = useState<string[]>([])
  const [currentActionText, setCurrentActionText] = useState('')

  // Non-housing active user goals
  const activeUserGoals = useMemo(() => {
    return userGoals.filter(
      (ug) => (ug.categorySlug || ug.goal?.category?.slug) !== 'housing',
    )
  }, [userGoals])

  const handleAddActionItem = () => {
    const text = currentActionText.trim()
    if (!text) return
    if (!actionsList.includes(text)) {
      setActionsList([...actionsList, text])
    }
    setCurrentActionText('')
  }

  const handleRemoveActionItem = (index: number) => {
    setActionsList(actionsList.filter((_, i) => i !== index))
  }

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) {
      toastError('Please enter a goal title')
      return
    }

    const numAmount = Number(newTargetAmount.replace(/[^0-9]/g, ''))
    const targetAmountKobo = numAmount > 0 ? numAmount * 100 : undefined

    let targetType: GoalTargetType = 'CHECKLIST_ACTIONS'
    if (targetAmountKobo && actionsList.length > 0) {
      targetType = 'HYBRID'
    } else if (targetAmountKobo) {
      targetType = 'AMOUNT'
    }

    try {
      await createGoalMutation.mutateAsync({
        title: newTitle.trim(),
        categorySlug: newCatSlug,
        icon: newIcon,
        targetType,
        durationDays: newTimelineDays,
        targetAmountKobo,
        actions: actionsList.length > 0 ? actionsList : undefined,
      })

      success('Goal created successfully')
      setIsCreateModalOpen(false)
      setNewTitle('')
      setNewTargetAmount('')
      setActionsList([])
      setCurrentActionText('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create goal'
      toastError(msg)
    }
  }

  const handleToggleAction = async (actionId: string) => {
    if (!activeDetailGoal?.uuid) return
    try {
      const updated = await toggleActionMutation.mutateAsync({
        goalUuid: activeDetailGoal.uuid,
        actionId,
      })
      setActiveDetailGoal(updated)
    } catch {
      toastError('Failed to update action')
    }
  }

  const handleDeleteGoal = async (id: number) => {
    if (!confirm('Are you sure you want to remove this goal?')) return
    try {
      await removeGoalMutation.mutateAsync(id)
      success('Goal removed')
      setActiveDetailGoal(null)
    } catch {
      toastError('Failed to remove goal')
    }
  }

  return (
    <div className="all-goals-page">
      {/* Top Navigation */}
      <div className="all-goals-page__topbar">
        <button
          type="button"
          className="all-goals-page__back-btn"
          onClick={() => router.push('/dashboard')}
          aria-label="Back to dashboard"
        >
          <ChevronLeft size={20} strokeWidth={2.2} />
        </button>
        <h1 className="all-goals-page__title">More you can work toward</h1>
      </div>

      <p className="all-goals-page__subhead">
        Housing is already on your home screen. Pick another area, or create your own.
      </p>

      {/* 1. Catalog Categories from Database */}
      <div className="all-goals-page__list">
        {categories.map((cat) => {
          const userGoalsInCat = activeUserGoals.filter(
            (ug) => (ug.categorySlug || ug.goal?.category?.slug) === cat.slug,
          )
          const count = userGoalsInCat.length
          const avgPct =
            count > 0
              ? Math.round(
                  userGoalsInCat.reduce((acc, g) => acc + (g.progressPct || 0), 0) / count,
                )
              : 0

          return (
            <button
              key={cat.id}
              type="button"
              className="all-goals-page__card"
              onClick={() => router.push(`/dashboard/lifestyle?category=${cat.slug}`)}
            >
              <div className="all-goals-page__card-body">
                <h2 className="all-goals-page__card-title">{cat.title || cat.name}</h2>
                <p className="all-goals-page__card-desc">
                  {count > 0 ? `${count} active goal${count > 1 ? 's' : ''}` : cat.description || 'Explore goals'}
                </p>
              </div>
              {renderGoalRing(avgPct, 42)}
            </button>
          )
        })}

        {/* 2. User's Active Goals from Database */}
        {activeUserGoals.map((ug) => {
          const title = (ug.icon ? `${ug.icon} ` : '') + (ug.title || ug.goal?.title || 'Goal')
          const catName = ug.categorySlug || ug.goal?.category?.title || ug.goal?.category?.name || 'Upward Goal'
          let subtitle = catName
          if (ug.durationDays) {
            const months = Math.round(ug.durationDays / 30)
            subtitle += months >= 1 ? ` · ${months} months` : ` · ${ug.durationDays} days`
          } else if (ug.targetAmountKobo) {
            const amt = Number(ug.targetAmountKobo) / 100
            const saved = Number(ug.savedAmountKobo || 0) / 100
            subtitle += ` · ₦${Math.round(saved).toLocaleString('en-NG')} of ₦${Math.round(amt).toLocaleString('en-NG')}`
          }

          return (
            <button
              key={ug.id || ug.uuid}
              type="button"
              className="all-goals-page__card"
              onClick={() => setActiveDetailGoal(ug)}
            >
              <div className="all-goals-page__card-body">
                <h2 className="all-goals-page__card-title">{title}</h2>
                <p className="all-goals-page__card-desc">{subtitle}</p>
              </div>
              {renderGoalRing(ug.progressPct || 0, 42)}
            </button>
          )
        })}
      </div>

      {/* + New Goal CTA */}
      <button
        type="button"
        className="all-goals-page__new-btn"
        onClick={() => setIsCreateModalOpen(true)}
      >
        + New goal
      </button>

      {/* CREATE GOAL MODAL */}
      {isCreateModalOpen && (
        <div
          className="goal-modal-overlay"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div className="goal-modal" onClick={(e) => e.stopPropagation()}>
            <div className="goal-modal__head">
              <h2 className="goal-modal__title">Create a Goal</h2>
              <button
                type="button"
                className="goal-modal__close"
                onClick={() => setIsCreateModalOpen(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form className="goal-modal__body" onSubmit={handleCreateGoal}>
              <div className="goal-modal__field">
                <label className="goal-modal__label">Goal Title</label>
                <input
                  type="text"
                  className="goal-modal__input"
                  placeholder="e.g. Learn a new skill, Buy a car, Relocate"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </div>

              <div className="goal-modal__field">
                <label className="goal-modal__label">Icon</label>
                <div className="goal-modal__chips">
                  {['🎯', '📚', '💼', '🚗', '✈️', '🏋️', '💻', '🏡'].map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      className={`goal-modal__chip ${newIcon === ic ? 'goal-modal__chip--active' : ''}`}
                      onClick={() => setNewIcon(ic)}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              <div className="goal-modal__field">
                <label className="goal-modal__label">Category</label>
                <div className="goal-modal__chips">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`goal-modal__chip ${newCatSlug === c.slug ? 'goal-modal__chip--active' : ''}`}
                      onClick={() => setNewCatSlug(c.slug)}
                    >
                      {c.title || c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="goal-modal__field">
                <label className="goal-modal__label">Timeline</label>
                <div className="goal-modal__chips">
                  {[
                    { label: '30 Days', days: 30 },
                    { label: '3 Months', days: 90 },
                    { label: '6 Months', days: 180 },
                    { label: '1 Year', days: 365 },
                  ].map((t) => (
                    <button
                      key={t.days}
                      type="button"
                      className={`goal-modal__chip ${newTimelineDays === t.days ? 'goal-modal__chip--active' : ''}`}
                      onClick={() => setNewTimelineDays(t.days)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="goal-modal__field">
                <label className="goal-modal__label">Target Savings (Optional)</label>
                <input
                  type="text"
                  className="goal-modal__input"
                  placeholder="₦ Amount (leave empty if checklist only)"
                  value={newTargetAmount}
                  onChange={(e) => setNewTargetAmount(e.target.value)}
                />
              </div>

              <div className="goal-modal__field">
                <label className="goal-modal__label">Action Checklist Steps</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="goal-modal__input"
                    placeholder="Add an action step..."
                    value={currentActionText}
                    onChange={(e) => setCurrentActionText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddActionItem()
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="goal-modal__chip goal-modal__chip--active"
                    style={{ flexShrink: 0 }}
                    onClick={handleAddActionItem}
                  >
                    <Plus size={16} /> Add
                  </button>
                </div>

                {actionsList.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                    {actionsList.map((act, i) => (
                      <div
                        key={i}
                        className="goal-modal__action-row"
                        style={{ justifyContent: 'space-between' }}
                      >
                        <span className="goal-modal__action-label">
                          {i + 1}. {act}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveActionItem(i)}
                          style={{ background: 'transparent', border: 'none', color: '#999', cursor: 'pointer' }}
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="goal-modal__submit"
                disabled={createGoalMutation.isPending}
              >
                {createGoalMutation.isPending ? 'Creating Goal...' : 'Save Goal'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL & ACTIONS MODAL */}
      {activeDetailGoal && (
        <div
          className="goal-modal-overlay"
          onClick={() => setActiveDetailGoal(null)}
        >
          <div className="goal-modal" onClick={(e) => e.stopPropagation()}>
            <div className="goal-modal__head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {renderGoalRing(activeDetailGoal.progressPct || 0, 32)}
                <h2 className="goal-modal__title">
                  {activeDetailGoal.icon} {activeDetailGoal.title || activeDetailGoal.goal?.title}
                </h2>
              </div>
              <button
                type="button"
                className="goal-modal__close"
                onClick={() => setActiveDetailGoal(null)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="goal-modal__body">
              {activeDetailGoal.targetAmountKobo && (
                <div className="goal-modal__field">
                  <label className="goal-modal__label">Savings Target</label>
                  <p style={{ fontSize: '15px', fontWeight: 700, margin: '2px 0 0' }}>
                    ₦{(Number(activeDetailGoal.savedAmountKobo || 0) / 100).toLocaleString('en-NG')} of ₦
                    {(Number(activeDetailGoal.targetAmountKobo) / 100).toLocaleString('en-NG')}
                  </p>
                </div>
              )}

              {activeDetailGoal.durationDays && (
                <div className="goal-modal__field">
                  <label className="goal-modal__label">Timeline</label>
                  <p style={{ fontSize: '13.5px', color: 'var(--text-muted, #8a8a8a)', margin: '2px 0 0' }}>
                    {activeDetailGoal.durationDays} days target window
                  </p>
                </div>
              )}

              <div className="goal-modal__field">
                <label className="goal-modal__label">
                  Action Steps (
                  {activeDetailGoal.actions?.filter((a) => a.done).length || 0} of{' '}
                  {activeDetailGoal.actions?.length || 0} complete)
                </label>

                {(!activeDetailGoal.actions || activeDetailGoal.actions.length === 0) ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    No checklist steps configured for this goal.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {activeDetailGoal.actions.map((act) => (
                      <button
                        key={act.id}
                        type="button"
                        className={`goal-modal__action-row ${act.done ? 'is-done' : ''}`}
                        onClick={() => handleToggleAction(act.id)}
                      >
                        <span className="goal-modal__action-check">
                          {act.done && <Check size={12} color="#ffffff" strokeWidth={3} />}
                        </span>
                        <span className="goal-modal__action-label">{act.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {activeDetailGoal.id && (
                <button
                  type="button"
                  className="goal-modal__delete-btn"
                  onClick={() => handleDeleteGoal(activeDetailGoal.id)}
                >
                  <Trash2 size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />
                  Remove this goal
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
