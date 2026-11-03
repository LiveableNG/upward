import React from 'react'
import {
  Plus,
  Search,
  Target,
  Edit2,
  Trash2,
  Link as LinkIcon,
  CheckCircle2,
  XCircle,
  Star,
  Layers,
} from 'lucide-react'
import { DataTable, type ColumnDef, type ActionItem } from '../../../components/common/table/DataTable'
import type { Goal, GoalCategory } from '../types'

interface GoalsTabProps {
  goals: Goal[]
  categories: GoalCategory[]
  totalGoals: number
  currentPage: number
  onPageChange: (page: number) => void
  search: string
  onSearchChange: (val: string) => void
  categoryFilter: number | undefined
  onCategoryFilterChange: (catId: number | undefined) => void
  publishedFilter: boolean | undefined
  onPublishedFilterChange: (pub: boolean | undefined) => void
  isLoading: boolean
  onNewGoal: () => void
  onEditGoal: (goal: Goal) => void
  onManageCollections: (goal: Goal) => void
  onDeleteGoal: (goal: Goal) => void
  onTogglePublish: (goal: Goal) => void
}

export const GoalsTab: React.FC<GoalsTabProps> = ({
  goals,
  categories,
  totalGoals,
  currentPage,
  onPageChange,
  search,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  publishedFilter,
  onPublishedFilterChange,
  isLoading,
  onNewGoal,
  onEditGoal,
  onManageCollections,
  onDeleteGoal,
  onTogglePublish,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalGoals / 20))

  const columns: ColumnDef<Goal>[] = [
    {
      key: 'title',
      label: 'Goal Title',
      render: (goal) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--accent-faint)',
              border: '1px solid var(--accent-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
              fontSize: '16px',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {goal.icon || <Target size={18} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>{goal.title}</span>
              {goal.isFeatured && (
                <span title="Featured Goal">
                  <Star size={13} fill="#f59e0b" color="#f59e0b" />
                </span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              /{goal.slug} • {goal.category?.name || 'Uncategorized'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'tags',
      label: 'Tags & Lifestyle Domain',
      render: (goal) => (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {goal.tags && goal.tags.length > 0 ? (
            goal.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: 'var(--surface-hover)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                }}
              >
                {tag}
              </span>
            ))
          ) : (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>—</span>
          )}
        </div>
      ),
    },
    {
      key: 'offerings',
      label: 'Offerings & Bundles',
      width: '150px',
      align: 'center',
      render: (goal) => {
        const count = goal._count?.offerings ?? goal.offerings?.length ?? 0
        return (
          <button
            onClick={() => onManageCollections(goal)}
            className="btn btn-secondary"
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              height: '28px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Manage Collections & Linked Offerings"
          >
            <Layers size={13} />
            <span>{count} linked</span>
          </button>
        )
      },
    },
    {
      key: 'adoptions',
      label: 'Adoptions',
      width: '100px',
      align: 'center',
      render: (goal) => (
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.1)',
            color: '#10b981',
          }}
        >
          {goal._count?.userGoals ?? 0}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '130px',
      render: (goal) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onTogglePublish(goal)
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            background: goal.isPublished ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.1)',
            color: goal.isPublished ? '#10b981' : '#64748b',
            border: 'none',
            cursor: 'pointer',
          }}
          title="Click to toggle publish status"
        >
          {goal.isPublished ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
          <span>{goal.isPublished ? 'Published' : 'Draft'}</span>
        </button>
      ),
    },
    {
      key: 'sortOrder',
      label: 'Order',
      width: '70px',
      align: 'center',
      render: (goal) => (
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{goal.sortOrder}</span>
      ),
    },
  ]

  const rowActions = (goal: Goal): ActionItem<Goal>[] => [
    {
      label: 'Edit Goal',
      icon: <Edit2 size={14} />,
      onClick: () => onEditGoal(goal),
    },
    {
      label: 'Manage Collections & Offerings',
      icon: <LinkIcon size={14} />,
      onClick: () => onManageCollections(goal),
    },
    {
      label: 'Delete Goal',
      icon: <Trash2 size={14} />,
      danger: true,
      onClick: () => onDeleteGoal(goal),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Filter and Action Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
          {/* Search Input */}
          <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="input"
              placeholder="Search goals..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{ paddingLeft: '36px', height: '40px' }}
            />
          </div>

          {/* Category Dropdown Filter */}
          <select
            className="input"
            value={categoryFilter ?? ''}
            onChange={(e) => onCategoryFilterChange(e.target.value ? Number(e.target.value) : undefined)}
            style={{ width: '180px', height: '40px' }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Published Filter */}
          <select
            className="input"
            value={publishedFilter === undefined ? '' : String(publishedFilter)}
            onChange={(e) => {
              const val = e.target.value
              onPublishedFilterChange(val === '' ? undefined : val === 'true')
            }}
            style={{ width: '150px', height: '40px' }}
          >
            <option value="">All Statuses</option>
            <option value="true">Published</option>
            <option value="false">Draft</option>
          </select>
        </div>

        <button
          onClick={onNewGoal}
          className="btn btn-primary"
          style={{ height: '40px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} />
          <span>New Goal</span>
        </button>
      </div>

      {/* Goals Data Table */}
      <DataTable
        data={goals}
        columns={columns}
        keyExtractor={(goal) => String(goal.id)}
        isLoading={isLoading}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        rowActions={rowActions}
        emptyIcon={<Target size={36} color="var(--text-muted)" />}
        emptyTitle="No Goals Configured"
        emptyDescription="Create lifestyle goals like 'Redecorate my space', 'Upgrade my workspace', or 'Start a gym membership'."
      />
    </div>
  )
}
