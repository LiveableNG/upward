'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Calendar, Wallet, CheckCircle2, Zap, Bell, Check } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import {
  PayFlowPrimaryButton,
  PayPageShell,
} from '@/features/dashboard/components/payment/PayPageShell'
import {
  MAX_SAVINGS_GOALS,
  SAVINGS_GOAL_TYPES,
  normalizeSavingsGoal,
  resolveGoalType,
  type SavingsGoalType,
} from '@/features/dashboard/utils/savingsGoals'

type FormState = {
  goalType: SavingsGoalType | ''
  targetAmount: number
  startDate: string
  endDate: string
  reminderEnabled: boolean
  reminderFrequency: string
  reminderDay: number
  autoSaveEnabled: boolean
}

const defaultForm = (): FormState => ({
  goalType: '',
  targetAmount: 0,
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  reminderEnabled: true,
  reminderFrequency: 'MONTHLY',
  reminderDay: 27,
  autoSaveEnabled: true,
})

export function SavingsGoalFlow() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { error } = useToast()

  const editTypeParam = searchParams.get('type') as SavingsGoalType | null

  const { data: savingsGoals, isLoading: goalsLoading } = useQuery({
    queryKey: ['savings-goals'],
    queryFn: () => api.getSavingsGoals(),
    staleTime: 5 * 60 * 1000,
  })

  const existingGoals = useMemo(
    () => (Array.isArray(savingsGoals) ? savingsGoals.map(normalizeSavingsGoal) : []),
    [savingsGoals],
  )

  const editingGoal = useMemo(() => {
    if (!editTypeParam) return null
    return existingGoals.find((g) => g.goalType === editTypeParam) ?? null
  }, [editTypeParam, existingGoals])

  const isEditMode = !!editingGoal
  const takenTypes = useMemo(
    () =>
      new Set(
        existingGoals
          .filter((g) => !isEditMode || g.goalType !== editingGoal?.goalType)
          .map((g) => g.goalType),
      ),
    [existingGoals, isEditMode, editingGoal],
  )

  const availableTypes = (['rent', 'home'] as SavingsGoalType[]).filter(
    (type) => !takenTypes.has(type),
  )

  const [formData, setFormData] = useState<FormState>(defaultForm)
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    if (goalsLoading) return

    if (isEditMode && editingGoal) {
      setFormData({
        goalType: editingGoal.goalType,
        targetAmount: editingGoal.target,
        startDate: editingGoal.startDate,
        endDate: editingGoal.endDate,
        reminderEnabled: editingGoal.reminderEnabled,
        reminderFrequency: editingGoal.reminderFrequency,
        reminderDay: editingGoal.reminderDay,
        autoSaveEnabled: editingGoal.autoSaveEnabled,
      })
      return
    }

    if (editTypeParam && !editingGoal && existingGoals.length > 0) {
      const resolved = resolveGoalType({ type: editTypeParam, name: editTypeParam })
      if (resolved && !takenTypes.has(resolved)) {
        setFormData((prev) => ({ ...prev, goalType: resolved }))
      }
    } else if (availableTypes.length === 1) {
      setFormData((prev) => ({ ...prev, goalType: availableTypes[0] }))
    }
  }, [goalsLoading, isEditMode, editingGoal, editTypeParam, existingGoals, takenTypes, availableTypes])

  useEffect(() => {
    if (goalsLoading || isEditMode || isSuccess) return
    if (existingGoals.length >= MAX_SAVINGS_GOALS) {
      error('You already have both savings goals. Edit an existing goal instead.')
      router.replace('/dashboard/savings')
    }
  }, [goalsLoading, isEditMode, isSuccess, existingGoals.length, error, router])

  const saveGoal = useMutation({
    mutationFn: (data: FormState) => {
      const meta = SAVINGS_GOAL_TYPES[data.goalType as SavingsGoalType]
      const payload = {
        name: meta.name,
        type: meta.category,
        category: meta.category,
        targetAmount: data.targetAmount,
        startDate: data.startDate,
        endDate: data.endDate,
        reminderEnabled: data.reminderEnabled,
        reminderFrequency: data.reminderEnabled ? data.reminderFrequency : undefined,
        reminderDay:
          data.reminderEnabled && data.reminderFrequency === 'MONTHLY'
            ? data.reminderDay
            : undefined,
        autoSaveEnabled: data.autoSaveEnabled,
      }

      if (isEditMode && editingGoal) {
        return api.updateSavingsGoal(editingGoal.id, payload)
      }
      return api.createSavingsGoal(payload)
    },
    onSuccess: () => {
      setIsSuccess(true)
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      error(
        err.response?.data?.message ||
          `Failed to ${isEditMode ? 'update' : 'create'} savings goal. Please try again.`,
      )
    },
  })

  const isValid =
    !!formData.goalType &&
    formData.targetAmount > 100 &&
    !!formData.endDate &&
    (isEditMode || availableTypes.includes(formData.goalType as SavingsGoalType))

  const goalLabel = formData.goalType
    ? SAVINGS_GOAL_TYPES[formData.goalType as SavingsGoalType].name
    : ''

  if (isSuccess) {
    return (
      <div className="savings-success dashboard--nav-offset">
        <div className="savings-success__badge">
          <CheckCircle2 size={40} />
        </div>
        <h1 className="savings-success__title">{isEditMode ? 'Goal updated!' : 'Goal set!'}</h1>
        <p className="savings-success__text">
          Your savings goal &quot;<strong>{goalLabel}</strong>&quot; has been{' '}
          {isEditMode ? 'updated' : 'created'}. Ready to make your first deposit?
        </p>

        <div className="savings-success__perks">
          <div className="savings-success__perk">Automation: fund via bank transfer</div>
          <div className="savings-success__perk">Insights: track milestones and growth</div>
        </div>

        <div className="savings-success__actions">
          <PayFlowPrimaryButton onClick={() => router.push('/dashboard/savings')}>
            Go to savings
          </PayFlowPrimaryButton>
          <button
            type="button"
            className="pay-flow__btn-secondary"
            onClick={() => router.push('/dashboard/savings/deposit')}
          >
            Deposit now
          </button>
        </div>
      </div>
    )
  }

  return (
    <PayPageShell
      title={isEditMode ? 'Edit savings goal' : 'Set savings goal'}
      subtitle={
        isEditMode
          ? 'Update your target, deadline, and reminders.'
          : 'Choose a goal type and set your target in one step.'
      }
      showBack
      onBack={() => router.back()}
      footer={
        <PayFlowPrimaryButton
          onClick={() => saveGoal.mutate(formData)}
          disabled={!isValid || goalsLoading}
          loading={saveGoal.isPending}
        >
          {isEditMode ? 'Save changes' : 'Set savings goal'}
        </PayFlowPrimaryButton>
      }
    >
      <div className="savings-form">
        <div className="savings-form__field">
          <label>Goal type</label>
          <div className="savings-form__input-wrap">
            <select
              value={formData.goalType}
              disabled={isEditMode || goalsLoading}
              onChange={(e) =>
                setFormData({ ...formData, goalType: e.target.value as SavingsGoalType })
              }
            >
              <option value="" disabled>
                Select a goal
              </option>
              {(isEditMode && formData.goalType
                ? [formData.goalType as SavingsGoalType]
                : availableTypes
              ).map((type) => (
                <option key={type} value={type}>
                  {SAVINGS_GOAL_TYPES[type].label}
                </option>
              ))}
            </select>
          </div>
          {!isEditMode && takenTypes.size > 0 && availableTypes.length === 1 ? (
            <p className="savings-form__hint">
              You already have a {takenTypes.has('rent') ? 'rent' : 'home'} goal — you can add one
              for {availableTypes[0] === 'rent' ? 'rent' : 'a home'}.
            </p>
          ) : null}
        </div>

        <div className="savings-form__field">
          <label>Target amount (₦)</label>
          <div className="savings-form__input-wrap">
            <Wallet size={18} />
            <input
              type="number"
              placeholder="e.g. 500,000"
              value={formData.targetAmount || ''}
              onChange={(e) =>
                setFormData({ ...formData, targetAmount: Number(e.target.value) })
              }
            />
          </div>
        </div>

        <div className="savings-form__field">
          <label>Target date</label>
          <div className="savings-form__input-wrap">
            <Calendar size={18} />
            <input
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>
        </div>

        <div
          className={`autosave-toggle ${formData.autoSaveEnabled ? 'autosave-toggle--on' : ''}`}
          onClick={() =>
            setFormData({ ...formData, autoSaveEnabled: !formData.autoSaveEnabled })
          }
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setFormData({ ...formData, autoSaveEnabled: !formData.autoSaveEnabled })
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div
            className={`autosave-toggle__check ${formData.autoSaveEnabled ? 'autosave-toggle__check--on' : ''}`}
          >
            {formData.autoSaveEnabled && <Check size={14} color="#fff" />}
          </div>
          <div className="autosave-toggle__info">
            <p className="autosave-toggle__title">Enable auto-save</p>
            <p className="autosave-toggle__sub">Plan for your goal automatically</p>
          </div>
          <Zap
            size={18}
            className={`autosave-toggle__icon ${formData.autoSaveEnabled ? 'autosave-toggle__icon--on' : ''}`}
          />
        </div>

        <div
          className={`autosave-toggle ${formData.reminderEnabled ? 'autosave-toggle--on' : ''}`}
          onClick={() =>
            setFormData({ ...formData, reminderEnabled: !formData.reminderEnabled })
          }
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setFormData({ ...formData, reminderEnabled: !formData.reminderEnabled })
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div
            className={`autosave-toggle__check ${formData.reminderEnabled ? 'autosave-toggle__check--on' : ''}`}
          >
            {formData.reminderEnabled && <Check size={14} color="#fff" />}
          </div>
          <div className="autosave-toggle__info">
            <p className="autosave-toggle__title">Enable reminders</p>
            <p className="autosave-toggle__sub">Get notified when it&apos;s time to save</p>
          </div>
          <Bell
            size={18}
            className={`autosave-toggle__icon ${formData.reminderEnabled ? 'autosave-toggle__icon--on' : ''}`}
          />
        </div>

        {formData.reminderEnabled && (
          <div className="savings-form__stack">
            <div className="savings-form__field">
              <label>Reminder frequency</label>
              <div className="savings-form__input-wrap">
                <select
                  value={formData.reminderFrequency}
                  onChange={(e) =>
                    setFormData({ ...formData, reminderFrequency: e.target.value })
                  }
                >
                  <option value="DAILY">Daily</option>
                  <option value="TWO_DAYS">Every 2 days</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>
            </div>

            {formData.reminderFrequency === 'MONTHLY' && (
              <div className="savings-form__field">
                <label>Day of month</label>
                <div className="savings-form__input-wrap">
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.reminderDay}
                    onChange={(e) =>
                      setFormData({ ...formData, reminderDay: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PayPageShell>
  )
}
