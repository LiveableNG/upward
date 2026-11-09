import React, { useState, useEffect } from 'react'
import { Package } from 'lucide-react'
import { Modal } from '../../../components/common/modal/Modal'
import { slugify } from '../utils'
import type { Offering, CommerceVendor, OfferingType, Goal } from '../types'

interface OfferingModalProps {
  isOpen: boolean
  onClose: () => void
  offering: Offering | null
  vendors: CommerceVendor[]
  goals?: Goal[]
  onSubmit: (data: Record<string, unknown>, linkedGoalIds?: number[]) => Promise<void>
}

export const OfferingModal: React.FC<OfferingModalProps> = ({
  isOpen,
  onClose,
  offering,
  vendors,
  goals = [],
  onSubmit,
}) => {
  const isEditing = Boolean(offering)
  const [type, setType] = useState<OfferingType>('PRODUCT')
  const [vendorId, setVendorId] = useState<number | ''>('')
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState<number | ''>('')
  const [compareAtPrice, setCompareAtPrice] = useState<number | ''>('')
  const [currency] = useState('NGN')
  const [stockCount, setStockCount] = useState<number | ''>('')
  const [leadTimeDays, setLeadTimeDays] = useState<number | ''>('')
  const [isDeliverable, setIsDeliverable] = useState(true)
  const [mediaUrl, setMediaUrl] = useState('')
  const [isPublished, setIsPublished] = useState(true)
  const [isFeatured, setIsFeatured] = useState(false)
  const [selectedGoalIds, setSelectedGoalIds] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (offering) {
      setType(offering.type)
      setVendorId(offering.vendorId ?? '')
      setTitle(offering.title || '')
      setSlug(offering.slug || (offering.title ? slugify(offering.title) : ''))
      setSubtitle(offering.subtitle || '')
      setDescription(offering.description || '')
      setPrice(offering.price ?? '')
      setCompareAtPrice(offering.compareAtPrice ?? (offering as any).maxPrice ?? '')
      setStockCount(offering.stockCount ?? '')
      setLeadTimeDays(offering.leadTimeDays ?? '')
      setIsDeliverable((offering as any).deliveryAvailable ?? offering.isDeliverable ?? true)

      const firstMedia = offering.media?.[0]
      setMediaUrl(firstMedia?.url || (firstMedia as any)?.mediaUrl || '')

      setIsPublished(offering.isPublished ?? (offering as any).status === 'PUBLISHED')
      setIsFeatured(offering.isFeatured ?? false)

      const initialGoalIds = offering.goalLinks?.map((gl) => gl.goalId) || []
      setSelectedGoalIds(initialGoalIds)
    } else {
      setType('PRODUCT')
      setVendorId('')
      setTitle('')
      setSlug('')
      setSubtitle('')
      setDescription('')
      setPrice('')
      setCompareAtPrice('')
      setStockCount('')
      setLeadTimeDays('')
      setIsDeliverable(true)
      setMediaUrl('')
      setIsPublished(true)
      setIsFeatured(false)
      setSelectedGoalIds([])
    }
  }, [offering, isOpen])

  const handleTitleChange = (val: string) => {
    setTitle(val)
    if (!isEditing && (!slug || slug === slugify(title))) {
      setSlug(slugify(val))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !slug.trim() || price === '') return

    setSubmitting(true)
    try {
      const media = mediaUrl.trim()
        ? [{ url: mediaUrl.trim(), altText: title.trim(), sortOrder: 0, isCover: true }]
        : undefined

      await onSubmit(
        {
          type,
          vendorId: vendorId === '' ? undefined : Number(vendorId),
          title: title.trim(),
          slug: slug.trim(),
          subtitle: subtitle.trim() || undefined,
          description: description.trim() || undefined,
          price: Number(price),
          currency,
          compareAtPrice: compareAtPrice === '' ? undefined : Number(compareAtPrice),
          stockCount: stockCount === '' ? undefined : Number(stockCount),
          leadTimeDays: leadTimeDays === '' ? undefined : Number(leadTimeDays),
          isDeliverable,
          media,
          isPublished,
          isFeatured,
        },
        selectedGoalIds,
      )
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
      title={isEditing ? 'Edit Offering' : 'Create Commerce Offering'}
      description="Configure products, artisan services, or lifestyle packages available for tenant purchase."
      icon={<Package size={20} />}
      maxWidth="580px"
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
            >
              Offering Type *
            </label>
            <select
              className="input"
              value={type}
              onChange={(e) => setType(e.target.value as OfferingType)}
              required
            >
              <option value="PRODUCT">Physical Product</option>
              <option value="SERVICE">Individual Service</option>
              <option value="PACKAGE">Service & Product Package</option>
              <option value="BUNDLE">Curated Bundle</option>
            </select>
          </div>

          <div>
            <label
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
            >
              Merchant / Vendor
            </label>
            <select
              className="input"
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Direct / Platform Fulfilled</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
          >
            Offering Title *
          </label>
          <input
            type="text"
            className="input"
            placeholder="e.g. Ergonomic Standing Desk Pro"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            required
          />
        </div>

        <div>
          <label
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
          >
            Slug *
          </label>
          <input
            type="text"
            className="input"
            placeholder="e.g. ergonomic-standing-desk-pro"
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            required
          />
        </div>

        <div>
          <label
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
          >
            Subtitle / Catchphrase
          </label>
          <input
            type="text"
            className="input"
            placeholder="e.g. 4-hour top-to-bottom scrub and sanitization for 1-2 bedroom apartments"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
            >
              Price (₦ NGN) *
            </label>
            <input
              type="number"
              className="input"
              placeholder="e.g. 185000"
              value={price}
              onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
              required
            />
          </div>

          <div>
            <label
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
            >
              Compare At Price (₦)
            </label>
            <input
              type="number"
              className="input"
              placeholder="e.g. 210000 (strike-through)"
              value={compareAtPrice}
              onChange={(e) =>
                setCompareAtPrice(e.target.value === '' ? '' : Number(e.target.value))
              }
            />
          </div>
        </div>

        <div>
          <label
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
          >
            Cover Image URL
          </label>
          <input
            type="url"
            className="input"
            placeholder="https://... image url"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
          />
        </div>

        <div>
          <label
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
          >
            Description
          </label>
          <textarea
            className="input"
            rows={3}
            placeholder="Detailed specs, what is included, dimensions or session structure"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: type === 'SERVICE' ? '1fr' : '1fr 1fr',
            gap: '12px',
          }}
        >
          {type !== 'SERVICE' && (
            <div>
              <label
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
              >
                Stock Count
              </label>
              <input
                type="number"
                className="input"
                placeholder="Leave empty for unlimited"
                value={stockCount}
                onChange={(e) => setStockCount(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
          )}

          <div>
            <label
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
            >
              {type === 'SERVICE' ? 'Advance Notice / Lead Time (Days)' : 'Lead Time (Days)'}
            </label>
            <input
              type="number"
              className="input"
              placeholder={
                type === 'SERVICE' ? 'e.g. 1 for next-day service' : 'e.g. 2 for 48hrs delivery'
              }
              value={leadTimeDays}
              onChange={(e) => setLeadTimeDays(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>
        </div>

        <div>
          <label
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
          >
            Connected Lifestyle Goal(s)
          </label>
          <div
            style={{
              display: 'flex',
              gap: '6px',
              flexWrap: 'wrap',
              maxHeight: '120px',
              overflowY: 'auto',
              padding: '8px',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              background: 'var(--surface-hover)',
            }}
          >
            {goals && goals.length > 0 ? (
              goals.map((g) => {
                const isSelected = selectedGoalIds.includes(g.id)
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      setSelectedGoalIds((prev) =>
                        isSelected ? prev.filter((id) => id !== g.id) : [...prev, g.id],
                      )
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '16px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                      background: isSelected ? 'var(--accent)' : 'var(--surface)',
                      color: isSelected ? '#fff' : 'var(--text)',
                      transition: 'all 0.15s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>{isSelected ? '✓' : '+'}</span>
                    <span>{g.title}</span>
                  </button>
                )
              })
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                No goals available yet. Create a goal in the Goals tab first.
              </span>
            )}
          </div>
          <span
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              marginTop: '4px',
              display: 'block',
            }}
          >
            Connect this offering to goals so tenants see it when browsing or filtering
            recommendations in Upward Pay.
          </span>
        </div>

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="offering-deliverable"
              checked={isDeliverable}
              onChange={(e) => setIsDeliverable(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
            />
            <label
              htmlFor="offering-deliverable"
              style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              {type === 'SERVICE' ? 'Home Visit / On-site Service' : 'Physical Delivery Available'}
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="offering-published"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
            />
            <label
              htmlFor="offering-published"
              style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              Published in Commerce Catalog
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="offering-featured"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
            />
            <label
              htmlFor="offering-featured"
              style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              Featured
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
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : isEditing ? 'Update Offering' : 'Create Offering'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
