import React from 'react'
import { X, Building, Home, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/common/Toast'

interface ImportModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasProperties: boolean;
}

export const ImportModeModal: React.FC<ImportModeModalProps> = ({ isOpen, onClose, hasProperties }) => {
  const router = useRouter()
  const { error } = useToast()

  if (!isOpen) return null

  const handleSelectMode = (mode: 'full' | 'units') => {
    if (mode === 'units' && !hasProperties) {
      error("No properties found. Please use Full Import or add a property first.")
      return
    }
    router.push(`/settings?tab=import&mode=${mode}`)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 className="modal__title">Choose Import Mode</h2>
          <button onClick={onClose} className="btn-icon"><X size={20} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <button 
            className="import-mode-card"
            onClick={() => handleSelectMode('full')}
          >
            <div className="import-mode-card__icon">
              <Building size={24} />
            </div>
            <div className="import-mode-card__content">
              <h3>Full Import (Properties & Tenants)</h3>
              <p>Ideal if you have a spreadsheet with new properties, landlords, and tenants combined.</p>
            </div>
            <ArrowRight size={18} className="import-mode-card__arrow" />
          </button>

          <button 
            className={`import-mode-card ${!hasProperties ? 'import-mode-card--disabled' : ''}`}
            onClick={() => handleSelectMode('units')}
          >
            <div className="import-mode-card__icon" style={{ background: 'var(--ivory-dim)', color: 'var(--forest)' }}>
              <Home size={24} />
            </div>
            <div className="import-mode-card__content">
              <h3>Units Import (Existing Property)</h3>
              <p>Quickly add units and tenants to a property already registered on Upward.</p>
            </div>
            <ArrowRight size={18} className="import-mode-card__arrow" />
          </button>
        </div>

        <style jsx>{`
          .import-mode-card {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 20px;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 16px;
            text-align: left;
            cursor: pointer;
            transition: all 0.2s ease;
            width: 100%;
          }

          .import-mode-card:hover {
            border-color: var(--forest);
            background: var(--surface-hover);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          }

          .import-mode-card--disabled {
            opacity: 0.6;
            cursor: not-allowed;
            grayscale: 1;
          }

          .import-mode-card__icon {
            padding: 12px;
            background: var(--forest-faint);
            color: var(--forest);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .import-mode-card__content {
            flex: 1;
          }

          .import-mode-card__content h3 {
            font-size: 15px;
            font-weight: 600;
            margin: 0 0 4px 0;
            color: var(--text);
          }

          .import-mode-card__content p {
            font-size: 12px;
            color: var(--text-muted);
            margin: 0;
            line-height: 1.4;
          }

          .import-mode-card__arrow {
            color: var(--text-muted);
            opacity: 0.5;
          }

          .import-mode-card:hover .import-mode-card__arrow {
            color: var(--forest);
            opacity: 1;
            transform: translateX(4px);
          }
        `}</style>
      </div>
    </div>
  )
}
