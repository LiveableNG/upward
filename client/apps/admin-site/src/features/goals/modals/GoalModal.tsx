import React, { useState, useEffect } from 'react'
import { Target } from 'lucide-react'
import { Modal } from '../../../components/common/modal/Modal'
import { slugify } from '../utils'
import type { Goal, GoalCategory } from '../types'

interface GoalModalProps {
  isOpen: boolean
  onClose: () => void
  goal: Goal | null
  categories: GoalCategory[]
  onSubmit: (data: Record<string, unknown>) => Promise<void>
}

export const GoalModal: React.FC<GoalModalProps> = ({
  isOpen,
  onClose,
  goal,
  categories,
  onSubmit,
}) => {
  const isEditing = Boolean(goal)
  const [categoryId, setCategoryId] = useState<number>(categories[0]?.id || 0)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [tagsStr, setTagsStr] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [isPublished, setIsPublished] = useState(true)
  const [isFeatured, setIsFeatured] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (goal) {
      setCategoryId(goal.categoryId)
      setTitle(goal.title)
      setSlug(goal.slug)
      setSubtitle(goal.subtitle || '')
      setDescription(goal.description || '')
      setIcon(goal.icon || '')
      setCoverImageUrl(goal.coverImageUrl || '')
      setTagsStr(goal.tags?.join(', ') || '')
      setSortOrder(goal.sortOrder || 0)
      setIsPublished(goal.isPublished ?? true)
      setIsFeatured(goal.isFeatured ?? false)
    } else {
      setCategoryId(categories[0]?.id || 0)
      setTitle('')
      setSlug('')
      setSubtitle('')
      setDescription('')
      setIcon('')
      setCoverImageUrl('')
      setTagsStr('')
      setSortOrder(0)
      setIsPublished(true)
      setIsFeatured(false)
    }
  }, [goal, categories, isOpen])

  const handleTitleChange = (val: string) => {
    setTitle(val)
    if (!isEditing && (!slug || slug === slugify(title))) {
      setSlug(slugify(val))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !slug.trim() || !categoryId) return

    setSubmitting(true)
    try {
      const parsedTags = tagsStr
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      await onSubmit({
        categoryId: Number(categoryId),
        title: title.trim(),
        slug: slug.trim(),
        subtitle: subtitle.trim() || undefined,
        description: description.trim() || undefined,
        icon: icon.trim() || undefined,
        coverImageUrl: coverImageUrl.trim() || undefined,
        tags: parsedTags,
        sortOrder: Number(sortOrder),
        isPublished,
        isFeatured,
      })
      onClose()
    } catch {
      // handled in hook
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Goal' : 'Create Lifestyle Goal'}
      description="Configure user lifestyle goals like 'Redecorate my space' or 'Upgrade my workspace'."
      icon={<Target size={20} />}
      maxWidth="560px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Category *
          </label>
          <select
            className="input"
            value={categoryId}
            onChange={(e) => setCategoryId(Number(e.target.value))}
            required
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || (c as any).title || c.slug}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Goal Title *
          </label>
          <input
            type="text"
            className="input"
            placeholder="e.g. Upgrade my workspace"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
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
            placeholder="e.g. upgrade-my-workspace"
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Subtitle / Catchphrase
          </label>
          <input
            type="text"
            className="input"
            placeholder="e.g. Desks, ergonomic chairs & productivity essentials"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Description
          </label>
          <textarea
            className="input"
            rows={3}
            placeholder="Detailed description of what this goal helps the tenant accomplish"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Icon (Emoji or Identifier)
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. 💻 or laptop"
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

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Cover Image URL
          </label>
          <input
            type="url"
            className="input"
            placeholder="https://... image banner"
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Tags (comma-separated)
          </label>
          <input
            type="text"
            className="input"
            placeholder="e.g. productivity, work-from-home, furniture"
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="goal-published"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
            />
            <label htmlFor="goal-published" style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              Published
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="goal-featured"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
            />
            <label htmlFor="goal-featured" style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              Featured on Tenant Home
            </label>
          </div>
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
            {submitting ? 'Saving...' : isEditing ? 'Update Goal' : 'Create Goal'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
