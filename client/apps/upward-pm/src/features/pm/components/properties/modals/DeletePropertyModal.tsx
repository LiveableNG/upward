import React, { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal/Modal'

interface DeletePropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  propertyName: string;
}

export const DeletePropertyModal: React.FC<DeletePropertyModalProps> = ({ 
  isOpen, onClose, onConfirm, isPending, propertyName 
}) => {
  const [confirmName, setConfirmName] = useState('')
  
  if (!isOpen) return null;

  const isValid = confirmName === propertyName;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Property"
      subtitle="This action is permanent and irreversible."
      icon={AlertTriangle}
      footer={
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          <button className="btn btn--secondary" style={{ flex: 1 }} onClick={onClose}>
            Keep Property
          </button>
          <button 
            className="btn btn--danger" 
            style={{ flex: 1 }} 
            onClick={onConfirm} 
            disabled={!isValid || isPending}
          >
            {isPending ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      }
    >
        <div style={{ 
          background: 'rgba(239, 68, 68, 0.05)', 
          border: '1px solid rgba(239, 68, 68, 0.2)', 
          padding: 16, 
          borderRadius: 12, 
          marginTop: 20,
          marginBottom: 20
        }}>
          <p style={{ margin: 0, fontSize: 14, color: '#b91c1c', fontWeight: 500 }}>
            Warning: Deleting <strong>{propertyName}</strong> will also permanently delete all units, tenant associations, and rent records linked to it.
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">Type the property name to confirm</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder={propertyName}
            value={confirmName} 
            onChange={e => setConfirmName(e.target.value)} 
          />
        </div>

    </Modal>
  )
}
