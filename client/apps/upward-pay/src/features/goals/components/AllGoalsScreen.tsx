'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, Plus, Check, Trash2, ArrowRight, X } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import {
  useUserGoals,
  useGoalCategories,
  useCreateCustomGoal,
  useSubmitQuestionnaire,
  useToggleGoalAction,
  useRemoveUserGoal,
} from '../hooks/useGoals'
import { useTenantOrders } from '../hooks/useCommerceOrders'
import { type UserGoal, type GoalTargetType } from '../types/goals.types'
import { useToast } from '@/components/common/Toast'

interface CategoryQuestionConfig {
  id: 'fitness' | 'career' | 'income' | 'custom'
  title: string
  intro: string
  label: string
  options: string[]
  extras?: Record<
    string,
    {
      label: string
      options: string[]
    }
  >
  notesLabel?: string
  notesRequired?: boolean
}

const QUESTIONNAIRE_CONFIGS: Record<'fitness' | 'career' | 'income' | 'custom', CategoryQuestionConfig> = {
  fitness: {
    id: 'fitness',
    title: 'Health & fitness goals',
    intro: 'Pick what fits best. We will use this to shape your milestones and recommendations.',
    label: 'What is your main health or fitness goal?',
    options: [
      'Lose weight',
      'Build muscle or strength',
      'Stay consistent with exercise',
      'Improve my diet and nutrition',
      'Prepare for a fitness event or run',
      'Something else',
    ],
  },
  career: {
    id: 'career',
    title: 'Career & professional goals',
    intro: 'Tell us where you want to grow professionally this year.',
    label: 'What do you want to achieve?',
    options: [
      'Pass a professional certification exam',
      'Learn a new high-income skill',
      'Transition into a new career role',
      'Get promoted at my current workplace',
      'Build a stronger professional network',
      'Something else',
    ],
    extras: {
      'Pass a professional certification exam': {
        label: 'Which certification?',
        options: ['ICAN', 'ACCA', 'CFA', 'PMP', 'CIPM', 'AWS / Cloud', 'Other'],
      },
    },
  },
  income: {
    id: 'income',
    title: 'Income goals',
    intro: 'Tell us how you want to grow your income in 2027.',
    label: 'What is your primary income goal?',
    options: [
      'Start a side business',
      'Grow my existing business revenue',
      'Add a second stream of income',
      'Save towards an emergency or investment fund',
      'Start investing more seriously',
      'Something else',
    ],
  },
  custom: {
    id: 'custom',
    title: 'Another goal',
    intro: 'What would you really like to achieve, aside from the categories already on your goals screen?',
    label: 'What is your goal?',
    options: [
      'Goals for my children',
      'A family goal',
      'Buy a car',
      'Travel abroad',
      'Something not listed here',
    ],
    notesLabel: 'Describe the goal, and any first actions you want to take.',
    notesRequired: false,
  },
}

function renderPrototypeRing(pct: number, size = 52) {
  const center = size / 2
  const radius = center - 5
  const circ = 2 * Math.PI * radius
  const clamped = Math.min(100, Math.max(0, Math.round(pct)))
  const dash = circ * (clamped / 100)
  const strokeColor = clamped > 0 ? 'var(--clay, #d97757)' : '#bcb3a7'

  return (
    <div
      className="proto-goals__ring"
      style={{ width: size, height: size, flex: `0 0 ${size}px` }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        style={{ width: size, height: size, transform: 'rotate(-90deg)', display: 'block' }}
        aria-hidden="true"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#e2ddd7"
          strokeWidth={5}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
        />
      </svg>
      <div className="proto-goals__ring-pct">{clamped}%</div>
    </div>
  )
}

function getTimeGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function resolveQueryCategory(
  isNew: boolean,
  cat: string | null,
): 'fitness' | 'career' | 'income' | 'custom' | null {
  if (isNew || cat === 'custom') return 'custom'
  if (cat === 'fitness' || cat === 'wellness-lifestyle') return 'fitness'
  if (cat === 'career' || cat === 'work-growth') return 'career'
  if (cat === 'income') return 'income'
  return null
}

export function AllGoalsScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const firstName = user?.firstName || 'there'

  const { success, error: toastError } = useToast()

  const { data: userGoals = [] } = useUserGoals()
  const { data: categories = [] } = useGoalCategories()
  const { data: tenantOrdersData } = useTenantOrders({ take: 10 })

  const createGoalMutation = useCreateCustomGoal()
  const submitQuestionnaireMutation = useSubmitQuestionnaire()
  const toggleActionMutation = useToggleGoalAction()
  const removeGoalMutation = useRemoveUserGoal()

  const isNewParam = searchParams.get('new') === 'true'
  const catParam = searchParams.get('cat') || searchParams.get('category')
  const initialQueryCat = resolveQueryCategory(isNewParam, catParam)

  // Active sub-screen state: 'home' | 'questionnaire' | 'detail' | 'custom-modal'
  const [activeCategory, setActiveCategory] = useState<'fitness' | 'career' | 'income' | 'custom' | null>(
    initialQueryCat,
  )
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [selectedExtra, setSelectedExtra] = useState<string | null>(null)
  const [notesText, setNotesText] = useState('')
  const [savedGoalLabel, setSavedGoalLabel] = useState<string | null>(null)

  const [prevQueryCat, setPrevQueryCat] = useState(initialQueryCat)
  if (initialQueryCat !== prevQueryCat) {
    setPrevQueryCat(initialQueryCat)
    if (initialQueryCat) {
      setActiveCategory(initialQueryCat)
      setSelectedOption(null)
      setSelectedExtra(null)
      setNotesText('')
      setSavedGoalLabel(null)
    }
  }

  const [activeDetailGoal, setActiveDetailGoal] = useState<UserGoal | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Custom goal modal form state
  const [newTitle, setNewTitle] = useState('')
  const [newCatSlug, setNewCatSlug] = useState('lifestyle')
  const [newIcon, setNewIcon] = useState('🎯')
  const [newTimelineDays, setNewTimelineDays] = useState(90)
  const [newTargetAmount, setNewTargetAmount] = useState('')
  const [actionsList, setActionsList] = useState<string[]>([])
  const [currentActionText, setCurrentActionText] = useState('')

  const openQuestionnaire = useCallback((catId: 'fitness' | 'career' | 'income' | 'custom') => {
    setActiveCategory(catId)
    setSelectedOption(null)
    setSelectedExtra(null)
    setNotesText('')
    setSavedGoalLabel(null)
  }, [])

  // Redirect ?cat=lifestyle straight to /dashboard/lifestyle
  useEffect(() => {
    if (catParam === 'lifestyle') {
      router.replace('/dashboard/lifestyle')
    }
  }, [catParam, router])

  // Group user's active goals by category
  const goalsByCategory = useMemo(() => {
    const active = userGoals.filter((ug) => ug.status === 'ACTIVE')

    const matchCategory = (ug: UserGoal, slugs: string[]) => {
      const s = (ug.categorySlug || ug.goal?.category?.slug || '').toLowerCase()
      const gSlug = (ug.goal?.slug || '').toLowerCase()
      return slugs.includes(s) || slugs.includes(gSlug)
    }

    const lifestyleGoals = active.filter(
      (ug) =>
        matchCategory(ug, ['lifestyle', 'home-refresh-package']) &&
        (ug.goal?.slug || '') !== 'healthy-living-lifestyle',
    )
    const fitnessGoals = active.filter((ug) =>
      matchCategory(ug, ['fitness', 'health-fitness', 'wellness-lifestyle', 'healthy-living-lifestyle']),
    )
    const careerGoals = active.filter((ug) =>
      matchCategory(ug, ['career', 'work-growth', 'learn-a-skill']),
    )
    const incomeGoals = active.filter((ug) =>
      matchCategory(ug, ['income', 'start-a-business']),
    )

    const coreIds = new Set(
      [...lifestyleGoals, ...fitnessGoals, ...careerGoals, ...incomeGoals].map(
        (g) => g.id || g.uuid,
      ),
    )

    const otherCustomGoals = active.filter((ug) => {
      const s = (ug.categorySlug || ug.goal?.category?.slug || '').toLowerCase()
      if (s === 'housing' || s === 'home-utilities') return false
      return !coreIds.has(ug.id || ug.uuid)
    })

    return {
      lifestyle: lifestyleGoals,
      fitness: fitnessGoals,
      career: careerGoals,
      income: incomeGoals,
      custom: otherCustomGoals,
    }
  }, [userGoals])

  // Active commerce orders count for lifestyle traction
  const activeOrdersCount = useMemo(() => {
    const orders = tenantOrdersData?.orders || []
    return orders.filter((ord) => !['CANCELLED', 'REFUNDED'].includes(ord.status)).length
  }, [tenantOrdersData])

  // Compute card metrics for each prototype category
  const lifestyleCardData = useMemo(() => {
    const list = goalsByCategory.lifestyle
    if (list.length > 0) {
      const primary = list[0]
      const pct = Math.max(
        5,
        Math.round(list.reduce((acc, g) => acc + (g.progressPct || 0), 0) / list.length),
      )
      const sub = primary.title || primary.goal?.title || 'Travel more'
      return { pct, subtitle: sub }
    }
    if (activeOrdersCount > 0) {
      return {
        pct: 15,
        subtitle: `${activeOrdersCount} active lifestyle package${activeOrdersCount > 1 ? 's' : ''}`,
      }
    }
    return {
      pct: 5,
      subtitle: 'Home refresh, wellness & everyday perks',
    }
  }, [goalsByCategory.lifestyle, activeOrdersCount])

  const getCategoryCardState = (
    catKey: 'fitness' | 'career' | 'income',
    defaultSubtitle: string,
  ) => {
    const list = goalsByCategory[catKey]
    if (list.length > 0) {
      const primary = list[0]
      const rawPct = Math.round(
        list.reduce((acc, g) => acc + (g.progressPct || 0), 0) / list.length,
      )
      const pct = rawPct > 0 ? rawPct : 5
      const rawTitle = primary.title || primary.goal?.title || defaultSubtitle
      const subtitle =
        catKey === 'fitness' && rawPct > 0
          ? `${rawTitle} · ${rawPct}% progress`
          : rawTitle
      return {
        hasGoal: true,
        badge: 'IN PROGRESS' as const,
        badgeClass: 'proto-goals__badge--live',
        pct,
        subtitle,
        primaryGoal: primary,
      }
    }
    return {
      hasGoal: false,
      badge: 'GET STARTED' as const,
      badgeClass: 'proto-goals__badge--collect',
      pct: 0,
      subtitle: defaultSubtitle,
      primaryGoal: null,
    }
  }

  const fitnessCard = getCategoryCardState('fitness', '10% progress · Build healthy habits')
  const careerCard = getCategoryCardState('career', 'Certifications, skills & career growth')
  const incomeCard = getCategoryCardState('income', 'Grow your income in 2027')

  const handleCategoryCardClick = (catId: 'fitness' | 'career' | 'income') => {
    const list = goalsByCategory[catId]
    if (list.length > 0) {
      setActiveDetailGoal(list[0])
    } else {
      openQuestionnaire(catId)
    }
  }

  const handleSubmitQuestionnaire = async () => {
    if (!activeCategory) return
    const q = QUESTIONNAIRE_CONFIGS[activeCategory]
    const chosen = selectedOption || notesText.trim()

    if (!chosen) {
      toastError('Pick an option or tell us in your own words first.')
      return
    }

    const extraDef = q.extras && selectedOption ? q.extras[selectedOption] : undefined
    if (extraDef && !selectedExtra) {
      toastError('Please pick which certification you are working towards.')
      return
    }

    let finalSelection = chosen
    if (activeCategory === 'career' && selectedExtra) {
      finalSelection = `Interested in ${selectedExtra}`
    } else if (notesText.trim() && selectedOption === 'Something else') {
      finalSelection = notesText.trim()
    } else if (notesText.trim() && selectedOption === 'Something not listed here') {
      finalSelection = notesText.trim()
    }

    try {
      await submitQuestionnaireMutation.mutateAsync({
        categorySlug: activeCategory === 'custom' ? 'other' : activeCategory,
        questionTitle: q.title,
        selectedOption: finalSelection,
        durationDays: 180,
      })
      setSavedGoalLabel(selectedExtra || finalSelection)
      success('Goal added to your plan')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save goal'
      toastError(msg)
    }
  }

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

  // ── SUB-SCREEN: QUESTIONNAIRE (Matches Prototype #screen-questionnaire) ──
  if (activeCategory) {
    const q = QUESTIONNAIRE_CONFIGS[activeCategory]
    const extraDef = q.extras && selectedOption ? q.extras[selectedOption] : undefined

    return (
      <div className="proto-goals">
        <div className="proto-goals__topbar">
          <button
            type="button"
            className="proto-goals__icon-btn"
            onClick={() => setActiveCategory(null)}
            aria-label="Back to goals"
          >
            <ChevronLeft size={18} strokeWidth={2.2} />
          </button>
          <h2 className="proto-goals__topbar-title">{q.title}</h2>
        </div>

        {!savedGoalLabel ? (
          <div className="proto-goals__q-form">
            <p className="proto-goals__subhead">{q.intro}</p>

            <div className="proto-goals__section-label">{q.label}</div>
            <div className="proto-goals__q-options">
              {q.options.map((opt) => {
                const isSelected = selectedOption === opt
                return (
                  <button
                    key={opt}
                    type="button"
                    className={`proto-goals__opt ${isSelected ? 'is-on' : ''}`}
                    onClick={() => {
                      setSelectedOption(opt)
                      setSelectedExtra(null)
                    }}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>

            {extraDef && (
              <div className="proto-goals__q-extra">
                <div className="proto-goals__section-label">{extraDef.label}</div>
                <div className="proto-goals__q-options">
                  {extraDef.options.map((extOpt) => (
                    <button
                      key={extOpt}
                      type="button"
                      className={`proto-goals__opt ${selectedExtra === extOpt ? 'is-on' : ''}`}
                      onClick={() => setSelectedExtra(extOpt)}
                    >
                      {extOpt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <label className="proto-goals__section-label" htmlFor="proto-q-notes">
              {q.notesLabel || 'Anything else we should know?'}
            </label>
            <textarea
              id="proto-q-notes"
              className="proto-goals__field"
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder={
                q.notesLabel
                  ? 'Type your goal, and a few actions you want to take'
                  : 'Optional — tell us in your own words'
              }
            />

            <button
              type="button"
              className="proto-goals__btn-primary"
              onClick={handleSubmitQuestionnaire}
              disabled={submitQuestionnaireMutation.isPending}
            >
              {submitQuestionnaireMutation.isPending ? 'Saving...' : 'Save this'}
            </button>
          </div>
        ) : (
          <div className="proto-goals__thanks">
            <div className="proto-goals__thanks-icon">
              <Check size={28} strokeWidth={2.4} />
            </div>
            <h2 className="proto-goals__thanks-title">Thank you, {firstName}</h2>
            <p className="proto-goals__thanks-copy">
              “{savedGoalLabel}” has been added to your goals. We&apos;ll show you the next steps to get there.
            </p>
            <div className="proto-goals__stack-btns">
              <button
                type="button"
                className="proto-goals__btn-primary"
                onClick={() => setActiveCategory(null)}
              >
                Back to goals
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── MAIN SCREEN: YOUR GOALS (Matches Prototype Screenshot) ──
  return (
    <div className="proto-goals">
      {/* Greeting & Page Heading */}
      <div className="proto-goals__hello">
        <div className="proto-goals__greet">
          {getTimeGreeting()}, {firstName}
        </div>
        <h1 className="proto-goals__title">Your goals</h1>
      </div>

      {/* Goal Category Cards List */}
      <div className="proto-goals__list">
        {/* 1. TOP FEATURED CARD: Lifestyle goals -> Click leads to /dashboard/lifestyle */}
        <button
          type="button"
          className="proto-goals__card proto-goals__card--active-cat"
          onClick={() => router.push('/dashboard/lifestyle')}
        >
          <div className="proto-goals__copy">
            <div className="proto-goals__kicker-row">
              <span className="proto-goals__badge proto-goals__badge--live">ACTIVE</span>
            </div>
            <h3 className="proto-goals__card-title">Lifestyle goals</h3>
            <p className="proto-goals__card-desc">{lifestyleCardData.subtitle}</p>
          </div>
          {renderPrototypeRing(lifestyleCardData.pct, 52)}
        </button>

        {/* 2. Health & fitness goals */}
        <button
          type="button"
          className="proto-goals__card"
          onClick={() => handleCategoryCardClick('fitness')}
        >
          <div className="proto-goals__copy">
            <div className="proto-goals__kicker-row">
              <span className={`proto-goals__badge ${fitnessCard.badgeClass}`}>
                {fitnessCard.badge}
              </span>
            </div>
            <h3 className="proto-goals__card-title">Health &amp; fitness goals</h3>
            <p className="proto-goals__card-desc">{fitnessCard.subtitle}</p>
          </div>
          {renderPrototypeRing(fitnessCard.pct, 52)}
        </button>

        {/* 3. Career & professional goals */}
        <button
          type="button"
          className="proto-goals__card"
          onClick={() => handleCategoryCardClick('career')}
        >
          <div className="proto-goals__copy">
            <div className="proto-goals__kicker-row">
              <span className={`proto-goals__badge ${careerCard.badgeClass}`}>
                {careerCard.badge}
              </span>
            </div>
            <h3 className="proto-goals__card-title">Career &amp; professional goals</h3>
            <p className="proto-goals__card-desc">{careerCard.subtitle}</p>
          </div>
          {renderPrototypeRing(careerCard.pct, 52)}
        </button>

        {/* 4. Income goals */}
        <button
          type="button"
          className="proto-goals__card"
          onClick={() => handleCategoryCardClick('income')}
        >
          <div className="proto-goals__copy">
            <div className="proto-goals__kicker-row">
              <span className={`proto-goals__badge ${incomeCard.badgeClass}`}>
                {incomeCard.badge}
              </span>
            </div>
            <h3 className="proto-goals__card-title">Income goals</h3>
            <p className="proto-goals__card-desc">{incomeCard.subtitle}</p>
          </div>
          {renderPrototypeRing(incomeCard.pct, 52)}
        </button>

        {/* 5. Any Additional Custom Goals */}
        {goalsByCategory.custom.map((ug) => {
          const pct = ug.progressPct || 5
          const title = ug.title || ug.goal?.title || 'Personal goal'
          return (
            <button
              key={ug.id || ug.uuid}
              type="button"
              className="proto-goals__card"
              onClick={() => setActiveDetailGoal(ug)}
            >
              <div className="proto-goals__copy">
                <div className="proto-goals__kicker-row">
                  <span className="proto-goals__badge proto-goals__badge--live">
                    IN PROGRESS
                  </span>
                </div>
                <h3 className="proto-goals__card-title">{title}</h3>
                <p className="proto-goals__card-desc">
                  {ug.notes || 'Personal milestone · Tap to view action steps'}
                </p>
              </div>
              {renderPrototypeRing(pct, 52)}
            </button>
          )
        })}
      </div>

      {/* Suggest a different goal CTA */}
      <button
        type="button"
        className="proto-goals__custom-link"
        onClick={() => openQuestionnaire('custom')}
      >
        Suggest a different goal
      </button>

      {/* Coming soon banner */}
      <div className="proto-goals__soon">
        <strong>Coming soon:</strong> See how others are progressing towards their goals.
      </div>

      {/* DETAIL & ACTIONS MODAL FOR ACTIVE GOALS */}
      {activeDetailGoal && (
        <div
          className="goal-modal-overlay"
          onClick={() => setActiveDetailGoal(null)}
        >
          <div className="goal-modal" onClick={(e) => e.stopPropagation()}>
            <div className="goal-modal__head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {renderPrototypeRing(activeDetailGoal.progressPct || 0, 38)}
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

                {!activeDetailGoal.actions || activeDetailGoal.actions.length === 0 ? (
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

              <button
                type="button"
                className="goal-modal__submit"
                onClick={() => {
                  const cat = (
                    activeDetailGoal.categorySlug ||
                    activeDetailGoal.goal?.category?.slug ||
                    ''
                  ).toLowerCase()
                  setActiveDetailGoal(null)
                  if (cat === 'fitness') {
                    router.push('/dashboard/lifestyle?goal=healthy-living-lifestyle')
                  } else if (cat === 'career' || cat === 'income') {
                    router.push(`/dashboard/lifestyle?category=${cat}`)
                  } else {
                    router.push('/dashboard/lifestyle')
                  }
                }}
              >
                Explore packages for this goal <ArrowRight size={15} style={{ display: 'inline', verticalAlign: '-2px' }} />
              </button>

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
    </div>
  )
}
