'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Plus, Check, Trash2, ArrowRight, X, Home } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import {
  useUserGoals,
  useGoalCategories,
  useGoalsList,
  useCreateCustomGoal,
  useSubmitQuestionnaire,
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
      maxSelect?: number
    }
  >
  notesLabel?: string
  notesRequired?: boolean
}

const QUESTIONNAIRE_CONFIGS: Record<CategoryKey, CategoryQuestionConfig> = {
  housing: {
    id: 'housing',
    title: 'Home & lifestyle goals',
    intro: 'Renting, moving, home ownership and living space improvements.',
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
    intro: 'Earn more, increase financial stability and build extra income streams.',
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
    intro: 'Advance professionally, acquire qualifications and improve workplace skills.',
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
    intro: 'Spend less and find ways to reduce costs across routine expenses.',
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
        maxSelect: 1,
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
    intro: 'Skills, educational interests and activities for your children.',
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
    intro: 'Tell Upward what you want to achieve.',
    label: 'What type of goal do you want to create?',
    options: [
      'Create my own goal',
      'Describe what I want to achieve',
      'Suggest a new goal category',
    ],
  },
}

const GOAL_DESCRIPTIONS: Record<string, string> = {
  // Home & lifestyle goals (Doc Section A)
  'Pay my rent now': 'Make my rent payment through Upward.',
  'Pay less for my next rent': 'Build up savings towards my upcoming rent.',
  'Move to a new apartment (coming soon)': 'Plan and save towards moving into a new home; indicate where I want to move.',
  'Buy a house': 'Start preparing financially to buy a house in the future.',
  'Prepare for the new year': 'Prepare your home with curated essentials & home refresh packages.',
  'Improve my home feel': 'Improve the look and feel of my home with furniture and decoration.',
  'Improve remote work productivity': 'Make my home more suitable for work and everyday productivity.',
  'Travel': 'Plan and save towards travel, getaways, and vacation experiences.',
  'Gift someone': 'Plan gifts for birthdays, Christmas, and special occasions.',

  // Income & financial goals (Doc Section B)
  'Get a promotion': 'Get promoted in the coming year to increase my income.',
  'Start a side hustle': 'Find an additional source of income outside my main job.',
  'Start freelancing': 'Offer professional services to clients independently.',
  'Get a remote international job': 'Earn income by working remotely for an international employer.',
  'Monetise my skills': 'Earn money from skills I already possess.',
  'Grow my existing income': 'Increase what I currently earn.',
  'Get my first source of income': 'Start earning, particularly early in your career.',
  'Start investing': 'Begin investing towards long-term financial security.',
  'Save more money': 'Improve my ability to save and build financial reserves.',
  'Reduce my expenses': 'Spend less and find ways to reduce costs.',
  'Relocate abroad': 'Explore relocating to another country as an economic goal.',
  'Save towards an important family occasion': 'Save towards milestone family celebrations and events.',
  'Pay off my debts': 'Reduce or clear outstanding debts.',

  // Career & professional development (Doc Section C)
  'Get my first job': 'Secure my first employment opportunity.',
  'Get an internship': 'Gain practical experience in a chosen field.',
  'Change my career': 'Move from my current career into another field.',
  'Switch career to tech': 'Transition into the technology industry.',
  'Get promoted to management': 'Progress into a management or leadership role.',
  'Start my own business': 'Build a small or medium-sized business.',
  'Improve my leadership skills': 'Develop the skills needed to lead people and teams.',
  'Improve my presentation skills': 'Communicate clearly and present with impact.',
  'Improve my speaking skills': 'Become a better and more confident speaker.',
  'Get a mentor/coach': 'Connect with experienced guidance to accelerate growth.',
  'Become a better salesperson': 'Improve ability to communicate, persuade, and sell.',
  'Improve my professional appearance': 'Upgrade professional wardrobe and presentation.',
  'Start working remotely': 'Find an opportunity to work remotely.',
  'Improve my remote-work setup': 'Create a more suitable, work-friendly space.',
  'Get a professional certification': 'Prepare for and obtain a recognized qualification.',
  'Get a professional licence': 'Obtain a licence required to practise in a profession.',
  'Take a professional examination': 'Prepare for a specific professional exam.',
  'Get a master\'s degree': 'Plan and prepare for postgraduate studies.',
  'Grow my professional career': 'Become established and progress in my chosen profession.',
  'Grow my business career': 'Develop and advance my entrepreneurial career.',

  // Pay less for stuff (Doc Section D)
  'Laundry': 'Spend less on dry cleaning and laundry services.',
  'Grocery': 'Bulk buying and regular grocery savings.',
  'Housing': 'Share space or optimize housing utility bills.',
  'Commute': 'Save on transportation and daily transit costs.',
  'Electricity & utilities': 'Reduce energy bills and recurring utility costs.',

  // Children development (Doc Section E)
  'Improve my child\'s mathematics': 'Help my child become better at mathematics.',
  'Improve my child\'s English': 'Help my child improve their English skills.',
  'Improve my child\'s speaking skills': 'Help my child become a better speaker.',
  'Introduce my child to programming and technology': 'Enrol my child in coding classes and digital skills.',
  'Improve my child\'s digital skills': 'Teach useful computer and digital literacy.',
  'Prepare my child for entrance examinations': 'Support preparation for school entrance exams.',
  'Develop my child\'s leadership skills': 'Help my child develop confidence and leadership.',
  'Get my child involved in sports': 'Enrol in a sports club or lawn tennis.',
  'Help my child learn piano': 'Enrol in piano and instrumental music lessons.',
  'Develop my child’s musical ability beyond piano': 'Enrol in music and vocal lessons.',
  'Help my child learn martial arts': 'Enrol in karate or martial arts classes.',
  'Improve my child\'s creative skills': 'Support drawing, painting, crafts, and creativity.',
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
  const removeGoalMutation = useRemoveUserGoal()

  const isNewParam = searchParams.get('new') === 'true'
  const catParam = searchParams.get('cat') || searchParams.get('category')
  const initialQueryCat = resolveQueryCategory(isNewParam, catParam)

  // Active sub-screen state: 'home' | 'questionnaire' | 'detail' | 'custom-modal'
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(initialQueryCat)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [selectedExtras, setSelectedExtras] = useState<string[]>([])
  const [notesText, setNotesText] = useState('')
  const [savedGoalLabel, setSavedGoalLabel] = useState<string | null>(null)

  const [prevQueryCat, setPrevQueryCat] = useState(initialQueryCat)
  if (initialQueryCat !== prevQueryCat) {
    setPrevQueryCat(initialQueryCat)
    if (initialQueryCat) {
      setActiveCategory(initialQueryCat)
      setSelectedOption(null)
      setSelectedExtras([])
      setNotesText('')
      setSavedGoalLabel(null)
    }
  }

  const [activeDetailGoal, setActiveDetailGoal] = useState<UserGoal | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Ensure modal is dismissed whenever transitioning category views without cascading effect renders
  const [prevCategory, setPrevCategory] = useState(activeCategory)
  if (prevCategory !== activeCategory) {
    setPrevCategory(activeCategory)
    setActiveDetailGoal(null)
  }

  // Custom goal modal form state
  const [newTitle, setNewTitle] = useState('')
  const [newCatSlug, setNewCatSlug] = useState('income')
  const [newIcon, setNewIcon] = useState('🎯')
  const [newTimelineDays, setNewTimelineDays] = useState(90)
  const [newTargetAmount, setNewTargetAmount] = useState('')

  const openQuestionnaire = useCallback(
    (catId: CategoryKey) => {
      setActiveCategory(catId)
      setSelectedOption(null)
      setSelectedExtras([])
      setNotesText('')
      setNewTimelineDays(180)
      setSavedGoalLabel(null)
      setActiveDetailGoal(null)
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
      const rawTitle = primary.title || primary.goal?.title || defaultSubtitle
      return {
        hasGoal: true,
        badge: 'ACTIVE' as const,
        badgeClass: 'proto-goals__badge--live',
        pct: 0,
        subtitle: rawTitle,
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

  const housingCard = getCategoryCardState('housing', 'Renting, moving, home ownership & living space')
  const incomeCard = getCategoryCardState('income', 'Earn more & build extra income streams')
  const careerCard = getCategoryCardState('career', 'Advance professionally & acquire qualifications')
  const payLessCard = getCategoryCardState('pay-less', 'Spend less and find ways to reduce costs')
  const childrenCard = getCategoryCardState('children', 'Skills, educational interests & activities')

  const handleCategoryCardClick = (catId: CategoryKey) => {
    openQuestionnaire(catId)
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
    if (extraDef && selectedExtras.length === 0 && !notesText.trim()) {
      toastError(`Please select an option for: ${extraDef.label}`)
      return
    }

    let finalSelection = chosen
    if (selectedExtras.length > 0 && !notesText.trim()) {
      if (activeCategory === 'career') {
        finalSelection = `Interested in ${selectedExtras.join(', ')}`
      } else {
        finalSelection = `${chosen}: ${selectedExtras.join(', ')}`
      }
    }

    try {
      const targetCategorySlug = activeCategory

      if (activeCategory === 'custom') {
        const iconMap: Record<string, string> = {
          housing: '🏠',
          income: '💼',
          career: '📚',
          'pay-less': '🏷️',
          children: '👶',
          custom: '🎯',
        }
        await createGoalMutation.mutateAsync({
          title: notesText.trim() || finalSelection,
          categorySlug: targetCategorySlug,
          icon: iconMap[activeCategory] || '🎯',
          targetType: 'DEADLINE',
          durationDays: newTimelineDays,
        })
      } else {
        await submitQuestionnaireMutation.mutateAsync({
          categorySlug: targetCategorySlug,
          questionTitle: q.title,
          selectedOption: finalSelection,
          durationDays: newTimelineDays,
        })
      }
      setSavedGoalLabel(selectedExtras.join(', ') || notesText.trim() || finalSelection)
      success('Goal added to your plan')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save goal'
      toastError(msg)
    }
  }

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) {
      toastError('Please enter a goal title')
      return
    }

    const numAmount = Number(newTargetAmount.replace(/[^0-9]/g, ''))
    const targetAmountKobo = numAmount > 0 ? numAmount * 100 : undefined
    const targetType: GoalTargetType = targetAmountKobo ? 'AMOUNT' : 'DEADLINE'

    try {
      await createGoalMutation.mutateAsync({
        title: newTitle.trim(),
        categorySlug: newCatSlug,
        icon: newIcon,
        targetType,
        durationDays: newTimelineDays,
        targetAmountKobo,
      })

      success('Goal created successfully')
      setIsCreateModalOpen(false)
      setNewTitle('')
      setNewTargetAmount('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create goal'
      toastError(msg)
    }
  }

  const handleDeleteGoal = async (idOrUuid: number | string) => {
    try {
      await removeGoalMutation.mutateAsync(idOrUuid)
      success('Goal removed')
      setActiveDetailGoal(null)
    } catch {
      toastError('Failed to remove goal')
    }
  }

  const renderGoalDetailModal = () => {
    if (!activeDetailGoal || !isMounted) return null
    return createPortal(
      <div
        className="goal-modal-overlay"
        onClick={() => setActiveDetailGoal(null)}
      >
        <div className="goal-modal" onClick={(e) => e.stopPropagation()}>
          <div className="goal-modal__head">
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted, #8a8a8a)', display: 'block', marginBottom: '4px' }}>
                Goal Details
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '22px', lineHeight: 1 }}>{activeDetailGoal.icon || '🎯'}</span>
                <h2 className="goal-modal__title" style={{ margin: 0 }}>
                  {activeDetailGoal.title || activeDetailGoal.goal?.title}
                </h2>
              </div>
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
            {/* Goal Status */}
            <div className="goal-modal__field">
              <label className="goal-modal__label">Status</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span className="proto-goals__badge proto-goals__badge--live">
                  ACTIVE
                </span>
              </div>
            </div>

            {/* Goal Objective / Description */}
            {(() => {
              const goalTitle = (activeDetailGoal.title || activeDetailGoal.goal?.title || '').trim()
              const desc = GOAL_DESCRIPTIONS[goalTitle] || activeDetailGoal.goal?.description
              if (!desc) return null
              return (
                <div className="goal-modal__field">
                  <label className="goal-modal__label">Objective</label>
                  <p style={{ fontSize: '13.5px', color: 'var(--text-secondary, #666)', margin: '2px 0 0', lineHeight: 1.45 }}>
                    {desc}
                  </p>
                </div>
              )
            })()}

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
                <p style={{ fontSize: '13.5px', color: 'var(--text, #0a0a0f)', margin: '2px 0 0', fontWeight: 500 }}>
                  {activeDetailGoal.durationDays} days target window
                </p>
              </div>
            )}

            {activeDetailGoal.notes && (
              <div className="goal-modal__field">
                <label className="goal-modal__label">Notes &amp; Preferences</label>
                <p style={{ fontSize: '13.5px', color: 'var(--text-secondary, #666)', margin: '2px 0 0', lineHeight: 1.45 }}>
                  {activeDetailGoal.notes}
                </p>
              </div>
            )}

            {activeDetailGoal.createdAt && (
              <div className="goal-modal__field">
                <label className="goal-modal__label">Started</label>
                <p style={{ fontSize: '13px', color: 'var(--text-muted, #8a8a8a)', margin: '2px 0 0' }}>
                  {new Date(activeDetailGoal.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
            )}

            {(activeDetailGoal.id || activeDetailGoal.uuid) && (
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--shell-border, #f0e9df)' }}>
                <button
                  type="button"
                  className="goal-modal__delete-btn"
                  onClick={() => handleDeleteGoal(activeDetailGoal.id || activeDetailGoal.uuid || '')}
                  disabled={removeGoalMutation.isPending}
                >
                  <Trash2 size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />
                  {removeGoalMutation.isPending ? 'Removing...' : 'Remove this goal'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body,
    )
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
    const effectiveOptions = q.options
    const activeGoalsInThisCat = goalsByCategory[activeCategory] || []
    const canAddMore = activeGoalsInThisCat.length < 3
    const extraDef = q.extras && selectedOption ? q.extras[selectedOption] : undefined
    const isSavingGoal =
      submitQuestionnaireMutation.isPending || createGoalMutation.isPending

    const handleSelectQuestionnaireOption = (opt: string) => {
      setSelectedOption(opt)
      setNotesText('')
      setSelectedExtras([])
      const matchedDbGoal = dbGoalsForCat.find(
        (g) => (g.title || '').toLowerCase() === opt.toLowerCase(),
      )
      if (matchedDbGoal?.defaultDurationDays) {
        setNewTimelineDays(matchedDbGoal.defaultDurationDays)
      }
    }

    const handleToggleExtra = (extOpt: string, maxSelect = 3) => {
      setSelectedExtras((prev) => {
        if (prev.includes(extOpt)) {
          return prev.filter((x) => x !== extOpt)
        }
        if (maxSelect === 1) {
          return [extOpt]
        }
        if (prev.length >= maxSelect) {
          toastError(`You can select up to ${maxSelect} items.`)
          return prev
        }
        return [...prev, extOpt]
      })
    }

    return (
      <div className="proto-goals">
        <div className="proto-goals__topbar">
          <button
            type="button"
            className="proto-goals__icon-btn"
            onClick={() => {
              setActiveCategory(null)
              setActiveDetailGoal(null)
            }}
            aria-label="Back to goals"
          >
            <ChevronLeft size={18} strokeWidth={2.2} />
          </button>
          <h2 className="proto-goals__topbar-title">{q.title}</h2>
        </div>

        {!savedGoalLabel ? (
          <div className="proto-goals__q-form">
            <p className="proto-goals__subhead">{q.intro}</p>

            {/* Active Goals in this Category */}
            {activeGoalsInThisCat.length > 0 && (
              <div className="proto-goals__active-group">
                <div className="proto-goals__section-label">
                  Your Active Goals ({activeGoalsInThisCat.length}/3)
                </div>
                <div className="proto-goals__active-list">
                  {activeGoalsInThisCat.map((ug) => {
                    const title = ug.title || ug.goal?.title || 'Goal'
                    const pct = ug.progressPct ?? 0
                    return (
                      <div
                        key={ug.id || ug.uuid}
                        className="proto-goals__active-card"
                        onClick={() => setActiveDetailGoal(ug)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="proto-goals__active-card-left">
                          <span style={{ fontSize: '22px', flexShrink: 0 }}>{ug.icon || '🎯'}</span>
                          <div>
                            <div className="proto-goals__active-card-title">
                              {title}
                            </div>
                            <div className="proto-goals__active-card-sub">
                              Active{ug.durationDays ? ` · ${ug.durationDays} days target` : ''}
                            </div>
                          </div>
                        </div>
                        <span className="proto-goals__active-card-arrow">
                          Manage ›
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="proto-goals__section-label">
              {q.label} {activeGoalsInThisCat.length > 0 ? `(${activeGoalsInThisCat.length}/3 selected)` : ''}
            </div>

            <div
              className={
                activeCategory === 'custom'
                  ? 'proto-goals__q-tags'
                  : 'proto-goals__q-options'
              }
            >
              {effectiveOptions.map((opt) => {
                const matchedActive = activeGoalsInThisCat.find((ug) => {
                  const t = (ug.title || ug.goal?.title || '').toLowerCase().trim()
                  const o = opt.toLowerCase().trim()
                  if (!t || !o) return false
                  return t === o || t.includes(o) || o.includes(t)
                })
                const isActive = Boolean(matchedActive)
                const isSelected = selectedOption === opt && !notesText.trim()
                const desc = GOAL_DESCRIPTIONS[opt]

                return (
                  <button
                    key={opt}
                    type="button"
                    className={`${
                      activeCategory === 'custom' ? 'proto-goals__tag' : 'proto-goals__opt'
                    } ${isSelected ? 'is-on' : ''} ${isActive ? 'proto-goals__opt--active' : ''}`}
                    onClick={() => {
                      if (isActive && matchedActive) {
                        setActiveDetailGoal(matchedActive)
                      } else if (!canAddMore && !isActive) {
                        toastError('You have reached the maximum of 3 goals in this category.')
                      } else {
                        handleSelectQuestionnaireOption(opt)
                      }
                    }}
                  >
                    <div className="proto-goals__opt-header">
                      <span className="proto-goals__opt-title">{opt}</span>
                      {isActive && (
                        <span
                          className="proto-goals__badge proto-goals__badge--live"
                          style={{ fontSize: '11px', padding: '2px 8px' }}
                        >
                          Active {matchedActive?.progressPct ? `· ${matchedActive.progressPct}%` : ''}
                        </span>
                      )}
                      {!isActive && isSelected && (
                        <span style={{ fontSize: '11px', color: 'var(--clay)', fontWeight: 700 }}>
                          Selected
                        </span>
                      )}
                    </div>
                    {desc && <p className="proto-goals__opt-desc">{desc}</p>}
                  </button>
                )
              })}
            </div>

            {extraDef && !notesText.trim() && (
              <div className="proto-goals__q-extra">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '14px 0 8px' }}>
                  <span className="proto-goals__section-label" style={{ margin: 0 }}>
                    {extraDef.label}
                  </span>
                  {extraDef.maxSelect !== 1 && (
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted, #8a8a8a)', fontWeight: 600 }}>
                      {selectedExtras.length}/3 selected
                    </span>
                  )}
                </div>
                <div className="proto-goals__q-options">
                  {extraDef.options.map((extOpt) => {
                    const isSelected = selectedExtras.includes(extOpt)
                    return (
                      <button
                        key={extOpt}
                        type="button"
                        className={`proto-goals__opt ${isSelected ? 'is-on' : ''}`}
                        onClick={() => handleToggleExtra(extOpt, extraDef.maxSelect ?? 3)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span>{extOpt}</span>
                          {isSelected && (
                            <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--clay)' }}>
                              ✓ Selected
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
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
                  setSelectedExtras([])
                }
              }}
              placeholder={
                activeCategory === 'custom'
                  ? 'e.g. Learn to fly a plane'
                  : 'Type your goal in your own words'
              }
            />

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
              “{savedGoalLabel}” has been added to your goals.
            </p>

            {/* Quick Actions: Help them go home or back to all goals */}
            <div className="proto-goals__stack-btns">
              <button
                type="button"
                className="proto-goals__btn-primary"
                onClick={() => router.push('/dashboard')}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Home size={17} /> Go to Home
              </button>
              <button
                type="button"
                className="proto-goals__btn-secondary"
                onClick={() => {
                  setSavedGoalLabel(null)
                  setActiveCategory(null)
                  setActiveDetailGoal(null)
                }}
              >
                Back to all goals
              </button>
            </div>

            {/* Show other goals in this category so they can easily add */}
            {(() => {
              const currentCatGoals = goalsByCategory[activeCategory] || []
              const existingTitles = new Set(
                currentCatGoals.map((ug) => (ug.title || ug.goal?.title || '').toLowerCase().trim()),
              )
              if (savedGoalLabel) {
                existingTitles.add(savedGoalLabel.toLowerCase().trim())
              }

              const remainingOptions = (q.options || []).filter(
                (opt) => !existingTitles.has(opt.toLowerCase().trim()),
              )

              const countInCat = currentCatGoals.length
              const canAddMore = countInCat < 3

              const allCategories: Array<{ id: CategoryKey; title: string; icon: string }> = [
                { id: 'housing', title: 'Home & lifestyle', icon: '🏠' },
                { id: 'income', title: 'Income & financial', icon: '💼' },
                { id: 'career', title: 'Career & growth', icon: '📚' },
                { id: 'pay-less', title: 'Pay less for stuff', icon: '🏷️' },
                { id: 'children', title: "Children's development", icon: '👶' },
                { id: 'custom', title: 'Set custom goal', icon: '🎯' },
              ]
              const otherCategories = allCategories.filter((c) => c.id !== activeCategory)

              const handleQuickAdd = async (opt: string) => {
                if (countInCat >= 3) {
                  toastError(`You can select up to 3 goals in ${q.title}.`)
                  return
                }
                if (q.extras && q.extras[opt]) {
                  setSavedGoalLabel(null)
                  setSelectedOption(opt)
                  setSelectedExtras([])
                  return
                }
                try {
                  await submitQuestionnaireMutation.mutateAsync({
                    categorySlug: activeCategory,
                    questionTitle: q.title,
                    selectedOption: opt,
                    durationDays: 90,
                  })
                  setSavedGoalLabel(opt)
                  success(`“${opt}” added to your goals`)
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : 'Failed to save goal'
                  toastError(msg)
                }
              }

              return (
                <div className="proto-goals__quick-section">
                  <div className="proto-goals__quick-header">
                    <h3 className="proto-goals__quick-title">
                      {canAddMore ? `More ${q.title}` : `${q.title} limit reached`}
                    </h3>
                    <span className="proto-goals__quick-counter">
                      {Math.min(3, countInCat)}/3 selected
                    </span>
                  </div>

                  {canAddMore && remainingOptions.length > 0 ? (
                    <div className="proto-goals__quick-list">
                      {remainingOptions.slice(0, 4).map((opt) => (
                        <div
                          key={opt}
                          className="proto-goals__quick-item"
                          onClick={() => handleQuickAdd(opt)}
                          role="button"
                          tabIndex={0}
                        >
                          <span className="proto-goals__quick-item-label">{opt}</span>
                          <span className="proto-goals__quick-item-btn">
                            <Plus size={13} /> Add
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : !canAddMore ? (
                    <p style={{ fontSize: '13px', color: 'var(--text-muted, #7a7268)', margin: '0 0 12px', lineHeight: 1.4 }}>
                      You have selected the maximum of 3 goals in this category. Explore other categories below:
                    </p>
                  ) : null}

                  {/* Explore other categories to easily add more goals */}
                  <div style={{ marginTop: '20px' }}>
                    <div className="proto-goals__quick-header" style={{ marginBottom: '8px' }}>
                      <h3 className="proto-goals__quick-title">Explore other goal categories</h3>
                    </div>
                    <div className="proto-goals__quick-cat-grid">
                      {otherCategories.map((otherCat) => (
                        <button
                          key={otherCat.id}
                          type="button"
                          className="proto-goals__quick-cat-card"
                          onClick={() => openQuestionnaire(otherCat.id)}
                        >
                          <span style={{ fontSize: '16px' }}>{otherCat.icon}</span>
                          <span>{otherCat.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {renderGoalDetailModal()}
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
          <ChevronRight size={18} color="var(--text-muted, #8a8a8a)" />
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
          <ChevronRight size={18} color="var(--text-muted, #8a8a8a)" />
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
          <ChevronRight size={18} color="var(--text-muted, #8a8a8a)" />
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
          <ChevronRight size={18} color="var(--text-muted, #8a8a8a)" />
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
          <ChevronRight size={18} color="var(--text-muted, #8a8a8a)" />
        </button>

        {/* 6. Any Additional Custom Goals */}
        {goalsByCategory.custom.map((ug) => {
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
                    ACTIVE
                  </span>
                </div>
                <h3 className="proto-goals__card-title">{title}</h3>
                <p className="proto-goals__card-desc">
                  {ug.notes || 'Personal milestone'}
                </p>
              </div>
              <ChevronRight size={18} color="var(--text-muted, #8a8a8a)" />
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
      {renderGoalDetailModal()}

      {/* CREATE GOAL MODAL */}
      {isCreateModalOpen && isMounted && createPortal(
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

              <button
                type="submit"
                className="goal-modal__submit"
                disabled={createGoalMutation.isPending}
              >
                {createGoalMutation.isPending ? 'Creating Goal...' : 'Save Goal'}
              </button>
            </form>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
