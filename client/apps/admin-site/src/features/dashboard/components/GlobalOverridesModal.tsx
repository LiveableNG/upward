import React from 'react'
import { createPortal } from 'react-dom'
import { X, Trash2 } from 'lucide-react'
import type { FeeOverride } from '../types'

interface GlobalOverridesModalProps {
  isOpen: boolean
  onClose: () => void
  baseFeeInput: string
  setBaseFeeInput: (fee: string) => void
  handleSaveBaseFee: () => void
  savingBaseFee: boolean
  customOverrideType: string
  setCustomOverrideType: (type: string) => void
  customOverrideId: string
  setCustomOverrideId: (id: string) => void
  customOverrideFee: string
  setCustomOverrideFee: (fee: string) => void
  handleSaveCustomOverride: (e: React.FormEvent) => void
  savingOverride: boolean
  loadingOverrides: boolean
  overrides: FeeOverride[]
  handleDeleteOverride: (targetType: string, targetId: string) => void
}

export const GlobalOverridesModal: React.FC<GlobalOverridesModalProps> = ({
  isOpen,
  onClose,
  baseFeeInput,
  setBaseFeeInput,
  handleSaveBaseFee,
  savingBaseFee,
  customOverrideType,
  setCustomOverrideType,
  customOverrideId,
  setCustomOverrideId,
  customOverrideFee,
  setCustomOverrideFee,
  handleSaveCustomOverride,
  savingOverride,
  loadingOverrides,
  overrides,
  handleDeleteOverride,
}) => {
  if (!isOpen) return null

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content card fade-in"
        style={{ maxWidth: '600px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>System Fee Overrides</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Global base configuration */}
        <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '12px' }}>
          <span className="section-label">Global Fallback Processing Fee</span>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)' }}>₦</span>
              <input
                type="number"
                min="0"
                value={baseFeeInput}
                onChange={(e) => setBaseFeeInput(e.target.value)}
                className="input"
                style={{ paddingLeft: '32px', fontSize: '15px', fontWeight: 700 }}
              />
            </div>
            <button onClick={handleSaveBaseFee} className="btn btn-primary" style={{ height: '40px' }} disabled={savingBaseFee}>
              Save Base Fee
            </button>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />

        {/* Config custom override */}
        <form onSubmit={handleSaveCustomOverride} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span className="section-label">Add Custom Fee Override (Company or Platform)</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
            <select
              value={customOverrideType}
              onChange={(e) => setCustomOverrideType(e.target.value)}
              className="input"
            >
              <option value="PM">Property Manager</option>
              <option value="COMPANY">Company / PM Corp</option>
              <option value="PLATFORM">External Platform</option>
            </select>
            <input
              type="text"
              placeholder="Enter target Entity UUID..."
              value={customOverrideId}
              onChange={(e) => setCustomOverrideId(e.target.value)}
              className="input"
              required
            />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)' }}>₦</span>
              <input
                type="number"
                value={customOverrideFee}
                onChange={(e) => setCustomOverrideFee(e.target.value)}
                className="input"
                style={{ paddingLeft: '32px' }}
                required
              />
            </div>
            <button type="submit" className="btn btn-secondary" style={{ height: '40px' }} disabled={savingOverride}>
              Add Override
            </button>
          </div>
        </form>

        {/* List custom overrides */}
        {loadingOverrides ? (
          <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>Loading overrides...</div>
        ) : overrides.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span className="section-label">Active Custom Overrides</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
              {overrides.map((ov) => (
                <div
                  key={ov.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: 'var(--surface-hover)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '13px'
                  }}
                >
                  <div>
                    <span
                      className="badge"
                      style={{
                        fontSize: '9px',
                        padding: '2px 6px',
                        background: ov.targetType === 'PM' ? 'rgba(99,102,241,0.08)' : 'var(--warning-faint)',
                        color: ov.targetType === 'PM' ? '#6366f1' : 'var(--warning)',
                        marginRight: '6px'
                      }}
                    >
                      {ov.targetType}
                    </span>
                    <span style={{ fontFamily: 'monospace' }}>{ov.targetId.slice(0, 8)}...</span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>({ov.targetName || 'unknown'})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 700 }}>₦{ov.fee.toLocaleString()}</span>
                    <button
                      onClick={() => handleDeleteOverride(ov.targetType, ov.targetId)}
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '16px' }}>No active overrides configured.</div>
        )}
      </div>
    </div>,
    document.body
  )
}
