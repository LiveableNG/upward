'use client'

import React from 'react'
import {
  AllianceSourceType,
  AllianceListingIntent,
} from '../types/alliance.types'
import { Info, Globe, EyeOff, Tag, Home, MapPin } from 'lucide-react'

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
    <div className="alliance-form-section">
      {/* Linked Inventory Context Notice */}
      {sourceType === 'LINKED_INVENTORY' && canonicalReference && (
        <div className="alliance-callout">
          <Info size={18} className="alliance-callout__icon" />
          <div className="alliance-callout__content">
            <div>
              <strong>Linked Canonical Asset:</strong> {canonicalReference.name || 'Selected Inventory'}
              {canonicalReference.address && ` • ${canonicalReference.address}`}
            </div>
            <div style={{ marginTop: '2px', color: 'var(--text-muted)' }}>
              Presentation marketing details below are isolated from your core PM inventory records.
            </div>
          </div>
        </div>
      )}

      {/* Listing Marketing Title */}
      <div className="alliance-form-group">
        <label className="alliance-label">
          <span>Marketing Title</span>
          <span className="alliance-label__required">*</span>
          <span className="alliance-label__hint">Recommended: 40–80 characters</span>
        </label>
        <input
          type="text"
          className="alliance-input"
          disabled={disabled}
          placeholder="e.g. Modern 3-Bedroom Penthouse with Panoramic City View"
          value={data.title}
          onChange={(e) => onChange('title', e.target.value)}
          required
        />
      </div>

      {/* Listing Intent & Visibility Controls */}
      <div className="alliance-form-row">
        {/* Visibility */}
        <div className="alliance-form-group">
          <label className="alliance-label">
            <span>Alliance Visibility</span>
            <span className="alliance-label__required">*</span>
          </label>
          <div className="alliance-segmented-switch">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange('visibility', 'ALLIANCE')}
              className={`alliance-segmented-switch__option ${
                currentVisibility === 'ALLIANCE' ? 'alliance-segmented-switch__option--active' : ''
              }`}
            >
              <Globe size={14} /> Alliance Network
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange('visibility', 'PRIVATE')}
              className={`alliance-segmented-switch__option ${
                currentVisibility === 'PRIVATE' ? 'alliance-segmented-switch__option--active' : ''
              }`}
            >
              <EyeOff size={14} /> Private (Hidden)
            </button>
          </div>
          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
            {currentVisibility === 'ALLIANCE'
              ? 'Discoverable by verified partner PMs once published.'
              : 'Private to your organization only.'}
          </span>
        </div>

        {/* Intent */}
        <div className="alliance-form-group">
          <label className="alliance-label">
            <span>Listing Intent</span>
            <span className="alliance-label__required">*</span>
          </label>
          <div className="alliance-segmented-switch">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange('intent', 'RENT')}
              className={`alliance-segmented-switch__option ${
                data.intent === 'RENT' ? 'alliance-segmented-switch__option--active' : ''
              }`}
            >
              <Tag size={14} /> For Rent
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange('intent', 'SALE')}
              className={`alliance-segmented-switch__option ${
                data.intent === 'SALE' ? 'alliance-segmented-switch__option--active' : ''
              }`}
            >
              <Home size={14} /> For Sale
            </button>
          </div>
          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
            {data.intent === 'RENT' ? 'Marketed for lease / rental attribution.' : 'Marketed for outright sale / disposition.'}
          </span>
        </div>
      </div>

      {/* Pricing Input */}
      <div className="alliance-form-group">
        <label className="alliance-label">
          <span>{data.intent === 'SALE' ? 'Asking Sale Price' : 'Annual / Periodic Rent'}</span>
          <span className="alliance-label__required">*</span>
          {canonicalReference?.canonicalRent ? (
            <span className="alliance-label__hint">
              Canonical inventory rate: ₦{canonicalReference.canonicalRent.toLocaleString()}
            </span>
          ) : null}
        </label>
        <div className="alliance-input-wrap">
          <span className="alliance-input-prefix">₦</span>
          <input
            type="number"
            min="0"
            step="1000"
            className="alliance-input alliance-input--with-prefix"
            disabled={disabled}
            placeholder="e.g. 15,000,000"
            value={data.price || ''}
            onChange={(e) => onChange('price', Number(e.target.value))}
            required
          />
        </div>
      </div>

      {/* Description */}
      <div className="alliance-form-group">
        <label className="alliance-label">
          <span>Marketing Description</span>
          <span className="alliance-label__hint">Optional</span>
        </label>
        <textarea
          className="alliance-textarea"
          disabled={disabled}
          rows={4}
          placeholder="Highlight key selling points, amenities, power supply, security, service charge schedule, or special broker terms..."
          value={data.description}
          onChange={(e) => onChange('description', e.target.value)}
        />
      </div>

      {/* Independent Details (If INDEPENDENT) */}
      {sourceType === 'INDEPENDENT' && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>
            Independent Asset Specifications
          </div>

          <div className="alliance-form-row">
            <div className="alliance-form-group">
              <label className="alliance-label">Property / Asset Type</label>
              <input
                type="text"
                className="alliance-input"
                disabled={disabled}
                placeholder="e.g. Terraced Duplex, Penthouse, Office Floor"
                value={data.propertyType || ''}
                onChange={(e) => onChange('propertyType', e.target.value)}
              />
            </div>

            <div className="alliance-form-group">
              <label className="alliance-label">Bedrooms</label>
              <input
                type="number"
                min="0"
                className="alliance-input"
                disabled={disabled}
                placeholder="e.g. 3"
                value={data.bedrooms ?? ''}
                onChange={(e) => onChange('bedrooms', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>

            <div className="alliance-form-group">
              <label className="alliance-label">Bathrooms</label>
              <input
                type="number"
                min="0"
                className="alliance-input"
                disabled={disabled}
                placeholder="e.g. 4"
                value={data.bathrooms ?? ''}
                onChange={(e) => onChange('bathrooms', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
          </div>

          <div className="alliance-form-row">
            <div className="alliance-form-group">
              <label className="alliance-label">Street Address</label>
              <input
                type="text"
                className="alliance-input"
                disabled={disabled}
                placeholder="e.g. 14 Glover Road"
                value={data.address || ''}
                onChange={(e) => onChange('address', e.target.value)}
              />
            </div>

            <div className="alliance-form-group">
              <label className="alliance-label">City / District</label>
              <input
                type="text"
                className="alliance-input"
                disabled={disabled}
                placeholder="e.g. Ikoyi"
                value={data.city || ''}
                onChange={(e) => onChange('city', e.target.value)}
              />
            </div>

            <div className="alliance-form-group">
              <label className="alliance-label">State</label>
              <input
                type="text"
                className="alliance-input"
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
