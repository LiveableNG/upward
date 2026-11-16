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

export type CategoryKey =
  | 'housing'
  | 'income'
  | 'career'
  | 'pay-less'
  | 'children'
  | 'custom'

interface CategoryQuestionConfig {
  id: CategoryKey
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

const QUESTIONNAIRE_CONFIGS: Record<CategoryKey, CategoryQuestionConfig> = {
  housing: {
    id: 'housing',
    title: 'Home & lifestyle goals',
    intro: 'Housing is more than rent. Pick your home, move, or living space goal.',
    label: 'What do you want to achieve for your home?',
    options: [
      'Pay my rent now',
      'Pay less for my next rent',
      'Move to a new apartment (coming soon)',
      'Buy a house',
      'Prepare for the new year',
      'Improve my home feel',
      'Improve remote work productivity',
      'Travel',
      'Gift someone',
    ],
    extras: {
      'Prepare for the new year': {
        label: 'Home refresh packages you are interested in:',
        options: [
          'Cleaning & sanitation essentials',
          'Room carpets & footmats',
          'Kitchen & dining renewal bundle',
          'Bathroom upgrade package',
        ],
      },
      'Gift someone': {
        label: 'Occasion for the gift:',
        options: ['Birthday', 'Christmas & holidays', 'Wedding / Anniversary', 'Housewarming'],
      },
    },
  },
  income: {
    id: 'income',
    title: 'Income & financial goals',
    intro: 'Earn more, increase financial stability, build additional income streams and make progress financially.',
    label: 'What is your primary income goal?',
    options: [
      'Get a promotion',
      'Start a side hustle',
      'Start freelancing',
      'Get a remote international job',
      'Monetise my skills',
      'Grow my existing income',
      'Get my first source of income',
      'Start investing',
      'Save more money',
      'Reduce my expenses',
      'Relocate abroad',
      'Save towards an important family occasion',
      'Pay off my debts',
    ],
  },
  career: {
    id: 'career',
    title: 'Career & professional development',
    intro: 'Advance professionally, switch fields, acquire qualifications, and sharpen workplace skills.',
    label: 'What do you want to achieve?',
    options: [
      'Get my first job',
      'Get an internship',
      'Change my career',
      'Switch career to tech',
      'Get promoted to management',
      'Start my own business',
      'Improve my leadership skills',
      'Improve my presentation skills',
      'Improve my speaking skills',
      'Get a mentor/coach',
      'Become a better salesperson',
      'Improve my professional appearance',
      'Start working remotely',
      'Improve my remote-work setup',
      'Get a professional certification',
      'Get a professional licence',
      'Take a professional examination',
      'Get a master\'s degree',
      'Grow my professional career',
      'Grow my business career',
    ],
    extras: {
      'Get a professional certification': {
        label: 'Which certification are you preparing for?',
        options: [
          'PMP',
          'ICAN',
          'OGF Academy',
          'CIPM',
          'NIPM',
          'CISA (ISACA)',
          'CCNA (Cisco)',
          'CEH (EC-Council)',
          'TOGAF',
          'DCP / ACIN / FCIN',
          'CPPM / CLM / CPPP',
          'HSE',
          'TCRN License',
          'NIMASA Maritime Standards',
          'Professional Engineering Exam',
          'Other / Unlisted',
        ],
      },
      'Get a professional licence': {
        label: 'Which professional licence?',
        options: [
          'COREN (Engineering)',
          'NSE',
          'SURCON (Surveying)',
          'NIS',
          'NIESV (Estate Surveyors)',
          'CORBON (Builders)',
          'NIOB',
          'NIQS (Quantity Surveyors)',
          'Other licence',
        ],
      },
    },
  },
  'pay-less': {
    id: 'pay-less',
    title: 'Pay less for stuff',
    intro: 'Cut routine expenses across laundry, grocery, housing, and commute.',
    label: 'Where do you want to save money?',
    options: [
      'Laundry — Save on drycleaning',
      'Grocery — Regular items bulk discount',
      'Grocery — Top monthly spends',
      'Housing — Share space with a roommate',
      'Commute — Reduce transportation costs',
    ],
    extras: {
      'Laundry — Save on drycleaning': {
        label: 'How much do you currently spend on drycleaning per month?',
        options: ['Under ₦15,000', '₦15,000 - ₦35,000', '₦35,000 - ₦70,000', 'Above ₦70,000'],
      },
      'Grocery — Regular items bulk discount': {
        label: 'What 3 things do you buy regularly?',
        options: [
          'Rice, oil & provisions',
          'Beverages & dairy',
          'Meat, poultry & fish',
          'Toiletries & home cleaning',
          'Fresh fruits & vegetables',
        ],
      },
      'Grocery — Top monthly spends': {
        label: 'What 3 things do you spend the most money on monthly?',
        options: [
          'Bulk grains & cooking oils',
          'Meat, fish & poultry',
          'Baby food & hygiene items',
          'Snacks & packaged provisions',
        ],
      },
      'Housing — Share space with a roommate': {
        label: 'Would you be open to sharing your space with a roommate?',
        options: [
          'Yes, definitely open',
          'Only with a verified professional',
          'Maybe in the future',
          'No, prefer living alone',
        ],
      },
      'Commute — Reduce transportation costs': {
        label: 'How much do you spend on transportation per month?',
        options: ['Under ₦25,000', '₦25,000 - ₦60,000', '₦60,000 - ₦120,000', 'Above ₦120,000'],
      },
    },
  },
  children: {
    id: 'children',
    title: 'Children\'s development',
    intro: 'Help your children develop academic skills, talents, and extracurricular passions.',
    label: 'What do you want your child to achieve?',
    options: [
      'Improve my child\'s mathematics',
      'Improve my child\'s English',
      'Improve my child\'s speaking skills',
      'Introduce my child to programming and technology',
      'Improve my child\'s digital skills',
      'Prepare my child for entrance examinations',
      'Develop my child\'s leadership skills',
      'Get my child involved in sports',
      'Help my child learn piano',
      'Develop my child’s musical ability beyond piano',
      'Help my child learn martial arts',
      'Improve my child\'s creative skills',
    ],
    extras: {
      'Get my child involved in sports': {
        label: 'Which sports activity?',
        options: ['Lawn tennis', 'Swimming', 'Football', 'Basketball', 'Athletics'],
      },
      'Help my child learn martial arts': {
        label: 'Which martial art?',
        options: ['Karate', 'Taekwondo', 'Judo', 'Self-defense basics'],
      },
      'Develop my child’s musical ability beyond piano': {
        label: 'Which musical instrument or skill?',
        options: ['Violin', 'Guitar', 'Drums / Percussion', 'Voice / Singing'],
      },
    },
  },
  custom: {
    id: 'custom',
    title: 'Set a custom goal',
    intro: 'Create your own goal, describe the outcome, add action steps, and set your target timeline.',
    label: 'What type of goal do you want to create?',
    options: [
      'Create my own goal',
      'Describe what I want to achieve',
      'Add actions towards my goal',
      'Suggest a new goal category',
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
): CategoryKey | null {
  if (isNew || cat === 'custom') return 'custom'
  if (cat === 'housing' || cat === 'home' || cat === 'lifestyle') return 'housing'
  if (cat === 'income') return 'income'
  if (cat === 'career' || cat === 'work-growth') return 'career'
  if (cat === 'pay-less' || cat === 'expenses' || cat === 'laundry' || cat === 'grocery') return 'pay-less'
  if (cat === 'children' || cat === 'family') return 'children'
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
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(initialQueryCat)
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
    (catId: CategoryKey) => {
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

  // Group user's active goals by category
  const goalsByCategory = useMemo(() => {
    const active = userGoals.filter((ug) => ug.status === 'ACTIVE')

    const matchCategory = (ug: UserGoal, slugs: string[]) => {
      const s = (ug.categorySlug || ug.goal?.category?.slug || '').toLowerCase()
      const gSlug = (ug.goal?.slug || '').toLowerCase()
      return slugs.includes(s) || slugs.includes(gSlug)
    }

    const housingGoals = active.filter((ug) =>
      matchCategory(ug, ['housing', 'home-lifestyle', 'home', 'lifestyle']),
    )
    const incomeGoals = active.filter((ug) =>
      matchCategory(ug, ['income']),
    )
    const careerGoals = active.filter((ug) =>
      matchCategory(ug, ['career', 'work-growth']),
    )
    const payLessGoals = active.filter((ug) =>
      matchCategory(ug, ['pay-less', 'expenses', 'laundry', 'grocery']),
    )
    const childrenGoals = active.filter((ug) =>
      matchCategory(ug, ['children', 'family', 'goals-for-my-children']),
    )

    const coreIds = new Set(
      [...housingGoals, ...incomeGoals, ...careerGoals, ...payLessGoals, ...childrenGoals].map(
        (g) => g.id || g.uuid,
      ),
    )

    const otherCustomGoals = active.filter((ug) => {
      const s = (ug.categorySlug || ug.goal?.category?.slug || '').toLowerCase()
      if (s === 'home-utilities') return false
      return !coreIds.has(ug.id || ug.uuid)
    })

    return {
      housing: housingGoals,
      income: incomeGoals,
      career: careerGoals,
      'pay-less': payLessGoals,
      children: childrenGoals,
      custom: otherCustomGoals,
    }
  }, [userGoals])

  const getCategoryCardState = (
    catKey: CategoryKey,
    defaultSubtitle: string,
  ) => {
    const list = goalsByCategory[catKey] || []
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

  const housingCard = getCategoryCardState('housing', 'Home readiness, rent savings & space improvements')
  const incomeCard = getCategoryCardState('income', 'Grow revenue, build reserves & invest')
  const careerCard = getCategoryCardState('career', 'Certifications, skills & career growth')
  const payLessCard = getCategoryCardState('pay-less', 'Cut laundry, groceries & commute expenses')
  const childrenCard = getCategoryCardState('children', 'School fees, skills & family milestones')

  const handleCategoryCardClick = (catId: CategoryKey) => {
    const list = goalsByCategory[catId] || []
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
      const targetCategorySlug = activeCategory

      if (activeCategory === 'custom' || finalActions.length > 0) {
        const iconMap: Record<string, string> = {
          housing: '🏠',
          income: '💼',
          career: '📚',
          'pay-less': '🏷️',
          children: '👶',
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
        {/* 1. Home & lifestyle goals */}
        <button
          type="button"
          className={`proto-goals__card ${housingCard.hasGoal ? 'proto-goals__card--active-cat' : ''}`}
          onClick={() => handleCategoryCardClick('housing')}
        >
          <div className="proto-goals__copy">
            <div className="proto-goals__kicker-row">
              <span className={`proto-goals__badge ${housingCard.badgeClass}`}>
                {housingCard.badge}
              </span>
            </div>
            <h3 className="proto-goals__card-title">Home &amp; lifestyle goals</h3>
            <p className="proto-goals__card-desc">{housingCard.subtitle}</p>
          </div>
          {renderPrototypeRing(housingCard.pct, 52)}
        </button>

        {/* 2. Income & financial goals */}
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

        {/* 3. Career & professional development */}
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
            <h3 className="proto-goals__card-title">Career &amp; professional development</h3>
            <p className="proto-goals__card-desc">{careerCard.subtitle}</p>
          </div>
          {renderPrototypeRing(careerCard.pct, 52)}
        </button>

        {/* 4. Pay less for stuff */}
        <button
          type="button"
          className={`proto-goals__card ${payLessCard.hasGoal ? 'proto-goals__card--active-cat' : ''}`}
          onClick={() => handleCategoryCardClick('pay-less')}
        >
          <div className="proto-goals__copy">
            <div className="proto-goals__kicker-row">
              <span className={`proto-goals__badge ${payLessCard.badgeClass}`}>
                {payLessCard.badge}
              </span>
            </div>
            <h3 className="proto-goals__card-title">Pay less for stuff</h3>
            <p className="proto-goals__card-desc">{payLessCard.subtitle}</p>
          </div>
          {renderPrototypeRing(payLessCard.pct, 52)}
        </button>

        {/* 5. Children development */}
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
            <h3 className="proto-goals__card-title">Children&#39;s development</h3>
            <p className="proto-goals__card-desc">{childrenCard.subtitle}</p>
          </div>
          {renderPrototypeRing(childrenCard.pct, 52)}
        </button>

        {/* 6. Any Additional Custom Goals */}
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

      {/* Suggest a different goal CTA / Custom Goal */}
      <button
        type="button"
        className="proto-goals__custom-link"
        onClick={() => openQuestionnaire('custom')}
      >
        + Add a custom goal or suggest a new category
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
                  if (cat) {
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
