import React from 'react'
import { FileSpreadsheet, Plus, ArrowRight } from 'lucide-react'
import { Modal } from '@/components/ui/Modal/Modal'

interface RentHistoryEntryModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onManualEntry: () => void;
  onBulkEntry: () => void;
}

export const RentHistoryEntryModeModal: React.FC<RentHistoryEntryModeModalProps> = ({ 
  isOpen, onClose, onManualEntry, onBulkEntry 
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enter Rent Payment"
      subtitle="Choose how you want to record the rent history for this unit."
      maxWidth={500}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
        <button 
          className="import-mode-card"
          onClick={onManualEntry}
        >
          <div className="import-mode-card__icon" style={{ background: 'var(--forest-faint)', color: 'var(--forest)' }}>
            <Plus size={24} />
          </div>
          <div className="import-mode-card__content">
            <h3>Single Record</h3>
            <p>Quickly enter a single rent payment history for this unit.</p>
          </div>
          <ArrowRight size={18} className="import-mode-card__arrow" />
        </button>

        <button 
          className="import-mode-card"
          onClick={onBulkEntry}
        >
          <div className="import-mode-card__icon" style={{ background: 'var(--ivory-dim)', color: 'var(--forest)' }}>
            <FileSpreadsheet size={24} />
          </div>
          <div className="import-mode-card__content">
            <h3>Bulk Import</h3>
            <p>Upload a CSV file containing multiple years of rent history.</p>
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

        .import-mode-card__icon {
          padding: 12px;
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
    </Modal>
  )
}
