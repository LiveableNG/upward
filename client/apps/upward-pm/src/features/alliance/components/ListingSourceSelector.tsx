'use client'

import React from 'react'
import { Building2, Home, Link as LinkIcon, Globe } from 'lucide-react'
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. What are you listing? */}
      <div>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, marginBottom: '8px', color: 'var(--text)' }}>
          1. What are you listing?
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <div
            onClick={() => !disabled && onTargetTypeChange('PROPERTY')}
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: targetType === 'PROPERTY' ? '2px solid var(--forest)' : '1px solid var(--border)',
              background: targetType === 'PROPERTY' ? 'rgba(22, 101, 52, 0.04)' : 'var(--white)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.15s ease',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: targetType === 'PROPERTY' ? 'rgba(22, 101, 52, 0.12)' : 'var(--bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: targetType === 'PROPERTY' ? 'var(--forest)' : 'var(--text-secondary)',
              }}
            >
              <Building2 size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>Entire Property / Building</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Commercial block, estate, or compound</div>
            </div>
          </div>

          <div
            onClick={() => !disabled && onTargetTypeChange('UNIT')}
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: targetType === 'UNIT' ? '2px solid var(--forest)' : '1px solid var(--border)',
              background: targetType === 'UNIT' ? 'rgba(22, 101, 52, 0.04)' : 'var(--white)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.15s ease',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: targetType === 'UNIT' ? 'rgba(22, 101, 52, 0.12)' : 'var(--bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: targetType === 'UNIT' ? 'var(--forest)' : 'var(--text-secondary)',
              }}
            >
              <Home size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>Individual Unit / Flat</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Single apartment, suite, or room</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Where does this listing come from? */}
      <div>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, marginBottom: '8px', color: 'var(--text)' }}>
          2. Where does this listing come from?
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <div
            onClick={() => !disabled && onSourceTypeChange('LINKED_INVENTORY')}
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: sourceType === 'LINKED_INVENTORY' ? '2px solid var(--forest)' : '1px solid var(--border)',
              background: sourceType === 'LINKED_INVENTORY' ? 'rgba(22, 101, 52, 0.04)' : 'var(--white)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.15s ease',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: sourceType === 'LINKED_INVENTORY' ? 'rgba(22, 101, 52, 0.12)' : 'var(--bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: sourceType === 'LINKED_INVENTORY' ? 'var(--forest)' : 'var(--text-secondary)',
              }}
            >
              <LinkIcon size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>Existing Upward Inventory</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Linked to an existing property/unit record</div>
            </div>
          </div>

          <div
            onClick={() => !disabled && onSourceTypeChange('INDEPENDENT')}
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: sourceType === 'INDEPENDENT' ? '2px solid var(--forest)' : '1px solid var(--border)',
              background: sourceType === 'INDEPENDENT' ? 'rgba(22, 101, 52, 0.04)' : 'var(--white)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.15s ease',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: sourceType === 'INDEPENDENT' ? 'rgba(22, 101, 52, 0.12)' : 'var(--bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: sourceType === 'INDEPENDENT' ? 'var(--forest)' : 'var(--text-secondary)',
              }}
            >
              <Globe size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>Independent Listing</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Direct marketing listing without PM inventory link</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
