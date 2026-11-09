import React, { useState, useEffect } from 'react'
import { Plus, Trash2, FolderPlus, Star, Layers, Package } from 'lucide-react'
import { Modal } from '../../../components/common/modal/Modal'
import { slugify } from '../utils'
import type { Goal, GoalCollection, Offering, GoalOfferingLink } from '../types'

interface GoalOfferingsModalProps {
  isOpen: boolean
  onClose: () => void
  goal: Goal | null
  allOfferings: Offering[]
  fetchGoalCollections: (goalId: number) => Promise<GoalCollection[]>
  onCreateCollection: (data: Record<string, unknown>) => Promise<GoalCollection>
  onDeleteCollection: (id: number) => Promise<void>
  onLinkOffering: (
    goalId: number,
    dto: { offeringId: number; collectionId?: number; isFeatured?: boolean },
  ) => Promise<GoalOfferingLink>
  onUnlinkOffering: (goalId: number, offeringId: number, collectionId?: number) => Promise<void>
}

export const GoalOfferingsModal: React.FC<GoalOfferingsModalProps> = ({
  isOpen,
  onClose,
  goal,
  allOfferings,
  fetchGoalCollections,
  onCreateCollection,
  onDeleteCollection,
  onLinkOffering,
  onUnlinkOffering,
}) => {
  const [collections, setCollections] = useState<GoalCollection[]>([])

  // New collection form state
  const [showAddCollection, setShowAddCollection] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')

  // Link offering form state
  const [selectedOfferingId, setSelectedOfferingId] = useState<number | ''>('')
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | ''>('')
  const [linkIsFeatured, setLinkIsFeatured] = useState(false)
  const [linking, setLinking] = useState(false)

  // Local linked offerings state for instant UI update
  const [linkedOfferings, setLinkedOfferings] = useState<GoalOfferingLink[]>([])

  useEffect(() => {
    if (goal && isOpen) {
      setLinkedOfferings(goal.offerings || [])
      fetchGoalCollections(goal.id).then((cols) => {
        setCollections(cols)
      })
    }
  }, [goal, isOpen, fetchGoalCollections])

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!goal || !newCollectionName.trim()) return

    try {
      const col = await onCreateCollection({
        goalId: goal.id,
        name: newCollectionName.trim(),
        slug: slugify(newCollectionName.trim()),
      })
      if (col) {
        setCollections([...collections, col])
        setNewCollectionName('')
        setShowAddCollection(false)
      }
    } catch {
      // handled
    }
  }

  const handleDeleteCollection = async (colId: number) => {
    if (!window.confirm('Delete this collection? Linked offerings will become unassigned.')) return
    try {
      await onDeleteCollection(colId)
      setCollections(collections.filter((c) => c.id !== colId))
    } catch {
      // handled
    }
  }

  const handleLinkOffering = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!goal || selectedOfferingId === '') return

    setLinking(true)
    try {
      const offeringIdNum = Number(selectedOfferingId)
      const collectionIdNum = selectedCollectionId !== '' ? Number(selectedCollectionId) : undefined

      const res = await onLinkOffering(goal.id, {
        offeringId: offeringIdNum,
        collectionId: collectionIdNum,
        isFeatured: linkIsFeatured,
      })

      // Add to local state
      const targetOffering = allOfferings.find((o) => o.id === offeringIdNum)
      const targetCollection = collections.find((c) => c.id === collectionIdNum)
      setLinkedOfferings([
        ...linkedOfferings,
        {
          id: res?.id || Date.now(),
          goalId: goal.id,
          offeringId: offeringIdNum,
          collectionId: collectionIdNum,
          isFeatured: linkIsFeatured,
          sortOrder: res?.sortOrder || 0,
          offering: targetOffering,
          collection: targetCollection,
        },
      ])

      setSelectedOfferingId('')
      setSelectedCollectionId('')
      setLinkIsFeatured(false)
    } catch {
      // handled
    } finally {
      setLinking(false)
    }
  }

  const handleUnlink = async (offeringId: number, collectionId?: number) => {
    if (!goal) return
    try {
      await onUnlinkOffering(goal.id, offeringId, collectionId)
      setLinkedOfferings(linkedOfferings.filter((l) => l.offeringId !== offeringId))
    } catch {
      // handled
    }
  }

  // Offerings not yet linked
  const availableToLink = allOfferings.filter(
    (o) => !linkedOfferings.some((l) => l.offeringId === o.id),
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Collections & Offerings: ${goal?.title || ''}`}
      description="Attach products, packages, or services to this goal so tenants can discover them."
      icon={<Layers size={20} />}
      maxWidth="700px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Section 1: Collections */}
        <div
          style={{
            padding: '16px',
            background: 'var(--surface)',
            borderRadius: '12px',
            border: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                Goal Collections ({collections.length})
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Groupings like "Desks & Chairs" or "Lighting" under this goal
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddCollection(!showAddCollection)}
              className="btn btn-secondary"
              style={{ height: '32px', fontSize: '12px', padding: '0 10px', gap: '4px' }}
            >
              <FolderPlus size={14} />
              <span>{showAddCollection ? 'Cancel' : 'New Collection'}</span>
            </button>
          </div>

          {showAddCollection && (
            <form
              onSubmit={handleCreateCollection}
              style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}
            >
              <input
                type="text"
                className="input"
                placeholder="Collection name (e.g. Ergonomic Chairs)"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                style={{ height: '36px', fontSize: '13px' }}
                autoFocus
                required
              />
              <button
                type="submit"
                className="btn btn-primary"
                style={{ height: '36px', fontSize: '13px', whiteSpace: 'nowrap' }}
              >
                Create
              </button>
            </form>
          )}

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {collections.length === 0 ? (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                No custom collections created. Offerings will be grouped directly under this goal.
              </span>
            ) : (
              collections.map((col) => (
                <div
                  key={col.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: 'var(--surface-hover)',
                    border: '1px solid var(--border)',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  <span>{col.name}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteCollection(col.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      padding: '2px',
                    }}
                    title="Delete collection"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Section 2: Link New Offering */}
        <form
          onSubmit={handleLinkOffering}
          style={{
            padding: '16px',
            background: 'var(--surface)',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
            Link An Offering to this Goal
          </h4>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr auto',
              gap: '10px',
              alignItems: 'flex-end',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: '4px',
                }}
              >
                Select Offering *
              </label>
              <select
                className="input"
                value={selectedOfferingId}
                onChange={(e) =>
                  setSelectedOfferingId(e.target.value ? Number(e.target.value) : '')
                }
                style={{ height: '38px', fontSize: '13px' }}
                required
              >
                <option value="">Choose an offering...</option>
                {availableToLink.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title} (₦{Number(o.price).toLocaleString()}) [{o.type}]
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: '4px',
                }}
              >
                Collection (Optional)
              </label>
              <select
                className="input"
                value={selectedCollectionId}
                onChange={(e) =>
                  setSelectedCollectionId(e.target.value ? Number(e.target.value) : '')
                }
                style={{ height: '38px', fontSize: '13px' }}
              >
                <option value="">General (No collection)</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ height: '38px', fontSize: '13px', whiteSpace: 'nowrap' }}
              disabled={linking || selectedOfferingId === ''}
            >
              <Plus size={14} />
              <span>Link</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="link-featured"
              checked={linkIsFeatured}
              onChange={(e) => setLinkIsFeatured(e.target.checked)}
              style={{ width: '15px', height: '15px', accentColor: 'var(--accent)' }}
            />
            <label
              htmlFor="link-featured"
              style={{ fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Highlight as Featured Recommendation for this goal
            </label>
          </div>
        </form>

        {/* Section 3: Currently Linked Offerings List */}
        <div>
          <h4
            style={{
              fontSize: '14px',
              fontWeight: 700,
              margin: '0 0 10px 0',
              color: 'var(--text)',
            }}
          >
            Currently Linked Offerings ({linkedOfferings.length})
          </h4>

          {linkedOfferings.length === 0 ? (
            <div
              style={{
                padding: '28px',
                textAlign: 'center',
                background: 'var(--surface-hover)',
                borderRadius: '10px',
                border: '1px dashed var(--border)',
                color: 'var(--text-muted)',
                fontSize: '13px',
              }}
            >
              No offerings linked to this goal yet. Select an offering above to connect it.
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '280px',
                overflowY: 'auto',
              }}
            >
              {linkedOfferings.map((link) => {
                const off = link.offering
                return (
                  <div
                    key={link.id || link.offeringId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Package size={16} color="var(--accent)" />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text)' }}>
                            {off?.title || `Offering #${link.offeringId}`}
                          </span>
                          {link.isFeatured && (
                            <span title="Featured for this goal">
                              <Star size={12} fill="#f59e0b" color="#f59e0b" />
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {link.collection?.name ? `In: ${link.collection.name}` : 'General'} • ₦
                          {Number(off?.price || 0).toLocaleString()} [{off?.type || 'PRODUCT'}]
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUnlink(link.offeringId, link.collectionId || undefined)}
                      className="btn btn-secondary"
                      style={{
                        padding: '4px 8px',
                        height: '28px',
                        fontSize: '12px',
                        color: 'var(--danger)',
                        border: 'none',
                      }}
                      title="Unlink from goal"
                    >
                      <Trash2 size={13} />
                      <span>Unlink</span>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            paddingTop: '16px',
            borderTop: '1px solid var(--border)',
          }}
        >
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Done
          </button>
        </div>
      </div>
    </Modal>
  )
}
