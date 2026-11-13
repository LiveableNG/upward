'use client'

import React, { useState, useMemo } from 'react'
import {
  Plus,
  Target,
  Loader2,
  AlertCircle,
  CheckCircle2,
  PauseCircle,
  Archive,
  RefreshCw,
} from 'lucide-react'
import { useUserGoals } from '../hooks/useGoals'
import { type UserGoal, type UserGoalStatus } from '../types/goals.types'
import { UserGoalCard } from './UserGoalCard'
import { GoalDetailModal } from './GoalDetailModal'
import { AddGoalModal } from './AddGoalModal'
import { UpwardGoalsInteractiveView } from './UpwardGoalsInteractiveView'

type FilterTab = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED'

export function GoalsWorkspaceView({ initialGoalId }: { initialGoalId?: string | number | null }) {
  const { data: userGoals = [], isLoading, isError, refetch } = useUserGoals()

  const [activeTab, setActiveTab] = useState<FilterTab>('ACTIVE')
  const [selectedGoalId, setSelectedGoalId] = useState<string | number | null>(initialGoalId || null)
  const [isAddOpen, setIsAddOpen] = useState(false)

  // Handle goal card click -> push URL and open modal
  const handleSelectGoal = (id: string | number) => {
    setSelectedGoalId(id)
    if (typeof window !== 'undefined') {
      window.history.pushState({ upwardGoalModal: true, goalId: id }, '', `/dashboard/goals/${id}`)
    }
  }

  // Handle modal close -> return URL to /dashboard/goals
  const handleCloseDetail = () => {
    setSelectedGoalId(null)
    if (typeof window !== 'undefined') {
      const isDetailRoute =
        window.location.pathname.startsWith('/dashboard/goals/') &&
        window.location.pathname !== '/dashboard/goals'
      if (isDetailRoute) {
        if (window.history.state?.upwardGoalModal) {
          window.history.back()
        } else {
          window.history.replaceState(null, '', '/dashboard/goals')
        }
      }
    }
  }

  // Handle browser back button (popstate)
  React.useEffect(() => {
    if (typeof window === 'undefined') return

    const handlePopState = () => {
      const pathname = window.location.pathname
      const match = pathname.match(/\/dashboard\/goals\/([^/]+)/)
      if (match && match[1] && match[1] !== 'placeholder') {
        setSelectedGoalId(match[1])
      } else {
        setSelectedGoalId(null)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Auto-align activeTab with initialGoalId if loaded directly
  React.useEffect(() => {
    if (!initialGoalId || userGoals.length === 0) return
    const matching = userGoals.find(
      (g) => String(g.id) === String(initialGoalId) || g.uuid === String(initialGoalId),
    )
    if (matching && matching.status) {
      setActiveTab(matching.status)
    }
  }, [initialGoalId, userGoals])

  // Status counts
  const counts = useMemo(() => {
    return {
      ACTIVE: userGoals.filter((g) => g.status === 'ACTIVE').length,
      PAUSED: userGoals.filter((g) => g.status === 'PAUSED').length,
      COMPLETED: userGoals.filter((g) => g.status === 'COMPLETED').length,
      ARCHIVED: userGoals.filter((g) => g.status === 'ARCHIVED').length,
    }
  }, [userGoals])

  // Filtered list
  const currentGoals = useMemo(() => {
    return userGoals.filter((g) => g.status === activeTab)
  }, [userGoals, activeTab])

  return (
    <div className="goals-workspace">
      <UpwardGoalsInteractiveView mode="workspace" />

      {userGoals.length > 0 && (
        <>
          {/* Header */}
          <header className="goals-workspace__header" style={{ marginTop: 28 }}>
            <div>
              <h2 className="goals-workspace__title" style={{ fontSize: 18 }}>Saved Cloud Goals</h2>
              <p className="goals-workspace__subtitle">
                Synced goals and milestone records from your account.
              </p>
            </div>
            <button
              type="button"
              className="goals-workspace__add-btn"
              onClick={() => setIsAddOpen(true)}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>New Goal</span>
            </button>
          </header>

          {/* Tabs */}
          <div className="goals-workspace__tabs">
            {(
              [
                { id: 'ACTIVE' as const, label: 'Active', count: counts.ACTIVE },
                { id: 'PAUSED' as const, label: 'Paused', count: counts.PAUSED },
                { id: 'COMPLETED' as const, label: 'Completed', count: counts.COMPLETED },
                { id: 'ARCHIVED' as const, label: 'Archived', count: counts.ARCHIVED },
              ]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`goals-workspace__tab ${activeTab === tab.id ? 'goals-workspace__tab--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className="goals-workspace__tab-count">{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {currentGoals.length > 0 && (
            <div className="goals-workspace__grid">
              {currentGoals.map((ug) => (
                <UserGoalCard
                  key={ug.id}
                  goal={ug}
                  onClick={() => handleSelectGoal(ug.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Goal Detail Modal */}
      {selectedGoalId && (
        <GoalDetailModal
          goalId={selectedGoalId}
          isOpen={!!selectedGoalId}
          onClose={handleCloseDetail}
        />
      )}

      {/* Add Goal Modal */}
      <AddGoalModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />
    </div>
  )
}
