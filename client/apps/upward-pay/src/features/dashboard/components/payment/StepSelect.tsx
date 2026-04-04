import React from 'react'
import { Plus, ChevronRight } from 'lucide-react'
import { type Landlord } from './types'
import { LandlordCard } from './LandlordCard'

export function StepSelect({
  saved,
  pm,
  onSelect,
  onNew,
}: {
  saved: Landlord[]
  pm: Landlord[]
  onSelect: (l: Landlord) => void
  onNew: () => void
}) {
  const all = [...pm, ...saved]
  return (
    <div style={{ padding: '0 0 32px' }}>
      <div style={{ padding: '20px 20px 12px' }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Select a saved recipient or add a new payment destination.
        </p>
      </div>
      {all.length > 0 && (
        <>
          {pm.length > 0 && (
            <div style={{ padding: '0 20px 8px' }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--text-muted)',
                  marginBottom: 10,
                }}
              >
                From your property manager
              </p>
              {pm.map((l) => (
                <LandlordCard key={l.id} landlord={l} onSelect={onSelect} tag="PM" />
              ))}
            </div>
          )}
          {saved.length > 0 && (
            <div style={{ padding: '0 20px 8px' }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--text-muted)',
                  marginBottom: 10,
                }}
              >
                Previously paid
              </p>
              {saved.map((l) => (
                <LandlordCard key={l.id} landlord={l} onSelect={onSelect} />
              ))}
            </div>
          )}
        </>
      )}
      <div style={{ padding: '12px 20px 0' }}>
        <button
          onClick={onNew}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '16px',
            background: 'var(--surface)',
            border: '1px dashed var(--border-solid)',
            borderRadius: 'var(--radius-lg)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'var(--font)',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--clay)'
            ;(e.currentTarget as HTMLElement).style.background = 'var(--clay-faint)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-solid)'
            ;(e.currentTarget as HTMLElement).style.background = 'var(--surface)'
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: 'var(--clay-faint)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--clay)',
            }}
          >
            <Plus size={20} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>New recipient</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Bank account or property manager
            </div>
          </div>
          <div style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
            <ChevronRight size={16} />
          </div>
        </button>
      </div>
    </div>
  )
}
