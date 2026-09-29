'use client'

import React from 'react'
import { Modal } from '@/components/ui/Modal/Modal'
import { Send, Building2, Home, Link as LinkIcon, Globe, CheckCircle2 } from 'lucide-react'
import { AllianceListing } from '../types/alliance.types'

interface ListingReviewModalProps {
  isOpen: boolean
  listing: AllianceListing | null
  onClose: () => void
  onConfirmPublish: () => void
  isPublishing?: boolean
}

export function ListingReviewModal({
  isOpen,
  listing,
  onClose,
  onConfirmPublish,
  isPublishing = false,
}: ListingReviewModalProps) {
  if (!listing) return null

  const formatPrice = (amount: number, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency === 'NGN' ? 'NGN' : currency,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Review & Publish Listing"
      icon={Send}
      maxWidth={520}
      footer={
        <>
          <button
            type="button"
            className="btn btn--secondary"
            style={{ flex: 1, height: 44 }}
            onClick={onClose}
            disabled={isPublishing}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary"
            style={{ flex: 1, height: 44, gap: '6px' }}
            onClick={onConfirmPublish}
            disabled={isPublishing}
          >
            <Send size={16} />
            {isPublishing ? 'Publishing...' : 'Confirm & Publish'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
        {/* Title & Price Header */}
        <div style={{ padding: '12px 16px', background: 'var(--bg)', borderRadius: '10px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
            FOR {listing.intent}
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)', marginTop: '2px' }}>
            {listing.title}
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--forest)', marginTop: '4px' }}>
            {formatPrice(listing.price, listing.currency)}
          </div>
        </div>

        {/* Target & Source Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Target Type</div>
            <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              {listing.targetType === 'PROPERTY' ? <Building2 size={14} /> : <Home size={14} />}
              {listing.targetType === 'PROPERTY' ? 'Entire Property' : 'Unit'}
            </div>
          </div>

          <div style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Source Origin</div>
            <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              {listing.sourceType === 'LINKED_INVENTORY' ? <LinkIcon size={14} /> : <Globe size={14} />}
              {listing.sourceType === 'LINKED_INVENTORY' ? 'Linked Inventory' : 'Independent'}
            </div>
          </div>
        </div>

        {/* Linked Canonical Info if Linked */}
        {listing.sourceType === 'LINKED_INVENTORY' && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(22, 101, 52, 0.04)', border: '1px solid rgba(22, 101, 52, 0.2)' }}>
            <div style={{ fontSize: '11px', color: 'var(--forest)', fontWeight: 700 }}>CANONICAL INVENTORY TARGET</div>
            <div style={{ fontWeight: 600, color: 'var(--text)', marginTop: '2px' }}>
              {listing.targetProperty && listing.targetProperty.name}
              {listing.targetUnit && `${listing.targetUnit.unitName} (${listing.targetUnit.property?.name || 'Property'})`}
            </div>
          </div>
        )}

        {/* Description snippet */}
        {listing.description && (
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>Description</div>
            <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5, maxHeight: '80px', overflowY: 'auto' }}>
              {listing.description}
            </p>
          </div>
        )}

        {/* Confirmation terms */}
        <div style={{ padding: '10px 14px', background: 'var(--surface-hover)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <CheckCircle2 size={16} color="var(--forest)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            Publishing makes this listing discoverable to authorized Alliance network participants. Canonical inventory records remain isolated.
          </div>
        </div>
      </div>
    </Modal>
  )
}
