'use client'

import React, { useState, useMemo } from 'react'
import {
  Compass,
  Plus,
  Search,
  Target,
  ArrowRight,
  Check,
  Calendar,
  Wallet,
  Clock,
  Sliders,
  FileText,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { BottomSheetModal } from '@/components/common/BottomSheetModal'
import {
  useGoalCategories,
  useAdoptCatalogueGoal,
  useCreateCustomGoal,
} from '../hooks/useGoals'
import {
  type Goal,
  type GoalCategory,
  type GoalProgressSource,
  getGoalTitle,
  getCategoryTitle,
} from '../types/goals.types'
import { majorToMinorString } from '../utils/monetary'
import { useToast } from '@/components/common/Toast'
import { haptics } from '@/lib/haptics'

interface AddGoalModalProps {
  isOpen: boolean
  onClose: () => void
}

type TabMode = 'catalogue' | 'custom'

export function AddGoalModal({ isOpen, onClose }: AddGoalModalProps) {
  const [activeTab, setActiveTab] = useState<TabMode>('catalogue')
  const { data: categories = [], isLoading: isCategoriesLoading } = useGoalCategories()
  const adoptMutation = useAdoptCatalogueGoal()
  const customMutation = useCreateCustomGoal()
  const { success, error: toastError } = useToast()

  // Catalogue browsing state
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCatalogueGoal, setSelectedCatalogueGoal] = useState<Goal | null>(null)
  const [adoptTargetDate, setAdoptTargetDate] = useState('')
  const [adoptNotes, setAdoptNotes] = useState('')

  // Custom goal state
  const [customTitle, setCustomTitle] = useState('')
  const [customCategoryId, setCustomCategoryId] = useState<number | ''>('')
  const [customDescription, setCustomDescription] = useState('')
  const [customTargetDate, setCustomTargetDate] = useState('')
  const [customProgressSource, setCustomProgressSource] = useState<GoalProgressSource>('MILESTONES')
  const [customTargetAmountMajor, setCustomTargetAmountMajor] = useState('')
  const [customNotes, setCustomNotes] = useState('')

  // Filter catalogue goals
  const allCatalogueGoals = useMemo(() => {
    const goalsList: Array<Goal & { categoryObj?: GoalCategory }> = []
    for (const cat of categories) {
      for (const g of cat.goals || []) {
        goalsList.push({ ...g, categoryObj: cat })
      }
    }
    return goalsList
  }, [categories])

  const filteredGoals = useMemo(() => {
    let result = allCatalogueGoals
    if (selectedCategoryId !== 'all') {
      result = result.filter((g) => g.categoryId === selectedCategoryId)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (g) =>
          (g.title || g.name || '').toLowerCase().includes(q) ||
          g.tagline?.toLowerCase().includes(q) ||
          g.description?.toLowerCase().includes(q),
      )
    }
    return result
  }, [allCatalogueGoals, selectedCategoryId, searchQuery])

  // Handle Adopt Catalogue Goal
  const handleAdopt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCatalogueGoal) return

    try {
      await adoptMutation.mutateAsync({
        goalId: selectedCatalogueGoal.id,
        targetDate: adoptTargetDate ? new Date(adoptTargetDate).toISOString() : undefined,
        notes: adoptNotes.trim() || undefined,
        progressSource: 'MILESTONES',
      })
      haptics.success()
      success('Goal added to your workspace')
      resetAndClose()
    } catch {
      toastError('Failed to adopt goal')
    }
  }

  // Handle Create Custom Goal
  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customTitle.trim()) return

    if (customProgressSource === 'TARGET_AMOUNT') {
      if (!customTargetAmountMajor.trim()) {
        toastError('Please enter a target amount')
        return
      }
      const minor = majorToMinorString(customTargetAmountMajor)
      if (BigInt(minor) <= BigInt(0)) {
        toastError('Target amount must be greater than zero')
        return
      }
    }

    const targetAmountMinor =
      customProgressSource === 'TARGET_AMOUNT' && customTargetAmountMajor
        ? majorToMinorString(customTargetAmountMajor)
        : undefined

    try {
      // Pick category ID: if user selected one, use it; otherwise use first available category or 1
      const categoryId =
        typeof customCategoryId === 'number'
          ? customCategoryId
          : categories[0]?.id || 1

      await customMutation.mutateAsync({
        customTitle: customTitle.trim(),
        categoryId,
        customDescription: customDescription.trim() || undefined,
        targetDate: customTargetDate ? new Date(customTargetDate).toISOString() : undefined,
        progressSource: customProgressSource,
        targetAmountMinor,
        notes: customNotes.trim() || undefined,
      })
      haptics.success()
      success('Personal goal created successfully')
      resetAndClose()
    } catch {
      toastError('Failed to create goal')
    }
  }

  const resetAndClose = () => {
    setSelectedCatalogueGoal(null)
    setSearchQuery('')
    setAdoptTargetDate('')
    setAdoptNotes('')
    setCustomTitle('')
    setCustomCategoryId('')
    setCustomDescription('')
    setCustomTargetDate('')
    setCustomProgressSource('MILESTONES')
    setCustomTargetAmountMajor('')
    setCustomNotes('')
    onClose()
  }

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={resetAndClose}
      title="Add a Goal"
      subtitle="Adopt from our curated catalogue or define your own personal ambition"
      maxWidth="md"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            borderRadius: 12,
            background: 'var(--surface2, #f5efe6)',
            padding: 3,
            gap: 4,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('catalogue')
              setSelectedCatalogueGoal(null)
            }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '9px 12px',
              borderRadius: 10,
              border: 'none',
              background: activeTab === 'catalogue' ? 'var(--surface, #ffffff)' : 'transparent',
              color: activeTab === 'catalogue' ? 'var(--dark, #1a1714)' : 'var(--text-muted, #7a7268)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: activeTab === 'catalogue' ? '0 1px 3px rgba(60, 40, 20, 0.08)' : 'none',
              transition: 'all 120ms ease',
            }}
          >
            <Compass size={15} />
            <span>Curated Catalogue</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('custom')
              setSelectedCatalogueGoal(null)
            }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '9px 12px',
              borderRadius: 10,
              border: 'none',
              background: activeTab === 'custom' ? 'var(--surface, #ffffff)' : 'transparent',
              color: activeTab === 'custom' ? 'var(--dark, #1a1714)' : 'var(--text-muted, #7a7268)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: activeTab === 'custom' ? '0 1px 3px rgba(60, 40, 20, 0.08)' : 'none',
              transition: 'all 120ms ease',
            }}
          >
            <Plus size={15} />
            <span>Custom Goal</span>
          </button>
        </div>

        {/* ── TAB 1: CURATED CATALOGUE ── */}
        {activeTab === 'catalogue' && (
          <div>
            {selectedCatalogueGoal ? (
              /* Inspect & Adopt Flow */
              <form onSubmit={handleAdopt} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div
                  style={{
                    background: 'var(--shell-tint, #fbede5)',
                    border: '1px solid var(--border)',
                    borderRadius: 14,
                    padding: '16px',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--clay)' }}>
                    {getCategoryTitle(selectedCatalogueGoal.category)}
                  </span>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--dark)', margin: '4px 0 6px' }}>
                    {selectedCatalogueGoal.title}
                  </h3>
                  {selectedCatalogueGoal.tagline && (
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--clay)', margin: '0 0 6px' }}>
                      {selectedCatalogueGoal.tagline}
                    </p>
                  )}
                  {selectedCatalogueGoal.description && (
                    <p style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--text-muted)', margin: 0 }}>
                      {selectedCatalogueGoal.description}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>
                    Target Completion Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={adoptTargetDate}
                    onChange={(e) => setAdoptTargetDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      fontSize: 13.5,
                      fontFamily: 'inherit',
                      color: 'var(--text)',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>
                    Personal Notes & Motivation (Optional)
                  </label>
                  <textarea
                    value={adoptNotes}
                    onChange={(e) => setAdoptNotes(e.target.value)}
                    rows={2}
                    placeholder="Why this goal matters to you right now..."
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      fontSize: 13.5,
                      fontFamily: 'inherit',
                      color: 'var(--text)',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button
                    type="submit"
                    disabled={adoptMutation.isPending}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '12px 18px',
                      background: 'var(--clay)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer',
                      opacity: adoptMutation.isPending ? 0.6 : 1,
                    }}
                  >
                    {adoptMutation.isPending ? 'Adding to Workspace...' : 'Add to My Goals'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCatalogueGoal(null)}
                    style={{
                      padding: '12px 18px',
                      background: 'transparent',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Back to List
                  </button>
                </div>
              </form>
            ) : (
              /* Browse Catalogue List */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Search Bar */}
                <div style={{ position: 'relative' }}>
                  <Search
                    size={15}
                    style={{ position: 'absolute', left: 12, top: 13, color: 'var(--text-muted)' }}
                  />
                  <input
                    type="text"
                    placeholder="Search catalogue goals..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 34px',
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      fontSize: 13.5,
                      fontFamily: 'inherit',
                      color: 'var(--text)',
                    }}
                  />
                </div>

                {/* Category Filter Pills */}
                {categories.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryId('all')}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        border: '1px solid var(--border)',
                        background: selectedCategoryId === 'all' ? 'var(--dark)' : 'var(--surface)',
                        color: selectedCategoryId === 'all' ? '#ffffff' : 'var(--text-muted)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      All ({allCatalogueGoals.length})
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategoryId(cat.id)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 600,
                          border: '1px solid var(--border)',
                          background: selectedCategoryId === cat.id ? 'var(--dark)' : 'var(--surface)',
                          color: selectedCategoryId === cat.id ? '#ffffff' : 'var(--text-muted)',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cat.title} ({cat.goals?.length || 0})
                      </button>
                    ))}
                  </div>
                )}

                {/* Goals List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '360px', overflowY: 'auto', paddingRight: 2 }}>
                  {filteredGoals.length === 0 ? (
                    <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <p style={{ fontSize: 13.5, margin: '0 0 10px' }}>No catalogue goals match your search.</p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('custom')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '8px 14px',
                          background: 'var(--clay)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          fontSize: 12.5,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <Plus size={14} />
                        <span>Create as Custom Goal</span>
                      </button>
                    </div>
                  ) : (
                    filteredGoals.map((g) => (
                      <div
                        key={g.id}
                        onClick={() => setSelectedCatalogueGoal(g)}
                        style={{
                          padding: '14px 16px',
                          borderRadius: 12,
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 12,
                          transition: 'border-color 150ms ease, box-shadow 150ms ease',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                            {getCategoryTitle(g.categoryObj || g.category)}
                          </span>
                          <h4 style={{ fontSize: 15, fontWeight: 800, color: 'var(--dark)', margin: '2px 0 4px' }}>
                            {g.title}
                          </h4>
                          {g.tagline && (
                            <p style={{ fontSize: 12.5, color: 'var(--clay)', fontWeight: 600, margin: '0 0 4px' }}>
                              {g.tagline}
                            </p>
                          )}
                          {g.description && (
                            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {g.description}
                            </p>
                          )}
                        </div>
                        <ArrowRight size={16} style={{ color: 'var(--text-muted)', marginTop: 4, flexShrink: 0 }} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: CREATE CUSTOM GOAL ── */}
        {activeTab === 'custom' && (
          <form onSubmit={handleCreateCustom} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>
                Goal Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Save towards my master's degree / Learn French"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  color: 'var(--text)',
                }}
              />
            </div>

            {categories.length > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>
                  Category (Optional)
                </label>
                <select
                  value={customCategoryId}
                  onChange={(e) => setCustomCategoryId(e.target.value ? Number(e.target.value) : '')}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    fontSize: 13.5,
                    fontFamily: 'inherit',
                    color: 'var(--text)',
                  }}
                >
                  <option value="">Select a category (or general)</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>
                Description (Optional)
              </label>
              <textarea
                placeholder="What does success look like?"
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                rows={2}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  fontSize: 13.5,
                  fontFamily: 'inherit',
                  color: 'var(--text)',
                  resize: 'vertical',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>
                Progress Tracking Method
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {[
                  { id: 'MILESTONES' as const, label: 'Milestones', desc: 'Calculated from completed steps' },
                  { id: 'MANUAL_PERCENT' as const, label: 'Manual Percent', desc: 'Slider percentage (0–100%)' },
                  { id: 'TARGET_AMOUNT' as const, label: 'Financial Target', desc: 'Savings amount track' },
                  { id: 'STATUS_ONLY' as const, label: 'Status Only', desc: 'Active/Paused/Completed' },
                ].map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setCustomProgressSource(method.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                      background: customProgressSource === method.id ? 'var(--shell-tint)' : 'var(--surface)',
                      borderColor: customProgressSource === method.id ? 'var(--clay)' : 'var(--border)',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: customProgressSource === method.id ? 'var(--clay)' : 'var(--dark)' }}>
                      {method.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {method.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {customProgressSource === 'TARGET_AMOUNT' && (
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>
                  Target Amount (NGN)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 500,000"
                  value={customTargetAmountMajor}
                  onChange={(e) => setCustomTargetAmountMajor(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    color: 'var(--text)',
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>
                Target Completion Date (Optional)
              </label>
              <input
                type="date"
                value={customTargetDate}
                onChange={(e) => setCustomTargetDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  fontSize: 13.5,
                  fontFamily: 'inherit',
                  color: 'var(--text)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>
                Notes (Optional)
              </label>
              <textarea
                placeholder="Personal reminders, links, or notes..."
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                rows={2}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  fontSize: 13.5,
                  fontFamily: 'inherit',
                  color: 'var(--text)',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button
                type="submit"
                disabled={customMutation.isPending || !customTitle.trim()}
                style={{
                  flex: 1,
                  padding: '12px 18px',
                  background: 'var(--clay)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  opacity: customMutation.isPending || !customTitle.trim() ? 0.6 : 1,
                }}
              >
                {customMutation.isPending ? 'Creating Goal...' : 'Create Personal Goal'}
              </button>
              <button
                type="button"
                onClick={resetAndClose}
                style={{
                  padding: '12px 18px',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </BottomSheetModal>
  )
}
