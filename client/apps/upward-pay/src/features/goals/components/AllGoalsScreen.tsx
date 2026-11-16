'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, Plus, Check, Trash2, ArrowRight, X } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import {
  useUserGoals,
  useGoalCategories,
  useGoalsList,
  useCreateCustomGoal,
  useSubmitQuestionnaire,
  useToggleGoalAction,
  useRemoveUserGoal,
} from '../hooks/useGoals'
import { type UserGoal, type GoalTargetType } from '../types/goals.types'
import { useToast } from '@/components/common/Toast'

interface CategoryQuestionConfig {
  id: 'income' | 'career' | 'children' | 'fitness' | 'custom'
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

const QUESTIONNAIRE_CONFIGS: Record<
  'income' | 'career' | 'children' | 'fitness' | 'custom',
  CategoryQuestionConfig
> = {
  income: {
    id: 'income',
    title: 'Income & financial goals',
    intro: 'Pick how you want to grow your income and reserves.',
    label: 'What is your primary income goal?',
    options: [
      'Start a business',
      'Grow my existing business revenue',
      'Add a second stream of income',
      'Save towards an emergency or investment fund',
      'Start investing more seriously',
    ],
  },
  career: {
    id: 'career',
    title: 'Career & professional goals',
    intro: 'Pick where you want to grow professionally this year.',
    label: 'What do you want to achieve?',
    options: [
      'Pass a professional certification exam',
      'Learn a new high-income skill',
      'Transition into a new career role',
      'Get promoted at my current workplace',
      'Build a stronger professional network',
    ],
    extras: {
      'Pass a professional certification exam': {
        label: 'Which certification?',
        options: ['ICAN', 'ACCA', 'CFA', 'PMP', 'CIPM', 'AWS / Cloud', 'Other'],
      },
    },
  },
  children: {
    id: 'children',
    title: 'Children development',
    intro: 'School fees, skills, family milestones & future planning.',
    label: 'What is your primary milestone or goal?',
    options: [
      'Goals for my children',
      'A family goal',
      'School fees and education fund',
      'Extracurriculars and skills development',
      'Buy a family car',
      'Travel abroad',
    ],
  },
  fitness: {
    id: 'fitness',
    title: 'Health & fitness goals',
    intro: 'Pick your focus area or enter your own goal below.',
    label: 'What is your main health or fitness goal?',
    options: [
      'Lose weight',
      'Build muscle or strength',
      'Stay consistent with exercise',
      'Improve my diet and nutrition',
      'Prepare for a fitness event or run',
    ],
  },
  custom: {
    id: 'custom',
    title: 'Set a goal',
    intro: 'Pick a goal idea or enter your own, then add the steps to complete it.',
    label: 'What is your goal?',
    options: [
      'Goals for my children',
      'Health & fitness goal',
      'A family goal',
      'Buy a car',
      'Travel abroad',
    ],
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

function resolveQueryCategory(
  isNew: boolean,
  cat: string | null,
): 'income' | 'career' | 'children' | 'fitness' | 'custom' | null {
  if (isNew || cat === 'custom') return 'custom'
  if (cat === 'income') return 'income'
  if (cat === 'career' || cat === 'work-growth') return 'career'
  if (cat === 'other' || cat === 'children' || cat === 'family') return 'children'
  if (cat === 'fitness' || cat === 'wellness-lifestyle') return 'fitness'
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
  const { data: catalogGoalsData } = useGoalsList({ status: 'PUBLISHED', take: 100 })

  const createGoalMutation = useCreateCustomGoal()
  const submitQuestionnaireMutation = useSubmitQuestionnaire()
  const toggleActionMutation = useToggleGoalAction()
  const removeGoalMutation = useRemoveUserGoal()

  const isNewParam = searchParams.get('new') === 'true'
  const catParam = searchParams.get('cat') || searchParams.get('category')
  const initialQueryCat = resolveQueryCategory(isNewParam, catParam)

  // Active sub-screen state: 'home' | 'questionnaire' | 'detail' | 'custom-modal'
  const [activeCategory, setActiveCategory] = useState<
    'income' | 'career' | 'children' | 'fitness' | 'custom' | null
  >(initialQueryCat)
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
  const [newCatSlug, setNewCatSlug] = useState('income')
  const [newIcon, setNewIcon] = useState('🎯')
  const [newTimelineDays, setNewTimelineDays] = useState(90)
  const [newTargetAmount, setNewTargetAmount] = useState('')
  const [actionsList, setActionsList] = useState<string[]>([])
  const [currentActionText, setCurrentActionText] = useState('')

  const openQuestionnaire = useCallback(
    (catId: 'income' | 'career' | 'children' | 'fitness' | 'custom') => {
      setActiveCategory(catId)
      setSelectedOption(null)
      setSelectedExtra(null)
      setNotesText('')
      setActionsList([])
      setCurrentActionText('')
      setNewTimelineDays(180)
      setSavedGoalLabel(null)
    },
    [],
  )

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

    const incomeGoals = active.filter((ug) =>
      matchCategory(ug, ['income', 'start-a-business']),
    )
    const careerGoals = active.filter((ug) =>
      matchCategory(ug, ['career', 'work-growth', 'learn-a-skill']),
    )
    const childrenGoals = active.filter((ug) =>
      matchCategory(ug, ['other', 'children', 'family', 'goals-for-my-children']),
    )
    const fitnessGoals = active.filter((ug) =>
      matchCategory(ug, ['fitness', 'health-fitness', 'wellness-lifestyle', 'healthy-living-lifestyle']),
    )

    const coreIds = new Set(
      [...incomeGoals, ...careerGoals, ...childrenGoals, ...fitnessGoals].map(
        (g) => g.id || g.uuid,
      ),
    )

    const otherCustomGoals = active.filter((ug) => {
      const s = (ug.categorySlug || ug.goal?.category?.slug || '').toLowerCase()
      if (s === 'housing' || s === 'lifestyle' || s === 'home-utilities') return false
      return !coreIds.has(ug.id || ug.uuid)
    })

    return {
      income: incomeGoals,
      career: careerGoals,
      children: childrenGoals,
      fitness: fitnessGoals,
      custom: otherCustomGoals,
    }
  }, [userGoals])

  const getCategoryCardState = (
    catKey: 'income' | 'career' | 'children' | 'fitness',
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
        rawPct > 0
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

  const incomeCard = getCategoryCardState('income', 'Grow revenue, build reserves & invest')
  const careerCard = getCategoryCardState('career', 'Certifications, skills & career growth')
  const childrenCard = getCategoryCardState('children', 'School fees, skills & family milestones')
  const fitnessCard = getCategoryCardState('fitness', 'Build healthy habits & fitness routines')

  const handleCategoryCardClick = (catId: 'income' | 'career' | 'children' | 'fitness') => {
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
    const chosen = notesText.trim() || selectedOption

    if (!chosen) {
      toastError('Pick a goal option or enter your own goal first.')
      return
    }

    const extraDef = q.extras && selectedOption ? q.extras[selectedOption] : undefined
    if (extraDef && !selectedExtra && !notesText.trim()) {
      toastError('Please pick which certification you are working towards.')
      return
    }

    let finalSelection = chosen
    if (activeCategory === 'career' && selectedExtra && !notesText.trim()) {
      finalSelection = `Interested in ${selectedExtra}`
    }

    // Collect user-created action steps (including any pending text in the step input)
    const pendingStep = currentActionText.trim()
    const finalActions =
      pendingStep && !actionsList.includes(pendingStep)
        ? [...actionsList, pendingStep]
        : actionsList

    if (activeCategory === 'custom' && finalActions.length === 0) {
      toastError('Add at least one action step to help you complete this goal.')
      return
    }

    try {
      const targetCategorySlug =
        activeCategory === 'children' || activeCategory === 'custom'
          ? 'other'
          : activeCategory

      if (activeCategory === 'custom' || finalActions.length > 0) {
        const iconMap: Record<string, string> = {
          income: '💼',
          career: '📚',
          children: '👶',
          fitness: '💪',
          custom: '🎯',
        }
        await createGoalMutation.mutateAsync({
          title: finalSelection,
          categorySlug: targetCategorySlug,
          icon: iconMap[activeCategory] || '🎯',
          targetType: 'CHECKLIST_ACTIONS',
          durationDays: newTimelineDays,
          actions: finalActions,
        })
      } else {
        await submitQuestionnaireMutation.mutateAsync({
          categorySlug: targetCategorySlug,
          questionTitle: q.title,
          selectedOption: finalSelection,
          durationDays: newTimelineDays,
        })
      }
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

  // ── SUB-SCREEN: QUESTIONNAIRE / CUSTOM GOAL BUILDER ──
  if (activeCategory) {
    const q = QUESTIONNAIRE_CONFIGS[activeCategory]
    const targetSlug =
      activeCategory === 'custom' || activeCategory === 'children'
        ? 'other'
        : activeCategory
    const dbGoalsForCat = (catalogGoalsData?.data || []).filter(
      (g) => g.category?.slug === targetSlug,
    )
    const dbOptions = dbGoalsForCat
      .map((g) => g.title)
      .filter((t): t is string => Boolean(t))
    const effectiveOptions = dbOptions.length > 0 ? dbOptions : q.options
    const extraDef = q.extras && selectedOption ? q.extras[selectedOption] : undefined
    const isSavingGoal =
      submitQuestionnaireMutation.isPending || createGoalMutation.isPending

    const handleSelectQuestionnaireOption = (opt: string) => {
      setSelectedOption(opt)
      setNotesText('')
      setSelectedExtra(null)
      const matchedDbGoal = dbGoalsForCat.find(
        (g) => (g.title || '').toLowerCase() === opt.toLowerCase(),
      )
      if (matchedDbGoal?.actionTemplates && matchedDbGoal.actionTemplates.length > 0) {
        setActionsList(matchedDbGoal.actionTemplates.map((t) => t.title))
      } else {
        setActionsList([])
      }
      if (matchedDbGoal?.defaultDurationDays) {
        setNewTimelineDays(matchedDbGoal.defaultDurationDays)
      }
    }

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
            <div
              className={
                activeCategory === 'custom'
                  ? 'proto-goals__q-tags'
                  : 'proto-goals__q-options'
              }
            >
              {effectiveOptions.map((opt) => {
                const isSelected = selectedOption === opt && !notesText.trim()
                return (
                  <button
                    key={opt}
                    type="button"
                    className={`${
                      activeCategory === 'custom' ? 'proto-goals__tag' : 'proto-goals__opt'
                    } ${isSelected ? 'is-on' : ''}`}
                    onClick={() => handleSelectQuestionnaireOption(opt)}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>

            {extraDef && !notesText.trim() && (
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
              Or enter your own goal
            </label>
            <input
              id="proto-q-notes"
              type="text"
              className="goal-modal__input"
              value={notesText}
              onChange={(e) => {
                setNotesText(e.target.value)
                if (e.target.value.trim()) {
                  setSelectedOption(null)
                  setSelectedExtra(null)
                }
              }}
              placeholder={
                activeCategory === 'custom'
                  ? 'e.g. Learn to fly a plane'
                  : 'Type your goal in your own words'
              }
            />

            {/* User-Created Action Steps Builder */}
            <div className="proto-goals__section-label">
              Steps to complete this goal
              {activeCategory !== 'custom' ? ' (Optional)' : ''}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <input
                type="text"
                className="goal-modal__input"
                placeholder="Add a step (e.g. Book ground school lessons)"
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
                style={{ flexShrink: 0, padding: '0 14px' }}
                onClick={handleAddActionItem}
              >
                <Plus size={15} style={{ display: 'inline', verticalAlign: '-2px' }} /> Add
              </button>
            </div>

            {actionsList.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
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
                      aria-label={`Remove step ${i + 1}`}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted, #8a8a8a)',
                        cursor: 'pointer',
                        padding: '2px 4px',
                      }}
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="proto-goals__section-label">Timeline</div>
            <div className="goal-modal__chips" style={{ marginBottom: '18px' }}>
              {[
                { label: '30 days', days: 30 },
                { label: '3 months', days: 90 },
                { label: '6 months', days: 180 },
                { label: '1 year', days: 365 },
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

            <button
              type="button"
              className="proto-goals__btn-primary"
              onClick={handleSubmitQuestionnaire}
              disabled={isSavingGoal}
            >
              {isSavingGoal ? 'Saving...' : 'Save this'}
            </button>
          </div>
        ) : (
          <div className="proto-goals__thanks">
            <div className="proto-goals__thanks-icon">
              <Check size={28} strokeWidth={2.4} />
            </div>
            <h2 className="proto-goals__thanks-title">Thank you, {firstName}</h2>
            <p className="proto-goals__thanks-copy">
              “{savedGoalLabel}” has been added to your goals. You can check off your steps as you complete them.
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
      {/* Page Heading */}
      <div className="proto-goals__hello">
        <h1 className="proto-goals__title">Your goals</h1>
      </div>

      {/* Goal Category Cards List */}
      <div className="proto-goals__list">
        {/* 1. Income & financial goals */}
        <button
          type="button"
          className={`proto-goals__card ${incomeCard.hasGoal ? 'proto-goals__card--active-cat' : ''}`}
          onClick={() => handleCategoryCardClick('income')}
        >
          <div className="proto-goals__copy">
            <div className="proto-goals__kicker-row">
              <span className={`proto-goals__badge ${incomeCard.badgeClass}`}>
                {incomeCard.badge}
              </span>
            </div>
            <h3 className="proto-goals__card-title">Income &amp; financial goals</h3>
            <p className="proto-goals__card-desc">{incomeCard.subtitle}</p>
          </div>
          {renderPrototypeRing(incomeCard.pct, 52)}
        </button>

        {/* 2. Career & professional goals */}
        <button
          type="button"
          className={`proto-goals__card ${careerCard.hasGoal ? 'proto-goals__card--active-cat' : ''}`}
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

        {/* 3. Children development */}
        <button
          type="button"
          className={`proto-goals__card ${childrenCard.hasGoal ? 'proto-goals__card--active-cat' : ''}`}
          onClick={() => handleCategoryCardClick('children')}
        >
          <div className="proto-goals__copy">
            <div className="proto-goals__kicker-row">
              <span className={`proto-goals__badge ${childrenCard.badgeClass}`}>
                {childrenCard.badge}
              </span>
            </div>
            <h3 className="proto-goals__card-title">Children development</h3>
            <p className="proto-goals__card-desc">{childrenCard.subtitle}</p>
          </div>
          {renderPrototypeRing(childrenCard.pct, 52)}
        </button>

        {/* 4. Health & fitness goals */}
        <button
          type="button"
          className={`proto-goals__card ${fitnessCard.hasGoal ? 'proto-goals__card--active-cat' : ''}`}
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
