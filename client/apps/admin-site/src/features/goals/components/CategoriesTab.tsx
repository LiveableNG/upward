import React, { useState } from 'react'
import { Plus, Search, FolderTree, Edit2, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import {
  DataTable,
  type ColumnDef,
  type ActionItem,
} from '../../../components/common/table/DataTable'
import type { GoalCategory } from '../types'

interface CategoriesTabProps {
  categories: GoalCategory[]
  isLoading: boolean
  onNewCategory: () => void
  onEditCategory: (cat: GoalCategory) => void
  onDeleteCategory: (cat: GoalCategory) => void
  onTogglePublish: (cat: GoalCategory) => void
}

export const CategoriesTab: React.FC<CategoriesTabProps> = ({
  categories,
  isLoading,
  onNewCategory,
  onEditCategory,
  onDeleteCategory,
  onTogglePublish,
}) => {
  const [search, setSearch] = useState('')

  const filteredCategories = categories.filter((c) => {
    if (!search.trim()) return true
    const term = search.toLowerCase()
    const catName = (c.name || (c as any).title || '').toLowerCase()
    return (
      catName.includes(term) ||
      c.slug.toLowerCase().includes(term) ||
      (c.description && c.description.toLowerCase().includes(term))
    )
  })

  const columns: ColumnDef<GoalCategory>[] = [
    {
      key: 'name',
      label: 'Category Name',
      render: (cat) => {
        const nameText = cat.name || (cat as any).title || ''
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--accent-faint)',
                border: '1px solid var(--accent-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)',
                fontSize: '14px',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {cat.icon || <FolderTree size={16} />}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text)' }}>{nameText}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{cat.slug}</div>
            </div>
          </div>
        )
      },
    },
    {
      key: 'description',
      label: 'Description',
      render: (cat) => (
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          {cat.description || '—'}
        </span>
      ),
    },
    {
      key: 'sortOrder',
      label: 'Order',
      width: '80px',
      align: 'center',
      render: (cat) => (
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
          {cat.sortOrder}
        </span>
      ),
    },
    {
      key: 'goalsCount',
      label: 'Goals',
      width: '100px',
      align: 'center',
      render: (cat) => (
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: '12px',
            background: 'var(--surface-hover)',
            color: 'var(--text)',
          }}
        >
          {cat._count?.goals ?? 0}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '130px',
      render: (cat) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onTogglePublish(cat)
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            background: cat.isPublished ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.1)',
            color: cat.isPublished ? '#10b981' : '#64748b',
            border: 'none',
            cursor: 'pointer',
          }}
          title="Click to toggle publish status"
        >
          {cat.isPublished ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
          <span>{cat.isPublished ? 'Published' : 'Draft'}</span>
        </button>
      ),
    },
  ]

  const rowActions = (cat: GoalCategory): ActionItem<GoalCategory>[] => [
    {
      label: 'Edit Category',
      icon: <Edit2 size={14} />,
      onClick: () => onEditCategory(cat),
    },
    {
      label: 'Delete Category',
      icon: <Trash2 size={14} />,
      danger: true,
      onClick: () => onDeleteCategory(cat),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Search and Action Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
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
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', height: '40px' }}
          />
        </div>

        <button
          onClick={onNewCategory}
          className="btn btn-primary"
          style={{ height: '40px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} />
          <span>New Category</span>
        </button>
      </div>

      {/* Table */}
      <DataTable
        data={filteredCategories}
        columns={columns}
        keyExtractor={(cat) => String(cat.id)}
        isLoading={isLoading}
        rowActions={rowActions}
        emptyIcon={<FolderTree size={36} color="var(--text-muted)" />}
        emptyTitle="No Goal Categories Found"
        emptyDescription="Create your first lifestyle category (e.g., Home & Living, Health & Fitness, Career & Professional)."
      />
    </div>
  )
}
