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

type FilterTab = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED'

export function GoalsWorkspaceView({ initialGoalId }: { initialGoalId?: string | number | null }) {
  const { data: userGoals = [], isLoading, isError, refetch } = useUserGoals()

  const [activeTab, setActiveTab] = useState<FilterTab>('ACTIVE')
  const [selectedGoalId, setSelectedGoalId] = useState<string | number | null>(initialGoalId || null)
  const [isAddOpen, setIsAddOpen] = useState(false)

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
      {/* Header */}
      <header className="goals-workspace__header">
        <div>
          <h1 className="goals-workspace__title">My Goals</h1>
          <p className="goals-workspace__subtitle">
            Define, track and achieve your personal ambitions.
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

      {/* Content Area */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 260, gap: 12, color: 'var(--text-muted)' }}>
          <Loader2 size={26} className="animate-spin" color="var(--clay)" />
          <span style={{ fontSize: 13.5 }}>Loading your goals workspace...</span>
        </div>
      ) : isError ? (
        <div className="goals-empty-state">
          <div className="goals-empty-state__icon" style={{ background: '#fef2f2', color: 'var(--error)' }}>
            <AlertCircle size={24} />
          </div>
          <h3 className="goals-empty-state__title">Unable to load goals</h3>
          <p className="goals-empty-state__desc">
            We couldn't connect to your goals workspace. Please check your connection and try again.
          </p>
          <button
            type="button"
            className="goals-empty-state__action"
            onClick={() => refetch()}
            style={{ background: 'var(--dark)' }}
          >
            <RefreshCw size={14} />
            <span>Try Again</span>
          </button>
        </div>
      ) : currentGoals.length === 0 ? (
        /* Empty States */
        <div className="goals-empty-state">
          <div className="goals-empty-state__icon">
            {activeTab === 'ACTIVE' && <Target size={24} />}
            {activeTab === 'PAUSED' && <PauseCircle size={24} />}
            {activeTab === 'COMPLETED' && <CheckCircle2 size={24} />}
            {activeTab === 'ARCHIVED' && <Archive size={24} />}
          </div>

          <h3 className="goals-empty-state__title">
            {activeTab === 'ACTIVE' && 'No active goals yet'}
            {activeTab === 'PAUSED' && 'No paused goals'}
            {activeTab === 'COMPLETED' && 'No completed goals yet'}
            {activeTab === 'ARCHIVED' && 'No archived goals'}
          </h3>

          <p className="goals-empty-state__desc">
            {activeTab === 'ACTIVE' &&
              'Define what you are working towards — adopt from our curated catalogue or create your own custom personal goal.'}
            {activeTab === 'PAUSED' &&
              'Goals that you pause will appear here. You can resume them whenever you are ready.'}
            {activeTab === 'COMPLETED' &&
              'Goals you accomplish and mark as completed will be celebrated and stored here.'}
            {activeTab === 'ARCHIVED' &&
              'Goals you archive are safely kept here with their complete milestone history.'}
          </p>

          {activeTab === 'ACTIVE' && (
            <button
              type="button"
              className="goals-empty-state__action"
              onClick={() => setIsAddOpen(true)}
            >
              <Plus size={15} />
              <span>Add Your First Goal</span>
            </button>
          )}
        </div>
      ) : (
        /* Goals List */
        <div className="goals-workspace__grid">
          {currentGoals.map((ug) => (
            <UserGoalCard
              key={ug.id}
              goal={ug}
              onClick={() => setSelectedGoalId(ug.id)}
            />
          ))}
        </div>
      )}

      {/* Goal Detail Modal */}
      {selectedGoalId && (
        <GoalDetailModal
          goalId={selectedGoalId}
          isOpen={!!selectedGoalId}
          onClose={() => setSelectedGoalId(null)}
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
