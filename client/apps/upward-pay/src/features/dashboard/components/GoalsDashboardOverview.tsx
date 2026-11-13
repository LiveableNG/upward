'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Home,
  Plus,
  Target,
  TrendingUp,
  Briefcase,
  Calendar,
  Layers,
  GraduationCap,
  User,
} from 'lucide-react'
import { useUserGoals, useToggleGoalMilestone } from '@/features/goals/hooks/useGoals'
import { getGoalTitle, getCategoryTitle } from '@/features/goals/types/goals.types'
import { formatMinorUnitAmount } from '@/features/goals/utils/monetary'
import { formatDate } from '@/lib/utils'
import { haptics } from '@/lib/haptics'
import { AddGoalModal } from '@/features/goals/components/AddGoalModal'
import '../styles/goals-dashboard.css'

interface GoalsDashboardOverviewProps {
  firstName: string
}

export function GoalsDashboardOverview({ firstName }: GoalsDashboardOverviewProps) {
  const router = useRouter()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // Primary source of truth: persisted user goals
  const { data: backendGoals = [], isLoading: isGoalsLoading } = useUserGoals()
  const toggleMilestoneMutation = useToggleGoalMilestone()

  // Map backend goals into display representation
  const activeGoals = useMemo(() => {
    return backendGoals.map((bg) => ({
      id: String(bg.id),
      numericId: bg.id,
      title: getGoalTitle(bg),
      categoryId: String(bg.categoryId || 'personal-goals'),
      categoryTitle: getCategoryTitle(bg.category) || 'Personal Goal',
      description: bg.customDescription || bg.catalogueGoal?.tagline || undefined,
      isCustom: !bg.goalId,
      targetDate: bg.targetDate ? formatDate(bg.targetDate) : undefined,
      targetAmountMajor: bg.targetAmountMinor ? formatMinorUnitAmount(bg.targetAmountMinor, bg.currency) : undefined,
      currency: bg.currency,
      progressSource: bg.progressSource || 'MILESTONES',
      milestones: (bg.milestones || []).map((m) => ({
        id: String(m.id),
        numericId: m.id,
        title: m.title,
        isCompleted: m.status === 'COMPLETED' || Boolean(m.completedAt),
        targetDate: m.targetDate ? formatDate(m.targetDate) : undefined,
      })),
      progressPct: Math.min(100, Math.max(0, bg.progressPct ?? 0)),
    }))
  }, [backendGoals])

  // Extract upcoming pending milestones across all active goals
  const upcomingMilestones = useMemo(() => {
    const list: Array<{
      milestoneId: string
      numericMilestoneId: number | string
      goalId: string
      goalTitle: string
      title: string
      isCompleted: boolean
      targetDate?: string
    }> = []

    activeGoals.forEach((goal) => {
      (goal.milestones || []).forEach((m) => {
        list.push({
          milestoneId: m.id,
          numericMilestoneId: m.numericId,
          goalId: goal.id,
          goalTitle: goal.title,
          title: m.title,
          isCompleted: Boolean(m.isCompleted),
          targetDate: m.targetDate || goal.targetDate,
        })
      })
    })

    return list
  }, [activeGoals])

  const pendingMilestones = upcomingMilestones.filter((m) => !m.isCompleted).slice(0, 4)

  const handleToggleMilestone = (goalId: string, milestoneId: string | number) => {
    haptics.selection()
    toggleMilestoneMutation.mutate({
      goalIdentifier: goalId,
      milestoneId: milestoneId,
    })
  }

  const renderCategoryIcon = (catId: string, size = 15) => {
    if (catId.includes('housing') || catId.includes('home')) return <Home size={size} />
    if (catId.includes('financial') || catId.includes('income')) return <TrendingUp size={size} />
    if (catId.includes('career') || catId.includes('professional')) return <Briefcase size={size} />
    if (catId.includes('children')) return <GraduationCap size={size} />
    if (catId.includes('personal')) return <User size={size} />
    return <Target size={size} />
  }

  return (
    <div className="dash-goals-overview">
      {/* ── 1. WELCOME SECTION ── */}
      <section className="dash-goals-welcome">
        <div style={{ flex: 1 }}>
          <div className="dash-goals-welcome__badge">
            <Target size={12} />
            <span>Personal Goals Platform</span>
          </div>
          <h2 className="dash-goals-welcome__title">
            Welcome, {firstName}
          </h2>
          <p className="dash-goals-welcome__desc">
            {activeGoals.length > 0
              ? `You are currently working towards ${activeGoals.length} ${activeGoals.length === 1 ? 'personal ambition' : 'personal ambitions'}. Track milestones, set targets, and build steady momentum.`
              : 'Define what you are working towards — choose from curated ambitions across housing, income, career, and personal life.'}
          </p>
        </div>

        <div className="dash-goals-welcome__actions">
          {activeGoals.length > 0 ? (
            <>
              <button
                type="button"
                className="dash-goals-welcome__primary-btn"
                onClick={() => router.push('/dashboard/goals')}
              >
                <span>My Goals Workspace</span>
                <ArrowRight size={15} />
              </button>
              <button
                type="button"
                className="dash-goals-welcome__secondary-btn"
                onClick={() => setIsAddModalOpen(true)}
              >
                <Plus size={15} />
                <span>Add More Goals</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              className="dash-goals-welcome__primary-btn"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus size={16} />
              <span>Explore & Set Goals</span>
            </button>
          )}
        </div>
      </section>

      {/* ── 2. GOALS OVERVIEW ── */}
      <section>
        <div className="dash-goals-section-header">
          <h3 className="dash-goals-section-title">
            <Target size={18} color="var(--clay)" />
            <span>Active Ambitions ({activeGoals.length})</span>
          </h3>
          {activeGoals.length > 0 && (
            <button
              type="button"
              className="dash-goals-section-link"
              onClick={() => router.push('/dashboard/goals')}
            >
              <span>View All in My Goals</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>

        {activeGoals.length === 0 ? (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: '32px 20px',
              textAlign: 'center',
            }}
          >
            <Compass size={28} color="var(--clay)" style={{ margin: '0 auto 10px' }} />
            <h4 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: 'var(--dark)' }}>
              No goals configured yet
            </h4>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px', maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
              Choose goals from our curated catalogue across Housing, Income, Career, or define your own personal ambitions.
            </p>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 18px',
                borderRadius: 10,
                background: 'var(--clay)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Plus size={14} />
              <span>Browse Goal Catalogue</span>
            </button>
          </div>
        ) : (
          <div className="dash-goals-grid">
            {activeGoals.map((goal) => {
              const progressPct = goal.progressPct ?? 0
              return (
                <div
                  key={goal.id}
                  className="dash-goal-card"
                  onClick={() => router.push('/dashboard/goals')}
                >
                  <div className="dash-goal-card__top">
                    <div>
                      <span className="dash-goal-card__cat">
                        {renderCategoryIcon(goal.categoryId, 12)}
                        {' '}{goal.categoryTitle}
                      </span>
                      <h4 className="dash-goal-card__title">{goal.title}</h4>
                      {goal.description && (
                        <p className="dash-goal-card__desc">{goal.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="dash-goal-card__progress-wrap">
                    <div className="dash-goal-card__progress-info">
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                        {goal.progressSource === 'TARGET_AMOUNT'
                          ? goal.targetAmountMajor ? `Target: ${goal.targetAmountMajor}` : 'Target Savings'
                          : `${goal.milestones?.length || 0} Action Steps`}
                      </span>
                      <span style={{ color: 'var(--clay)' }}>
                        {goal.progressSource === 'STATUS_ONLY' ? 'Status Tracked' : `${progressPct}%`}
                      </span>
                    </div>

                    {goal.progressSource !== 'STATUS_ONLY' && (
                      <div className="dash-goal-card__progress-bar">
                        <div
                          className="dash-goal-card__progress-fill"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    )}

                    {goal.targetDate && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        <Calendar size={11} />
                        <span>Due {goal.targetDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── 3. UPCOMING MILESTONES ── */}
      {activeGoals.length > 0 && (
        <section>
          <div className="dash-goals-section-header">
            <h3 className="dash-goals-section-title">
              <Clock size={18} color="var(--clay)" />
              <span>Upcoming Action Steps</span>
            </h3>
            <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 600 }}>
              {pendingMilestones.length} pending
            </span>
          </div>

          <div className="dash-milestones-card">
            {pendingMilestones.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={24} color="var(--success, #22c55e)" style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--dark)', margin: '0 0 4px' }}>
                  All caught up on milestones!
                </p>
                <p style={{ fontSize: 12.5, margin: 0 }}>
                  Add more action steps to your goals in your workspace to keep building steady momentum.
                </p>
              </div>
            ) : (
              pendingMilestones.map((item) => (
                <div key={item.milestoneId} className="dash-milestone-item">
                  <button
                    type="button"
                    className={`dash-milestone-check ${item.isCompleted ? 'dash-milestone-check--done' : ''}`}
                    onClick={() => handleToggleMilestone(item.goalId, item.numericMilestoneId)}
                    aria-label={item.isCompleted ? 'Mark incomplete' : 'Mark complete'}
                    disabled={toggleMilestoneMutation.isPending}
                  >
                    {item.isCompleted && <Check size={12} strokeWidth={3} />}
                  </button>

                  <span className={`dash-milestone-title ${item.isCompleted ? 'dash-milestone-title--done' : ''}`}>
                    {item.title}
                  </span>

                  <span className="dash-milestone-goal-badge">
                    {item.goalTitle}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* ── 4. NEXT STEPS & ACTIONS ── */}
      <section>
        <div className="dash-goals-section-header">
          <h3 className="dash-goals-section-title">
            <Layers size={18} color="var(--clay)" />
            <span>Recommended Next Steps</span>
          </h3>
        </div>

        <div className="dash-next-steps-grid">
          <div
            className="dash-next-step-card"
            onClick={() => router.push('/dashboard/goals')}
          >
            <div className="dash-next-step-icon">
              <Plus size={18} />
            </div>
            <div>
              <h4 className="dash-next-step-title">Break Goals into Steps</h4>
              <p className="dash-next-step-desc">
                Add tangible action milestones to turn big ambitions into manageable tasks.
              </p>
            </div>
          </div>

          <div
            className="dash-next-step-card"
            onClick={() => router.push('/dashboard/explore')}
          >
            <div className="dash-next-step-icon">
              <Compass size={18} />
            </div>
            <div>
              <h4 className="dash-next-step-title">Explore Goal Resources</h4>
              <p className="dash-next-step-desc">
                Discover equipment, study materials, and vetted services tailored to your goals.
              </p>
            </div>
          </div>

          <div
            className="dash-next-step-card"
            onClick={() => router.push('/dashboard/finance')}
          >
            <div className="dash-next-step-icon">
              <TrendingUp size={18} />
            </div>
            <div>
              <h4 className="dash-next-step-title">Access Financial Tools</h4>
              <p className="dash-next-step-desc">
                Leverage rent savings, payment schedules, and credibility tracking when needed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. DISCOVER & EXPLORE ENTRY POINT ── */}
      <section
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--clay)' }}>
              Marketplace & Tools
            </span>
            <h4 style={{ fontSize: 16, fontWeight: 800, color: 'var(--dark)', margin: '4px 0 2px' }}>
              Explore Resources That Support Your Goals
            </h4>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
              Find products, exam preparations, and vetted services independently without purchasing requirements.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/dashboard/explore')}
            style={{
              padding: '9px 16px',
              borderRadius: 10,
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              color: 'var(--dark)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            Browse Explore
          </button>
        </div>
      </section>

      {/* ── ADD GOAL MODAL (Dedicated registered-user entry point) ── */}
      <AddGoalModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  )
}
