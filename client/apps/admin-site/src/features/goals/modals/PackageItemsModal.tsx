import React, { useState, useEffect } from 'react'
import { Boxes, Plus, Trash2 } from 'lucide-react'
import { Modal } from '../../../components/common/modal/Modal'
import { showToast } from '@upward/client-core'
import type { Offering } from '../types'

interface PackageItemsModalProps {
  isOpen: boolean
  onClose: () => void
  packageOffering: Offering | null
  allOfferings: Offering[]
  onSubmit: (
    packageId: number,
    items: Array<{
      componentId: number
      quantity: number
      isOptional?: boolean
      overridePrice?: number
    }>,
  ) => Promise<unknown>
}

export const PackageItemsModal: React.FC<PackageItemsModalProps> = ({
  isOpen,
  onClose,
  packageOffering,
  allOfferings,
  onSubmit,
}) => {
  const [items, setItems] = useState<
    { componentId: number; quantity: number; isOptional: boolean; overridePrice?: number }[]
  >([])
  const [submitting, setSubmitting] = useState(false)

  // Filter out the package itself to prevent circular bundling
  const availableComponents = allOfferings.filter(
    (o) => o.id !== packageOffering?.id && o.type !== 'SERVICE_PACKAGE',
  )

  useEffect(() => {
    if (packageOffering && packageOffering.packageItems) {
      setItems(
        packageOffering.packageItems.map((p) => ({
          componentId: p.componentId,
          quantity: p.quantity,
          isOptional: p.isOptional ?? false,
          overridePrice: p.overridePrice ? Number(p.overridePrice) : undefined,
        })),
      )
    } else {
      setItems([])
    }
  }, [packageOffering, isOpen])

  const handleAddItem = () => {
    if (availableComponents.length === 0) {
      showToast('No standalone products or services available to add', true)
      return
    }
    const unused = availableComponents.find((c) => !items.some((i) => i.componentId === c.id))
    const firstId = unused ? unused.id : availableComponents[0].id
    setItems([...items, { componentId: firstId, quantity: 1, isOptional: false }])
  }

  const handleRemoveItem = (index: number) => {
    const updated = [...items]
    updated.splice(index, 1)
    setItems(updated)
  }

  const handleUpdateItem = (
    index: number,
    field: 'componentId' | 'quantity' | 'isOptional' | 'overridePrice',
    value: number | boolean | undefined,
  ) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!packageOffering) return

    setSubmitting(true)
    try {
      await onSubmit(packageOffering.id, items)
      onClose()
    } catch {
      // handled
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Package Components"
      description={`Configure the products and services bundled inside "${packageOffering?.title || ''}"`}
      icon={<Boxes size={20} />}
      maxWidth="620px"
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
            Bundled Components ({items.length})
          </span>
          <button
            type="button"
            onClick={handleAddItem}
            className="btn btn-secondary"
            style={{ height: '32px', fontSize: '12px', padding: '0 10px', gap: '4px' }}
          >
            <Plus size={14} />
            <span>Add Component</span>
          </button>
        </div>

        {items.length === 0 ? (
          <div
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              background: 'var(--surface-hover)',
              borderRadius: '10px',
              border: '1px dashed var(--border)',
              color: 'var(--text-muted)',
              fontSize: '13px',
            }}
          >
            No components added to this package bundle yet. Click "Add Component" above.
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              maxHeight: '360px',
              overflowY: 'auto',
            }}
          >
            {items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px',
                  background: 'var(--surface)',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ flex: 2 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      marginBottom: '4px',
                    }}
                  >
                    Component
                  </label>
                  <select
                    className="input"
                    value={item.componentId}
                    onChange={(e) => handleUpdateItem(idx, 'componentId', Number(e.target.value))}
                    style={{ height: '36px', fontSize: '13px' }}
                  >
                    {availableComponents.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} (₦{Number(c.price).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ width: '80px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      marginBottom: '4px',
                    }}
                  >
                    Qty
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="input"
                    value={item.quantity}
                    onChange={(e) => handleUpdateItem(idx, 'quantity', Number(e.target.value))}
                    style={{ height: '36px', fontSize: '13px' }}
                  />
                </div>

                <div style={{ width: '120px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      marginBottom: '4px',
                    }}
                  >
                    Override Price
                  </label>
                  <input
                    type="number"
                    placeholder="Default"
                    className="input"
                    value={item.overridePrice ?? ''}
                    onChange={(e) =>
                      handleUpdateItem(
                        idx,
                        'overridePrice',
                        e.target.value === '' ? undefined : Number(e.target.value),
                      )
                    }
                    style={{ height: '36px', fontSize: '13px' }}
                  />
                </div>

                <div style={{ paddingTop: '16px' }}>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="btn btn-secondary"
                    style={{
                      width: '36px',
                      height: '36px',
                      padding: 0,
                      borderRadius: '8px',
                      color: 'var(--danger)',
                    }}
                    title="Remove Component"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

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
            {submitting ? 'Saving...' : 'Save Package Items'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
