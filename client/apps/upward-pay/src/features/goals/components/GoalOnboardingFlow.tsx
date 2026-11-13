'use client'

import React, { useState, useMemo } from 'react'
import {
  ArrowRight,
  ArrowLeft,
  Check,
  GraduationCap,
  Home,
  Plus,
  Search,
  Settings,
  Target,
  TrendingUp,
  Briefcase,
  User,
  X,
} from 'lucide-react'
import {
  PRESENTATION_CATALOGUE,
  type PresentationCategory,
  type PresentationGoal,
} from '../data/presentationCatalogue'
import {
  useOnboardingGoals,
  type SelectedOnboardingGoal,
} from '../context/OnboardingGoalsContext'
import { ConfigureGoalModal } from './ConfigureGoalModal'
import { CreateCustomGoalModal } from './CreateCustomGoalModal'
import { haptics } from '@/lib/haptics'
import '../styles/onboarding.css'

interface GoalOnboardingFlowProps {
  onComplete: () => void
  onSkip: () => void
  initialStep?: 'welcome' | 'selection' | 'review'
}

type Step = 'welcome' | 'selection' | 'review'

export function GoalOnboardingFlow({
  onComplete,
  onSkip,
  initialStep = 'selection',
}: GoalOnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<Step>(initialStep)
  const [activeCategoryId, setActiveCategoryId] = useState<string>('housing-living')
  const [activeSubcategoryId, setActiveSubcategoryId] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals state
  const [configuringGoal, setConfiguringGoal] = useState<SelectedOnboardingGoal | null>(null)
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false)

  const {
    selectedGoals,
    isGoalSelected,
    toggleCatalogueGoal,
    getSelectedGoal,
    removeGoal,
    completeOnboarding,
    skipOnboarding,
  } = useOnboardingGoals()

  const currentCategory = useMemo(
    () => PRESENTATION_CATALOGUE.find((c) => c.id === activeCategoryId) || PRESENTATION_CATALOGUE[0],
    [activeCategoryId],
  )

  // Filtered goals for selection step
  const displayedGoals = useMemo(() => {
    let list: Array<{ goal: PresentationGoal; category: PresentationCategory }> = []

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      PRESENTATION_CATALOGUE.forEach((cat) => {
        cat.goals.forEach((g) => {
          if (
            g.title.toLowerCase().includes(q) ||
            g.tagline?.toLowerCase().includes(q) ||
            g.description?.toLowerCase().includes(q)
          ) {
            list.push({ goal: g, category: cat })
          }
        })
      })
    } else {
      list = currentCategory.goals.map((g) => ({ goal: g, category: currentCategory }))
      if (activeSubcategoryId !== 'all') {
        list = list.filter((item) => item.goal.subcategoryId === activeSubcategoryId)
      }
    }

    return list
  }, [currentCategory, activeSubcategoryId, searchQuery])

  // Count selected goals per category
  const categorySelectedCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    selectedGoals.forEach((g) => {
      counts[g.categoryId] = (counts[g.categoryId] || 0) + 1
    })
    return counts
  }, [selectedGoals])

  const handleCardClick = (goal: PresentationGoal, category: PresentationCategory) => {
    if (goal.comingSoon) return
    haptics.selection()
    toggleCatalogueGoal(goal, category)
  }

  const handleOpenConfigure = (e: React.MouseEvent, goalId: string) => {
    e.stopPropagation()
    const configured = getSelectedGoal(goalId)
    if (configured) {
      setConfiguringGoal(configured)
    }
  }

  const handleFinish = () => {
    completeOnboarding()
    haptics.success()
    onComplete()
  }

  const handleSkipInternal = () => {
    skipOnboarding()
    onSkip()
  }

  // Helper for category icons (restrained iconography, no Sparkles)
  const renderCategoryIcon = (iconName: string, size = 16) => {
    switch (iconName) {
      case 'Home':
        return <Home size={size} />
      case 'TrendingUp':
        return <TrendingUp size={size} />
      case 'Briefcase':
        return <Briefcase size={size} />
      case 'GraduationCap':
        return <GraduationCap size={size} />
      case 'User':
        return <User size={size} />
      default:
        return <Target size={size} />
    }
  }

  /* ──────────────────────────────────────────────────────────────────
   * OPTIONAL WELCOME STEP (only if explicitly passed initialStep='welcome')
   * ────────────────────────────────────────────────────────────────── */
  if (currentStep === 'welcome') {
    return (
      <div className="goal-onboarding">
        <div className="onboarding-welcome">
          <div className="onboarding-welcome__badge">
            <Target size={13} />
            <span>Upward Goals Platform</span>
          </div>

          <h1 className="onboarding-welcome__title">
            What are you working towards?
          </h1>

          <p className="onboarding-welcome__desc">
            Upward is your personal ambition and lifestyle platform. Set meaningful targets, break them into tangible milestones, and unlock financial tools designed around what you want to achieve.
          </p>

          <div className="onboarding-welcome__pillars">
            {PRESENTATION_CATALOGUE.map((cat) => (
              <div key={cat.id} className="onboarding-welcome__pillar-card">
                <div className="onboarding-welcome__pillar-icon">
                  {renderCategoryIcon(cat.iconName, 18)}
                </div>
                <h3 className="onboarding-welcome__pillar-title">{cat.title}</h3>
                <p className="onboarding-welcome__pillar-text">{cat.description}</p>
              </div>
            ))}
          </div>

          <div className="onboarding-welcome__actions">
            <button
              type="button"
              className="onboarding-welcome__start-btn"
              onClick={() => {
                haptics.selection()
                setCurrentStep('selection')
              }}
            >
              <span>Explore & Choose Goals</span>
              <ArrowRight size={16} />
            </button>

            <button
              type="button"
              className="onboarding-welcome__skip-btn"
              onClick={handleSkipInternal}
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ──────────────────────────────────────────────────────────────────
   * OPTIONAL REVIEW STEP
   * ────────────────────────────────────────────────────────────────── */
  if (currentStep === 'review') {
    return (
      <div className="goal-onboarding">
        <div className="onboarding-header">
          <div className="onboarding-header__top">
            <button
              type="button"
              className="onboarding-header__back-btn"
              onClick={() => setCurrentStep('selection')}
            >
              <ArrowLeft size={14} />
              <span>Back to goal selection</span>
            </button>
            <button
              type="button"
              onClick={handleSkipInternal}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
              }}
            >
              Skip for now
            </button>
          </div>
          <h1 className="onboarding-header__title">Review Your Ambitions</h1>
          <p className="onboarding-header__subtitle">
            You have selected {selectedGoals.length} {selectedGoals.length === 1 ? 'goal' : 'goals'} to begin your Upward journey. You can adjust milestones or add new goals anytime.
          </p>
        </div>

        {selectedGoals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)' }}>
            <Target size={32} color="var(--clay)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px' }}>No goals selected yet</h3>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: '0 0 16px' }}>
              Choose at least one ambition to personalize your setup, or continue straight to your dashboard.
            </p>
            <button
              type="button"
              onClick={() => setCurrentStep('selection')}
              style={{
                padding: '10px 20px',
                borderRadius: 10,
                background: 'var(--clay)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 13.5,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Browse Catalogue
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {selectedGoals.map((goal) => (
              <div
                key={goal.id}
                style={{
                  background: 'var(--surface)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 14,
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--clay)' }}>
                      {goal.categoryTitle}
                    </span>
                    {goal.qualification && (
                      <span style={{ fontSize: 11, background: 'var(--surface2)', padding: '2px 6px', borderRadius: 4, color: 'var(--dark)', fontWeight: 600 }}>
                        {goal.qualification}
                      </span>
                    )}
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--dark)', margin: '0 0 4px' }}>
                    {goal.title}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                    <span>{goal.milestones.length} {goal.milestones.length === 1 ? 'action step' : 'action steps'}</span>
                    {goal.targetAmountMajor && (
                      <span>· Target: {goal.currency || '₦'}{goal.targetAmountMajor}</span>
                    )}
                    {goal.targetDate && (
                      <span>· Due {goal.targetDate}</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setConfiguringGoal(goal)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: 'var(--surface2)',
                      border: '1px solid var(--border)',
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: 'var(--dark)',
                      cursor: 'pointer',
                    }}
                  >
                    Configure
                  </button>
                  <button
                    type="button"
                    onClick={() => removeGoal(goal.id)}
                    style={{
                      padding: 8,
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                    title="Remove goal"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="onboarding-bottom-bar">
          <div className="onboarding-bottom-bar__content">
            <div className="onboarding-bottom-bar__count">
              <span className="onboarding-bottom-bar__count-badge">{selectedGoals.length}</span>
              <span>Ambitions Selected</span>
            </div>

            <button
              type="button"
              className="onboarding-bottom-bar__continue-btn"
              onClick={handleFinish}
            >
              <span>Continue to Dashboard</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        <ConfigureGoalModal
          goal={configuringGoal}
          isOpen={!!configuringGoal}
          onClose={() => setConfiguringGoal(null)}
        />
      </div>
    )
  }

  /* ──────────────────────────────────────────────────────────────────
   * CONSOLIDATED GOAL SELECTION & INTRODUCTION (DEFAULT)
   * ────────────────────────────────────────────────────────────────── */
  return (
    <div className="goal-onboarding">
      {/* Consolidated Header with Concise Introduction & Skip */}
      <div className="onboarding-header">
        <div className="onboarding-header__top">
          <div className="onboarding-welcome__badge" style={{ margin: 0 }}>
            <Target size={12} />
            <span>Upward Personal Goals</span>
          </div>
          <button
            type="button"
            onClick={handleSkipInternal}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            Skip for now
          </button>
        </div>
        <h1 className="onboarding-header__title" style={{ marginTop: 12 }}>
          What ambitions are you working towards?
        </h1>
        <p className="onboarding-header__subtitle">
          Upward helps you define personal goals, track action steps, and access supporting financial tools. Select the ambitions that matter to you now, or configure targets for any goal.
        </p>
      </div>

      {/* Category Tabs */}
      <div className="onboarding-category-tabs">
        {PRESENTATION_CATALOGUE.map((cat) => {
          const count = categorySelectedCounts[cat.id] || 0
          const isActive = activeCategoryId === cat.id && !searchQuery.trim()
          return (
            <button
              key={cat.id}
              type="button"
              className={`onboarding-category-tab ${isActive ? 'onboarding-category-tab--active' : ''}`}
              onClick={() => {
                setActiveCategoryId(cat.id)
                setActiveSubcategoryId('all')
                setSearchQuery('')
                haptics.selection()
              }}
            >
              {renderCategoryIcon(cat.iconName, 15)}
              <span>{cat.title}</span>
              {count > 0 && <span className="onboarding-category-tab__badge">{count}</span>}
            </button>
          )
        })}
      </div>

      {/* Search Input */}
      <div className="onboarding-search">
        <Search size={15} className="onboarding-search__icon" />
        <input
          type="text"
          placeholder="Search all catalogue goals (e.g. rent, promotion, coding, furniture, piano)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="onboarding-search__input"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute',
              right: 12,
              top: 13,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Subcategory Filter Pills (when not searching) */}
      {!searchQuery.trim() && currentCategory.subcategories.length > 0 && (
        <div className="onboarding-subcategories">
          <button
            type="button"
            className={`onboarding-subcategory-pill ${activeSubcategoryId === 'all' ? 'onboarding-subcategory-pill--active' : ''}`}
            onClick={() => {
              setActiveSubcategoryId('all')
              haptics.selection()
            }}
          >
            All {currentCategory.title}
          </button>
          {currentCategory.subcategories.map((sub) => (
            <button
              key={sub.id}
              type="button"
              className={`onboarding-subcategory-pill ${activeSubcategoryId === sub.id ? 'onboarding-subcategory-pill--active' : ''}`}
              onClick={() => {
                setActiveSubcategoryId(sub.id)
                haptics.selection()
              }}
            >
              {sub.title}
            </button>
          ))}
        </div>
      )}

      {/* Goals Grid */}
      <div className="onboarding-goals-grid">
        {displayedGoals.map(({ goal, category }) => {
          const selected = isGoalSelected(goal.id)
          return (
            <div
              key={goal.id}
              className={`onboarding-goal-card ${selected ? 'onboarding-goal-card--selected' : ''} ${goal.comingSoon ? 'onboarding-goal-card--coming-soon' : ''}`}
              onClick={() => handleCardClick(goal, category)}
            >
              <div className="onboarding-goal-card__top">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 className="onboarding-goal-card__title">{goal.title}</h3>
                  {goal.tagline && (
                    <p className="onboarding-goal-card__tagline">{goal.tagline}</p>
                  )}
                </div>

                <div className="onboarding-goal-card__check">
                  {selected && <Check size={14} strokeWidth={3} />}
                </div>
              </div>

              <div className="onboarding-goal-card__bottom">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {goal.comingSoon ? (
                    <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', background: 'var(--surface2)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: 4 }}>
                      Coming Soon
                    </span>
                  ) : (
                    <span className="onboarding-goal-card__subcat">
                      {category.title}
                    </span>
                  )}
                </div>

                {selected && !goal.comingSoon && (
                  <button
                    type="button"
                    className="onboarding-goal-card__config-btn"
                    onClick={(e) => handleOpenConfigure(e, goal.id)}
                  >
                    <Settings size={12} />
                    <span>Configure</span>
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Category E / Custom Goal Banner */}
      <div
        className="onboarding-custom-prompt-card"
        onClick={() => {
          haptics.selection()
          setIsCustomModalOpen(true)
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--clay)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h4 style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--dark)', margin: 0 }}>
              Have a goal not listed here?
            </h4>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
              Create your own personal goal with custom milestones and outcomes.
            </p>
          </div>
        </div>

        <button
          type="button"
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            background: 'var(--clay)',
            color: '#fff',
            fontSize: 12.5,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Create Custom Goal
        </button>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="onboarding-bottom-bar">
        <div className="onboarding-bottom-bar__content">
          <div className="onboarding-bottom-bar__count">
            <span className="onboarding-bottom-bar__count-badge">{selectedGoals.length}</span>
            <span>{selectedGoals.length === 1 ? 'Goal Selected' : 'Goals Selected'}</span>
          </div>

          <button
            type="button"
            className="onboarding-bottom-bar__continue-btn"
            onClick={handleFinish}
          >
            <span>Continue to Dashboard</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Modals */}
      <ConfigureGoalModal
        goal={configuringGoal}
        isOpen={!!configuringGoal}
        onClose={() => setConfiguringGoal(null)}
      />

      <CreateCustomGoalModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
      />
    </div>
  )
}
