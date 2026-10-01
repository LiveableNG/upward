'use client'

import React from 'react'
import { Building2, Home, Link2, Globe, Check } from 'lucide-react'
import { AllianceTargetType, AllianceSourceType } from '../types/alliance.types'

interface ListingSourceSelectorProps {
  targetType: AllianceTargetType
  sourceType: AllianceSourceType
  onTargetTypeChange: (type: AllianceTargetType) => void
  onSourceTypeChange: (source: AllianceSourceType) => void
  disabled?: boolean
}

export function ListingSourceSelector({
  targetType,
  sourceType,
  onTargetTypeChange,
  onSourceTypeChange,
  disabled = false,
}: ListingSourceSelectorProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* 1. What type of asset are you listing? */}
      <div>
        <label className="alliance-label" style={{ fontSize: '14px', marginBottom: '12px' }}>
          <span>1. What asset scope are you marketing?</span>
          <span className="alliance-label__required">*</span>
        </label>

        <div className="alliance-tile-grid">
          <div
            onClick={() => !disabled && onTargetTypeChange('PROPERTY')}
            className={`alliance-tile ${targetType === 'PROPERTY' ? 'alliance-tile--selected' : ''} ${
              disabled ? 'alliance-tile--disabled' : ''
            }`}
          >
            <div className="alliance-tile__icon-wrap">
              <Building2 size={24} />
            </div>
            <div className="alliance-tile__body">
              <div className="alliance-tile__title">Entire Property / Complex</div>
              <div className="alliance-tile__desc">Commercial building, residential estate, compound, or multi-family block</div>
            </div>
            <div className="alliance-tile__indicator">
              {targetType === 'PROPERTY' && <Check size={12} strokeWidth={3} />}
            </div>
          </div>

          <div
            onClick={() => !disabled && onTargetTypeChange('UNIT')}
            className={`alliance-tile ${targetType === 'UNIT' ? 'alliance-tile--selected' : ''} ${
              disabled ? 'alliance-tile--disabled' : ''
            }`}
          >
            <div className="alliance-tile__icon-wrap">
              <Home size={24} />
            </div>
            <div className="alliance-tile__body">
              <div className="alliance-tile__title">Individual Unit / Flat</div>
              <div className="alliance-tile__desc">Single apartment, serviced flat, office suite, studio, or room</div>
            </div>
            <div className="alliance-tile__indicator">
              {targetType === 'UNIT' && <Check size={12} strokeWidth={3} />}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Where does this listing come from? */}
      <div>
        <label className="alliance-label" style={{ fontSize: '14px', marginBottom: '12px' }}>
          <span>2. Where does this listing originate from?</span>
          <span className="alliance-label__required">*</span>
        </label>

        <div className="alliance-tile-grid">
          <div
            onClick={() => !disabled && onSourceTypeChange('LINKED_INVENTORY')}
            className={`alliance-tile ${sourceType === 'LINKED_INVENTORY' ? 'alliance-tile--selected' : ''} ${
              disabled ? 'alliance-tile--disabled' : ''
            }`}
          >
            <div className="alliance-tile__icon-wrap">
              <Link2 size={24} />
            </div>
            <div className="alliance-tile__body">
              <div className="alliance-tile__title">Linked Upward Inventory</div>
              <div className="alliance-tile__desc">Connected to your managed properties or unit inventory in Upward PM</div>
            </div>
            <div className="alliance-tile__indicator">
              {sourceType === 'LINKED_INVENTORY' && <Check size={12} strokeWidth={3} />}
            </div>
          </div>

          <div
            onClick={() => !disabled && onSourceTypeChange('INDEPENDENT')}
            className={`alliance-tile ${sourceType === 'INDEPENDENT' ? 'alliance-tile--selected' : ''} ${
              disabled ? 'alliance-tile--disabled' : ''
            }`}
          >
            <div className="alliance-tile__icon-wrap">
              <Globe size={24} />
            </div>
            <div className="alliance-tile__body">
              <div className="alliance-tile__title">Independent Listing</div>
              <div className="alliance-tile__desc">Direct marketing listing without a linked inventory asset</div>
            </div>
            <div className="alliance-tile__indicator">
              {sourceType === 'INDEPENDENT' && <Check size={12} strokeWidth={3} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
