import React, { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, ListChecks, Plus, Trash2, XCircle } from 'lucide-react'
import { Modal } from '../../../components/common/modal/Modal'
import type { Goal, GoalActionTemplate } from '../types'

interface GoalActionsModalProps {
  isOpen: boolean
  onClose: () => void
  goal: Goal | null
  fetchGoalActions: (goalId: number) => Promise<GoalActionTemplate[]>
  onCreateAction: (
    goalId: number,
    data: { title: string; sortOrder?: number; isActive?: boolean },
  ) => Promise<GoalActionTemplate>
  onUpdateAction: (
    actionId: number,
    data: { title?: string; sortOrder?: number; isActive?: boolean },
  ) => Promise<GoalActionTemplate>
  onDeleteAction: (actionId: number) => Promise<void>
}

export const GoalActionsModal: React.FC<GoalActionsModalProps> = ({
  isOpen,
  onClose,
  goal,
  fetchGoalActions,
  onCreateAction,
  onUpdateAction,
  onDeleteAction,
}) => {
  const [actions, setActions] = useState<GoalActionTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    if (!goal) return
    setLoading(true)
    try {
      const list = await fetchGoalActions(goal.id)
      setActions(list)
    } finally {
      setLoading(false)
    }
  }, [goal, fetchGoalActions])

  useEffect(() => {
    if (isOpen && goal) {
      load()
    } else {
      setActions([])
      setNewTitle('')
    }
  }, [isOpen, goal, load])

  if (!goal) return null

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newTitle.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    try {
      const created = await onCreateAction(goal.id, {
        title: trimmed,
        sortOrder: actions.length,
        isActive: true,
      })
      if (created) {
        setActions((prev) => [...prev, created])
      } else {
        await load()
      }
      setNewTitle('')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (act: GoalActionTemplate) => {
    const nextActive = act.isActive === false ? true : false
    setActions((prev) =>
      prev.map((a) => (a.id === act.id ? { ...a, isActive: nextActive } : a)),
    )
    try {
      await onUpdateAction(act.id, { isActive: nextActive })
    } catch {
      setActions((prev) =>
        prev.map((a) => (a.id === act.id ? { ...a, isActive: act.isActive } : a)),
      )
    }
  }

  const handleDelete = async (act: GoalActionTemplate) => {
    setActions((prev) => prev.filter((a) => a.id !== act.id))
    try {
      await onDeleteAction(act.id)
    } catch {
      await load()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Predefined Actions — ${goal.title}`}
      description="Activate, disable, or add predefined action steps shown to users when they pick this goal."
      icon={<ListChecks size={20} />}
      maxWidth="580px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            className="input"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add a predefined action step..."
            disabled={submitting}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || !newTitle.trim()}
            style={{
              height: '42px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            <Plus size={16} /> Add
          </button>
        </form>

        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
            Loading actions...
          </p>
        ) : actions.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
            No predefined actions configured for this goal yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {actions.map((act, idx) => {
              const isActive = act.isActive !== false
              return (
                <div
                  key={act.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: isActive ? 'var(--white)' : 'var(--surface-hover)',
                    opacity: isActive ? 1 : 0.72,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--text)',
                        textDecoration: isActive ? 'none' : 'line-through',
                      }}
                    >
                      {idx + 1}. {act.title}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(act)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: isActive
                          ? 'rgba(16, 185, 129, 0.1)'
                          : 'rgba(100, 116, 139, 0.12)',
                        color: isActive ? '#10b981' : '#64748b',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      title={isActive ? 'Click to disable this action' : 'Click to activate this action'}
                    >
                      {isActive ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                      <span>{isActive ? 'Active' : 'Disabled'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(act)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--danger)',
                        cursor: 'pointer',
                        padding: '6px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Delete action"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Modal>
  )
}
