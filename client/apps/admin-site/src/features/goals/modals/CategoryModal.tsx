import React, { useState, useEffect } from 'react'
import { FolderTree } from 'lucide-react'
import { Modal } from '../../../components/common/modal/Modal'
import { slugify } from '../utils'
import type { GoalCategory } from '../types'

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  category: GoalCategory | null
  onSubmit: (data: Record<string, unknown>) => Promise<void>
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  category,
  onSubmit,
}) => {
  const isEditing = Boolean(category)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [isPublished, setIsPublished] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (category) {
      setName(category.name)
      setSlug(category.slug)
      setDescription(category.description || '')
      setIcon(category.icon || '')
      setSortOrder(category.sortOrder || 0)
      setIsPublished(category.isPublished ?? true)
    } else {
      setName('')
      setSlug('')
      setDescription('')
      setIcon('')
      setSortOrder(0)
      setIsPublished(true)
    }
  }, [category, isOpen])

  const handleNameChange = (val: string) => {
    setName(val)
    if (!isEditing && (!slug || slug === slugify(name))) {
      setSlug(slugify(val))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) return

    setSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        icon: icon.trim() || undefined,
        sortOrder: Number(sortOrder),
        isPublished,
      })
      onClose()
    } catch {
      // error handled in hook
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Goal Category' : 'Create Goal Category'}
      description="Lifestyle categories organize goals into areas like Home & Living, Fitness, or Career."
      icon={<FolderTree size={20} />}
      maxWidth="500px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Category Name *
          </label>
          <input
            type="text"
            className="input"
            placeholder="e.g. Home & Living"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Slug *
          </label>
          <input
            type="text"
            className="input"
            placeholder="e.g. home-and-living"
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Description
          </label>
          <textarea
            className="input"
            rows={3}
            placeholder="Optional summary of this category"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Icon (Emoji or Icon Key)
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. 🏠 or home"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Display Order
            </label>
            <input
              type="number"
              className="input"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
          <input
            type="checkbox"
            id="cat-published"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
          />
          <label htmlFor="cat-published" style={{ fontSize: '13.5px', fontWeight: 600, cursor: 'pointer' }}>
            Published and available for tenant goal selection
          </label>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border)',
          }}
        >
          <button type="button" onClick={onClose} className="btn btn-secondary" disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : isEditing ? 'Update Category' : 'Create Category'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
