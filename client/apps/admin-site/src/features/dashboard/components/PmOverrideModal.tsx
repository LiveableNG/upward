import React from 'react'
import { X } from 'lucide-react'
import type { PmRecord, FeeOverride } from '../types'

interface PmOverrideModalProps {
  selectedPmOverride: PmRecord | null
  onClose: () => void
  pmOverrideFeeInput: string
  setPmOverrideFeeInput: (fee: string) => void
  handleSavePmQuickOverride: () => void
  handleDeletePmQuickOverride: () => void
  overrides: FeeOverride[]
  savingOverride: boolean
}

export const PmOverrideModal: React.FC<PmOverrideModalProps> = ({
  selectedPmOverride,
  onClose,
  pmOverrideFeeInput,
  setPmOverrideFeeInput,
  handleSavePmQuickOverride,
  handleDeletePmQuickOverride,
  overrides,
  savingOverride,
}) => {
  if (!selectedPmOverride) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card fade-in" style={{ maxWidth: '440px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Configure PM Processing Fee</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>
        
        <div style={{ background: 'var(--surface)', padding: '12px 14px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px' }}>
          <div><strong>PM Account:</strong> {selectedPmOverride.businessName}</div>
          <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>{selectedPmOverride.email}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Custom Fee (₦)</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)' }}>₦</span>
            <input
              type="number"
              min="0"
              value={pmOverrideFeeInput}
              onChange={(e) => setPmOverrideFeeInput(e.target.value)}
              className="input"
              style={{ paddingLeft: '32px', fontSize: '16px', fontWeight: 700 }}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button onClick={handleSavePmQuickOverride} className="btn btn-primary" style={{ flex: 1, height: '40px' }} disabled={savingOverride}>
              Save Override
            </button>
            {overrides.some((o) => o.targetType === 'PM' && o.targetId === selectedPmOverride.uuid) && (
              <button onClick={handleDeletePmQuickOverride} className="btn btn-secondary" style={{ color: 'var(--danger)', height: '40px' }} disabled={savingOverride}>
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
