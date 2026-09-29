'use client'

import React from 'react'
import {
  AllianceSourceType,
  AllianceListingIntent,
} from '../types/alliance.types'
import { Info } from 'lucide-react'

export interface ListingFormData {
  title: string
  description: string
  intent: AllianceListingIntent
  visibility?: 'ALLIANCE' | 'PRIVATE'
  price: number
  currency: string
  address?: string
  city?: string
  state?: string
  country?: string
  propertyType?: string
  bedrooms?: number
  bathrooms?: number
}

interface ListingBasicsFormProps {
  sourceType: AllianceSourceType
  data: ListingFormData
  onChange: (field: keyof ListingFormData, value: any) => void
  disabled?: boolean
  canonicalReference?: {
    name?: string
    address?: string
    canonicalRent?: number
  } | null
}

export function ListingBasicsForm({
  sourceType,
  data,
  onChange,
  disabled = false,
  canonicalReference,
}: ListingBasicsFormProps) {
  const currentVisibility = data.visibility || 'ALLIANCE'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Linked Inventory Context Notice */}
      {sourceType === 'LINKED_INVENTORY' && canonicalReference && (
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '10px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}
        >
          <Info size={18} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '12px', lineHeight: 1.5 }}>
            <div style={{ fontWeight: 700, color: 'var(--text)' }}>
              Linked Canonical Source: {canonicalReference.name || 'Selected Inventory'}
            </div>
            {canonicalReference.address && (
              <div style={{ color: 'var(--text-muted)' }}>Location: {canonicalReference.address}</div>
            )}
            <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
              <em>Alliance presentation changes below are isolated and will <strong>not</strong> modify your canonical inventory record.</em>
            </div>
          </div>
        </div>
      )}

      {/* Listing Title */}
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
          Listing Marketing Title <span style={{ color: 'var(--danger)' }}>*</span>
        </label>
        <input
          type="text"
          className="input"
          disabled={disabled}
          placeholder="e.g. Modern 3-Bedroom Penthouse with Panoramic City View"
          value={data.title}
          onChange={(e) => onChange('title', e.target.value)}
          required
        />
      </div>

      {/* Listing Visibility & Intent */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
            Alliance Visibility <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange('visibility', 'ALLIANCE')}
              className={`btn ${currentVisibility === 'ALLIANCE' ? 'btn--primary' : 'btn--secondary'}`}
              style={{ flex: 1, height: '40px', fontSize: '13px' }}
            >
              Alliance Network
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange('visibility', 'PRIVATE')}
              className={`btn ${currentVisibility === 'PRIVATE' ? 'btn--primary' : 'btn--secondary'}`}
              style={{ flex: 1, height: '40px', fontSize: '13px' }}
            >
              Private (Hidden)
            </button>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {currentVisibility === 'ALLIANCE'
              ? 'Discoverable by other verified Upward Alliance PMs once published.'
              : 'Private to your organization. Not discoverable across the Alliance network.'}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
            Listing Intent <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange('intent', 'RENT')}
              className={`btn ${data.intent === 'RENT' ? 'btn--primary' : 'btn--secondary'}`}
              style={{ flex: 1, height: '40px' }}
            >
              For Rent
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange('intent', 'SALE')}
              className={`btn ${data.intent === 'SALE' ? 'btn--primary' : 'btn--secondary'}`}
              style={{ flex: 1, height: '40px' }}
            >
              For Sale
            </button>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
          {data.intent === 'SALE' ? 'Asking Sale Price (₦)' : 'Annual / Periodic Rent (₦)'} <span style={{ color: 'var(--danger)' }}>*</span>
        </label>
        <input
          type="number"
          min="0"
          step="1000"
          className="input"
          disabled={disabled}
          placeholder="e.g. 15000000"
          value={data.price || ''}
          onChange={(e) => onChange('price', Number(e.target.value))}
          required
        />
      </div>

      {/* Description */}
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
          Marketing Description
        </label>
        <textarea
          className="input"
          disabled={disabled}
          rows={4}
          placeholder="Highlight key amenities, accessibility, finishings, service charges, or terms..."
          value={data.description}
          onChange={(e) => onChange('description', e.target.value)}
          style={{ resize: 'vertical' }}
        />
      </div>

      {/* Independent Details (If INDEPENDENT) */}
      {sourceType === 'INDEPENDENT' && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>
            Independent Property Details
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                Property / Unit Type
              </label>
              <input
                type="text"
                className="input"
                disabled={disabled}
                placeholder="e.g. Flat, Terraced Duplex, Office"
                value={data.propertyType || ''}
                onChange={(e) => onChange('propertyType', e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                Bedrooms
              </label>
              <input
                type="number"
                min="0"
                className="input"
                disabled={disabled}
                placeholder="e.g. 3"
                value={data.bedrooms ?? ''}
                onChange={(e) => onChange('bedrooms', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                Bathrooms
              </label>
              <input
                type="number"
                min="0"
                className="input"
                disabled={disabled}
                placeholder="e.g. 4"
                value={data.bathrooms ?? ''}
                onChange={(e) => onChange('bathrooms', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                Street Address
              </label>
              <input
                type="text"
                className="input"
                disabled={disabled}
                placeholder="e.g. 14 Glover Road"
                value={data.address || ''}
                onChange={(e) => onChange('address', e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                City / Area
              </label>
              <input
                type="text"
                className="input"
                disabled={disabled}
                placeholder="e.g. Ikoyi"
                value={data.city || ''}
                onChange={(e) => onChange('city', e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                State
              </label>
              <input
                type="text"
                className="input"
                disabled={disabled}
                placeholder="e.g. Lagos"
                value={data.state || ''}
                onChange={(e) => onChange('state', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
